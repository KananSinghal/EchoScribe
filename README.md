# EchoScribe

EchoScribe is a voice-note workspace that records or uploads audio, creates a
transcript in the browser, and keeps every note searchable.

## Features

- Record audio in the browser or upload an existing file
- Transcribe without a paid API or secret key
- Run a quantized Whisper model on the visitor's device
- Search note titles and transcript text
- Replay, rename, copy, download, and delete notes
- Keep every visitor's notes private to their own browser

## Stack

- React 19 and TypeScript
- Vinext with the Next.js App Router
- Transformers.js with `onnx-community/whisper-tiny`
- Cloudflare Workers
- IndexedDB for browser-local notes and audio

## How free transcription works

The browser downloads a small quantized Whisper model from Hugging Face and
runs it locally using ONNX Runtime Web. The recording and transcript stay in
the visitor's browser, so no transcription API key or storage subscription is
needed.

The first transcription takes longer because the model must be downloaded.
Later attempts reuse the browser cache. Chrome and Edge usually provide the
best performance.

## Run locally

Use Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Notes are saved in the browser's IndexedDB storage.

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

Wrangler prints the public `workers.dev` URL when deployment finishes. There is
no OpenAI key, R2 subscription, database, or secret to add.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Demo privacy

Notes and recordings are stored in IndexedDB on the visitor's own device.
Different visitors cannot see one another's notes. Clearing the browser's site
data also removes the saved notes, so this setup is best suited to a portfolio
demo rather than a synced account system.

## License

MIT
