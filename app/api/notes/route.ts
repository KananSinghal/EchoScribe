import {
  errorResponse,
  getOwnerId,
  listNotes,
} from "../../lib/server";

export async function GET(request: Request) {
  try {
    const ownerId = await getOwnerId(request);
    const notes = await listNotes(ownerId);
    return Response.json({ notes });
  } catch (error) {
    return errorResponse(error);
  }
}
