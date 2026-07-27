# EchoScribe

EchoScribe is a private voice-note workspace. It records audio in the browser,
accepts existing audio files, creates a transcript, and keeps every note
searchable.

## What it can do

- Record directly from the browser or upload an audio file
- Transcribe MP3, MP4, M4A, MPEG, MPGA, WAV, and WEBM files
- Search across note titles and transcript text
- Replay the original audio
- Rename, copy, download, and delete transcripts
- Keep each signed-in user's notes separate
- Limit transcription usage per user each day

## Stack

- React 19 with TypeScript
- Vinext and the Next.js App Router
- Cloudflare D1 for note metadata
- Cloudflare R2 for audio files
- OpenAI Audio Transcriptions API
- Tailwind CSS 4 and custom CSS

## Project structure

```text
app/
  api/                  API routes for notes, audio, and transcription
  components/           Main workspace and icon components
  lib/server.ts         D1, R2, ownership, and error helpers
  globals.css           Complete visual system
db/schema.ts            Database schema
drizzle/                Generated database migrations
worker/index.ts         Worker entry point
```

## Environment variables

Copy `.env.example` to `.env` for local development:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_TRANSCRIPTION_MODEL=whisper-1
DAILY_TRANSCRIPTION_LIMIT=10
```

Keep the API key only in local or hosted environment settings. Never commit it.

## Run locally

Use Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

The local development server creates local D1 and R2 storage automatically.

## Checks

```bash
npm run lint
npm test
```

## Security choices

- API keys stay on the server.
- Notes are scoped to a hashed user identifier.
- Audio types and the 25 MB upload limit are checked on both client and server.
- Failed database writes remove incomplete audio uploads.
- The daily limit defaults to 10 transcriptions per user.

## License

MIT
