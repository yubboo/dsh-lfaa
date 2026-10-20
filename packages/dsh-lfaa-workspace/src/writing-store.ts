/** Browser-profile manuscript store. DSH remains the owner of AI and sessions. */

export interface NovelRecord {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ChapterRecord {
  readonly id: string;
  readonly novelId: string;
  readonly title: string;
  readonly content: string;
  readonly order: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ChapterSummary = Omit<ChapterRecord, 'content'>;

export interface WritingLibrary {
  readonly novels: readonly NovelRecord[];
  readonly chapters: readonly ChapterSummary[];
}

const DATABASE = 'dsh-lfaa-writing';
const VERSION = 1;
const MAX_TITLE_LENGTH = 120;
const MAX_CHAPTER_LENGTH = 1_000_000;

const databaseOpenings = new Map<string, Promise<IDBDatabase>>();

function openDatabase(accountId: string): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('当前 DSH 客户端不支持本地作品存储。'));
  if (typeof accountId !== 'string' || !accountId.trim() || accountId.length > 256) {
    return Promise.reject(new Error('无法确认当前 DSH 账号，作品存储已停止。'));
  }
  const databaseName = `${DATABASE}:${encodeURIComponent(accountId)}`;
  let opening = databaseOpenings.get(databaseName);
  if (!opening) {
    opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('novels')) database.createObjectStore('novels', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('chapters')) {
        const chapters = database.createObjectStore('chapters', { keyPath: 'id' });
        chapters.createIndex('novelId', 'novelId', { unique: false });
      }
      if (!database.objectStoreNames.contains('chapterContents')) database.createObjectStore('chapterContents', { keyPath: 'id' });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        databaseOpenings.delete(databaseName);
      };
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error('无法打开作品存储。'));
    request.onblocked = () => reject(new Error('作品存储正在被另一个 DSH 窗口使用，请关闭其他窗口后重试。'));
    }).catch(error => {
      databaseOpenings.delete(databaseName);
      throw error;
    });
    databaseOpenings.set(databaseName, opening);
  }
  return opening;
}

function transaction<T>(
  accountId: string,
  stores: string | string[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction, complete: (value: T) => void) => void,
): Promise<T> {
  return openDatabase(accountId).then(database => new Promise<T>((resolve, reject) => {
    const tx = database.transaction(stores, mode);
    let value!: T;
    tx.oncomplete = () => resolve(value);
    tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('作品保存失败。'));
    run(tx, next => { value = next; });
  }));
}

function titleValue(value: string): string {
  const title = value.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) throw new Error(`标题需为 1 到 ${MAX_TITLE_LENGTH} 个字符。`);
  return title;
}

function requireRecord<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`${label}已不存在，请刷新列表后重试。`);
  return value;
}

export async function loadLibrary(accountId: string): Promise<WritingLibrary> {
  return transaction(accountId, ['novels', 'chapters'], 'readonly', (tx, complete) => {
    const novelsRequest = tx.objectStore('novels').getAll() as IDBRequest<NovelRecord[]>;
    const chaptersRequest = tx.objectStore('chapters').getAll() as IDBRequest<ChapterSummary[]>;
    let novels: NovelRecord[] | undefined;
    let chapters: ChapterSummary[] | undefined;
    const finish = () => {
      if (!novels || !chapters) return;
      complete({
        novels: novels.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        chapters: chapters.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)),
      });
    };
    novelsRequest.onsuccess = () => { novels = novelsRequest.result; finish(); };
    chaptersRequest.onsuccess = () => { chapters = chaptersRequest.result; finish(); };
  });
}

export async function getChapter(accountId: string, id: string): Promise<ChapterRecord> {
  return transaction(accountId, ['chapters', 'chapterContents'], 'readonly', (tx, complete) => {
    const metadata = tx.objectStore('chapters').get(id) as IDBRequest<ChapterSummary | undefined>;
    const content = tx.objectStore('chapterContents').get(id) as IDBRequest<{ id: string; content: string } | undefined>;
    let row: ChapterSummary | undefined;
    let text: string | undefined;
    let loadedMetadata = false;
    let loadedText = false;
    const finish = () => {
      if (!loadedMetadata || !loadedText) return;
      complete({ ...requireRecord(row, '章节'), content: text ?? '' });
    };
    metadata.onsuccess = () => { row = metadata.result; loadedMetadata = true; finish(); };
    content.onsuccess = () => { text = content.result?.content; loadedText = true; finish(); };
  });
}

export async function createNovel(accountId: string, rawTitle: string): Promise<NovelRecord> {
  const now = new Date().toISOString();
  const novel: NovelRecord = { id: crypto.randomUUID(), title: titleValue(rawTitle), createdAt: now, updatedAt: now };
  return transaction(accountId, 'novels', 'readwrite', (tx, complete) => {
    tx.objectStore('novels').add(novel);
    complete(novel);
  });
}

export async function renameNovel(accountId: string, id: string, rawTitle: string): Promise<NovelRecord> {
  const title = titleValue(rawTitle);
  return transaction(accountId, 'novels', 'readwrite', (tx, complete) => {
    const store = tx.objectStore('novels');
    const request = store.get(id) as IDBRequest<NovelRecord | undefined>;
    request.onsuccess = () => {
      const current = requireRecord(request.result, '小说');
      const novel = { ...current, title, updatedAt: new Date().toISOString() };
      store.put(novel);
      complete(novel);
    };
  });
}

export async function deleteNovel(accountId: string, id: string): Promise<void> {
  return transaction(accountId, ['novels', 'chapters', 'chapterContents'], 'readwrite', tx => {
    tx.objectStore('novels').delete(id);
    const chapters = tx.objectStore('chapters');
    const contents = tx.objectStore('chapterContents');
    const request = chapters.index('novelId').openKeyCursor(IDBKeyRange.only(id));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      contents.delete(cursor.primaryKey);
      chapters.delete(cursor.primaryKey);
      cursor.continue();
    };
  });
}

export async function createChapter(accountId: string, novelId: string, count: number): Promise<ChapterRecord> {
  const now = new Date().toISOString();
  const chapter: ChapterRecord = {
    id: crypto.randomUUID(), novelId, title: `第 ${count + 1} 章`, content: '', order: count,
    createdAt: now, updatedAt: now,
  };
  return transaction(accountId, ['chapters', 'chapterContents'], 'readwrite', (tx, complete) => {
    tx.objectStore('chapters').add({ id: chapter.id, novelId, title: chapter.title, order: chapter.order, createdAt: now, updatedAt: now });
    tx.objectStore('chapterContents').add({ id: chapter.id, content: '' });
    complete(chapter);
  });
}

export async function renameChapter(accountId: string, id: string, rawTitle: string): Promise<ChapterSummary> {
  const title = titleValue(rawTitle);
  return transaction(accountId, 'chapters', 'readwrite', (tx, complete) => {
    const store = tx.objectStore('chapters');
    const request = store.get(id) as IDBRequest<ChapterSummary | undefined>;
    request.onsuccess = () => {
      const chapter = { ...requireRecord(request.result, '章节'), title, updatedAt: new Date().toISOString() };
      store.put(chapter);
      complete(chapter);
    };
  });
}

export async function deleteChapter(accountId: string, id: string): Promise<void> {
  return transaction(accountId, ['chapters', 'chapterContents'], 'readwrite', tx => {
    tx.objectStore('chapters').delete(id);
    tx.objectStore('chapterContents').delete(id);
  });
}

export async function saveChapter(accountId: string, id: string, content: string, rawTitle?: string): Promise<void> {
  if (content.length > MAX_CHAPTER_LENGTH) throw new Error(`单章最多可保存 ${MAX_CHAPTER_LENGTH.toLocaleString()} 个字符。`);
  const title = rawTitle === undefined ? undefined : titleValue(rawTitle);
  return transaction(accountId, ['chapters', 'chapterContents'], 'readwrite', (tx, complete) => {
    const store = tx.objectStore('chapters');
    const request = store.get(id) as IDBRequest<ChapterSummary | undefined>;
    request.onsuccess = () => {
      const chapter = { ...requireRecord(request.result, '章节'), ...(title === undefined ? {} : { title }), updatedAt: new Date().toISOString() };
      store.put(chapter);
      tx.objectStore('chapterContents').put({ id, content });
      complete(undefined);
    };
  });
}
