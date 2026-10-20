import { MinecraftError } from './errors.mjs';

const PAPER_PROJECT_URL = 'https://fill.papermc.io/v3/projects/paper';
const FABRIC_META_URL = 'https://meta.fabricmc.net/v2/versions';
const MODRINTH_API_URL = 'https://api.modrinth.com/v2';
const MOJANG_VERSIONS_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const ADOPTIUM_API_URL = 'https://api.adoptium.net/v3/assets/latest';
const USER_AGENT = 'dsh-lfaa/0.1.0 (https://github.com/yubboo/dsh-lfaa)';
const JSON_LIMIT_BYTES = 20 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const CACHE_MS = 15 * 60_000;
const PAPER_HOSTS = new Set(['fill.papermc.io', 'fill-data.papermc.io']);
const FABRIC_HOSTS = new Set(['meta.fabricmc.net']);
const MODRINTH_API_HOSTS = new Set(['api.modrinth.com']);
const MODRINTH_CDN_HOSTS = new Set(['cdn.modrinth.com']);
const MOJANG_HOSTS = new Set(['piston-meta.mojang.com', 'launcher.mojang.com']);
const ADOPTIUM_API_HOSTS = new Set(['api.adoptium.net']);
const ADOPTIUM_DOWNLOAD_HOST = 'github.com';
const ADOPTIUM_REDIRECT_HOSTS = new Set(['github.com', 'release-assets.githubusercontent.com']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const versionCache = { expiresAt: 0, value: undefined };
const javaCache = new Map();

function requestSignal(signal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function assertTrustedUrl(value, hosts, label) {
  let url;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new MinecraftError('MINECRAFT_INVALID_SOURCE', `${label} returned an invalid URL.`, { cause });
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username !== '' || url.password !== '' || !hosts.has(url.hostname)) {
    throw new MinecraftError('MINECRAFT_UNTRUSTED_SOURCE', `${label} returned an untrusted download host.`);
  }
  return url;
}

async function fetchAllowedUrl(value, hosts, label, options) {
  let url = assertTrustedUrl(value, hosts, label);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, { ...options, redirect: 'manual' });
    if (!REDIRECT_STATUSES.has(response.status)) {
      assertTrustedUrl(response.url, hosts, label);
      return response;
    }
    if (redirects === 3) throw new MinecraftError('MINECRAFT_TOO_MANY_REDIRECTS', `${label} returned too many redirects.`);
    const location = response.headers.get('location');
    if (!location) throw new MinecraftError('MINECRAFT_INVALID_SOURCE', `${label} returned a redirect without a location.`);
    const nextUrl = assertTrustedUrl(new URL(location, url).href, hosts, label);
    await response.body?.cancel().catch(() => {});
    url = nextUrl;
  }
  throw new MinecraftError('MINECRAFT_TOO_MANY_REDIRECTS', `${label} returned too many redirects.`);
}

async function responseText(response, maxBytes, signal) {
  if (!response.body) throw new MinecraftError('MINECRAFT_EMPTY_RESPONSE', 'The metadata service returned no response body.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new MinecraftError('MINECRAFT_METADATA_TOO_LARGE', 'The metadata response exceeded its size limit.');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const content = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    content.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(content);
}

async function fetchJson(value, hosts, label, signal) {
  const url = assertTrustedUrl(value, hosts, label);
  const request = requestSignal(signal);
  let response;
  try {
    response = await fetchAllowedUrl(url.href, hosts, label, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
      signal: request,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError('MINECRAFT_METADATA_UNAVAILABLE', `${label} could not be reached.`, { cause });
  }
  if (!response.ok) {
    throw new MinecraftError('MINECRAFT_METADATA_HTTP_ERROR', `${label} returned HTTP ${response.status}.`);
  }
  const text = await responseText(response, JSON_LIMIT_BYTES, request);
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new MinecraftError('MINECRAFT_INVALID_METADATA', `${label} returned invalid JSON.`, { cause });
  }
}

/** Return Paper's live API version list in its published order. */
export async function listPaperVersions(signal) {
  if (versionCache.value && versionCache.expiresAt > Date.now()) return versionCache.value;
  const catalog = await fetchJson(PAPER_PROJECT_URL, PAPER_HOSTS, 'PaperMC downloads API', signal);
  const versions = Object.values(catalog.versions ?? {}).flat();
  const unique = [...new Set(versions.filter(value => typeof value === 'string' && /^\d+(?:\.\d+){1,2}$/.test(value)))];
  if (unique.length === 0) throw new MinecraftError('MINECRAFT_EMPTY_CATALOG', 'PaperMC did not return any usable Minecraft versions.');
  versionCache.value = unique;
  versionCache.expiresAt = Date.now() + CACHE_MS;
  return unique;
}

/** Return stable Paper builds and their checksum metadata for one published version. */
export async function listPaperBuilds(version, signal) {
  if (typeof version !== 'string' || !/^\d+(?:\.\d+){1,2}$/.test(version)) {
    throw new MinecraftError('MINECRAFT_INVALID_VERSION', 'Choose a Minecraft version from the PaperMC catalog.');
  }
  const versions = await listPaperVersions(signal);
  if (!versions.includes(version)) throw new MinecraftError('MINECRAFT_VERSION_UNAVAILABLE', `Paper does not publish Minecraft ${version}.`);
  const url = `${PAPER_PROJECT_URL}/versions/${encodeURIComponent(version)}/builds`;
  const builds = await fetchJson(url, PAPER_HOSTS, 'PaperMC downloads API', signal);
  if (!Array.isArray(builds)) throw new MinecraftError('MINECRAFT_INVALID_METADATA', 'PaperMC returned an invalid build list.');
  return builds
    .filter(build => build?.channel === 'STABLE')
    .map(build => {
      const download = build?.downloads?.['server:default'];
      if (!download || !Number.isSafeInteger(download.size) || download.size <= 0 || !/^[a-f0-9]{64}$/i.test(download.checksums?.sha256 ?? '')) return undefined;
      const downloadUrl = assertTrustedUrl(download.url, PAPER_HOSTS, 'PaperMC downloads API');
      return {
        id: build.id,
        number: build.build,
        channel: build.channel,
        name: download.name,
        url: downloadUrl.href,
        size: download.size,
        sha256: download.checksums.sha256.toLowerCase(),
      };
    })
    .filter(Boolean)
    .sort((left, right) => Number(right.number ?? right.id) - Number(left.number ?? left.id));
}

/** Read every stable game version currently published by Fabric Meta. */
export async function listFabricVersions(signal) {
  const versions = await fetchJson(`${FABRIC_META_URL}/game`, FABRIC_HOSTS, 'Fabric Meta API', signal);
  if (!Array.isArray(versions)) throw new MinecraftError('MINECRAFT_INVALID_METADATA', 'Fabric Meta returned an invalid game-version catalog.');
  const unique = [...new Map(versions
    .filter(item => item?.stable === true && typeof item.version === 'string' && /^[A-Za-z0-9._-]{1,64}$/.test(item.version))
    .map(item => [item.version, { version: item.version, stable: true }])).values()];
  if (unique.length === 0) throw new MinecraftError('MINECRAFT_EMPTY_CATALOG', 'Fabric Meta did not return any stable Minecraft versions.');
  return unique;
}

/** Select official stable Fabric loader and installer builds for a published game version. */
export async function listFabricBuilds(version, signal) {
  if (typeof version !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(version)) {
    throw new MinecraftError('MINECRAFT_INVALID_VERSION', 'Choose a Minecraft version from Fabric Meta.');
  }
  const versions = await listFabricVersions(signal);
  if (!versions.some(item => item.version === version)) throw new MinecraftError('MINECRAFT_VERSION_UNAVAILABLE', `Fabric does not publish stable support for Minecraft ${version}.`);
  const loaders = await fetchJson(`${FABRIC_META_URL}/loader/${encodeURIComponent(version)}`, FABRIC_HOSTS, 'Fabric Meta API', signal);
  const installers = await fetchJson(`${FABRIC_META_URL}/installer`, FABRIC_HOSTS, 'Fabric Meta API', signal);
  if (!Array.isArray(loaders) || !Array.isArray(installers)) throw new MinecraftError('MINECRAFT_INVALID_METADATA', 'Fabric Meta returned invalid loader or installer metadata.');
  const stableLoaders = loaders.filter(item => item?.loader?.stable === true && typeof item.loader.version === 'string' && /^[A-Za-z0-9._+-]{1,64}$/.test(item.loader.version));
  const stableInstaller = installers.find(item => item?.stable === true && typeof item.version === 'string' && /^[A-Za-z0-9._+-]{1,64}$/.test(item.version));
  if (!stableInstaller || stableLoaders.length === 0) throw new MinecraftError('MINECRAFT_EMPTY_CATALOG', `Fabric has no stable loader and installer for Minecraft ${version}.`);
  return stableLoaders.slice(0, 25).map(item => {
    const loader = item.loader.version;
    const installer = stableInstaller.version;
    const url = `${FABRIC_META_URL}/loader/${encodeURIComponent(version)}/${encodeURIComponent(loader)}/${encodeURIComponent(installer)}/server/jar`;
    return {
      id: `${loader}@${installer}`,
      loaderVersion: loader,
      installerVersion: installer,
      channel: 'STABLE',
      name: 'fabric-server-launch.jar',
      url: assertFabricDownloadUrl(url).href,
      size: null,
      sha256: null,
    };
  });
}

/** Search Modrinth mods compatible with one Minecraft version and Fabric. */
export async function searchFabricMods(query, gameVersion, signal) {
  if (typeof query !== 'string' || query.trim().length < 2 || query.trim().length > 120) {
    throw new MinecraftError('MINECRAFT_MOD_QUERY_INVALID', 'Mod search text must contain 2 to 120 characters.');
  }
  if (typeof gameVersion !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(gameVersion)) {
    throw new MinecraftError('MINECRAFT_INVALID_VERSION', 'Choose a Minecraft version before searching for mods.');
  }
  const url = new URL(`${MODRINTH_API_URL}/search`);
  url.searchParams.set('query', query.trim());
  url.searchParams.set('facets', JSON.stringify([['project_type:mod'], [`versions:${gameVersion}`], ['categories:fabric']]));
  url.searchParams.set('limit', '20');
  const result = await fetchJson(url.href, MODRINTH_API_HOSTS, 'Modrinth API', signal);
  if (!result || !Array.isArray(result.hits)) throw new MinecraftError('MINECRAFT_INVALID_METADATA', 'Modrinth returned an invalid mod search result.');
  return result.hits
    .filter(hit => typeof hit?.project_id === 'string' && hit.project_type === 'mod')
    .map(hit => ({
      projectId: hit.project_id,
      slug: typeof hit.slug === 'string' ? hit.slug : undefined,
      title: typeof hit.title === 'string' ? hit.title : hit.project_id,
      description: typeof hit.description === 'string' ? hit.description.slice(0, 400) : '',
      downloads: Number.isSafeInteger(hit.downloads) ? hit.downloads : 0,
      categories: Array.isArray(hit.categories) ? hit.categories.filter(value => typeof value === 'string') : [],
      serverSide: typeof hit.server_side === 'string' ? hit.server_side : 'unknown',
      gameVersions: Array.isArray(hit.versions) ? hit.versions.filter(value => typeof value === 'string') : [],
      latestVersionId: typeof hit.latest_version === 'string' ? hit.latest_version : undefined,
    }));
}

/** Resolve a Modrinth release for one Fabric server and Minecraft version. */
export async function resolveFabricModVersion({ projectId, versionId, gameVersion, signal }) {
  if (typeof projectId !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(projectId)) {
    throw new MinecraftError('MINECRAFT_MOD_ID_INVALID', 'The Modrinth project id is invalid.');
  }
  if (versionId !== undefined && (typeof versionId !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(versionId))) {
    throw new MinecraftError('MINECRAFT_MOD_VERSION_INVALID', 'The Modrinth version id is invalid.');
  }
  if (typeof gameVersion !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(gameVersion)) {
    throw new MinecraftError('MINECRAFT_INVALID_VERSION', 'The instance has an invalid Minecraft version.');
  }
  const project = await fetchJson(`${MODRINTH_API_URL}/project/${encodeURIComponent(projectId)}`, MODRINTH_API_HOSTS, 'Modrinth API', signal);
  if (project?.project_type !== 'mod' || typeof project.id !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(project.id)) {
    throw new MinecraftError('MINECRAFT_MOD_ID_INVALID', 'The selected Modrinth project is not a valid mod.');
  }
  const canonicalProjectId = project.id;
  const url = versionId === undefined
    ? new URL(`${MODRINTH_API_URL}/project/${encodeURIComponent(canonicalProjectId)}/version`)
    : new URL(`${MODRINTH_API_URL}/version/${encodeURIComponent(versionId)}`);
  if (versionId === undefined) {
    url.searchParams.set('loaders', JSON.stringify(['fabric']));
    url.searchParams.set('game_versions', JSON.stringify([gameVersion]));
  }
  const raw = await fetchJson(url.href, MODRINTH_API_HOSTS, 'Modrinth API', signal);
  const candidates = Array.isArray(raw) ? raw : [raw];
  const compatible = candidates.filter(version => version?.project_id === canonicalProjectId
    && Array.isArray(version.loaders) && version.loaders.includes('fabric')
    && Array.isArray(version.game_versions) && version.game_versions.includes(gameVersion)
    && Array.isArray(version.files) && version.files.length > 0);
  const selected = versionId === undefined
    ? compatible.find(version => version.version_type === 'release') ?? compatible[0]
    : compatible[0];
  if (!selected) throw new MinecraftError('MINECRAFT_MOD_VERSION_UNAVAILABLE', `Modrinth has no Fabric mod version compatible with Minecraft ${gameVersion}.`);
  const file = selected.files.find(item => item?.primary === true) ?? selected.files[0];
  if (!file || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 512 * 1024 * 1024
      || typeof file.filename !== 'string' || !/^[A-Za-z0-9._+-]{1,200}\.jar$/i.test(file.filename)
      || !/^[a-f0-9]{128}$/i.test(file.hashes?.sha512 ?? '')) {
    throw new MinecraftError('MINECRAFT_INVALID_METADATA', 'Modrinth returned incomplete or unsupported mod file metadata.');
  }
  const download = assertModrinthDownloadUrl(file.url);
  return {
    id: selected.id,
    projectId: canonicalProjectId,
    projectName: typeof selected.name === 'string' ? selected.name : projectId,
    versionNumber: typeof selected.version_number === 'string' ? selected.version_number : selected.id,
    versionType: typeof selected.version_type === 'string' ? selected.version_type : 'unknown',
    serverSide: typeof selected.environment?.server === 'string' ? selected.environment.server : 'unknown',
    file: { name: file.filename, size: file.size, sha512: file.hashes.sha512.toLowerCase(), url: download.href },
    dependencies: Array.isArray(selected.dependencies) ? selected.dependencies
      .filter(dep => dep?.dependency_type === 'required' && typeof dep.project_id === 'string')
      .map(dep => ({ projectId: dep.project_id, ...(typeof dep.version_id === 'string' ? { versionId: dep.version_id } : {}) })) : [],
  };
}

/** Resolve Mojang's Java requirement for one published Minecraft version. */
export async function requiredJavaVersion(version, signal) {
  const cached = javaCache.get(version);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let entry;
  const manifest = await fetchJson(MOJANG_VERSIONS_URL, MOJANG_HOSTS, 'Mojang version manifest', signal);
  entry = manifest.versions?.find(candidate => candidate.id === version);
  if (!entry) throw new MinecraftError('MINECRAFT_VERSION_METADATA_MISSING', `Mojang metadata for Minecraft ${version} is unavailable.`);
  const details = await fetchJson(entry.url, MOJANG_HOSTS, 'Mojang version metadata', signal);
  const majorVersion = details.javaVersion?.majorVersion;
  const required = Number.isSafeInteger(majorVersion) && majorVersion > 0 ? majorVersion : legacyPaperJavaRequirement(version);
  if (required === undefined) {
    throw new MinecraftError('MINECRAFT_JAVA_REQUIREMENT_UNKNOWN', `Paper's Java requirement for Minecraft ${version} is not available in Mojang metadata.`);
  }
  javaCache.set(version, { expiresAt: Date.now() + CACHE_MS, value: required });
  return required;
}

/** Return the latest official Temurin JRE archive and its published checksum. */
export async function latestTemurinRuntime(major, platform, architecture, signal) {
  if (!Number.isSafeInteger(major) || major < 8 || major > 99) {
    throw new MinecraftError('MINECRAFT_JAVA_REQUIREMENT_UNKNOWN', 'The requested Java feature version is invalid.');
  }
  const os = ({ win32: 'windows', darwin: 'mac', linux: 'linux' })[platform];
  const arch = ({ x64: 'x64', arm64: 'aarch64' })[architecture];
  if (!os || !arch) throw new MinecraftError('MINECRAFT_JAVA_PLATFORM_UNSUPPORTED', `Temurin does not support automatic Java installation for ${platform}/${architecture}.`);
  const url = new URL(`${ADOPTIUM_API_URL}/${major}/hotspot`);
  url.search = new URLSearchParams({ architecture: arch, image_type: 'jre', os, vendor: 'eclipse' }).toString();
  const assets = await fetchJson(url.href, ADOPTIUM_API_HOSTS, 'Adoptium release API', signal);
  const asset = Array.isArray(assets) ? assets[0] : undefined;
  const binary = asset?.binary;
  const archive = binary?.package;
  if (asset?.vendor !== 'eclipse' || Number(asset?.version?.major) !== major
      || binary?.project !== 'jdk' || binary?.image_type !== 'jre'
      || binary?.os !== os || binary?.architecture !== arch
      || !archive || typeof archive.name !== 'string'
      || !/^[A-Za-z0-9._+-]+\.(?:zip|tar\.gz)$/.test(archive.name)
      || !Number.isSafeInteger(archive.size) || archive.size < 1
      || !/^[a-f0-9]{64}$/i.test(archive.checksum ?? '')) {
    throw new MinecraftError('MINECRAFT_INVALID_METADATA', 'Adoptium returned incomplete Java runtime archive metadata.');
  }
  const download = assertJavaDownloadUrl(archive.link, major);
  return {
    vendor: 'Eclipse Temurin',
    imageType: 'jre',
    major,
    version: asset?.version?.openjdk_version ?? null,
    architecture: arch,
    platform: os,
    name: archive.name,
    url: download.href,
    size: archive.size,
    sha256: archive.checksum.toLowerCase(),
  };
}

function legacyPaperJavaRequirement(version) {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(version);
  if (!match) return undefined;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3] ?? 0);
  if (major >= 26 && minor >= 1) return 25;
  if (major !== 1) return undefined;
  if (minor >= 7 && minor <= 11) return 8;
  if (minor === 12 || (minor >= 13 && minor <= 16 && patch < 5)) return 11;
  if (minor === 16 && patch === 5) return 16;
  if (minor >= 17 && minor <= 19) return 17;
  if (minor === 20 || (minor === 21 && patch <= 11)) return 21;
  return undefined;
}

/** Check that an official download response cannot escape its published source host. */
export function assertPaperDownloadUrl(value) {
  return assertTrustedUrl(value, PAPER_HOSTS, 'PaperMC downloads API');
}

/** Validate a Fabric server bootstrap URL assembled from official Fabric Meta values. */
export function assertFabricDownloadUrl(value) {
  const url = assertTrustedUrl(value, FABRIC_HOSTS, 'Fabric Meta API');
  if (!/^\/v2\/versions\/loader\/[A-Za-z0-9%._+-]+\/[A-Za-z0-9%._+-]+\/[A-Za-z0-9%._+-]+\/server\/jar$/.test(url.pathname)) {
    throw new MinecraftError('MINECRAFT_UNTRUSTED_SOURCE', 'Fabric Meta returned an unexpected server artifact path.');
  }
  return url;
}

/** Validate a Modrinth CDN file URL before a managed mod download. */
export function assertModrinthDownloadUrl(value) {
  return assertTrustedUrl(value, MODRINTH_CDN_HOSTS, 'Modrinth version metadata');
}

/** Fetch one already validated Paper artifact response. */
export async function fetchPaperDownload(value, signal) {
  const source = assertPaperDownloadUrl(value);
  const request = requestSignal(signal);
  let response;
  try {
    response = await fetchAllowedUrl(source.href, PAPER_HOSTS, 'PaperMC downloads API', { headers: { 'user-agent': USER_AGENT }, signal: request });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError('MINECRAFT_DOWNLOAD_FAILED', 'Paper server download could not be reached.', { cause });
  }
  if (!response.ok || !response.body) throw new MinecraftError('MINECRAFT_DOWNLOAD_FAILED', `Paper server download returned HTTP ${response.status}.`);
  return response;
}

/** Fetch the Fabric bootstrap JAR from the official Fabric Meta endpoint. */
export async function fetchFabricDownload(value, signal) {
  const source = assertFabricDownloadUrl(value);
  const request = requestSignal(signal);
  let response;
  try {
    response = await fetchAllowedUrl(source.href, FABRIC_HOSTS, 'Fabric Meta API', { headers: { 'user-agent': USER_AGENT }, signal: request });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError('MINECRAFT_DOWNLOAD_FAILED', 'Fabric server download could not be reached.', { cause });
  }
  if (!response.ok || !response.body) throw new MinecraftError('MINECRAFT_DOWNLOAD_FAILED', `Fabric server download returned HTTP ${response.status}.`);
  return response;
}

/** Fetch a file from Modrinth's official CDN with redirects restricted to that CDN. */
export async function fetchModrinthDownload(value, signal) {
  const source = assertModrinthDownloadUrl(value);
  const request = requestSignal(signal);
  let response;
  try {
    response = await fetchAllowedUrl(source.href, MODRINTH_CDN_HOSTS, 'Modrinth CDN', { headers: { 'user-agent': USER_AGENT }, signal: request });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError('MINECRAFT_DOWNLOAD_FAILED', 'The Modrinth mod file could not be reached.', { cause });
  }
  if (!response.ok || !response.body) throw new MinecraftError('MINECRAFT_DOWNLOAD_FAILED', `Modrinth returned HTTP ${response.status} for a mod file.`);
  return response;
}

/** Validate the official Adoptium package path before following its GitHub release redirect. */
export function assertJavaDownloadUrl(value, major) {
  let url;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new MinecraftError('MINECRAFT_INVALID_SOURCE', 'Adoptium returned an invalid Java download URL.', { cause });
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username !== '' || url.password !== '' || url.hostname !== ADOPTIUM_DOWNLOAD_HOST
      || !url.pathname.startsWith(`/adoptium/temurin${major}-binaries/releases/download/`)) {
    throw new MinecraftError('MINECRAFT_UNTRUSTED_SOURCE', 'Adoptium returned a Java archive outside its official Temurin release repository.');
  }
  return url;
}

/** Fetch one checksum-pinned Temurin archive from the official release asset. */
export async function fetchJavaDownload(value, major, signal) {
  const source = assertJavaDownloadUrl(value, major);
  const request = requestSignal(signal);
  let response;
  let url = source;
  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      response = await fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: request, redirect: 'manual' });
      if (!REDIRECT_STATUSES.has(response.status)) break;
      if (redirects === 3) throw new MinecraftError('MINECRAFT_TOO_MANY_REDIRECTS', 'The Java runtime download returned too many redirects.');
      const location = response.headers.get('location');
      if (!location) throw new MinecraftError('MINECRAFT_INVALID_SOURCE', 'The Java runtime download redirected without a location.');
      const nextUrl = new URL(location, url);
      if (nextUrl.protocol !== 'https:' || nextUrl.port !== '' || nextUrl.username !== '' || nextUrl.password !== ''
          || (nextUrl.hostname === ADOPTIUM_DOWNLOAD_HOST
            ? !nextUrl.pathname.startsWith(`/adoptium/temurin${major}-binaries/releases/download/`)
            : !ADOPTIUM_REDIRECT_HOSTS.has(nextUrl.hostname))) {
        throw new MinecraftError('MINECRAFT_UNTRUSTED_SOURCE', 'The Java runtime download redirected to an untrusted URL.');
      }
      await response.body?.cancel().catch(() => {});
      url = nextUrl;
    }
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError('MINECRAFT_DOWNLOAD_FAILED', 'The Java runtime download could not be reached.', { cause });
  }
  let finalUrl;
  try {
    finalUrl = new URL(response.url);
  } catch (cause) {
    throw new MinecraftError('MINECRAFT_INVALID_SOURCE', 'The Java runtime download returned an invalid final URL.', { cause });
  }
  if (finalUrl.protocol !== 'https:' || finalUrl.port !== '' || finalUrl.username !== '' || finalUrl.password !== ''
      || (finalUrl.hostname === ADOPTIUM_DOWNLOAD_HOST
        ? !finalUrl.pathname.startsWith(`/adoptium/temurin${major}-binaries/releases/download/`)
        : !ADOPTIUM_REDIRECT_HOSTS.has(finalUrl.hostname))) {
    throw new MinecraftError('MINECRAFT_UNTRUSTED_SOURCE', 'The Java runtime download redirected to an untrusted host.');
  }
  if (!response.ok || !response.body) throw new MinecraftError('MINECRAFT_DOWNLOAD_FAILED', `The Java runtime download returned HTTP ${response.status}.`);
  return response;
}
