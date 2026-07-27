import {
  ApiError,
  deleteNote,
  errorResponse,
  getOwnerId,
  renameNote,
} from "../../../lib/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const ownerId = await getOwnerId(request);
    const { id } = await context.params;
    const body = (await request.json()) as { title?: unknown };
    const title =
      typeof body.title === "string"
        ? body.title.replace(/\s+/g, " ").trim().slice(0, 100)
        : "";

    if (!title) throw new ApiError(400, "A note title is required.");
    const note = await renameNote(ownerId, id, title);
    if (!note) throw new ApiError(404, "Voice note not found.");
    return Response.json({
      id: note.id,
      title: note.title,
      transcript: note.transcript,
      audioUrl: `/api/notes/${note.id}/audio`,
      originalFilename: note.original_filename,
      mimeType: note.mime_type,
      fileSize: note.file_size,
      wordCount: note.word_count,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const ownerId = await getOwnerId(request);
    const { id } = await context.params;
    const note = await deleteNote(ownerId, id);
    if (!note) throw new ApiError(404, "Voice note not found.");
    return Response.json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
