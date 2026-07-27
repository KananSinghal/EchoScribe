import type { VoiceNote } from "../types";

type RuntimeEnv = {
  DB: D1Database;
  BUCKET: R2Bucket;
  DAILY_NOTE_LIMIT?: string;
};

type NoteRow = {
  id: string;
  owner_id: string;
  title: string;
  transcript: string;
  audio_key: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  word_count: number;
  created_at: string;
  updated_at: string;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getRuntime() {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as RuntimeEnv;
  if (!runtime.DB) throw new ApiError(503, "Note storage is not available.");
  if (!runtime.BUCKET) throw new ApiError(503, "Audio storage is not available.");
  return runtime;
}

export async function ensureDatabase() {
  const { DB } = await getRuntime();
  await DB.batch([
    DB.prepare(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL,
        transcript TEXT NOT NULL,
        audio_key TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        word_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `),
    DB.prepare(
      "CREATE INDEX IF NOT EXISTS notes_owner_created_idx ON notes (owner_id, created_at)",
    ),
    DB.prepare(
      "CREATE INDEX IF NOT EXISTS notes_owner_id_idx ON notes (owner_id, id)",
    ),
  ]);
}

export async function getOwnerId(request: Request) {
  const sessionId = request.headers.get("x-echoscribe-session");
  const validSession =
    sessionId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionId,
    );

  if (!validSession) {
    throw new ApiError(401, "Refresh the page to start your browser session.");
  }

  const bytes = new TextEncoder().encode(`browser:${sessionId.toLowerCase()}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function listNotes(ownerId: string) {
  await ensureDatabase();
  const { DB } = await getRuntime();
  const result = await DB.prepare(
    `SELECT id, owner_id, title, transcript, audio_key, original_filename,
      mime_type, file_size, word_count, created_at, updated_at
     FROM notes
     WHERE owner_id = ?
     ORDER BY created_at DESC
     LIMIT 200`,
  )
    .bind(ownerId)
    .all<NoteRow>();

  return result.results.map(toVoiceNote);
}

export async function findNote(ownerId: string, id: string) {
  await ensureDatabase();
  const { DB } = await getRuntime();
  const row = await DB.prepare(
    `SELECT id, owner_id, title, transcript, audio_key, original_filename,
      mime_type, file_size, word_count, created_at, updated_at
     FROM notes
     WHERE owner_id = ? AND id = ?
     LIMIT 1`,
  )
    .bind(ownerId, id)
    .first<NoteRow>();

  return row ?? null;
}

export async function countNotesSince(ownerId: string, timestamp: string) {
  await ensureDatabase();
  const { DB } = await getRuntime();
  const row = await DB.prepare(
    "SELECT COUNT(*) AS total FROM notes WHERE owner_id = ? AND created_at >= ?",
  )
    .bind(ownerId, timestamp)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

export async function insertNote(row: NoteRow) {
  await ensureDatabase();
  const { DB } = await getRuntime();
  await DB.prepare(
    `INSERT INTO notes (
      id, owner_id, title, transcript, audio_key, original_filename,
      mime_type, file_size, word_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.owner_id,
      row.title,
      row.transcript,
      row.audio_key,
      row.original_filename,
      row.mime_type,
      row.file_size,
      row.word_count,
      row.created_at,
      row.updated_at,
    )
    .run();
  return toVoiceNote(row);
}

export async function renameNote(ownerId: string, id: string, title: string) {
  await ensureDatabase();
  const { DB } = await getRuntime();
  const updatedAt = new Date().toISOString();
  const result = await DB.prepare(
    "UPDATE notes SET title = ?, updated_at = ? WHERE owner_id = ? AND id = ?",
  )
    .bind(title, updatedAt, ownerId, id)
    .run();

  if (!result.meta.changes) return null;
  return findNote(ownerId, id);
}

export async function deleteNote(ownerId: string, id: string) {
  const note = await findNote(ownerId, id);
  if (!note) return null;
  const { DB, BUCKET } = await getRuntime();
  await DB.prepare("DELETE FROM notes WHERE owner_id = ? AND id = ?")
    .bind(ownerId, id)
    .run();
  await BUCKET.delete(note.audio_key);
  return note;
}

export function toVoiceNote(row: NoteRow): VoiceNote {
  return {
    id: row.id,
    title: row.title,
    transcript: row.transcript,
    audioUrl: `/api/notes/${row.id}/audio`,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    wordCount: row.word_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json(
    { error: "Something went wrong while processing this request." },
    { status: 500 },
  );
}
