type WorkerResponse =
  | { type: "status"; message: string }
  | { type: "complete"; transcript: string }
  | { type: "error"; message: string };

type ActiveJob = {
  resolve: (transcript: string) => void;
  reject: (error: Error) => void;
  onStatus: (message: string) => void;
};

let transcriptionWorker: Worker | null = null;
let activeJob: ActiveJob | null = null;

function resetWorker(message: string) {
  activeJob?.reject(new Error(message));
  activeJob = null;
  transcriptionWorker?.terminate();
  transcriptionWorker = null;
}

function getWorker() {
  if (transcriptionWorker) return transcriptionWorker;

  transcriptionWorker = new Worker("/transcription.worker.js", {
    type: "module",
  });

  transcriptionWorker.addEventListener(
    "message",
    (event: MessageEvent<WorkerResponse>) => {
      if (!activeJob) return;

      if (event.data.type === "status") {
        activeJob.onStatus(event.data.message);
        return;
      }

      if (event.data.type === "complete") {
        activeJob.resolve(event.data.transcript);
        activeJob = null;
        return;
      }

      const message = event.data.message || "Browser transcription failed.";
      activeJob.reject(new Error(message));
      activeJob = null;
    },
  );

  transcriptionWorker.addEventListener("error", () => {
    resetWorker(
      "The browser could not load the speech model. Check your connection and try again.",
    );
  });

  return transcriptionWorker;
}

async function decodeAndResample(file: File) {
  const audioContext = new AudioContext();

  try {
    const decoded = await audioContext.decodeAudioData(await file.arrayBuffer());
    const outputLength = Math.max(1, Math.ceil(decoded.duration * 16_000));
    const offlineContext = new OfflineAudioContext(1, outputLength, 16_000);
    const source = offlineContext.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineContext.destination);
    source.start();

    const rendered = await offlineContext.startRendering();
    return rendered.getChannelData(0).slice();
  } catch {
    throw new Error(
      "This browser could not read the selected audio. Try MP3, WAV, M4A, or WEBM.",
    );
  } finally {
    await audioContext.close();
  }
}

export async function transcribeAudioInBrowser(
  file: File,
  onStatus: (message: string) => void,
) {
  if (activeJob) {
    throw new Error("Another transcription is already running.");
  }

  onStatus("Preparing audio...");
  const audio = await decodeAndResample(file);

  if (!audio.length) throw new Error("The selected audio is empty.");

  return new Promise<string>((resolve, reject) => {
    activeJob = { resolve, reject, onStatus };
    getWorker().postMessage(
      {
        type: "transcribe",
        audio,
      },
      [audio.buffer],
    );
  });
}
