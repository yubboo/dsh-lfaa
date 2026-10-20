// packages/dsh-lfaa-minecraft/src/index.mjs
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, lstat, mkdir, readdir, realpath, rename, rm, statfs } from "node:fs/promises";
import { createServer } from "node:net";
import { totalmem } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// packages/dsh-lfaa-minecraft/src/errors.mjs
var MinecraftError = class extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "MinecraftError";
    this.code = code;
  }
};

// packages/dsh-lfaa-minecraft/src/catalog.mjs
var PAPER_PROJECT_URL = "https://fill.papermc.io/v3/projects/paper";
var FABRIC_META_URL = "https://meta.fabricmc.net/v2/versions";
var MODRINTH_API_URL = "https://api.modrinth.com/v2";
var MOJANG_VERSIONS_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
var ADOPTIUM_API_URL = "https://api.adoptium.net/v3/assets/latest";
var USER_AGENT = "dsh-lfaa/0.1.0 (https://github.com/yubboo/dsh-lfaa)";
var JSON_LIMIT_BYTES = 20 * 1024 * 1024;
var REQUEST_TIMEOUT_MS = 3e4;
var CACHE_MS = 15 * 6e4;
var PAPER_HOSTS = /* @__PURE__ */ new Set(["fill.papermc.io", "fill-data.papermc.io"]);
var FABRIC_HOSTS = /* @__PURE__ */ new Set(["meta.fabricmc.net"]);
var MODRINTH_API_HOSTS = /* @__PURE__ */ new Set(["api.modrinth.com"]);
var MODRINTH_CDN_HOSTS = /* @__PURE__ */ new Set(["cdn.modrinth.com"]);
var MOJANG_HOSTS = /* @__PURE__ */ new Set(["piston-meta.mojang.com", "launcher.mojang.com"]);
var ADOPTIUM_API_HOSTS = /* @__PURE__ */ new Set(["api.adoptium.net"]);
var ADOPTIUM_DOWNLOAD_HOST = "github.com";
var ADOPTIUM_REDIRECT_HOSTS = /* @__PURE__ */ new Set(["github.com", "release-assets.githubusercontent.com"]);
var REDIRECT_STATUSES = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
var versionCache = { expiresAt: 0, value: void 0 };
var javaCache = /* @__PURE__ */ new Map();
function requestSignal(signal) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
function assertTrustedUrl(value, hosts, label) {
  let url;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new MinecraftError("MINECRAFT_INVALID_SOURCE", `${label} returned an invalid URL.`, { cause });
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username !== "" || url.password !== "" || !hosts.has(url.hostname)) {
    throw new MinecraftError("MINECRAFT_UNTRUSTED_SOURCE", `${label} returned an untrusted download host.`);
  }
  return url;
}
async function fetchAllowedUrl(value, hosts, label, options) {
  let url = assertTrustedUrl(value, hosts, label);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const response = await fetch(url, { ...options, redirect: "manual" });
    if (!REDIRECT_STATUSES.has(response.status)) {
      assertTrustedUrl(response.url, hosts, label);
      return response;
    }
    if (redirects === 3) throw new MinecraftError("MINECRAFT_TOO_MANY_REDIRECTS", `${label} returned too many redirects.`);
    const location = response.headers.get("location");
    if (!location) throw new MinecraftError("MINECRAFT_INVALID_SOURCE", `${label} returned a redirect without a location.`);
    const nextUrl = assertTrustedUrl(new URL(location, url).href, hosts, label);
    await response.body?.cancel().catch(() => {
    });
    url = nextUrl;
  }
  throw new MinecraftError("MINECRAFT_TOO_MANY_REDIRECTS", `${label} returned too many redirects.`);
}
async function responseText(response, maxBytes, signal) {
  if (!response.body) throw new MinecraftError("MINECRAFT_EMPTY_RESPONSE", "The metadata service returned no response body.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new MinecraftError("MINECRAFT_METADATA_TOO_LARGE", "The metadata response exceeded its size limit.");
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
  return new TextDecoder("utf-8", { fatal: true }).decode(content);
}
async function fetchJson(value, hosts, label, signal) {
  const url = assertTrustedUrl(value, hosts, label);
  const request = requestSignal(signal);
  let response;
  try {
    response = await fetchAllowedUrl(url.href, hosts, label, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: request
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError("MINECRAFT_METADATA_UNAVAILABLE", `${label} could not be reached.`, { cause });
  }
  if (!response.ok) {
    throw new MinecraftError("MINECRAFT_METADATA_HTTP_ERROR", `${label} returned HTTP ${response.status}.`);
  }
  const text = await responseText(response, JSON_LIMIT_BYTES, request);
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new MinecraftError("MINECRAFT_INVALID_METADATA", `${label} returned invalid JSON.`, { cause });
  }
}
async function listPaperVersions(signal) {
  if (versionCache.value && versionCache.expiresAt > Date.now()) return versionCache.value;
  const catalog = await fetchJson(PAPER_PROJECT_URL, PAPER_HOSTS, "PaperMC downloads API", signal);
  const versions = Object.values(catalog.versions ?? {}).flat();
  const unique = [...new Set(versions.filter((value) => typeof value === "string" && /^\d+(?:\.\d+){1,2}$/.test(value)))];
  if (unique.length === 0) throw new MinecraftError("MINECRAFT_EMPTY_CATALOG", "PaperMC did not return any usable Minecraft versions.");
  versionCache.value = unique;
  versionCache.expiresAt = Date.now() + CACHE_MS;
  return unique;
}
async function listPaperBuilds(version, signal) {
  if (typeof version !== "string" || !/^\d+(?:\.\d+){1,2}$/.test(version)) {
    throw new MinecraftError("MINECRAFT_INVALID_VERSION", "Choose a Minecraft version from the PaperMC catalog.");
  }
  const versions = await listPaperVersions(signal);
  if (!versions.includes(version)) throw new MinecraftError("MINECRAFT_VERSION_UNAVAILABLE", `Paper does not publish Minecraft ${version}.`);
  const url = `${PAPER_PROJECT_URL}/versions/${encodeURIComponent(version)}/builds`;
  const builds = await fetchJson(url, PAPER_HOSTS, "PaperMC downloads API", signal);
  if (!Array.isArray(builds)) throw new MinecraftError("MINECRAFT_INVALID_METADATA", "PaperMC returned an invalid build list.");
  return builds.filter((build) => build?.channel === "STABLE").map((build) => {
    const download = build?.downloads?.["server:default"];
    if (!download || !Number.isSafeInteger(download.size) || download.size <= 0 || !/^[a-f0-9]{64}$/i.test(download.checksums?.sha256 ?? "")) return void 0;
    const downloadUrl = assertTrustedUrl(download.url, PAPER_HOSTS, "PaperMC downloads API");
    return {
      id: build.id,
      number: build.build,
      channel: build.channel,
      name: download.name,
      url: downloadUrl.href,
      size: download.size,
      sha256: download.checksums.sha256.toLowerCase()
    };
  }).filter(Boolean).sort((left, right) => Number(right.number ?? right.id) - Number(left.number ?? left.id));
}
async function listFabricVersions(signal) {
  const versions = await fetchJson(`${FABRIC_META_URL}/game`, FABRIC_HOSTS, "Fabric Meta API", signal);
  if (!Array.isArray(versions)) throw new MinecraftError("MINECRAFT_INVALID_METADATA", "Fabric Meta returned an invalid game-version catalog.");
  const unique = [...new Map(versions.filter((item) => item?.stable === true && typeof item.version === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(item.version)).map((item) => [item.version, { version: item.version, stable: true }])).values()];
  if (unique.length === 0) throw new MinecraftError("MINECRAFT_EMPTY_CATALOG", "Fabric Meta did not return any stable Minecraft versions.");
  return unique;
}
async function listFabricBuilds(version, signal) {
  if (typeof version !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(version)) {
    throw new MinecraftError("MINECRAFT_INVALID_VERSION", "Choose a Minecraft version from Fabric Meta.");
  }
  const versions = await listFabricVersions(signal);
  if (!versions.some((item) => item.version === version)) throw new MinecraftError("MINECRAFT_VERSION_UNAVAILABLE", `Fabric does not publish stable support for Minecraft ${version}.`);
  const loaders = await fetchJson(`${FABRIC_META_URL}/loader/${encodeURIComponent(version)}`, FABRIC_HOSTS, "Fabric Meta API", signal);
  const installers = await fetchJson(`${FABRIC_META_URL}/installer`, FABRIC_HOSTS, "Fabric Meta API", signal);
  if (!Array.isArray(loaders) || !Array.isArray(installers)) throw new MinecraftError("MINECRAFT_INVALID_METADATA", "Fabric Meta returned invalid loader or installer metadata.");
  const stableLoaders = loaders.filter((item) => item?.loader?.stable === true && typeof item.loader.version === "string" && /^[A-Za-z0-9._+-]{1,64}$/.test(item.loader.version));
  const stableInstaller = installers.find((item) => item?.stable === true && typeof item.version === "string" && /^[A-Za-z0-9._+-]{1,64}$/.test(item.version));
  if (!stableInstaller || stableLoaders.length === 0) throw new MinecraftError("MINECRAFT_EMPTY_CATALOG", `Fabric has no stable loader and installer for Minecraft ${version}.`);
  return stableLoaders.slice(0, 25).map((item) => {
    const loader = item.loader.version;
    const installer = stableInstaller.version;
    const url = `${FABRIC_META_URL}/loader/${encodeURIComponent(version)}/${encodeURIComponent(loader)}/${encodeURIComponent(installer)}/server/jar`;
    return {
      id: `${loader}@${installer}`,
      loaderVersion: loader,
      installerVersion: installer,
      channel: "STABLE",
      name: "fabric-server-launch.jar",
      url: assertFabricDownloadUrl(url).href,
      size: null,
      sha256: null
    };
  });
}
async function searchFabricMods(query, gameVersion, signal) {
  if (typeof query !== "string" || query.trim().length < 2 || query.trim().length > 120) {
    throw new MinecraftError("MINECRAFT_MOD_QUERY_INVALID", "Mod search text must contain 2 to 120 characters.");
  }
  if (typeof gameVersion !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(gameVersion)) {
    throw new MinecraftError("MINECRAFT_INVALID_VERSION", "Choose a Minecraft version before searching for mods.");
  }
  const url = new URL(`${MODRINTH_API_URL}/search`);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("facets", JSON.stringify([["project_type:mod"], [`versions:${gameVersion}`], ["categories:fabric"]]));
  url.searchParams.set("limit", "20");
  const result = await fetchJson(url.href, MODRINTH_API_HOSTS, "Modrinth API", signal);
  if (!result || !Array.isArray(result.hits)) throw new MinecraftError("MINECRAFT_INVALID_METADATA", "Modrinth returned an invalid mod search result.");
  return result.hits.filter((hit) => typeof hit?.project_id === "string" && hit.project_type === "mod").map((hit) => ({
    projectId: hit.project_id,
    slug: typeof hit.slug === "string" ? hit.slug : void 0,
    title: typeof hit.title === "string" ? hit.title : hit.project_id,
    description: typeof hit.description === "string" ? hit.description.slice(0, 400) : "",
    downloads: Number.isSafeInteger(hit.downloads) ? hit.downloads : 0,
    categories: Array.isArray(hit.categories) ? hit.categories.filter((value) => typeof value === "string") : [],
    serverSide: typeof hit.server_side === "string" ? hit.server_side : "unknown",
    gameVersions: Array.isArray(hit.versions) ? hit.versions.filter((value) => typeof value === "string") : [],
    latestVersionId: typeof hit.latest_version === "string" ? hit.latest_version : void 0
  }));
}
async function resolveFabricModVersion({ projectId, versionId, gameVersion, signal }) {
  if (typeof projectId !== "string" || !/^[A-Za-z0-9_-]{2,64}$/.test(projectId)) {
    throw new MinecraftError("MINECRAFT_MOD_ID_INVALID", "The Modrinth project id is invalid.");
  }
  if (versionId !== void 0 && (typeof versionId !== "string" || !/^[A-Za-z0-9_-]{2,64}$/.test(versionId))) {
    throw new MinecraftError("MINECRAFT_MOD_VERSION_INVALID", "The Modrinth version id is invalid.");
  }
  if (typeof gameVersion !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(gameVersion)) {
    throw new MinecraftError("MINECRAFT_INVALID_VERSION", "The instance has an invalid Minecraft version.");
  }
  const project = await fetchJson(`${MODRINTH_API_URL}/project/${encodeURIComponent(projectId)}`, MODRINTH_API_HOSTS, "Modrinth API", signal);
  if (project?.project_type !== "mod" || typeof project.id !== "string" || !/^[A-Za-z0-9_-]{2,64}$/.test(project.id)) {
    throw new MinecraftError("MINECRAFT_MOD_ID_INVALID", "The selected Modrinth project is not a valid mod.");
  }
  const canonicalProjectId = project.id;
  const url = versionId === void 0 ? new URL(`${MODRINTH_API_URL}/project/${encodeURIComponent(canonicalProjectId)}/version`) : new URL(`${MODRINTH_API_URL}/version/${encodeURIComponent(versionId)}`);
  if (versionId === void 0) {
    url.searchParams.set("loaders", JSON.stringify(["fabric"]));
    url.searchParams.set("game_versions", JSON.stringify([gameVersion]));
  }
  const raw = await fetchJson(url.href, MODRINTH_API_HOSTS, "Modrinth API", signal);
  const candidates = Array.isArray(raw) ? raw : [raw];
  const compatible = candidates.filter((version) => version?.project_id === canonicalProjectId && Array.isArray(version.loaders) && version.loaders.includes("fabric") && Array.isArray(version.game_versions) && version.game_versions.includes(gameVersion) && Array.isArray(version.files) && version.files.length > 0);
  const selected = versionId === void 0 ? compatible.find((version) => version.version_type === "release") ?? compatible[0] : compatible[0];
  if (!selected) throw new MinecraftError("MINECRAFT_MOD_VERSION_UNAVAILABLE", `Modrinth has no Fabric mod version compatible with Minecraft ${gameVersion}.`);
  const file = selected.files.find((item) => item?.primary === true) ?? selected.files[0];
  if (!file || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 512 * 1024 * 1024 || typeof file.filename !== "string" || !/^[A-Za-z0-9._+-]{1,200}\.jar$/i.test(file.filename) || !/^[a-f0-9]{128}$/i.test(file.hashes?.sha512 ?? "")) {
    throw new MinecraftError("MINECRAFT_INVALID_METADATA", "Modrinth returned incomplete or unsupported mod file metadata.");
  }
  const download = assertModrinthDownloadUrl(file.url);
  return {
    id: selected.id,
    projectId: canonicalProjectId,
    projectName: typeof selected.name === "string" ? selected.name : projectId,
    versionNumber: typeof selected.version_number === "string" ? selected.version_number : selected.id,
    versionType: typeof selected.version_type === "string" ? selected.version_type : "unknown",
    serverSide: typeof selected.environment?.server === "string" ? selected.environment.server : "unknown",
    file: { name: file.filename, size: file.size, sha512: file.hashes.sha512.toLowerCase(), url: download.href },
    dependencies: Array.isArray(selected.dependencies) ? selected.dependencies.filter((dep) => dep?.dependency_type === "required" && typeof dep.project_id === "string").map((dep) => ({ projectId: dep.project_id, ...typeof dep.version_id === "string" ? { versionId: dep.version_id } : {} })) : []
  };
}
async function requiredJavaVersion(version, signal) {
  const cached = javaCache.get(version);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let entry;
  const manifest = await fetchJson(MOJANG_VERSIONS_URL, MOJANG_HOSTS, "Mojang version manifest", signal);
  entry = manifest.versions?.find((candidate) => candidate.id === version);
  if (!entry) throw new MinecraftError("MINECRAFT_VERSION_METADATA_MISSING", `Mojang metadata for Minecraft ${version} is unavailable.`);
  const details = await fetchJson(entry.url, MOJANG_HOSTS, "Mojang version metadata", signal);
  const majorVersion = details.javaVersion?.majorVersion;
  const required2 = Number.isSafeInteger(majorVersion) && majorVersion > 0 ? majorVersion : legacyPaperJavaRequirement(version);
  if (required2 === void 0) {
    throw new MinecraftError("MINECRAFT_JAVA_REQUIREMENT_UNKNOWN", `Paper's Java requirement for Minecraft ${version} is not available in Mojang metadata.`);
  }
  javaCache.set(version, { expiresAt: Date.now() + CACHE_MS, value: required2 });
  return required2;
}
async function latestTemurinRuntime(major, platform, architecture, signal) {
  if (!Number.isSafeInteger(major) || major < 8 || major > 99) {
    throw new MinecraftError("MINECRAFT_JAVA_REQUIREMENT_UNKNOWN", "The requested Java feature version is invalid.");
  }
  const os = { win32: "windows", darwin: "mac", linux: "linux" }[platform];
  const arch = { x64: "x64", arm64: "aarch64" }[architecture];
  if (!os || !arch) throw new MinecraftError("MINECRAFT_JAVA_PLATFORM_UNSUPPORTED", `Temurin does not support automatic Java installation for ${platform}/${architecture}.`);
  const url = new URL(`${ADOPTIUM_API_URL}/${major}/hotspot`);
  url.search = new URLSearchParams({ architecture: arch, image_type: "jre", os, vendor: "eclipse" }).toString();
  const assets = await fetchJson(url.href, ADOPTIUM_API_HOSTS, "Adoptium release API", signal);
  const asset = Array.isArray(assets) ? assets[0] : void 0;
  const binary = asset?.binary;
  const archive = binary?.package;
  if (asset?.vendor !== "eclipse" || Number(asset?.version?.major) !== major || binary?.project !== "jdk" || binary?.image_type !== "jre" || binary?.os !== os || binary?.architecture !== arch || !archive || typeof archive.name !== "string" || !/^[A-Za-z0-9._+-]+\.(?:zip|tar\.gz)$/.test(archive.name) || !Number.isSafeInteger(archive.size) || archive.size < 1 || !/^[a-f0-9]{64}$/i.test(archive.checksum ?? "")) {
    throw new MinecraftError("MINECRAFT_INVALID_METADATA", "Adoptium returned incomplete Java runtime archive metadata.");
  }
  const download = assertJavaDownloadUrl(archive.link, major);
  return {
    vendor: "Eclipse Temurin",
    imageType: "jre",
    major,
    version: asset?.version?.openjdk_version ?? null,
    architecture: arch,
    platform: os,
    name: archive.name,
    url: download.href,
    size: archive.size,
    sha256: archive.checksum.toLowerCase()
  };
}
function legacyPaperJavaRequirement(version) {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(version);
  if (!match) return void 0;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3] ?? 0);
  if (major >= 26 && minor >= 1) return 25;
  if (major !== 1) return void 0;
  if (minor >= 7 && minor <= 11) return 8;
  if (minor === 12 || minor >= 13 && minor <= 16 && patch < 5) return 11;
  if (minor === 16 && patch === 5) return 16;
  if (minor >= 17 && minor <= 19) return 17;
  if (minor === 20 || minor === 21 && patch <= 11) return 21;
  return void 0;
}
function assertPaperDownloadUrl(value) {
  return assertTrustedUrl(value, PAPER_HOSTS, "PaperMC downloads API");
}
function assertFabricDownloadUrl(value) {
  const url = assertTrustedUrl(value, FABRIC_HOSTS, "Fabric Meta API");
  if (!/^\/v2\/versions\/loader\/[A-Za-z0-9%._+-]+\/[A-Za-z0-9%._+-]+\/[A-Za-z0-9%._+-]+\/server\/jar$/.test(url.pathname)) {
    throw new MinecraftError("MINECRAFT_UNTRUSTED_SOURCE", "Fabric Meta returned an unexpected server artifact path.");
  }
  return url;
}
function assertModrinthDownloadUrl(value) {
  return assertTrustedUrl(value, MODRINTH_CDN_HOSTS, "Modrinth version metadata");
}
async function fetchPaperDownload(value, signal) {
  const source = assertPaperDownloadUrl(value);
  const request = requestSignal(signal);
  let response;
  try {
    response = await fetchAllowedUrl(source.href, PAPER_HOSTS, "PaperMC downloads API", { headers: { "user-agent": USER_AGENT }, signal: request });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", "Paper server download could not be reached.", { cause });
  }
  if (!response.ok || !response.body) throw new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", `Paper server download returned HTTP ${response.status}.`);
  return response;
}
async function fetchFabricDownload(value, signal) {
  const source = assertFabricDownloadUrl(value);
  const request = requestSignal(signal);
  let response;
  try {
    response = await fetchAllowedUrl(source.href, FABRIC_HOSTS, "Fabric Meta API", { headers: { "user-agent": USER_AGENT }, signal: request });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", "Fabric server download could not be reached.", { cause });
  }
  if (!response.ok || !response.body) throw new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", `Fabric server download returned HTTP ${response.status}.`);
  return response;
}
async function fetchModrinthDownload(value, signal) {
  const source = assertModrinthDownloadUrl(value);
  const request = requestSignal(signal);
  let response;
  try {
    response = await fetchAllowedUrl(source.href, MODRINTH_CDN_HOSTS, "Modrinth CDN", { headers: { "user-agent": USER_AGENT }, signal: request });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", "The Modrinth mod file could not be reached.", { cause });
  }
  if (!response.ok || !response.body) throw new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", `Modrinth returned HTTP ${response.status} for a mod file.`);
  return response;
}
function assertJavaDownloadUrl(value, major) {
  let url;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new MinecraftError("MINECRAFT_INVALID_SOURCE", "Adoptium returned an invalid Java download URL.", { cause });
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username !== "" || url.password !== "" || url.hostname !== ADOPTIUM_DOWNLOAD_HOST || !url.pathname.startsWith(`/adoptium/temurin${major}-binaries/releases/download/`)) {
    throw new MinecraftError("MINECRAFT_UNTRUSTED_SOURCE", "Adoptium returned a Java archive outside its official Temurin release repository.");
  }
  return url;
}
async function fetchJavaDownload(value, major, signal) {
  const source = assertJavaDownloadUrl(value, major);
  const request = requestSignal(signal);
  let response;
  let url = source;
  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      response = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: request, redirect: "manual" });
      if (!REDIRECT_STATUSES.has(response.status)) break;
      if (redirects === 3) throw new MinecraftError("MINECRAFT_TOO_MANY_REDIRECTS", "The Java runtime download returned too many redirects.");
      const location = response.headers.get("location");
      if (!location) throw new MinecraftError("MINECRAFT_INVALID_SOURCE", "The Java runtime download redirected without a location.");
      const nextUrl = new URL(location, url);
      if (nextUrl.protocol !== "https:" || nextUrl.port !== "" || nextUrl.username !== "" || nextUrl.password !== "" || (nextUrl.hostname === ADOPTIUM_DOWNLOAD_HOST ? !nextUrl.pathname.startsWith(`/adoptium/temurin${major}-binaries/releases/download/`) : !ADOPTIUM_REDIRECT_HOSTS.has(nextUrl.hostname))) {
        throw new MinecraftError("MINECRAFT_UNTRUSTED_SOURCE", "The Java runtime download redirected to an untrusted URL.");
      }
      await response.body?.cancel().catch(() => {
      });
      url = nextUrl;
    }
  } catch (cause) {
    if (signal?.aborted) throw cause;
    if (cause instanceof MinecraftError) throw cause;
    throw new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", "The Java runtime download could not be reached.", { cause });
  }
  let finalUrl;
  try {
    finalUrl = new URL(response.url);
  } catch (cause) {
    throw new MinecraftError("MINECRAFT_INVALID_SOURCE", "The Java runtime download returned an invalid final URL.", { cause });
  }
  if (finalUrl.protocol !== "https:" || finalUrl.port !== "" || finalUrl.username !== "" || finalUrl.password !== "" || (finalUrl.hostname === ADOPTIUM_DOWNLOAD_HOST ? !finalUrl.pathname.startsWith(`/adoptium/temurin${major}-binaries/releases/download/`) : !ADOPTIUM_REDIRECT_HOSTS.has(finalUrl.hostname))) {
    throw new MinecraftError("MINECRAFT_UNTRUSTED_SOURCE", "The Java runtime download redirected to an untrusted host.");
  }
  if (!response.ok || !response.body) throw new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", `The Java runtime download returned HTTP ${response.status}.`);
  return response;
}

// packages/dsh-lfaa-minecraft/src/tools.mjs
import { defineTool } from "@deepseek-ai/dsh-tools";
import { approveEscalation } from "@deepseek-ai/dsh-sandbox";
var ACTIONS = [
  "list_versions",
  "list_builds",
  "inspect_java",
  "install_java",
  "list_instances",
  "create",
  "install_server",
  "mod_search",
  "mod_install",
  "accept_eula",
  "start",
  "status",
  "console_read",
  "console_send",
  "stop",
  "restart",
  "list_files",
  "read_file",
  "write_file",
  "config_read",
  "config_update",
  "backup_create",
  "backup_list",
  "backup_restore"
];
var APPROVAL_ACTIONS = /* @__PURE__ */ new Set([
  "install_java",
  "create",
  "install_server",
  "mod_install",
  "accept_eula",
  "start",
  "console_send",
  "stop",
  "restart",
  "write_file",
  "config_update",
  "backup_create",
  "backup_restore"
]);
var NEXT_STEPS = {
  MINECRAFT_JAVA_NOT_FOUND: "Call inspect_java for the requested Minecraft version. If it reports requiresInstall, install Java from the official Temurin source into the user-selected dataRoot, then retry server installation.",
  MINECRAFT_JAVA_INCOMPATIBLE: "Call inspect_java for the requested Minecraft version. If no compatible runtime is listed, call install_java and retry server installation with its returned executable.",
  MINECRAFT_EULA_REQUIRED: "Ask the user to review and explicitly accept the Minecraft EULA. Only then call accept_eula with accepted=true.",
  MINECRAFT_NOT_INSTALLED: "List official builds for the selected distribution and version, install the returned stable build, then retry the requested lifecycle action.",
  MINECRAFT_VERSION_UNAVAILABLE: "Call list_versions with the selected distribution and let the user choose a version from that catalog.",
  MINECRAFT_DISK_SPACE_LOW: "Tell the user how much disk space is needed and ask them to choose a dataRoot with enough free space."
};
function resultText(value) {
  return JSON.stringify(value);
}
function errorText(error) {
  const code = typeof error?.code === "string" ? error.code : "MINECRAFT_OPERATION_FAILED";
  const nextStep = NEXT_STEPS[code] ?? "Report the returned error and do not claim the action succeeded. If it came from a denied or cancelled DSH approval, stop without retrying through another tool.";
  return resultText({ error: { code, message: error instanceof Error ? error.message : String(error) }, nextStep });
}
function required(value, name2) {
  if (value === void 0 || value === null || value === "") throw new Error(`${name2} is required for this Minecraft action.`);
  return value;
}
function registerMinecraftTool(ctx, service) {
  ctx.tools.register(defineTool({
    name: "minecraft_server",
    description: "Discover official Paper or Fabric Minecraft versions and server builds, inspect compatible Java runtimes, install a missing Java runtime from official Eclipse Temurin metadata with SHA-256 verification, create and install the selected server, search Modrinth for Minecraft-version-compatible Fabric mods and install a selected mod with required dependencies and SHA-512 verification, manage the server lifecycle, inspect instance files and server.properties, make approved text-configuration changes, and create, list, or restore stopped-instance backups. Decide the next action from each result: inspect Java for the selected Minecraft version first; if no compatible runtime is listed, install Java under the user-selected dataRoot before installing the server. Never invent a dataRoot. Mod installation is currently limited to Fabric mods from Modrinth and requires the server to be stopped. Ask the user to review and explicitly accept the Minecraft EULA before calling accept_eula with accepted=true. DSH permission policy may ask for one-call approval before downloads, file writes, console commands, backup restore, or process lifecycle actions. If an approval is denied or cancelled, stop and explain; never bypass it through another tool. Only Paper and Fabric are currently supported.",
    parameters: {
      action: { type: "string", required: true, enum: ACTIONS, description: "The discovery, installation, or lifecycle action to perform." },
      distribution: { type: "string", enum: ["paper", "fabric"], description: "Minecraft server distribution. Defaults to Paper; currently supported: paper and fabric." },
      dataRoot: { type: "string", description: "Absolute local directory chosen by the user for Minecraft files and downloaded Java runtimes." },
      version: { type: "string", description: "Minecraft version from list_versions." },
      buildId: { type: "string", description: "Optional official stable Paper build id from list_builds." },
      query: { type: "string", description: "Modrinth search text for mod_search, at least 2 characters." },
      projectId: { type: "string", description: "Modrinth project id or slug for mod_install." },
      versionId: { type: "string", description: "Optional exact Modrinth version id for mod_install; omit to choose the latest compatible release." },
      id: { type: "string", description: "Minecraft instance id returned by create or list_instances." },
      name: { type: "string", description: "User-chosen display name for a new Minecraft instance." },
      memoryMb: { type: "number", description: "Maximum server heap in MiB, chosen by the user." },
      port: { type: "number", description: "User-chosen server port from 1 to 65535." },
      javaExecutable: { type: "string", description: "Optional compatible Java executable path returned by inspect_java or install_java." },
      accepted: { type: "boolean", description: "For accept_eula only: true after the user explicitly says they accept the Minecraft EULA." },
      command: { type: "string", description: "One single-line Minecraft server console command." },
      limit: { type: "number", description: "Maximum number of recent console lines to return." },
      path: { type: "string", description: "Instance-relative file or directory path. Never use an absolute path or parent-directory segment." },
      content: { type: "string", description: "UTF-8 text content for write_file, at most 1 MiB." },
      properties: {
        type: "object",
        description: "One to twenty server.properties values. Supported keys include motd, max-players, difficulty, gamemode, pvp, online-mode, white-list, allow-flight, view-distance, simulation-distance, spawn-protection, level-name, and server-port.",
        additionalProperties: { type: "string" }
      },
      backupId: { type: "string", description: "Managed backup ID returned by backup_list." }
    },
    output: {
      schema: { type: "string" },
      render: (_args, value) => [{ type: "text", text: value }]
    },
    async execute(args, exec) {
      try {
        if (APPROVAL_ACTIONS.has(args.action)) {
          const policy = ctx.sandboxPolicy.resolve(exec.agent === void 0 ? {} : { session: exec.agent.session });
          await approveEscalation({
            requestedMode: "danger-full-access",
            effectiveMode: policy.mode,
            subject: "Minecraft server operation",
            justification: `minecraft_server ${args.action} ${JSON.stringify(args)}. This operation may download Java or Paper files, write the selected game-data directory, or run/stop a server process.`
          }, {
            approver: ctx.get("approval"),
            agent: exec.agent,
            callId: exec.callId,
            toolName: "minecraft_server",
            signal: exec.signal
          });
        }
        exec.signal.throwIfAborted();
        let value;
        switch (args.action) {
          case "list_versions":
            value = await service.listVersions(args.distribution ?? "paper", exec.signal);
            break;
          case "list_builds":
            value = await service.listBuilds(required(args.version, "version"), args.distribution ?? "paper", exec.signal);
            break;
          case "inspect_java":
            value = await service.inspectJavaForVersion({ version: required(args.version, "version"), signal: exec.signal });
            break;
          case "install_java":
            value = await service.installJavaForVersion({ dataRoot: required(args.dataRoot, "dataRoot"), version: required(args.version, "version"), signal: exec.signal });
            break;
          case "list_instances":
            value = await service.listInstances({ dataRoot: required(args.dataRoot, "dataRoot"), signal: exec.signal });
            break;
          case "create":
            value = await service.createInstance({
              dataRoot: required(args.dataRoot, "dataRoot"),
              name: required(args.name, "name"),
              version: required(args.version, "version"),
              distribution: args.distribution ?? "paper",
              memoryMb: required(args.memoryMb, "memoryMb"),
              port: required(args.port, "port"),
              signal: exec.signal
            });
            break;
          case "install_server":
            value = await service.install({
              dataRoot: required(args.dataRoot, "dataRoot"),
              id: required(args.id, "id"),
              ...args.buildId === void 0 ? {} : { buildId: args.buildId },
              ...args.javaExecutable === void 0 ? {} : { javaExecutable: args.javaExecutable },
              signal: exec.signal
            });
            break;
          case "mod_search":
            value = await service.searchMods({ query: required(args.query, "query"), version: required(args.version, "version"), distribution: args.distribution ?? "fabric", signal: exec.signal });
            break;
          case "mod_install":
            value = await service.installMod({
              dataRoot: required(args.dataRoot, "dataRoot"),
              id: required(args.id, "id"),
              projectId: required(args.projectId, "projectId"),
              ...args.versionId === void 0 ? {} : { versionId: args.versionId },
              signal: exec.signal
            });
            break;
          case "accept_eula":
            value = await service.acceptEula({
              dataRoot: required(args.dataRoot, "dataRoot"),
              id: required(args.id, "id"),
              accepted: args.accepted,
              signal: exec.signal
            });
            break;
          case "start":
            value = await service.start({
              dataRoot: required(args.dataRoot, "dataRoot"),
              id: required(args.id, "id"),
              ...args.javaExecutable === void 0 ? {} : { javaExecutable: args.javaExecutable },
              signal: exec.signal
            });
            break;
          case "status":
            value = await service.status({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), signal: exec.signal });
            break;
          case "console_read":
            value = await service.readConsole({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), limit: args.limit, signal: exec.signal });
            break;
          case "console_send":
            value = await service.sendConsole({
              dataRoot: required(args.dataRoot, "dataRoot"),
              id: required(args.id, "id"),
              command: required(args.command, "command"),
              signal: exec.signal
            });
            break;
          case "stop":
            value = await service.stop({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), signal: exec.signal });
            break;
          case "restart":
            value = await service.restart({
              dataRoot: required(args.dataRoot, "dataRoot"),
              id: required(args.id, "id"),
              ...args.javaExecutable === void 0 ? {} : { javaExecutable: args.javaExecutable },
              signal: exec.signal
            });
            break;
          case "list_files":
            value = await service.listFiles({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), path: args.path, signal: exec.signal });
            break;
          case "read_file":
            value = await service.readFile({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), path: required(args.path, "path"), signal: exec.signal });
            break;
          case "write_file":
            value = await service.writeFile({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), path: required(args.path, "path"), content: required(args.content, "content"), signal: exec.signal });
            break;
          case "config_read":
            value = await service.readConfig({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), signal: exec.signal });
            break;
          case "config_update":
            value = await service.updateConfig({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), properties: required(args.properties, "properties"), signal: exec.signal });
            break;
          case "backup_create":
            value = await service.createBackup({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), signal: exec.signal });
            break;
          case "backup_list":
            value = await service.listBackups({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), signal: exec.signal });
            break;
          case "backup_restore":
            value = await service.restoreBackup({ dataRoot: required(args.dataRoot, "dataRoot"), id: required(args.id, "id"), backupId: required(args.backupId, "backupId"), signal: exec.signal });
            break;
          default:
            value = { error: { code: "MINECRAFT_ACTION_UNKNOWN", message: "The requested Minecraft action is not supported." } };
        }
        return resultText(value);
      } catch (error) {
        return errorText(error);
      }
    },
    presentCall: (args) => ({ card: "generic", title: "Minecraft server", kind: "other", rawInput: args })
  }));
}

// packages/dsh-lfaa-minecraft/src/index.mjs
var INSTANCE_DIR_NAME = "dsh-lfaa/minecraft/instances";
var READY_PATTERN = /Done \([^\r\n]+\)! For help, type ["']help["']/i;
var MEMORY_MIN_MB = 512;
var MEMORY_MAX_MB = 131072;
var CONSOLE_MAX_CHARS = 2048;
var LOG_MAX_CHARS = 256 * 1024;
var PROCESS_GRACE_MS = 5e3;
var START_TIMEOUT_MS = 18e4;
var STOP_TIMEOUT_MS = 45e3;
var FORCE_STOP_TIMEOUT_MS = 1e4;
var OUTPUT_COLLECT_BYTES = 512 * 1024;
var OUTPUT_SPILL_BYTES = 16 * 1024 * 1024;
var DOWNLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024;
var JAVA_DOWNLOAD_MAX_BYTES = 512 * 1024 * 1024;
var JAVA_EXTRACT_MIN_FREE_BYTES = 512 * 1024 * 1024;
var JAVA_EXTRACTOR_OUTPUT_BYTES = 64 * 1024;
var FABRIC_SERVER_MIN_FREE_BYTES = 512 * 1024 * 1024;
var SERVER_TEXT_FILE_MAX_BYTES = 1024 * 1024;
var BACKUP_TIMEOUT_MS = 30 * 60 * 1e3;
var BACKUP_OUTPUT_BYTES = 64 * 1024;
var BACKUP_INSPECT_OUTPUT_BYTES = 8 * 1024 * 1024;
var SERVER_TEXT_EXTENSIONS = /* @__PURE__ */ new Set([".cfg", ".json", ".properties", ".toml", ".txt", ".yaml", ".yml"]);
var SERVER_PROPERTY_RULES = {
  "allow-flight": (value) => parseBooleanProperty(value),
  difficulty: (value) => ["peaceful", "easy", "normal", "hard"].includes(value),
  "enable-command-block": (value) => parseBooleanProperty(value),
  "enforce-whitelist": (value) => parseBooleanProperty(value),
  gamemode: (value) => ["survival", "creative", "adventure", "spectator"].includes(value),
  "level-name": (value) => /^[A-Za-z0-9._-]{1,64}$/.test(value) && value !== "." && value !== "..",
  "max-players": (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 1e4,
  "motd": (value) => value.length <= 255,
  "online-mode": (value) => parseBooleanProperty(value),
  "pvp": (value) => parseBooleanProperty(value),
  "server-port": (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 65535,
  "simulation-distance": (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 2 && Number(value) <= 32,
  "spawn-protection": (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 1e6,
  "view-distance": (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 2 && Number(value) <= 32,
  "white-list": (value) => parseBooleanProperty(value)
};
function parseBooleanProperty(value) {
  return value === "true" || value === "false";
}
function parseServerProperties(text) {
  const properties = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (key) properties[key] = line.slice(separator + 1).trim();
  }
  return properties;
}
async function measureBackupTree(root, signal) {
  const pending = [root];
  let bytes = 0;
  let files = 0;
  while (pending.length > 0) {
    signal?.throwIfAborted();
    const directory = pending.pop();
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (/[\u0000-\u001f\u007f]/.test(entry.name) || entry.name === "." || entry.name === "..") {
        throw new MinecraftError("MINECRAFT_BACKUP_PATH_INVALID", "A server file name cannot be represented safely in a backup archive.");
      }
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) throw new MinecraftError("MINECRAFT_BACKUP_LINK_REFUSED", "Backups do not follow symbolic links inside a server instance.");
      if (info.isDirectory()) pending.push(path);
      else if (info.isFile()) {
        bytes += info.size;
        files++;
      } else throw new MinecraftError("MINECRAFT_BACKUP_FILE_TYPE_REFUSED", "Backups support only regular files and directories.");
      if (files > 1e6) throw new MinecraftError("MINECRAFT_BACKUP_TOO_LARGE", "The server contains too many files for one managed backup.");
    }
  }
  return { bytes, files };
}
async function sha256File(path, signal) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path, { signal })) hash.update(chunk);
  return hash.digest("hex");
}
async function sha512File(path, signal) {
  const hash = createHash("sha512");
  for await (const chunk of createReadStream(path, { signal })) hash.update(chunk);
  return hash.digest("hex");
}
function requiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MinecraftError("MINECRAFT_INVALID_INPUT", `${field} must be a non-empty string.`);
  }
  return value.trim();
}
function validateName(value) {
  const name2 = requiredString(value, "name");
  if (name2.length > 64 || /[\u0000-\u001f\u007f]/.test(name2)) {
    throw new MinecraftError("MINECRAFT_INVALID_INPUT", "Server name must be 1\u201364 characters and contain no control characters.");
  }
  return name2;
}
function validatePort(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 65535) {
    throw new MinecraftError("MINECRAFT_INVALID_INPUT", "Server port must be an integer from 1 to 65535.");
  }
  return value;
}
function validateMemory(value) {
  if (!Number.isSafeInteger(value) || value < MEMORY_MIN_MB || value > MEMORY_MAX_MB) {
    throw new MinecraftError("MINECRAFT_INVALID_INPUT", `Memory must be an integer from ${MEMORY_MIN_MB} to ${MEMORY_MAX_MB} MB.`);
  }
  return value;
}
function normalizeDataRoot(value) {
  const dataRoot = requiredString(value, "dataRoot");
  if (!isAbsolute(dataRoot)) throw new MinecraftError("MINECRAFT_INVALID_PATH", "Choose an absolute local data directory.");
  return resolve(dataRoot);
}
function isPathWithin(parentPath, candidatePath) {
  const relativePath = relative(parentPath, candidatePath);
  return relativePath === "" || !isAbsolute(relativePath) && relativePath !== ".." && !relativePath.startsWith(`..${sep}`);
}
function instanceRoot(dataRoot) {
  return join(dataRoot, INSTANCE_DIR_NAME);
}
function instanceDirectory(dataRoot, id) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new MinecraftError("MINECRAFT_INVALID_INSTANCE", "The Minecraft instance ID is invalid.");
  }
  return join(instanceRoot(dataRoot), id);
}
function wait(ms, signal) {
  return new Promise((resolvePromise, reject) => {
    signal?.throwIfAborted();
    const timer = setTimeout(() => finish(resolvePromise), ms);
    const onAbort = () => finish(reject, signal.reason ?? new DOMException("Operation aborted.", "AbortError"));
    function finish(settle, value) {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      settle(value);
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
function settledWithin(promise, timeoutMs) {
  return new Promise((resolvePromise) => {
    const timer = setTimeout(() => resolvePromise({ settled: false }), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolvePromise({ settled: true, value });
      },
      (error) => {
        clearTimeout(timer);
        resolvePromise({ settled: true, error });
      }
    );
  });
}
function normalizeJavaVersion(value) {
  const version = String(value ?? "").trim();
  const major = version.startsWith("1.") ? Number(version.slice(2).split(".")[0]) : Number(version.split(".")[0].split("-")[0]);
  return Number.isSafeInteger(major) && major > 0 ? major : void 0;
}
function normalizeArchitecture(value) {
  const arch = String(value ?? "").toLowerCase();
  if (["amd64", "x86_64", "x64"].includes(arch)) return "x64";
  if (["aarch64", "arm64"].includes(arch)) return "arm64";
  if (["x86", "i386", "i486", "i586", "i686", "ia32"].includes(arch)) return "ia32";
  return arch;
}
async function discoverJavaHomes() {
  const executable = process.platform === "win32" ? "java.exe" : "java";
  const homes = [];
  if (process.env.JAVA_HOME) homes.push(process.env.JAVA_HOME);
  const roots = process.platform === "win32" ? [
    process.env.ProgramFiles && join(process.env.ProgramFiles, "Java"),
    process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Java"),
    process.env.ProgramFiles && join(process.env.ProgramFiles, "Eclipse Adoptium"),
    process.env.ProgramFiles && join(process.env.ProgramFiles, "Amazon Corretto"),
    process.env.ProgramFiles && join(process.env.ProgramFiles, "Microsoft"),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs", "Eclipse Adoptium"),
    process.env.USERPROFILE && join(process.env.USERPROFILE, ".jdks")
  ] : process.platform === "darwin" ? ["/Library/Java/JavaVirtualMachines", `${process.env.HOME ?? ""}/.jdks`] : ["/usr/lib/jvm", "/usr/java"];
  const queue = roots.filter(Boolean).map((path) => ({ path, depth: 0 }));
  const seen = /* @__PURE__ */ new Set();
  while (queue.length > 0 && seen.size < 256) {
    const current = queue.shift();
    const key = normalizeComparablePath(current.path);
    if (seen.has(key)) continue;
    seen.add(key);
    const javaPath = join(current.path, "bin", executable);
    try {
      await access(javaPath);
      homes.push(current.path);
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") continue;
    }
    if (current.depth >= 3) continue;
    let entries;
    try {
      entries = await readdir(current.path, { withFileTypes: true });
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR" && error?.code !== "EACCES") continue;
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory() || entry.isSymbolicLink()) queue.push({ path: join(current.path, entry.name), depth: current.depth + 1 });
    }
  }
  return [...new Set(homes.map((home) => join(home, "bin", executable)))];
}
function appendLog(entry, source, text) {
  if (!text) return;
  entry.logs += `[${source}] ${text}`;
  if (!text.endsWith("\n")) entry.logs += "\n";
  if (entry.logs.length > LOG_MAX_CHARS) entry.logs = entry.logs.slice(-LOG_MAX_CHARS);
}
function metadataFromText(text, expectedId, expectedRoot) {
  let record;
  try {
    record = JSON.parse(text);
  } catch (cause) {
    throw new MinecraftError("MINECRAFT_INVALID_INSTANCE_DATA", "The instance metadata file is not valid JSON.", { cause });
  }
  if (!record || record.id !== expectedId || record.dataRoot !== expectedRoot || !["paper", "fabric"].includes(record.distribution)) {
    throw new MinecraftError("MINECRAFT_INVALID_INSTANCE_DATA", "The instance metadata does not match a supported Minecraft instance.");
  }
  return record;
}
async function assertPortAvailable(port, signal) {
  signal?.throwIfAborted();
  const server = createServer();
  try {
    await new Promise((resolvePromise, reject) => {
      server.once("error", reject);
      server.listen({ host: "0.0.0.0", port, exclusive: true }, resolvePromise);
    });
  } catch (cause) {
    throw new MinecraftError("MINECRAFT_PORT_IN_USE", `Port ${port} is unavailable.`, { cause });
  }
  await new Promise((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()));
  signal?.throwIfAborted();
}
async function downloadAndVerify(url, expectedSize, expectedHash, outputPath, signal, {
  fetchArtifact = fetchPaperDownload,
  validateUrl = assertPaperDownloadUrl,
  maxBytes = DOWNLOAD_MAX_BYTES,
  label = "Paper server"
} = {}) {
  validateUrl(url);
  const sizeKnown = Number.isSafeInteger(expectedSize) && expectedSize > 0;
  if (expectedSize !== null && expectedSize !== void 0 && !sizeKnown || sizeKnown && expectedSize > maxBytes) {
    throw new MinecraftError("MINECRAFT_INVALID_METADATA", `${label} metadata contains an unsupported archive size.`);
  }
  if (expectedHash !== null && expectedHash !== void 0 && !/^(?:[a-f0-9]{64}|[a-f0-9]{128})$/i.test(expectedHash)) {
    throw new MinecraftError("MINECRAFT_INVALID_METADATA", `${label} metadata contains an invalid SHA checksum.`);
  }
  const response = await fetchArtifact(url, signal);
  const hashAlgorithm = expectedHash?.length === 128 ? "sha512" : "sha256";
  const hash = createHash(hashAlgorithm);
  let size = 0;
  let prefix = Buffer.alloc(0);
  const digest = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length;
      if (sizeKnown && size > expectedSize || size > maxBytes) {
        callback(new MinecraftError("MINECRAFT_DOWNLOAD_SIZE_MISMATCH", `The downloaded ${label} exceeded its published size.`));
        return;
      }
      if (prefix.length < 4) prefix = Buffer.concat([prefix, chunk.subarray(0, 4 - prefix.length)]);
      hash.update(chunk);
      callback(null, chunk);
    }
  });
  const output = createWriteStream(outputPath, { flags: "wx" });
  try {
    await pipeline(Readable.fromWeb(response.body), digest, output, { signal });
  } catch (cause) {
    output.destroy();
    await rm(outputPath, { force: true });
    if (signal?.aborted) throw cause;
    throw cause instanceof MinecraftError ? cause : new MinecraftError("MINECRAFT_DOWNLOAD_FAILED", `${label} download failed.`, { cause });
  }
  const actualHash = hash.digest("hex");
  if (size === 0 || prefix.length < 4 || prefix[0] !== 80 || prefix[1] !== 75) {
    await rm(outputPath, { force: true });
    throw new MinecraftError("MINECRAFT_ARTIFACT_INVALID", `${label} did not return a valid JAR archive.`);
  }
  if (sizeKnown && size !== expectedSize) {
    await rm(outputPath, { force: true });
    throw new MinecraftError("MINECRAFT_DOWNLOAD_SIZE_MISMATCH", `The ${label} size was ${size} bytes; the published size is ${expectedSize}.`);
  }
  if (expectedHash && actualHash !== expectedHash.toLowerCase()) {
    await rm(outputPath, { force: true });
    throw new MinecraftError("MINECRAFT_CHECKSUM_MISMATCH", `${label} ${hashAlgorithm.toUpperCase()} verification failed.`);
  }
  return { size, [hashAlgorithm]: actualHash };
}
async function findJavaExecutable(rootPath) {
  const executable = process.platform === "win32" ? "java.exe" : "java";
  const queue = [{ path: rootPath, depth: 0 }];
  const seen = /* @__PURE__ */ new Set();
  while (queue.length > 0 && seen.size < 512) {
    const current = queue.shift();
    const key = normalizeComparablePath(current.path);
    if (seen.has(key)) continue;
    seen.add(key);
    const candidate = join(current.path, "bin", executable);
    try {
      await access(candidate);
      return candidate;
    } catch {
    }
    if (current.depth >= 5) continue;
    let entries;
    try {
      entries = await readdir(current.path, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) queue.push({ path: join(current.path, entry.name), depth: current.depth + 1 });
    }
  }
  return void 0;
}
var MinecraftService = class {
  constructor(ctx) {
    this.ctx = ctx;
    this.processes = /* @__PURE__ */ new Map();
    this.operations = /* @__PURE__ */ new Set();
  }
  async withOperation(key, action) {
    if (this.operations.has(key)) throw new MinecraftError("MINECRAFT_OPERATION_IN_PROGRESS", "Another operation is already running for this instance.");
    this.operations.add(key);
    try {
      return await action();
    } finally {
      this.operations.delete(key);
    }
  }
  async localTarget(path, signal) {
    const absolutePath = resolve(path);
    const target = await this.ctx.fs.resolve(absolutePath, { signal });
    const processPath = this.ctx.fs.processPath(target);
    const hostPath = this.ctx.fs.processPathFromHostPath(absolutePath);
    if (!hostPath || normalizeComparablePath(hostPath) !== normalizeComparablePath(processPath)) {
      throw new MinecraftError("MINECRAFT_FILESYSTEM_WORLD_MISMATCH", "The selected data directory is not available to both DSH file and process providers.");
    }
    return { target, processPath };
  }
  async canonicalRoot(dataRoot, signal) {
    const requestedRoot = normalizeDataRoot(dataRoot);
    try {
      await mkdir(requestedRoot, { recursive: true });
      const canonicalDataRoot = await realpath(requestedRoot);
      const rawRoot = instanceRoot(requestedRoot);
      await mkdir(rawRoot, { recursive: true });
      const canonicalInstances = await realpath(rawRoot);
      if (!isPathWithin(canonicalDataRoot, canonicalInstances)) {
        throw new MinecraftError("MINECRAFT_INVALID_PATH", "The instance directory resolved outside the selected data root.");
      }
      const { target, processPath } = await this.localTarget(canonicalInstances, signal);
      if (normalizeComparablePath(processPath) !== normalizeComparablePath(canonicalInstances)) {
        throw new MinecraftError("MINECRAFT_FILESYSTEM_WORLD_MISMATCH", "DSH providers resolved the selected data directory to different locations.");
      }
      return { dataRoot: resolve(requestedRoot), instancesPath: canonicalInstances, instancesTarget: target };
    } catch (error) {
      if (error instanceof MinecraftError) throw error;
      throw new MinecraftError("MINECRAFT_DATA_ROOT_UNAVAILABLE", "The selected data directory is not writable or cannot be opened.", { cause: error });
    }
  }
  async canonicalRuntimeRoot(dataRoot, signal) {
    const requestedRoot = normalizeDataRoot(dataRoot);
    try {
      await mkdir(requestedRoot, { recursive: true });
      const canonicalDataRoot = await realpath(requestedRoot);
      const rawRoot = join(canonicalDataRoot, "dsh-lfaa", "minecraft", "runtimes");
      await mkdir(rawRoot, { recursive: true });
      const canonical = await realpath(rawRoot);
      if (!isPathWithin(canonicalDataRoot, canonical)) {
        throw new MinecraftError("MINECRAFT_INVALID_PATH", "The Java runtime directory resolved outside the selected data root.");
      }
      const { target, processPath } = await this.localTarget(canonical, signal);
      if (normalizeComparablePath(processPath) !== normalizeComparablePath(canonical)) {
        throw new MinecraftError("MINECRAFT_FILESYSTEM_WORLD_MISMATCH", "DSH providers resolved the Java runtime directory to different locations.");
      }
      return { dataRoot: requestedRoot, runtimePath: canonical, runtimeTarget: target };
    } catch (error) {
      if (error instanceof MinecraftError) throw error;
      throw new MinecraftError("MINECRAFT_DATA_ROOT_UNAVAILABLE", "The selected runtime directory is not writable or cannot be opened.", { cause: error });
    }
  }
  async writeRecord(record, signal) {
    const path = join(record.instancePath, "dsh-lfaa.json");
    const { target } = await this.localTarget(path, signal);
    await this.ctx.fs.writeText(target, `${JSON.stringify(record, null, 2)}
`, void 0, signal);
  }
  async readRecord(dataRoot, id, signal) {
    const canonical = await this.canonicalRoot(dataRoot, signal);
    const dir = instanceDirectory(canonical.dataRoot, id);
    const instanceTarget = await this.ctx.fs.resolve(dir, { signal });
    if (!this.ctx.fs.contains(canonical.instancesTarget, instanceTarget)) {
      throw new MinecraftError("MINECRAFT_INVALID_INSTANCE", "The instance is outside the selected data root.");
    }
    const info = await this.ctx.fs.stat(instanceTarget, signal);
    if (!info || info.type !== "directory") throw new MinecraftError("MINECRAFT_INSTANCE_NOT_FOUND", `Minecraft instance ${id} was not found.`);
    const metadataTarget = await this.ctx.fs.resolve(join(dir, "dsh-lfaa.json"), { signal });
    const metadataInfo = await this.ctx.fs.stat(metadataTarget, signal);
    if (!metadataInfo || metadataInfo.type !== "file") throw new MinecraftError("MINECRAFT_INSTANCE_NOT_FOUND", `Metadata for Minecraft instance ${id} was not found.`);
    const text = await this.ctx.fs.readText(metadataTarget, signal);
    const record = metadataFromText(text, id, canonical.dataRoot);
    record.instancePath = dir;
    return record;
  }
  /** List stable Minecraft versions advertised by a supported server distribution. */
  async listVersions(distribution = "paper", signal) {
    if (distribution === "paper") return (await listPaperVersions(signal)).map((version) => ({ version, distribution, stable: true }));
    if (distribution === "fabric") return (await listFabricVersions(signal)).map((item) => ({ ...item, distribution }));
    throw new MinecraftError("MINECRAFT_DISTRIBUTION_UNAVAILABLE", `The ${distribution} server distribution is not supported yet.`);
  }
  /** List official stable server builds for one selected distribution and Minecraft version. */
  listBuilds(version, distribution = "paper", signal) {
    if (distribution === "paper") return listPaperBuilds(version, signal);
    if (distribution === "fabric") return listFabricBuilds(version, signal);
    throw new MinecraftError("MINECRAFT_DISTRIBUTION_UNAVAILABLE", `The ${distribution} server distribution is not supported yet.`);
  }
  /** Search server-side-compatible Fabric mods for one live Minecraft version in Modrinth. */
  searchMods({ query, version, distribution = "fabric", signal }) {
    if (distribution !== "fabric") throw new MinecraftError("MINECRAFT_MOD_LOADER_UNSUPPORTED", "Modrinth Fabric mod installation is currently supported only for Fabric instances.");
    return searchFabricMods(query, version, signal);
  }
  /** Inspect one already installed Java executable through DSH's managed subprocess seam. */
  async inspectJava({ executable = "java", requiredMajor, signal } = {}) {
    const resolved = await this.resolveJava(executable, signal);
    const handle = this.ctx.subprocess.spawn({
      argv: [resolved, "-XshowSettings:properties", "-version"],
      cwd: process.cwd(),
      stdio: { stdin: "ignore", stdout: { maxBytes: 16 * 1024 }, stderr: { maxBytes: 16 * 1024 } },
      graceMs: PROCESS_GRACE_MS,
      signal
    });
    const outcome = await handle.done;
    const output = `${handle.collected.stdout?.readFrom(0).text ?? ""}
${handle.collected.stderr?.readFrom(0).text ?? ""}`;
    if (outcome.exitCode !== 0) throw new MinecraftError("MINECRAFT_JAVA_CHECK_FAILED", "Java could not report its runtime version.");
    const versionText = /java\.specification\.version\s*=\s*([^\s]+)/i.exec(output)?.[1] ?? /(?:openjdk|java) version\s+"([^"]+)"/i.exec(output)?.[1];
    const major = normalizeJavaVersion(versionText);
    if (!major) throw new MinecraftError("MINECRAFT_JAVA_VERSION_UNKNOWN", "The selected Java executable did not report a recognizable version.");
    const architecture = normalizeArchitecture(/os\.arch\s*=\s*([^\s]+)/i.exec(output)?.[1] ?? process.arch);
    const required2 = requiredMajor === void 0 ? void 0 : Number(requiredMajor);
    return {
      executable: resolved,
      version: versionText,
      major,
      architecture,
      platform: process.platform,
      compatible: required2 === void 0 || major === required2,
      requiredMajor: required2
    };
  }
  async resolveJava(executable, signal) {
    try {
      return await this.ctx.subprocess.resolveExecutable(executable, void 0, signal);
    } catch (cause) {
      if (executable !== "java") {
        throw new MinecraftError("MINECRAFT_JAVA_NOT_FOUND", `Java executable ${executable} could not be resolved.`, { cause });
      }
    }
    let lastError;
    for (const candidate of await discoverJavaHomes()) {
      signal?.throwIfAborted();
      try {
        return await this.ctx.subprocess.resolveExecutable(candidate, void 0, signal);
      } catch (error) {
        lastError = error;
      }
    }
    throw new MinecraftError("MINECRAFT_JAVA_NOT_FOUND", "Java was not found on PATH, JAVA_HOME, or the common installation directories.", { cause: lastError });
  }
  /** Inspect every discoverable Java installation and resolve the version required by one Paper release. */
  async inspectJavaForVersion({ version, signal }) {
    const minecraftVersion = requiredString(version, "version");
    const requiredMajor = await requiredJavaVersion(minecraftVersion, signal);
    const executableName = process.platform === "win32" ? "java.exe" : "java";
    const candidates = [];
    try {
      candidates.push(await this.ctx.subprocess.resolveExecutable(executableName, void 0, signal));
    } catch {
    }
    for (const candidate of await discoverJavaHomes()) {
      signal?.throwIfAborted();
      try {
        candidates.push(await this.ctx.subprocess.resolveExecutable(candidate, void 0, signal));
      } catch {
      }
    }
    const unique = [...new Set(candidates.map((candidate) => normalizeComparablePath(candidate)))].slice(0, 32);
    const runtimes = [];
    for (const candidate of unique) {
      signal?.throwIfAborted();
      try {
        runtimes.push(await this.inspectJava({ executable: candidate, requiredMajor, signal }));
      } catch {
      }
    }
    runtimes.sort((left, right) => Number(right.compatible) - Number(left.compatible) || left.major - right.major);
    const compatible = runtimes.filter((runtime) => runtime.compatible);
    return {
      minecraftVersion,
      requiredMajor,
      platform: process.platform,
      architecture: normalizeArchitecture(process.arch),
      runtimes,
      compatible: compatible[0] ?? null,
      requiresInstall: compatible.length === 0,
      installSource: "Eclipse Temurin JRE (official Adoptium API; SHA-256 verified)"
    };
  }
  /** Install a checksum-verified Temurin JRE into the selected data root when no compatible Java exists. */
  async installJavaForVersion({ dataRoot, version, signal }) {
    const requestedRoot = normalizeDataRoot(dataRoot);
    const minecraftVersion = requiredString(version, "version");
    const requiredMajor = await requiredJavaVersion(minecraftVersion, signal);
    const operationKey = `runtime:${normalizeComparablePath(requestedRoot)}:${requiredMajor}`;
    return this.withOperation(operationKey, async () => {
      const inspection = await this.inspectJavaForVersion({ version: minecraftVersion, signal });
      if (inspection.compatible) {
        return { installed: false, reused: true, runtime: inspection.compatible, requiredMajor, minecraftVersion };
      }
      const artifact = await latestTemurinRuntime(requiredMajor, process.platform, normalizeArchitecture(process.arch), signal);
      const canonical = await this.canonicalRuntimeRoot(requestedRoot, signal);
      const filesystem = await statfs(canonical.runtimePath);
      const freeBytes = filesystem.bavail * filesystem.bsize;
      const requiredSpace = Math.max(artifact.size * 5, JAVA_EXTRACT_MIN_FREE_BYTES);
      if (freeBytes < requiredSpace) throw new MinecraftError("MINECRAFT_DISK_SPACE_LOW", "There is not enough free disk space to download and extract the Java runtime.");
      const finalPath = join(canonical.runtimePath, `temurin-jre-${requiredMajor}-${artifact.architecture}-${artifact.sha256.slice(0, 12)}`);
      let existingRuntimePath;
      try {
        existingRuntimePath = await realpath(finalPath);
      } catch (error) {
        if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
      }
      if (existingRuntimePath) {
        if (!isPathWithin(canonical.runtimePath, existingRuntimePath)) {
          throw new MinecraftError("MINECRAFT_INVALID_PATH", "The Java runtime destination resolves outside the selected data root.");
        }
        const finalExecutable = await findJavaExecutable(existingRuntimePath);
        if (finalExecutable) {
          const runtime = await this.inspectJava({ executable: finalExecutable, requiredMajor, signal });
          if (runtime.compatible) return { installed: false, reused: true, runtime, requiredMajor, minecraftVersion, sha256: artifact.sha256 };
        }
        throw new MinecraftError("MINECRAFT_RUNTIME_EXISTS_INVALID", "A runtime directory for this official Java release exists but did not pass compatibility checks.");
      }
      const stagePath = join(canonical.runtimePath, `.install-${randomUUID()}`);
      const extractionPath = join(stagePath, "unpacked");
      const archivePath = join(stagePath, artifact.name);
      try {
        await mkdir(extractionPath, { recursive: true });
        const { processPath: archiveProcessPath } = await this.localTarget(archivePath, signal);
        await downloadAndVerify(artifact.url, artifact.size, artifact.sha256, archiveProcessPath, signal, {
          fetchArtifact: (url, requestSignal2) => fetchJavaDownload(url, requiredMajor, requestSignal2),
          validateUrl: (url) => assertJavaDownloadUrl(url, requiredMajor),
          maxBytes: JAVA_DOWNLOAD_MAX_BYTES,
          label: "Temurin Java runtime"
        });
        const { processPath: extractionProcessPath } = await this.localTarget(extractionPath, signal);
        let extractor;
        try {
          extractor = await this.ctx.subprocess.resolveExecutable(process.platform === "win32" ? "tar.exe" : "tar", void 0, signal);
        } catch (cause) {
          throw new MinecraftError("MINECRAFT_ARCHIVER_NOT_FOUND", "A system tar extractor is required to unpack the verified Java runtime.", { cause });
        }
        const extract = this.ctx.subprocess.spawn({
          argv: [extractor, "-xf", archiveProcessPath, "-C", extractionProcessPath],
          cwd: extractionProcessPath,
          stdio: { stdin: "ignore", stdout: { maxBytes: JAVA_EXTRACTOR_OUTPUT_BYTES }, stderr: { maxBytes: JAVA_EXTRACTOR_OUTPUT_BYTES } },
          graceMs: PROCESS_GRACE_MS,
          signal
        });
        const extractionResult = await settledWithin(extract.done, START_TIMEOUT_MS);
        if (!extractionResult.settled) {
          extract.terminate();
          await settledWithin(extract.done, FORCE_STOP_TIMEOUT_MS);
          throw new MinecraftError("MINECRAFT_RUNTIME_EXTRACT_TIMEOUT", "The Java runtime archive did not finish extracting in time.");
        }
        if (extractionResult.error || extractionResult.value.exitCode !== 0) {
          const output = `${extract.collected.stderr?.readFrom(0).text ?? ""}
${extract.collected.stdout?.readFrom(0).text ?? ""}`.trim();
          throw new MinecraftError("MINECRAFT_RUNTIME_EXTRACT_FAILED", `The Java runtime archive could not be extracted.${output ? ` ${output.slice(-2e3)}` : ""}`, { cause: extractionResult.error });
        }
        const unpackedJava = await findJavaExecutable(extractionProcessPath);
        if (!unpackedJava) throw new MinecraftError("MINECRAFT_RUNTIME_INVALID", "The official Java archive did not contain a Java executable.");
        const javaHome = dirname(dirname(unpackedJava));
        const relativeHome = relative(extractionProcessPath, javaHome);
        if (!relativeHome || relativeHome === ".." || relativeHome.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(relativeHome)) {
          throw new MinecraftError("MINECRAFT_RUNTIME_INVALID", "The Java executable resolved outside the extraction directory.");
        }
        const unpackedRuntime = await this.inspectJava({ executable: unpackedJava, requiredMajor, signal });
        if (!unpackedRuntime.compatible) throw new MinecraftError("MINECRAFT_RUNTIME_INCOMPATIBLE", `The downloaded Temurin runtime is Java ${unpackedRuntime.major}; Paper ${minecraftVersion} recommends Java ${requiredMajor}.`);
        const { processPath: finalProcessPath } = await this.localTarget(finalPath, signal);
        await rename(javaHome, finalProcessPath);
        const executable = join(finalPath, "bin", process.platform === "win32" ? "java.exe" : "java");
        const runtime = await this.inspectJava({ executable, requiredMajor, signal });
        return {
          installed: true,
          reused: false,
          source: artifact.vendor,
          archive: artifact.name,
          sha256: artifact.sha256,
          runtime,
          requiredMajor,
          minecraftVersion,
          path: finalPath
        };
      } catch (error) {
        throw error instanceof MinecraftError ? error : new MinecraftError("MINECRAFT_JAVA_INSTALL_FAILED", "The Java runtime could not be installed.", { cause: error });
      } finally {
        await rm(stagePath, { recursive: true, force: true }).catch(() => {
        });
      }
    });
  }
  /** Create an empty Paper or Fabric instance after validating its runtime settings. */
  async createInstance({ dataRoot, name: name2, version, distribution = "paper", memoryMb, port, signal }) {
    if (!["paper", "fabric"].includes(distribution)) throw new MinecraftError("MINECRAFT_DISTRIBUTION_UNAVAILABLE", `The ${distribution} server distribution is not supported yet.`);
    const serverName = validateName(name2);
    const minecraftVersion = requiredString(version, "version");
    validateMemory(memoryMb);
    validatePort(port);
    if (memoryMb * 1024 * 1024 > totalmem()) {
      throw new MinecraftError("MINECRAFT_MEMORY_EXCEEDS_SYSTEM", "The requested server memory exceeds the physical memory installed on this computer.");
    }
    const versions = await this.listVersions(distribution, signal);
    if (!versions.some((item) => item.version === minecraftVersion)) throw new MinecraftError("MINECRAFT_VERSION_UNAVAILABLE", `${distribution} does not publish Minecraft ${minecraftVersion}.`);
    await assertPortAvailable(port, signal);
    const canonical = await this.canonicalRoot(dataRoot, signal);
    const id = randomUUID();
    const dir = join(canonical.instancesPath, id);
    try {
      await mkdir(dir, { recursive: false });
      const { target: directoryTarget } = await this.localTarget(dir, signal);
      if (!this.ctx.fs.contains(canonical.instancesTarget, directoryTarget)) {
        throw new MinecraftError("MINECRAFT_INVALID_PATH", "The instance directory escaped the selected data root.");
      }
      const record = {
        schemaVersion: 1,
        id,
        name: serverName,
        distribution,
        minecraftVersion,
        dataRoot: canonical.dataRoot,
        instancePath: dir,
        memoryMb,
        port,
        installState: "pending",
        buildId: null,
        buildNumber: null,
        loaderVersion: null,
        installerVersion: null,
        jarSha256: null,
        javaExecutable: "java",
        javaMajor: null,
        eulaAcceptedAt: null,
        state: "stopped",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastExit: null,
        lastError: null
      };
      const { target: eulaTarget } = await this.localTarget(join(dir, "eula.txt"), signal);
      await this.ctx.fs.writeText(eulaTarget, "# Review the Minecraft EULA before accepting it.\neula=false\n", { kind: "createIfAbsent" }, signal);
      const { target: propertiesTarget } = await this.localTarget(join(dir, "server.properties"), signal);
      await this.ctx.fs.writeText(propertiesTarget, `server-port=${port}
`, { kind: "createIfAbsent" }, signal);
      await this.writeRecord(record, signal);
      return publicInstance(record);
    } catch (error) {
      await rm(dir, { recursive: true, force: true }).catch(() => {
      });
      throw error instanceof MinecraftError ? error : new MinecraftError("MINECRAFT_INSTANCE_CREATE_FAILED", "The Minecraft instance could not be created.", { cause: error });
    }
  }
  /** Download the official Paper build or Fabric server bootstrap selected for this instance. */
  async install({ dataRoot, id, buildId, javaExecutable, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      if (this.processes.has(key)) throw new MinecraftError("MINECRAFT_SERVER_RUNNING", "Stop the server before installing or replacing its server file.");
      const isFabric = record.distribution === "fabric";
      const builds = await this.listBuilds(record.minecraftVersion, record.distribution, signal);
      const build = buildId === void 0 ? builds[0] : builds.find((item) => String(item.id) === String(buildId));
      if (!build) throw new MinecraftError("MINECRAFT_BUILD_UNAVAILABLE", `No stable ${record.distribution} build matches the selected version and build.`);
      if (record.installState === "installed") throw new MinecraftError("MINECRAFT_ALREADY_INSTALLED", "This instance already has an installed server build. Create a separate instance to install another build.");
      const requiredMajor = await requiredJavaVersion(record.minecraftVersion, signal);
      const java = await this.inspectJava({ executable: javaExecutable ?? record.javaExecutable, requiredMajor, signal });
      if (!java.compatible) {
        throw new MinecraftError("MINECRAFT_JAVA_INCOMPATIBLE", `${record.distribution} ${record.minecraftVersion} requires Java ${requiredMajor}; Java ${java.major} was found.`);
      }
      const filesystem = await statfs(record.instancePath);
      const freeBytes = filesystem.bavail * filesystem.bsize;
      if (freeBytes < (build.size ?? FABRIC_SERVER_MIN_FREE_BYTES)) throw new MinecraftError("MINECRAFT_DISK_SPACE_LOW", `There is not enough free disk space for the ${record.distribution} server file.`);
      record.installState = "installing";
      record.lastError = null;
      await this.writeRecord(record, signal);
      const partialPath = join(record.instancePath, "server.jar.part");
      await rm(partialPath, { force: true });
      try {
        const { processPath } = await this.localTarget(partialPath, signal);
        const artifact = await downloadAndVerify(build.url, build.size, build.sha256, processPath, signal, isFabric ? {
          fetchArtifact: fetchFabricDownload,
          validateUrl: assertFabricDownloadUrl,
          label: "Fabric server bootstrap",
          maxBytes: 512 * 1024 * 1024
        } : {});
        const targetFinal = join(record.instancePath, "server.jar");
        const temporary = await this.localTarget(processPath, signal);
        const final = await this.localTarget(targetFinal, signal);
        await rename(temporary.processPath, final.processPath);
        record.installState = "installed";
        record.buildId = build.id;
        record.buildNumber = build.number ?? build.id;
        record.loaderVersion = build.loaderVersion ?? null;
        record.installerVersion = build.installerVersion ?? null;
        record.jarSha256 = artifact.sha256;
        record.javaExecutable = java.executable;
        record.javaMajor = java.major;
        record.state = "stopped";
        await this.writeRecord(record, signal);
        return { instance: publicInstance(record), build, java, size: artifact.size, sha256: artifact.sha256 };
      } catch (error) {
        await rm(partialPath, { force: true });
        record.installState = "failed";
        record.lastError = error instanceof Error ? error.message : String(error);
        await this.writeRecord(record).catch(() => {
        });
        throw error instanceof MinecraftError ? error : new MinecraftError("MINECRAFT_INSTALL_FAILED", `The ${record.distribution} server file could not be installed.`, { cause: error });
      }
    });
  }
  /** Install a compatible Modrinth Fabric mod and its required dependencies into a stopped server. */
  async installMod({ dataRoot, id, projectId, versionId, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      if (record.distribution !== "fabric") throw new MinecraftError("MINECRAFT_MOD_LOADER_UNSUPPORTED", "Install server mods only into a Fabric instance.");
      if (this.processes.has(key)) throw new MinecraftError("MINECRAFT_SERVER_RUNNING", "Stop the Fabric server before installing mods.");
      if (record.installState !== "installed") throw new MinecraftError("MINECRAFT_NOT_INSTALLED", "Install the Fabric server before adding mods.");
      const installing = /* @__PURE__ */ new Set();
      const completed = /* @__PURE__ */ new Map();
      const installed = [];
      const installVersion = async (dependencyProjectId, dependencyVersionId, depth) => {
        signal?.throwIfAborted();
        if (depth > 8 || completed.size >= 32) throw new MinecraftError("MINECRAFT_MOD_DEPENDENCY_LIMIT", "The mod dependency graph exceeded its safe installation limit.");
        if (completed.has(dependencyProjectId)) return completed.get(dependencyProjectId);
        if (installing.has(dependencyProjectId)) throw new MinecraftError("MINECRAFT_MOD_DEPENDENCY_CYCLE", "The required mod dependency graph contains a cycle.");
        installing.add(dependencyProjectId);
        try {
          const mod = await resolveFabricModVersion({
            projectId: dependencyProjectId,
            ...dependencyVersionId === void 0 ? {} : { versionId: dependencyVersionId },
            gameVersion: record.minecraftVersion,
            signal
          });
          if (mod.serverSide === "unsupported") throw new MinecraftError("MINECRAFT_MOD_CLIENT_ONLY", `${mod.projectName} is not marked as compatible with dedicated servers.`);
          for (const dependency of mod.dependencies) await installVersion(dependency.projectId, dependency.versionId, depth + 1);
          const instanceRootPath = await realpath(record.instancePath);
          const modsDirectory = join(instanceRootPath, "mods");
          await mkdir(modsDirectory, { recursive: true });
          const modsInfo = await lstat(modsDirectory);
          if (!modsInfo.isDirectory() || modsInfo.isSymbolicLink()) throw new MinecraftError("MINECRAFT_MOD_PATH_INVALID", "The instance mods folder must be a regular directory.");
          const canonicalModsDirectory = await realpath(modsDirectory);
          if (!isPathWithin(instanceRootPath, canonicalModsDirectory)) throw new MinecraftError("MINECRAFT_MOD_PATH_INVALID", "The mods folder resolves outside the instance.");
          const finalPath = join(canonicalModsDirectory, mod.file.name);
          let existing;
          try {
            existing = await lstat(finalPath);
          } catch (error) {
            if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
          }
          if (existing) {
            if (!existing.isFile() || existing.isSymbolicLink()) throw new MinecraftError("MINECRAFT_MOD_FILE_CONFLICT", `A non-file already occupies ${mod.file.name}.`);
            if (await sha512File(finalPath, signal) !== mod.file.sha512) throw new MinecraftError("MINECRAFT_MOD_FILE_CONFLICT", `${mod.file.name} already exists with different contents; remove or rename it before installing this mod.`);
            const reused = { projectId: mod.projectId, name: mod.projectName, version: mod.versionNumber, file: mod.file.name, sha512: mod.file.sha512, reused: true };
            completed.set(dependencyProjectId, reused);
            installed.push(reused);
            return reused;
          }
          const filesystem = await statfs(canonicalModsDirectory);
          if (filesystem.bavail * filesystem.bsize < mod.file.size) throw new MinecraftError("MINECRAFT_DISK_SPACE_LOW", `There is not enough disk space for ${mod.file.name}.`);
          const partialPath = join(canonicalModsDirectory, `.${randomUUID()}.part`);
          const temporary = await this.localTarget(partialPath, signal);
          let artifact;
          try {
            artifact = await downloadAndVerify(mod.file.url, mod.file.size, mod.file.sha512, temporary.processPath, signal, {
              fetchArtifact: fetchModrinthDownload,
              validateUrl: assertModrinthDownloadUrl,
              maxBytes: 512 * 1024 * 1024,
              label: `Modrinth mod ${mod.file.name}`
            });
            const current = await this.localTarget(finalPath, signal);
            let raced;
            try {
              raced = await lstat(finalPath);
            } catch (error) {
              if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
            }
            if (raced) throw new MinecraftError("MINECRAFT_MOD_FILE_CONFLICT", `${mod.file.name} appeared during the download and was not overwritten.`);
            await rename(temporary.processPath, current.processPath);
          } catch (error) {
            await rm(temporary.processPath, { force: true });
            throw error;
          }
          const result = { projectId: mod.projectId, name: mod.projectName, version: mod.versionNumber, file: mod.file.name, sha512: artifact.sha512, reused: false };
          completed.set(dependencyProjectId, result);
          installed.push(result);
          record.installedMods ??= [];
          record.installedMods = record.installedMods.filter((item) => item.projectId !== mod.projectId);
          record.installedMods.push({ ...result, installedAt: (/* @__PURE__ */ new Date()).toISOString() });
          await this.writeRecord(record, signal);
          return result;
        } finally {
          installing.delete(dependencyProjectId);
        }
      };
      const root = await installVersion(projectId, versionId, 0);
      return { instance: publicInstance(record), installed, root };
    });
  }
  /** Record the user's explicit Minecraft EULA acceptance; installation never accepts it. */
  async acceptEula({ dataRoot, id, accepted, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      if (accepted !== true) throw new MinecraftError("MINECRAFT_EULA_REQUIRED", "The Minecraft EULA must be explicitly accepted before enabling the server.");
      const record = await this.readRecord(dataRoot, id, signal);
      const target = await this.localTarget(join(record.instancePath, "eula.txt"), signal);
      await this.ctx.fs.writeText(target.target, "# Accepted explicitly by the user.\neula=true\n", void 0, signal);
      record.eulaAcceptedAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.writeRecord(record, signal);
      return publicInstance(record);
    });
  }
  async readEula(record, signal) {
    if (!record.eulaAcceptedAt) return false;
    const { target } = await this.localTarget(join(record.instancePath, "eula.txt"), signal);
    const text = await this.ctx.fs.readText(target, signal);
    return /^\s*eula\s*=\s*true\s*$/im.test(text);
  }
  async startInternal(record, javaExecutable, signal) {
    if (record.installState !== "installed" || !record.jarSha256) throw new MinecraftError("MINECRAFT_NOT_INSTALLED", `Install and verify the ${record.distribution} server before starting it.`);
    if (!await this.readEula(record, signal)) throw new MinecraftError("MINECRAFT_EULA_REQUIRED", "Review and explicitly accept the Minecraft EULA before starting this server.");
    const java = await this.inspectJava({ executable: javaExecutable ?? record.javaExecutable, requiredMajor: record.javaMajor, signal });
    if (!java.compatible) throw new MinecraftError("MINECRAFT_JAVA_INCOMPATIBLE", `This instance uses Java ${record.javaMajor}; Java ${java.major} was found.`);
    await assertPortAvailable(record.port, signal);
    const jarPath = join(record.instancePath, "server.jar");
    const jarTarget = await this.localTarget(jarPath, signal);
    const jarInfo = await this.ctx.fs.stat(jarTarget.target, signal);
    if (!jarInfo || jarInfo.type !== "file") throw new MinecraftError("MINECRAFT_SERVER_FILE_MISSING", "The installed server file is missing.");
    if (await sha256File(jarTarget.processPath, signal) !== record.jarSha256) throw new MinecraftError("MINECRAFT_CHECKSUM_MISMATCH", "The installed server JAR changed after it was installed.");
    record.javaExecutable = java.executable;
    record.state = "starting";
    record.lastError = null;
    await this.writeRecord(record, signal);
    const directory = await this.localTarget(record.instancePath, signal);
    const handle = this.ctx.subprocess.spawn({
      argv: [java.executable, `-Xmx${record.memoryMb}M`, "-jar", jarTarget.processPath, "nogui"],
      cwd: directory.processPath,
      stdio: {
        stdin: "pipe",
        stdout: { maxBytes: OUTPUT_COLLECT_BYTES, spill: { maxBytes: OUTPUT_SPILL_BYTES } },
        stderr: { maxBytes: OUTPUT_COLLECT_BYTES, spill: { maxBytes: OUTPUT_SPILL_BYTES } }
      },
      graceMs: PROCESS_GRACE_MS,
      signal
    });
    const entry = {
      key: `${record.dataRoot}:${record.id}`,
      instance: record,
      handle,
      state: "starting",
      logs: "",
      offsets: { stdout: 0, stderr: 0 },
      stoppedByRequest: false,
      outcome: void 0,
      failure: void 0,
      closed: void 0,
      writeTail: Promise.resolve()
    };
    entry.closed = handle.done.then(
      (outcome) => {
        entry.outcome = outcome;
        return { outcome };
      },
      (error) => {
        entry.failure = error;
        return { error };
      }
    );
    this.processes.set(entry.key, entry);
    const deadline = Date.now() + START_TIMEOUT_MS;
    try {
      while (Date.now() < deadline) {
        signal?.throwIfAborted();
        this.drain(entry);
        if (READY_PATTERN.test(entry.logs)) {
          entry.state = "running";
          record.state = "running";
          record.lastError = null;
          await this.writeRecord(record, signal);
          return { instance: publicInstance(record), status: "running", console: this.consoleTail(entry.logs, 80) };
        }
        if (entry.outcome || entry.failure) {
          const reason = entry.failure?.message ?? `Java exited with code ${entry.outcome?.exitCode}.`;
          throw new MinecraftError("MINECRAFT_START_FAILED", `${record.distribution} exited before reporting ready. ${reason}`);
        }
        await wait(150, signal);
      }
      throw new MinecraftError("MINECRAFT_START_TIMEOUT", `${record.distribution} did not report ready before the startup deadline.`);
    } catch (error) {
      if (!entry.outcome && !entry.failure) {
        handle.terminate();
        await settledWithin(entry.closed, FORCE_STOP_TIMEOUT_MS);
      }
      this.drain(entry);
      entry.state = "failed";
      record.state = "failed";
      record.lastError = error instanceof Error ? error.message : String(error);
      record.lastExit = entry.outcome ?? null;
      await this.writeRecord(record).catch(() => {
      });
      this.processes.delete(entry.key);
      throw error;
    }
  }
  /** Start Paper and wait for its real server-ready log line. */
  async start({ dataRoot, id, javaExecutable, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      const current = this.processes.get(key);
      if (current && !current.outcome && !current.failure) throw new MinecraftError("MINECRAFT_SERVER_RUNNING", "This Minecraft instance already has a managed process.");
      return this.startInternal(record, javaExecutable, signal);
    });
  }
  drain(entry) {
    for (const [streamName, source] of [["stdout", "stdout"], ["stderr", "stderr"]]) {
      const reader = entry.handle.collected[source];
      if (!reader) continue;
      const next = reader.readFrom(entry.offsets[streamName]);
      entry.offsets[streamName] = next.nextOffset;
      if (next.lossy) appendLog(entry, streamName, "[earlier output omitted because the bounded console buffer advanced]");
      appendLog(entry, streamName, next.text);
    }
  }
  consoleTail(logs, limit) {
    const count = Math.max(1, Math.min(Number.isSafeInteger(limit) ? limit : 100, 1e3));
    return logs.split(/\r?\n/).filter(Boolean).slice(-count);
  }
  /** Read a stable status snapshot and reconcile a completed managed process. */
  async status({ dataRoot, id, signal }) {
    const record = await this.readRecord(dataRoot, id, signal);
    const key = `${record.dataRoot}:${record.id}`;
    const entry = this.processes.get(key);
    if (!entry) {
      const state = ["running", "starting", "stopping"].includes(record.state) ? "unknown" : record.state;
      return { instance: { ...publicInstance(record), state }, processManaged: false, console: [] };
    }
    this.drain(entry);
    if (entry.outcome || entry.failure) {
      record.state = entry.stoppedByRequest || entry.outcome?.exitCode === 0 ? "stopped" : "failed";
      record.lastExit = entry.outcome ?? null;
      record.lastError = entry.failure?.message ?? null;
      entry.state = record.state;
      await this.writeRecord(record, signal);
      this.processes.delete(key);
    } else {
      record.state = entry.state;
    }
    return { instance: publicInstance(record), processManaged: !entry.outcome && !entry.failure, console: this.consoleTail(entry.logs, 100) };
  }
  /** Read the bounded tail of one live server console. */
  async readConsole({ dataRoot, id, limit = 100, signal }) {
    const snapshot = await this.status({ dataRoot, id, signal });
    const entry = this.processes.get(`${snapshot.instance.dataRoot}:${id}`);
    return { state: snapshot.instance.state, lines: entry ? this.consoleTail(entry.logs, limit) : snapshot.console };
  }
  /** Send one bounded, single-line command to the managed Paper console. */
  async sendConsole({ dataRoot, id, command, signal }) {
    const record = await this.readRecord(dataRoot, id, signal);
    const entry = this.processes.get(`${record.dataRoot}:${id}`);
    if (!entry || entry.state !== "running" || !entry.handle.stdin) throw new MinecraftError("MINECRAFT_SERVER_NOT_RUNNING", "The Minecraft server has no live console input.");
    const text = requiredString(command, "command");
    if (text.length > CONSOLE_MAX_CHARS || /[\r\n\u0000]/.test(text)) {
      throw new MinecraftError("MINECRAFT_INVALID_COMMAND", `Console commands must be one line of at most ${CONSOLE_MAX_CHARS} characters.`);
    }
    signal?.throwIfAborted();
    const write = () => new Promise((resolvePromise, reject) => {
      entry.handle.stdin.write(`${text}
`, (error) => error ? reject(error) : resolvePromise());
    });
    entry.writeTail = entry.writeTail.then(write);
    await entry.writeTail;
    return { sent: true, command: text };
  }
  async stopEntry(entry, signal, persist = true) {
    if (entry.outcome || entry.failure) {
      await entry.closed;
      return;
    }
    entry.state = "stopping";
    entry.instance.state = "stopping";
    if (persist) await this.writeRecord(entry.instance).catch(() => {
    });
    entry.stoppedByRequest = true;
    try {
      if (entry.handle.stdin) {
        await new Promise((resolvePromise, reject) => entry.handle.stdin.write("stop\n", (error) => error ? reject(error) : resolvePromise()));
      }
    } catch (error) {
      entry.failure = error;
    }
    const normalExit = await settledWithin(entry.closed, STOP_TIMEOUT_MS);
    if (!normalExit.settled) {
      entry.handle.terminate();
      const forcedExit = await settledWithin(entry.closed, FORCE_STOP_TIMEOUT_MS);
      if (!forcedExit.settled) {
        const waitSignal = AbortSignal.timeout(FORCE_STOP_TIMEOUT_MS);
        const empty = await entry.handle.waitForExit(waitSignal).catch(() => false);
        if (!empty) throw new MinecraftError("MINECRAFT_STOP_TIMEOUT", "The Minecraft process did not stop after the forced termination request.");
        await settledWithin(entry.closed, FORCE_STOP_TIMEOUT_MS);
      }
    }
    this.drain(entry);
    const result = await entry.closed;
    const record = entry.instance;
    record.state = result.error ? "failed" : "stopped";
    record.lastExit = result.outcome ?? null;
    record.lastError = result.error?.message ?? null;
    entry.state = record.state;
    if (persist) await this.writeRecord(record).catch(() => {
    });
    this.processes.delete(entry.key);
  }
  /** Gracefully stop a live server, then request provider-managed termination on timeout. */
  async stop({ dataRoot, id, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      const entry = this.processes.get(key);
      if (!entry) {
        if (["running", "starting", "stopping"].includes(record.state)) record.state = "unknown";
        else record.state = "stopped";
        await this.writeRecord(record, signal);
        return { instance: publicInstance(record), stopped: record.state === "stopped" };
      }
      await this.stopEntry(entry, signal);
      return { instance: publicInstance(record), stopped: true };
    });
  }
  /** Restart a Paper instance through the same stop and readiness lifecycle. */
  async restart({ dataRoot, id, javaExecutable, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      const entry = this.processes.get(key);
      if (entry) await this.stopEntry(entry, signal);
      return this.startInternal(record, javaExecutable, signal);
    });
  }
  /** List stored Paper instances under one caller-selected local data root. */
  async listInstances({ dataRoot, signal }) {
    const requested = normalizeDataRoot(dataRoot);
    const root = instanceRoot(requested);
    let canonical;
    try {
      canonical = await realpath(root);
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw new MinecraftError("MINECRAFT_DATA_ROOT_UNAVAILABLE", "The selected data directory cannot be read.", { cause: error });
    }
    const { target } = await this.localTarget(canonical, signal);
    const info = await this.ctx.fs.stat(target, signal);
    if (!info || info.type !== "directory") return [];
    const entries = await this.ctx.fs.listDir(target, signal);
    const result = [];
    for (const entry of entries) {
      if (entry.type !== "directory" || !/^[0-9a-f-]{36}$/i.test(entry.name)) continue;
      const record = await this.readRecord(requested, entry.name, signal);
      const snapshot = await this.status({ dataRoot: requested, id: record.id, signal });
      result.push(snapshot.instance);
    }
    return result.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  /** Resolve one relative path without traversing links or leaving its instance. */
  async resolveInstanceFile(record, relativePath, { signal, allowMissing = false } = {}) {
    const value = requiredString(relativePath, "path").replace(/\\/g, "/");
    if (value.startsWith("/") || /^[A-Za-z]:/.test(value) || value.includes("\0") || /[\u0000-\u001f\u007f]/.test(value)) {
      throw new MinecraftError("MINECRAFT_INVALID_PATH", "File paths must be relative to the selected Minecraft instance.");
    }
    const segments = value.split("/").filter((segment) => segment && segment !== ".");
    if (segments.length === 0 || segments.some((segment) => segment === "..")) {
      throw new MinecraftError("MINECRAFT_INVALID_PATH", "The requested path must name a file or directory inside the instance.");
    }
    if (segments[0].toLowerCase() === "dsh-lfaa.json") {
      throw new MinecraftError("MINECRAFT_INVALID_PATH", "The plugin-owned instance manifest is not exposed as a server file.");
    }
    const root = await realpath(record.instancePath);
    let candidate = root;
    for (let index = 0; index < segments.length; index++) {
      candidate = join(candidate, segments[index]);
      let entry;
      try {
        entry = await lstat(candidate);
      } catch (error) {
        if (allowMissing && error?.code === "ENOENT" && index === segments.length - 1) break;
        throw error;
      }
      if (entry.isSymbolicLink()) throw new MinecraftError("MINECRAFT_FILE_LINK_REFUSED", "Server file operations do not follow symbolic links.");
      if (index < segments.length - 1 && !entry.isDirectory()) {
        throw new MinecraftError("MINECRAFT_FILE_NOT_DIRECTORY", "A parent component of the requested path is not a directory.");
      }
      if (index === segments.length - 1 && !allowMissing && !entry.isFile() && !entry.isDirectory()) {
        throw new MinecraftError("MINECRAFT_FILE_TYPE_UNSUPPORTED", "The requested server path is not a regular file or directory.");
      }
    }
    const canonicalParent = await realpath(dirname(candidate));
    if (!isPathWithin(root, canonicalParent) || !isPathWithin(root, candidate)) {
      throw new MinecraftError("MINECRAFT_INVALID_PATH", "The requested server path escaped its instance directory.");
    }
    const { target, processPath } = await this.localTarget(candidate, signal);
    const rootTarget = await this.ctx.fs.resolve(root, { signal });
    if (!this.ctx.fs.contains(rootTarget, target) || normalizeComparablePath(processPath) !== normalizeComparablePath(candidate)) {
      throw new MinecraftError("MINECRAFT_INVALID_PATH", "The requested server path is outside the selected instance.");
    }
    return { target, path: candidate, relativePath: segments.join("/"), processPath };
  }
  /** List one instance directory level without following symbolic links. */
  async listFiles({ dataRoot, id, path = ".", signal }) {
    const record = await this.readRecord(dataRoot, id, signal);
    const directory = path === "." ? await this.localTarget(record.instancePath, signal) : await this.resolveInstanceFile(record, path, { signal });
    const info = await this.ctx.fs.stat(directory.target, signal);
    if (!info || info.type !== "directory") throw new MinecraftError("MINECRAFT_FILE_NOT_DIRECTORY", "The requested server path is not a directory.");
    const entries = await this.ctx.fs.listDir(directory.target, signal);
    return {
      path: path === "." ? "." : String(path).replace(/\\/g, "/"),
      entries: entries.filter((entry) => entry.name !== "dsh-lfaa.json").map((entry) => ({ name: entry.name, type: entry.type, ...entry.size === void 0 ? {} : { size: entry.size } }))
    };
  }
  /** Read a bounded UTF-8 text file from one instance. */
  async readFile({ dataRoot, id, path, signal }) {
    const record = await this.readRecord(dataRoot, id, signal);
    const target = await this.resolveInstanceFile(record, path, { signal });
    const info = await this.ctx.fs.stat(target.target, signal);
    if (!info || info.type !== "file") throw new MinecraftError("MINECRAFT_FILE_NOT_FOUND", "The requested server file was not found.");
    if (info.size !== void 0 && info.size > SERVER_TEXT_FILE_MAX_BYTES) {
      throw new MinecraftError("MINECRAFT_FILE_TOO_LARGE", `Text reads are limited to ${SERVER_TEXT_FILE_MAX_BYTES} bytes.`);
    }
    const bytes = await this.ctx.fs.readBytes(target.target, signal, SERVER_TEXT_FILE_MAX_BYTES);
    let content;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (cause) {
      throw new MinecraftError("MINECRAFT_FILE_NOT_TEXT", "The requested server file is not valid UTF-8 text.", { cause });
    }
    if (content.includes("\0")) throw new MinecraftError("MINECRAFT_FILE_NOT_TEXT", "Binary files cannot be read as text.");
    return { path: target.relativePath, size: bytes.byteLength, content };
  }
  /** Update one bounded text/config file after confirming the server is stopped. */
  async writeFile({ dataRoot, id, path, content, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      const running = this.processes.get(key);
      if (running && !running.outcome && !running.failure) throw new MinecraftError("MINECRAFT_SERVER_RUNNING", "Stop the server before changing server files.");
      if (typeof content !== "string" || content.includes("\0") || Buffer.byteLength(content, "utf8") > SERVER_TEXT_FILE_MAX_BYTES) {
        throw new MinecraftError("MINECRAFT_FILE_CONTENT_INVALID", `Text file content must be UTF-8 text no larger than ${SERVER_TEXT_FILE_MAX_BYTES} bytes.`);
      }
      const target = await this.resolveInstanceFile(record, path, { signal, allowMissing: true });
      const extension = extname(target.path).toLowerCase();
      if (!SERVER_TEXT_EXTENSIONS.has(extension) || ["eula.txt", "dsh-lfaa.json"].includes(basename(target.path).toLowerCase())) {
        throw new MinecraftError("MINECRAFT_FILE_WRITE_REFUSED", "Only non-plugin-owned text configuration files may be written.");
      }
      const info = await this.ctx.fs.stat(target.target, signal);
      if (info && info.type !== "file") throw new MinecraftError("MINECRAFT_FILE_TYPE_UNSUPPORTED", "The requested target is not a regular file.");
      if (info?.size !== void 0 && info.size > SERVER_TEXT_FILE_MAX_BYTES) {
        throw new MinecraftError("MINECRAFT_FILE_TOO_LARGE", `Text writes are limited to ${SERVER_TEXT_FILE_MAX_BYTES} bytes.`);
      }
      const expected = info ? { kind: "replaceIfVersion", version: info.version } : { kind: "createIfAbsent" };
      await this.ctx.fs.writeText(target.target, content, expected, signal);
      return { path: target.relativePath, size: Buffer.byteLength(content, "utf8"), written: true };
    });
  }
  /** Read the current server.properties values from a stopped or running Paper instance. */
  async readConfig({ dataRoot, id, signal }) {
    const record = await this.readRecord(dataRoot, id, signal);
    const target = await this.resolveInstanceFile(record, "server.properties", { signal });
    const info = await this.ctx.fs.stat(target.target, signal);
    if (!info || info.type !== "file") throw new MinecraftError("MINECRAFT_CONFIG_NOT_FOUND", "server.properties is missing.");
    if (info.size !== void 0 && info.size > SERVER_TEXT_FILE_MAX_BYTES) throw new MinecraftError("MINECRAFT_CONFIG_TOO_LARGE", "server.properties exceeds the supported text size.");
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(await this.ctx.fs.readBytes(target.target, signal, SERVER_TEXT_FILE_MAX_BYTES));
    } catch (cause) {
      throw new MinecraftError("MINECRAFT_CONFIG_NOT_TEXT", "server.properties is not a valid UTF-8 text file.", { cause });
    }
    const properties = parseServerProperties(text);
    return { instance: publicInstance(record), properties };
  }
  /** Validate and persist a focused set of safe server.properties fields. */
  async updateConfig({ dataRoot, id, properties, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      const running = this.processes.get(key);
      if (running && !running.outcome && !running.failure) throw new MinecraftError("MINECRAFT_SERVER_RUNNING", "Stop the server before changing server.properties.");
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) throw new MinecraftError("MINECRAFT_CONFIG_INVALID", "properties must be an object of server.properties values.");
      const entries = Object.entries(properties);
      if (entries.length === 0 || entries.length > 20) throw new MinecraftError("MINECRAFT_CONFIG_INVALID", "Update between 1 and 20 server.properties values per request.");
      for (const [name2, rawValue] of entries) {
        const validate = SERVER_PROPERTY_RULES[name2];
        if (!validate || typeof rawValue !== "string" || /[\r\n\0]/.test(rawValue) || !validate(rawValue)) {
          throw new MinecraftError("MINECRAFT_CONFIG_INVALID", `The server.properties value for ${name2} is not supported or valid.`);
        }
      }
      if (Object.hasOwn(properties, "server-port") && Number(properties["server-port"]) !== record.port) {
        await assertPortAvailable(Number(properties["server-port"]), signal);
      }
      const target = await this.resolveInstanceFile(record, "server.properties", { signal });
      const info = await this.ctx.fs.stat(target.target, signal);
      if (!info || info.type !== "file") throw new MinecraftError("MINECRAFT_CONFIG_NOT_FOUND", "server.properties is missing.");
      const original = await this.ctx.fs.readText(target.target, signal);
      const pending = new Map(entries);
      const lines = original.replace(/\r\n?/g, "\n").split("\n");
      const output = lines.map((line) => {
        const separator = line.indexOf("=");
        if (separator < 1 || line.trimStart().startsWith("#") || line.trimStart().startsWith("!")) return line;
        const name2 = line.slice(0, separator).trim();
        if (!pending.has(name2)) return line;
        const value = pending.get(name2);
        pending.delete(name2);
        return `${name2}=${value}`;
      });
      for (const [name2, value] of pending) output.push(`${name2}=${value}`);
      const content = `${output.join("\n").replace(/\n+$/, "")}
`;
      await this.ctx.fs.writeText(target.target, content, { kind: "replaceIfVersion", version: info.version }, signal);
      if (Object.hasOwn(properties, "server-port")) record.port = Number(properties["server-port"]);
      await this.writeRecord(record, signal);
      return { instance: publicInstance(record), properties: parseServerProperties(content), updated: Object.keys(properties) };
    });
  }
  /** Create a SHA-256 checked archive of a stopped instance. */
  async createBackup({ dataRoot, id, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      const running = this.processes.get(key);
      if (running && !running.outcome && !running.failure) throw new MinecraftError("MINECRAFT_BACKUP_SERVER_RUNNING", "Stop the server before creating a consistent backup.");
      const tree = await measureBackupTree(record.instancePath, signal);
      const dataDirectory = await realpath(normalizeDataRoot(dataRoot));
      const backupDirectory = join(dataDirectory, "dsh-lfaa", "minecraft", "backups", id);
      await mkdir(backupDirectory, { recursive: true });
      const canonicalBackupDirectory = await realpath(backupDirectory);
      if (!isPathWithin(dataDirectory, canonicalBackupDirectory)) throw new MinecraftError("MINECRAFT_INVALID_PATH", "The backup directory resolved outside the selected data root.");
      const { processPath: backupProcessPath } = await this.localTarget(canonicalBackupDirectory, signal);
      const { processPath: instanceProcessPath } = await this.localTarget(record.instancePath, signal);
      const backupId = randomUUID();
      const archiveName = `${backupId}.tar.gz`;
      const archivePath = join(canonicalBackupDirectory, archiveName);
      const manifestPath = join(canonicalBackupDirectory, `${backupId}.json`);
      const archive = await this.localTarget(archivePath, signal);
      const manifest = await this.localTarget(manifestPath, signal);
      let tar;
      try {
        tar = await this.ctx.subprocess.resolveExecutable(process.platform === "win32" ? "tar.exe" : "tar", void 0, signal);
      } catch (cause) {
        throw new MinecraftError("MINECRAFT_ARCHIVER_NOT_FOUND", "A system tar archiver is required to create a server backup.", { cause });
      }
      const operation = this.ctx.subprocess.spawn({
        argv: [tar, "-czf", archive.processPath, "-C", instanceProcessPath, "."],
        cwd: instanceProcessPath,
        stdio: { stdin: "ignore", stdout: { maxBytes: BACKUP_OUTPUT_BYTES }, stderr: { maxBytes: BACKUP_OUTPUT_BYTES } },
        graceMs: PROCESS_GRACE_MS,
        signal
      });
      const result = await settledWithin(operation.done, BACKUP_TIMEOUT_MS);
      if (!result.settled) {
        operation.terminate();
        await settledWithin(operation.done, FORCE_STOP_TIMEOUT_MS);
        await rm(archive.processPath, { force: true }).catch(() => {
        });
        throw new MinecraftError("MINECRAFT_BACKUP_TIMEOUT", "The instance backup did not finish within 30 minutes.");
      }
      const output = `${operation.collected.stderr?.readFrom(0).text ?? ""}
${operation.collected.stdout?.readFrom(0).text ?? ""}`.trim();
      if (result.error || result.value.exitCode !== 0) {
        await rm(archive.processPath, { force: true }).catch(() => {
        });
        throw new MinecraftError("MINECRAFT_BACKUP_FAILED", `The server backup could not be created.${output ? ` ${output.slice(-1e3)}` : ""}`, { cause: result.error });
      }
      try {
        const info = await this.ctx.fs.stat(archive.target, signal);
        if (!info || info.type !== "file") throw new MinecraftError("MINECRAFT_BACKUP_FAILED", "The archiver did not produce a backup file.");
        const entry = {
          id: backupId,
          instanceId: id,
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          archiveName,
          size: info.size ?? 0,
          sha256: await sha256File(archive.processPath, signal),
          sourceBytes: tree.bytes,
          fileCount: tree.files
        };
        await this.ctx.fs.writeText(manifest.target, `${JSON.stringify(entry, null, 2)}
`, { kind: "createIfAbsent" }, signal);
        return entry;
      } catch (error) {
        await rm(archive.processPath, { force: true }).catch(() => {
        });
        throw error;
      }
    });
  }
  /** List managed backup manifests without reading archive contents. */
  async listBackups({ dataRoot, id, signal }) {
    await this.readRecord(dataRoot, id, signal);
    const dataDirectory = await realpath(normalizeDataRoot(dataRoot));
    const backupDirectory = join(dataDirectory, "dsh-lfaa", "minecraft", "backups", id);
    let canonicalBackupDirectory;
    try {
      canonicalBackupDirectory = await realpath(backupDirectory);
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
    if (!isPathWithin(dataDirectory, canonicalBackupDirectory)) throw new MinecraftError("MINECRAFT_INVALID_PATH", "The backup directory resolved outside the selected data root.");
    const directory = await this.localTarget(canonicalBackupDirectory, signal);
    const entries = await this.ctx.fs.listDir(directory.target, signal);
    const backups = [];
    for (const entry of entries) {
      if (entry.type !== "file" || !/^[0-9a-f-]{36}\.json$/i.test(entry.name)) continue;
      const text = await this.ctx.fs.readText(entry.target, signal);
      let manifest;
      try {
        manifest = JSON.parse(text);
      } catch (cause) {
        throw new MinecraftError("MINECRAFT_BACKUP_MANIFEST_INVALID", "A managed backup manifest is not valid JSON.", { cause });
      }
      if (!manifest || !/^[0-9a-f-]{36}$/i.test(manifest.id) || manifest.instanceId !== id || manifest.archiveName !== `${manifest.id}.tar.gz` || !/^[a-f0-9]{64}$/i.test(manifest.sha256)) {
        throw new MinecraftError("MINECRAFT_BACKUP_MANIFEST_INVALID", "A managed backup manifest failed validation.");
      }
      const archive = await this.ctx.fs.resolve(join(canonicalBackupDirectory, manifest.archiveName), { signal });
      const info = await this.ctx.fs.stat(archive, signal);
      backups.push({ ...manifest, available: Boolean(info && info.type === "file" && info.size === manifest.size) });
    }
    return backups.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
  /** Restore one verified managed backup after checking archive paths and entry types. */
  async restoreBackup({ dataRoot, id, backupId, signal }) {
    const key = `${resolve(normalizeDataRoot(dataRoot))}:${id}`;
    return this.withOperation(key, async () => {
      const record = await this.readRecord(dataRoot, id, signal);
      const running = this.processes.get(key);
      if (running && !running.outcome && !running.failure) throw new MinecraftError("MINECRAFT_RESTORE_SERVER_RUNNING", "Stop the server before restoring a backup.");
      if (typeof backupId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(backupId)) {
        throw new MinecraftError("MINECRAFT_BACKUP_NOT_FOUND", "The backup ID is invalid.");
      }
      const backups = await this.listBackups({ dataRoot, id, signal });
      const manifest = backups.find((item) => item.id === backupId && item.available);
      if (!manifest) throw new MinecraftError("MINECRAFT_BACKUP_NOT_FOUND", "The selected managed backup is unavailable or incomplete.");
      const dataDirectory = await realpath(normalizeDataRoot(dataRoot));
      const backupDirectory = join(dataDirectory, "dsh-lfaa", "minecraft", "backups", id);
      const archivePath = join(backupDirectory, manifest.archiveName);
      const archive = await this.localTarget(archivePath, signal);
      if (await sha256File(archive.processPath, signal) !== manifest.sha256) {
        throw new MinecraftError("MINECRAFT_BACKUP_CHECKSUM_MISMATCH", "The backup archive no longer matches its recorded SHA-256 digest.");
      }
      let tar;
      try {
        tar = await this.ctx.subprocess.resolveExecutable(process.platform === "win32" ? "tar.exe" : "tar", void 0, signal);
      } catch (cause) {
        throw new MinecraftError("MINECRAFT_ARCHIVER_NOT_FOUND", "A system tar extractor is required to restore a server backup.", { cause });
      }
      const inspect = async (args) => {
        const handle = this.ctx.subprocess.spawn({
          argv: [tar, ...args],
          cwd: record.instancePath,
          stdio: { stdin: "ignore", stdout: { maxBytes: BACKUP_INSPECT_OUTPUT_BYTES }, stderr: { maxBytes: BACKUP_OUTPUT_BYTES } },
          graceMs: PROCESS_GRACE_MS,
          signal
        });
        const settled = await settledWithin(handle.done, BACKUP_TIMEOUT_MS);
        if (!settled.settled) {
          handle.terminate();
          await settledWithin(handle.done, FORCE_STOP_TIMEOUT_MS);
          throw new MinecraftError("MINECRAFT_RESTORE_TIMEOUT", "The backup archive could not be inspected within 30 minutes.");
        }
        const stdout = handle.collected.stdout?.readFrom(0);
        if (settled.error || settled.value.exitCode !== 0 || !stdout || stdout.lossy) {
          const details = `${handle.collected.stderr?.readFrom(0).text ?? ""}
${stdout?.text ?? ""}`.trim();
          throw new MinecraftError("MINECRAFT_BACKUP_ARCHIVE_INVALID", `The backup archive failed inspection.${details ? ` ${details.slice(-1e3)}` : ""}`, { cause: settled.error });
        }
        return stdout.text;
      };
      const names = (await inspect(["-tzf", archive.processPath])).split(/\r?\n/).filter(Boolean);
      if (names.length === 0 || names.length > 1e6) throw new MinecraftError("MINECRAFT_BACKUP_ARCHIVE_INVALID", "The backup archive contains no entries or too many entries.");
      for (const rawName of names) {
        const name2 = rawName.replace(/^\.\//, "").replace(/\/$/, "");
        if (!name2) continue;
        const parts = name2.split("/");
        if (name2.startsWith("/") || /^[A-Za-z]:/.test(name2) || /[\u0000-\u001f\u007f]/.test(name2) || parts.some((part) => part === "..")) {
          throw new MinecraftError("MINECRAFT_BACKUP_ARCHIVE_INVALID", "The backup archive contains an unsafe path.");
        }
      }
      const detailed = (await inspect(["-tvzf", archive.processPath])).split(/\r?\n/).filter(Boolean);
      if (detailed.length !== names.length || detailed.some((line) => !["-", "d"].includes(line[0]))) {
        throw new MinecraftError("MINECRAFT_BACKUP_ARCHIVE_INVALID", "The backup archive contains links or unsupported filesystem entry types.");
      }
      const restoreRoot = join(dataDirectory, "dsh-lfaa", "minecraft", "restores");
      await mkdir(restoreRoot, { recursive: true });
      const canonicalRestoreRoot = await realpath(restoreRoot);
      if (!isPathWithin(dataDirectory, canonicalRestoreRoot)) throw new MinecraftError("MINECRAFT_INVALID_PATH", "The restore staging directory resolved outside the selected data root.");
      const stagePath = join(canonicalRestoreRoot, `.restore-${randomUUID()}`);
      const rollbackPath = join(dirname(record.instancePath), `.rollback-${randomUUID()}`);
      await mkdir(stagePath, { recursive: false });
      try {
        const stage = await this.localTarget(stagePath, signal);
        const extraction = this.ctx.subprocess.spawn({
          argv: [tar, "-xf", archive.processPath, "-C", stage.processPath],
          cwd: stage.processPath,
          stdio: { stdin: "ignore", stdout: { maxBytes: BACKUP_OUTPUT_BYTES }, stderr: { maxBytes: BACKUP_OUTPUT_BYTES } },
          graceMs: PROCESS_GRACE_MS,
          signal
        });
        const extracted = await settledWithin(extraction.done, BACKUP_TIMEOUT_MS);
        if (!extracted.settled) {
          extraction.terminate();
          await settledWithin(extraction.done, FORCE_STOP_TIMEOUT_MS);
          throw new MinecraftError("MINECRAFT_RESTORE_TIMEOUT", "The backup archive did not finish extracting within 30 minutes.");
        }
        if (extracted.error || extracted.value.exitCode !== 0) {
          const detail = extraction.collected.stderr?.readFrom(0).text ?? "";
          throw new MinecraftError("MINECRAFT_BACKUP_ARCHIVE_INVALID", `The backup archive could not be extracted.${detail ? ` ${detail.slice(-1e3)}` : ""}`, { cause: extracted.error });
        }
        const extractedTree = await measureBackupTree(stagePath, signal);
        if (extractedTree.files !== manifest.fileCount || extractedTree.bytes !== manifest.sourceBytes) {
          throw new MinecraftError("MINECRAFT_BACKUP_ARCHIVE_INVALID", "The extracted backup contents do not match the recorded file count and size.");
        }
        const savedMetadataPath = join(stagePath, "dsh-lfaa.json");
        const savedMetadataTarget = await this.localTarget(savedMetadataPath, signal);
        const savedMetadata = await this.ctx.fs.readText(savedMetadataTarget.target, signal);
        metadataFromText(savedMetadata, id, record.dataRoot);
        await rename(record.instancePath, rollbackPath);
        try {
          await rename(stagePath, record.instancePath);
          record.state = "stopped";
          record.lastError = null;
          record.lastExit = null;
          record.lastBackupRestoredAt = (/* @__PURE__ */ new Date()).toISOString();
          await this.writeRecord(record, signal);
        } catch (error) {
          await rm(record.instancePath, { recursive: true, force: true }).catch(() => {
          });
          await rename(rollbackPath, record.instancePath).catch(() => {
          });
          throw error;
        }
        await rm(rollbackPath, { recursive: true, force: true });
        return { instance: publicInstance(record), backupId, restored: true };
      } finally {
        await rm(stagePath, { recursive: true, force: true }).catch(() => {
        });
      }
    });
  }
  /** Stop owned Minecraft processes before this plugin's Cordis scope is disposed. */
  async dispose() {
    await Promise.all([...this.processes.values()].map(async (entry) => {
      try {
        await this.stopEntry(entry, void 0);
      } catch {
        entry.handle.terminate();
        await settledWithin(entry.closed, FORCE_STOP_TIMEOUT_MS);
      }
    }));
  }
};
function normalizeComparablePath(value) {
  const normalized = resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
function publicInstance(record) {
  const {
    schemaVersion: _schemaVersion,
    instancePath: _instancePath,
    ...instance
  } = record;
  return instance;
}
function apply(ctx) {
  const service = new MinecraftService(ctx);
  ctx.provide("lfaaMinecraft", service);
  registerMinecraftTool(ctx, service);
  ctx.effect(() => async () => {
    await service.dispose();
  }, "dsh-lfaa-minecraft.processes");
}

// packages/dsh-lfaa-appearance/src/config.mjs
import Schema from "@deepseek-ai/schemastery";
var Config = Schema.object({
  enabled: Schema.boolean().default(true).volatile().description({ zh: "\u542F\u7528\u4F53\u9A8C\u914D\u7F6E\uFF1B\u5173\u95ED\u540E\u6062\u590D\u5BBF\u4E3B\u539F\u5916\u89C2\u3002", en: "Enable experience settings; disabling restores the host appearance." }),
  preset: Schema.union(["native", "soft", "crisp"]).default("native").volatile().description({ zh: "\u89C6\u89C9\u65B9\u6848\uFF1A\u539F\u751F\u3001\u67D4\u548C\u3001\u6E05\u6670\u3002", en: "Visual style: native, soft or crisp." }),
  density: Schema.union(["comfortable", "compact"]).default("comfortable").volatile().description({ zh: "\u63D2\u4EF6\u5DE5\u4F5C\u533A\u5BC6\u5EA6\uFF0C\u4E0D\u6539\u52A8 DSH \u4F1A\u8BDD\u5E03\u5C40\u72B6\u6001\u3002", en: "Plugin workspace density; does not change DSH conversation geometry." }),
  motion: Schema.union(["system", "reduced"]).default("system").volatile().description({ zh: "\u8DDF\u968F\u7CFB\u7EDF\u6216\u51CF\u5C11\u52A8\u6001\u6548\u679C\uFF0C\u7CFB\u7EDF\u504F\u597D\u4F18\u5148\u3002", en: "Follow the system or reduce motion; system accessibility takes precedence." })
});

// packages/dsh-lfaa/src/index.mjs
var name = "dsh-lfaa";
var inject = ["fs", "subprocess", "tools", "sandboxPolicy"];
function apply2(ctx) {
  apply(ctx);
}
export {
  Config,
  apply2 as apply,
  inject,
  name
};
