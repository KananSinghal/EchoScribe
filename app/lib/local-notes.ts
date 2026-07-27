import type { VoiceNote } from "../types";

const DATABASE_NAME = "echoscribe";
const DATABASE_VERSION = 1;
const NOTES_STORE = "notes";

type StoredVoiceNote = Omit<VoiceNote, "audioUrl"> & {
  audio: Blob;
};

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(NOTES_STORE)) {
        database.createObjectStore(NOTES_STORE, { keyPath: "id" });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("Could not open browser storage."));
    });
  });
}

function waitForRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => {
      reject(request.error ?? new Error("Browser storage request failed."));
    });
  });
}

function toVoiceNote(note: StoredVoiceNote): VoiceNote {
  return {
    id: note.id,
    title: note.title,
    transcript: note.transcript,
    audioUrl: URL.createObjectURL(note.audio),
    originalFilename: note.originalFilename,
    mimeType: note.mimeType,
    fileSize: note.fileSize,
    wordCount: note.wordCount,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

export function releaseAudioUrl(note: VoiceNote) {
  if (note.audioUrl.startsWith("blob:")) {
    URL.revokeObjectURL(note.audioUrl);
  }
}

export async function listLocalNotes() {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(NOTES_STORE, "readonly");
    const notes = await waitForRequest(
      transaction.objectStore(NOTES_STORE).getAll() as IDBRequest<
        StoredVoiceNote[]
      >,
    );

    return notes
      .sort((first, second) =>
        second.createdAt.localeCompare(first.createdAt),
      )
      .map(toVoiceNote);
  } finally {
    database.close();
  }
}

export async function createLocalNote(
  title: string,
  transcript: string,
  audioFile: File,
) {
  const now = new Date().toISOString();
  const cleanTranscript = transcript.trim();
  const note: StoredVoiceNote = {
    id: crypto.randomUUID(),
    title: title.trim(),
    transcript: cleanTranscript,
    audio: audioFile,
    originalFilename: audioFile.name,
    mimeType: audioFile.type || "application/octet-stream",
    fileSize: audioFile.size,
    wordCount: cleanTranscript ? cleanTranscript.split(/\s+/).length : 0,
    createdAt: now,
    updatedAt: now,
  };

  const database = await openDatabase();

  try {
    const transaction = database.transaction(NOTES_STORE, "readwrite");
    await waitForRequest(transaction.objectStore(NOTES_STORE).put(note));
    return toVoiceNote(note);
  } finally {
    database.close();
  }
}

export async function renameLocalNote(id: string, title: string) {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(NOTES_STORE, "readwrite");
    const store = transaction.objectStore(NOTES_STORE);
    const note = await waitForRequest(
      store.get(id) as IDBRequest<StoredVoiceNote | undefined>,
    );

    if (!note) throw new Error("This note is no longer in browser storage.");

    const updatedNote: StoredVoiceNote = {
      ...note,
      title: title.trim(),
      updatedAt: new Date().toISOString(),
    };

    await waitForRequest(store.put(updatedNote));
    return toVoiceNote(updatedNote);
  } finally {
    database.close();
  }
}

export async function deleteLocalNote(id: string) {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(NOTES_STORE, "readwrite");
    await waitForRequest(transaction.objectStore(NOTES_STORE).delete(id));
  } finally {
    database.close();
  }
}
