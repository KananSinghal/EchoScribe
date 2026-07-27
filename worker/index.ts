import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BUCKET: R2Bucket;
  DAILY_NOTE_LIMIT?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const SESSION_COOKIE = "echoscribe_session";
const SESSION_HEADER = "x-echoscribe-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  for (const item of cookieHeader.split(";")) {
    const [name, ...valueParts] = item.trim().split("=");
    if (name === SESSION_COOKIE) {
      const value = valueParts.join("=");
      return UUID_PATTERN.test(value) ? value.toLowerCase() : "";
    }
  }

  return "";
}

function requestWithSession(request: Request, sessionId: string) {
  const headers = new Headers(request.headers);

  // This value always comes from the Worker, not from a visitor-supplied
  // request header.
  headers.set(SESSION_HEADER, sessionId);

  return new Request(request, { headers });
}

function responseWithSessionCookie(
  response: Response,
  sessionId: string,
  secure: boolean,
) {
  const headers = new Headers(response.headers);
  const securePart = secure ? "; Secure" : "";

  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${securePart}`,
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    let sessionId = readSessionCookie(request);
    const isNewSession = !sessionId;

    if (isNewSession) sessionId = crypto.randomUUID();

    const response = await handler.fetch(
      requestWithSession(request, sessionId),
      env,
      ctx,
    );

    if (!isNewSession) return response;

    return responseWithSessionCookie(
      response,
      sessionId,
      url.protocol === "https:",
    );
  },
};

export default worker;
