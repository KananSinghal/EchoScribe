import {
  ApiError,
  countNotesSince,
  errorResponse,
  getOwnerId,
  getRuntime,
  insertNote,
  listNotes,
} from "../../lib/server";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_TRANSCRIPT_LENGTH = 200_000;
const ALLOWED_EXTENSIONS = new Set([
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "wav",
  "webm",
]);

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

export async function GET(request: Request) {
  try {
    const ownerId = await getOwnerId(request);
    const notes = await listNotes(ownerId);
    return Response.json({ notes });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  let savedAudioKey = "";

  try {
    const ownerId = await getOwnerId(request);
    const runtime = await getRuntime();
    const form = await request.formData();
    const title = cleanText(form.get("title"), 100);
    const transcript = cleanText(
      form.get("transcript"),
      MAX_TRANSCRIPT_LENGTH,
    );
    const audio = form.get("audio");

    if (!title) throw new ApiError(400, "A note title is required.");
    if (!transcript) {
      throw new ApiError(400, "The browser did not return a transcript.");
    }
    if (!(audio instanceof File)) {
      throw new ApiError(400, "Choose an audio file to save.");
    }

    const extension = fileExtension(audio.name);
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new ApiError(
        400,
        "Use an MP3, MP4, M4A, WAV, MPEG, MPGA, or WEBM audio file.",
      );
    }
    if (!audio.size || audio.size > MAX_FILE_SIZE) {
      throw new ApiError(400, "The audio file must be smaller than 25 MB.");
    }

    const configuredLimit = Number.parseInt(
      runtime.DAILY_NOTE_LIMIT || "10",
      10,
    );
    const dailyLimit =
      Number.isFinite(configuredLimit) && configuredLimit > 0
        ? Math.min(configuredLimit, 100)
        : 10;
    const usedToday = await countNotesSince(ownerId, startOfTodayUtc());

    if (usedToday >= dailyLimit) {
      throw new ApiError(
        429,
        `You have reached the daily limit of ${dailyLimit} saved notes.`,
      );
    }

    const id = crypto.randomUUID();
    savedAudioKey = `${ownerId}/${id}.${extension}`;
    const mimeType = audio.type || "application/octet-stream";

    await runtime.BUCKET.put(savedAudioKey, audio.stream(), {
      httpMetadata: { contentType: mimeType },
      customMetadata: {
        originalFilename: audio.name.slice(0, 180),
      },
    });

    const timestamp = new Date().toISOString();
    const note = await insertNote({
      id,
      owner_id: ownerId,
      title,
      transcript,
      audio_key: savedAudioKey,
      original_filename: audio.name.slice(0, 180),
      mime_type: mimeType,
      file_size: audio.size,
      word_count: transcript.split(/\s+/).filter(Boolean).length,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return Response.json(note, { status: 201 });
  } catch (error) {
    if (savedAudioKey) {
      try {
        const runtime = await getRuntime();
        await runtime.BUCKET.delete(savedAudioKey);
      } catch (cleanupError) {
        console.error("Could not remove an incomplete audio upload", cleanupError);
      }
    }

    return errorResponse(error);
  }
}
