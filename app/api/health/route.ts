export async function GET() {
  return Response.json({
    status: "ok",
    storage: "browser",
    transcription: "browser",
  });
}
