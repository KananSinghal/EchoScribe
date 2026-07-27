import {
  ApiError,
  countNotesSince,
  errorResponse,
  getOwnerId,
  getRuntime,
  insertNote,
} from "../../../lib/server";

const OPENAI_TRANSCRIPTION_URL =
  "https://api.openai.com/v1/audio/transcriptions";
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "wav",
  "webm",
]);

function cleanTitle(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 100);
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

async function transcribeAudio(file: File) {
  const runtime = await getRuntime();
  if (!runtime.OPENAI_API_KEY) {
    throw new ApiError(
      503,
      "Transcription is not configured yet. Add a new OpenAI API key in the deployment settings.",
    );
  }

  const form = new FormData();
  form.append("file", file, file.name);
  form.append(
    "model",
    runtime.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
  );
  form.append("response_format", "json");

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.OPENAI_API_KEY}`,
    },
    body: form,
  });

  const payload = (await response.json()) as {
    text?: string;
    error?: { message?: string };
  };
  if (!response.ok || !payload.text?.trim()) {
    console.error("Transcription request failed", response.status, payload.error);
    throw new ApiError(
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "The transcription service is busy. Try again in a moment."
        : "The audio could not be transcribed. Check the file and try again.",
    );
  }
  return payload.text.trim();
}

export async function POST(request: Request) {
  let savedAudioKey = "";
  try {
    const ownerId = await getOwnerId(request);
    const runtime = await getRuntime();
    const form = await request.formData();
    const title = cleanTitle(form.get("title"));
    const audio = form.get("audio");

    if (!title) throw new ApiError(400, "A note title is required.");
    if (!(audio instanceof File)) {
      throw new ApiError(400, "Choose an audio file to transcribe.");
    }
    if (!ALLOWED_EXTENSIONS.has(fileExtension(audio.name))) {
      throw new ApiError(
        400,
        "Use an MP3, MP4, M4A, WAV, MPEG, MPGA, or WEBM audio file.",
      );
    }
    if (!audio.size || audio.size > MAX_FILE_SIZE) {
      throw new ApiError(400, "The audio file must be smaller than 25 MB.");
    }

    const configuredLimit = Number.parseInt(
      runtime.DAILY_TRANSCRIPTION_LIMIT || "10",
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
        `You have reached the daily limit of ${dailyLimit} transcriptions.`,
      );
    }

    const transcript = await transcribeAudio(audio);
    const id = crypto.randomUUID();
    const safeExtension = fileExtension(audio.name);
    savedAudioKey = `${ownerId}/${id}.${safeExtension}`;
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
