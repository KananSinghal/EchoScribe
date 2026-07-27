# EchoScribe

EchoScribe is a voice-note workspace that records or uploads audio, creates a
transcript in the browser, and keeps every note searchable.

## Features

- Record audio in the browser or upload an existing file
- Transcribe without a paid API or secret key
- Run a quantized Whisper model on the visitor's device
- Search note titles and transcript text
- Replay, rename, copy, download, and delete notes
- Keep demo visitors separate with a browser session cookie

## Stack

- React 19 and TypeScript
- Vinext with the Next.js App Router
- Transformers.js with `onnx-community/whisper-tiny`
- Cloudflare Workers
- Cloudflare D1 for note information
- Cloudflare R2 for audio files

## How free transcription works

The browser downloads a small quantized Whisper model from Hugging Face and
runs it locally using ONNX Runtime Web. The recording is sent to Cloudflare
only after the transcript is complete, so no transcription API key is needed.

The first transcription takes longer because the model must be downloaded.
Later attempts reuse the browser cache. Chrome and Edge usually provide the
best performance.

## Run locally

Use Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Local D1 and R2 storage is created automatically by Wrangler.

## Deploy to Cloudflare Workers

Create a Cloudflare account, then run:

```bash
npm run cf:login
npm run cf:whoami
```

Copy the Account ID printed by `wrangler whoami` and set it in the same
Terminal window:

```bash
export CLOUDFLARE_ACCOUNT_ID="paste-your-account-id"
```

Deploy:

```bash
npm run deploy
```

The first deployment automatically creates the D1 database and R2 bucket.
Wrangler prints the public `workers.dev` URL when deployment finishes. There is
no OpenAI key to add.

After deployment, Wrangler may add generated D1 and R2 resource details to
`wrangler.jsonc`. These IDs are not secret and can be committed.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Demo privacy

Each browser gets a random session cookie so visitors do not see one another's
notes. This is suitable for a portfolio demo, but it is not a complete account
system. Do not upload sensitive recordings to a public demo.

## License

MIT
