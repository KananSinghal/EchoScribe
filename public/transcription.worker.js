import {
  env,
  pipeline,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

const MODEL_ID = "onnx-community/whisper-tiny";

env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriberPromise = null;

function sendStatus(message) {
  self.postMessage({ type: "status", message });
}

function getTranscriber() {
  if (!transcriberPromise) {
    sendStatus("Loading the free speech model...");

    transcriberPromise = pipeline(
      "automatic-speech-recognition",
      MODEL_ID,
      {
        dtype: "q8",
        progress_callback: (progress) => {
          if (
            progress.status === "progress" &&
            typeof progress.progress === "number" &&
            Number.isFinite(progress.progress)
          ) {
            sendStatus(
              `Downloading speech model ${Math.round(progress.progress)}%...`,
            );
          }
        },
      },
    );
  }

  return transcriberPromise;
}

function transcriptText(result) {
  if (Array.isArray(result)) {
    return result
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return result.text.replace(/\s+/g, " ").trim();
}

self.addEventListener("message", async (event) => {
  if (event.data.type !== "transcribe") return;

  try {
    const transcriber = await getTranscriber();
    sendStatus("Transcribing on this device...");

    const result = await transcriber(event.data.audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });
    const transcript = transcriptText(result);

    if (!transcript) {
      throw new Error(
        "No speech was detected. Try a clearer or louder recording.",
      );
    }

    self.postMessage({ type: "complete", transcript });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The browser could not transcribe this audio.";
    self.postMessage({ type: "error", message });
  }
});
