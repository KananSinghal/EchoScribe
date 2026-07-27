export async function GET() {
  const { env } = await import("cloudflare:workers");
  const runtime = env as unknown as {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  };

  return Response.json({
    status: "ok",
    storage: Boolean(runtime.DB && runtime.BUCKET),
    transcription: "browser",
  });
}
