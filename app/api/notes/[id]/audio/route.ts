import {
  ApiError,
  errorResponse,
  findNote,
  getOwnerId,
  getRuntime,
} from "../../../../lib/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const ownerId = await getOwnerId(request);
    const { id } = await context.params;
    const note = await findNote(ownerId, id);
    if (!note) throw new ApiError(404, "Voice note not found.");

    const runtime = await getRuntime();
    const object = await runtime.BUCKET.get(note.audio_key);
    if (!object?.body) throw new ApiError(404, "Audio file not found.");

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", note.mime_type);
    headers.set("Content-Length", String(note.file_size));
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(note.original_filename)}`,
    );

    return new Response(object.body, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
