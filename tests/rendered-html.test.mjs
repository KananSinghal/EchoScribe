import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders the EchoScribe workspace", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(
    response.headers.get("set-cookie") ?? "",
    /echoscribe_session=[0-9a-f-]+/i,
  );
  const html = await response.text();
  assert.match(html, /EchoScribe/);
  assert.match(html, /Capture audio/);
  assert.match(html, /Voice notes/);

  const transcriptionWorker = await readFile(
    new URL("../dist/client/transcription.worker.js", import.meta.url),
    "utf8",
  );
  assert.match(transcriptionWorker, /onnx-community\/whisper-tiny/);
  assert.match(transcriptionWorker, /cdn\.jsdelivr\.net/);
});
