import type { ConsultationDraft } from '@/types';

const DB_NAME = 'diversidade-consultation-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const DRAFT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const openDraftDb = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'storage_key' });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const runDraftTransaction = async <T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> => {
  const db = await openDraftDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);

    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }

    transaction.oncomplete = () => {
      db.close();
      if (!request) resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const getConsultationDraftKey = (userId: number | string) => `consultation:${userId}`;

export const saveLocalConsultationDraft = async (
  storageKey: string,
  draft: ConsultationDraft
): Promise<void> => {
  await runDraftTransaction('readwrite', (store) => store.put({
    ...draft,
    storage_key: storageKey,
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + DRAFT_TTL_MS).toISOString(),
  }));
};

export const loadLocalConsultationDraft = async (
  storageKey: string
): Promise<ConsultationDraft | null> => {
  const record = await runDraftTransaction<Record<string, unknown> | undefined>(
    'readonly',
    (store) => store.get(storageKey)
  );

  if (!record) return null;

  const expiresAt = typeof record.expires_at === 'string' ? Date.parse(record.expires_at) : 0;
  if (expiresAt && expiresAt < Date.now()) {
    await deleteLocalConsultationDraft(storageKey);
    return null;
  }

  const draft = { ...record };
  delete draft.storage_key;
  delete draft.expires_at;
  return draft as unknown as ConsultationDraft;
};

export const deleteLocalConsultationDraft = async (storageKey: string): Promise<void> => {
  await runDraftTransaction('readwrite', (store) => store.delete(storageKey));
};
