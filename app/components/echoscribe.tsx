"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  MicIcon,
  NotesIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
} from "./icons";
import { transcribeAudioInBrowser } from "../lib/browser-transcription";
import {
  createLocalNote,
  deleteLocalNote,
  listLocalNotes,
  releaseAudioUrl,
  renameLocalNote,
} from "../lib/local-notes";
import type { VoiceNote } from "../types";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "wav",
  "webm",
];

type CaptureMode = "upload" | "record";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function safeTitleFromFile(fileName: string) {
  const title = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return title || "Untitled voice note";
}

function validateAudio(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return "Choose an MP3, MP4, M4A, WAV, MPEG, MPGA, or WEBM file.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "The audio file must be smaller than 25 MB.";
  }
  return "";
}

export function EchoScribe() {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const notesRef = useRef<VoiceNote[]>([]);

  const selectedNote =
    notes.find((note) => note.id === selectedId) ?? notes[0] ?? null;

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const loadedNotes = await listLocalNotes();
      setNotes((current) => {
        current.forEach(releaseAudioUrl);
        return loadedNotes;
      });
      setSelectedId((current) => current ?? loadedNotes[0]?.id ?? null);
      setLoadError("");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load your notes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listLocalNotes()
      .then((loadedNotes) => {
        if (!active) {
          loadedNotes.forEach(releaseAudioUrl);
          return;
        }
        setNotes(loadedNotes);
        setSelectedId(loadedNotes[0]?.id ?? null);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load your notes.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    return () => notesRef.current.forEach(releaseAudioUrl);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredNotes = notes.filter((note) => {
    const value = search.trim().toLowerCase();
    if (!value) return true;
    return (
      note.title.toLowerCase().includes(value) ||
      note.transcript.toLowerCase().includes(value)
    );
  });

  function addNote(note: VoiceNote) {
    setNotes((current) => [note, ...current]);
    setSelectedId(note.id);
  }

  function updateNote(note: VoiceNote) {
    setNotes((current) =>
      current.map((item) => {
        if (item.id !== note.id) return item;
        releaseAudioUrl(item);
        return note;
      }),
    );
  }

  function removeNote(id: string) {
    setNotes((current) => {
      const removed = current.find((note) => note.id === id);
      if (removed) releaseAudioUrl(removed);
      const remaining = current.filter((note) => note.id !== id);
      if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
      return remaining;
    });
  }

  return (
    <main className="app">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="EchoScribe home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">EchoScribe</span>
        </Link>
        <div className="header-meta">
          <span className="tiny-label">
            <span className="status-dot" />
            Voice workspace
          </span>
          <span className="count-badge">
            {notes.length.toString().padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="workspace">
        <CapturePanel onNoteAdded={addNote} />

        <section className="panel" aria-labelledby="notes-heading">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Library</div>
              <h2 className="panel-title" id="notes-heading">
                Voice notes
              </h2>
            </div>
            <span className="count-badge">{filteredNotes.length}</span>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <label className="search-wrap">
              <span className="sr-only">Search notes</span>
              <SearchIcon />
              <input
                className="search-input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or transcript"
              />
              {search && (
                <button
                  className="clear-search"
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <CloseIcon size={13} />
                </button>
              )}
            </label>
          </div>

          <div className="notes-list">
            {loading ? (
              <div className="loading-state">
                <div>
                  <div className="loading-line" />
                  <p>Opening your voice library...</p>
                </div>
              </div>
            ) : loadError ? (
              <div className="empty-state">
                <div>
                  <h3>Library unavailable</h3>
                  <p>{loadError}</p>
                  <button
                    className="small-button"
                    type="button"
                    onClick={() => void loadNotes()}
                    style={{ marginTop: 16 }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="empty-state">
                <div>
                  <span className="empty-icon">
                    <NotesIcon />
                  </span>
                  <h3>{search ? "No matching notes" : "Your library is empty"}</h3>
                  <p>
                    {search
                      ? "Try a different word or clear the search."
                      : "Upload or record your first note to start a searchable archive."}
                  </p>
                </div>
              </div>
            ) : (
              filteredNotes.map((note, index) => (
                <button
                  key={note.id}
                  className={`note-card ${
                    selectedNote?.id === note.id ? "selected" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                >
                  <div className="note-topline">
                    <h3 className="note-title">{note.title}</h3>
                    <span className="note-index">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                  </div>
                  <p className="note-preview">{note.transcript}</p>
                  <div className="note-meta">
                    <span>{formatDate(note.createdAt)}</span>
                    <span>{note.wordCount} words</span>
                    <span>{formatBytes(note.fileSize)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <TranscriptPanel
          key={selectedNote?.id ?? "empty"}
          note={selectedNote}
          onUpdated={updateNote}
          onDeleted={removeNote}
          onToast={setToast}
        />
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}

function CapturePanel({
  onNoteAdded,
}: {
  onNoteAdded: (note: VoiceNote) => void;
}) {
  const [mode, setMode] = useState<CaptureMode>("upload");
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function chooseFile(file: File) {
    const error = validateAudio(file);
    if (error) {
      setMessage(error);
      return;
    }
    setAudioFile(file);
    setTitle((current) => current || safeTitleFromFile(file.name));
    setMessage("");
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) chooseFile(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) chooseFile(file);
  }

  function clearFile() {
    setAudioFile(null);
    setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage("Audio recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, {
          type: mimeType,
        });
        chooseFile(file);
        setTitle((current) => current || "Recorded voice note");
        stream.getTracks().forEach((track) => track.stop());
      });

      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      setMessage("");
      timerRef.current = window.setInterval(
        () => setRecordingSeconds((value) => value + 1),
        1000,
      );
    } catch {
      setMessage("Microphone access was blocked. Allow access and try again.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function switchMode(nextMode: CaptureMode) {
    if (recording) stopRecording();
    setMode(nextMode);
    setMessage("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!audioFile) {
      setMessage("Choose an audio file or record a voice note first.");
      return;
    }
    if (!title.trim()) {
      setMessage("Add a short title before transcribing.");
      return;
    }

    setSubmitting(true);
    setMessage("Preparing audio...");

    try {
      const transcript = await transcribeAudioInBrowser(audioFile, setMessage);
      setMessage("Saving note...");

      const note = await createLocalNote(title, transcript, audioFile);
      onNoteAdded(note);
      setAudioFile(null);
      setTitle("");
      setRecordingSeconds(0);
      if (inputRef.current) inputRef.current.value = "";
      setMessage("Transcription saved to your library.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Transcription failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="capture-heading">
      <div className="panel-head">
        <div>
          <div className="panel-kicker">New note</div>
          <h1 className="panel-title" id="capture-heading">
            Capture audio
          </h1>
        </div>
        <span className="count-badge">01</span>
      </div>
      <div className="panel-body">
        <p className="intro-copy">
          Record a thought or upload existing audio. EchoScribe transcribes and
          saves it only in this browser, without sending it to a paid service.
        </p>

        <div className="mode-tabs" role="tablist" aria-label="Audio source">
          <button
            className={`mode-tab ${mode === "upload" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={mode === "upload"}
            onClick={() => switchMode("upload")}
          >
            Upload file
          </button>
          <button
            className={`mode-tab ${mode === "record" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={mode === "record"}
            onClick={() => switchMode("record")}
          >
            Record now
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="note-title">Note title</label>
            <input
              className="text-input"
              id="note-title"
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Monday research notes"
            />
          </div>

          <div className="field">
            <label>{mode === "upload" ? "Audio file" : "Microphone"}</label>
            {mode === "upload" ? (
              audioFile ? (
                <SelectedFile file={audioFile} onClear={clearFile} />
              ) : (
                <label
                  className={`drop-zone ${dragging ? "dragging" : ""}`}
                  onDragEnter={() => setDragging(true)}
                  onDragLeave={() => setDragging(false)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onDrop}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,audio/*"
                    onChange={onInputChange}
                  />
                  <span>
                    <span className="drop-icon">
                      <UploadIcon />
                    </span>
                    <span className="drop-title">Drop audio here or browse</span>
                    <span className="drop-help">
                      MP3, M4A, WAV or WEBM
                      <br />
                      Up to 25 MB
                    </span>
                  </span>
                </label>
              )
            ) : (
              <>
                <div className="record-box">
                  <div>
                    <button
                      className={`record-control ${recording ? "recording" : ""}`}
                      type="button"
                      onClick={recording ? stopRecording : startRecording}
                      aria-label={recording ? "Stop recording" : "Start recording"}
                      title={recording ? "Stop recording" : "Start recording"}
                    >
                      {recording ? <span className="stop-square" /> : <MicIcon />}
                    </button>
                    <div className="record-time">
                      {formatClock(recordingSeconds)}
                    </div>
                    <p className="record-help">
                      {recording ? "Recording — press to stop" : "Press to record"}
                    </p>
                    {recording && (
                      <div className="wave" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                  </div>
                </div>
                {audioFile && (
                  <SelectedFile file={audioFile} onClear={clearFile} />
                )}
              </>
            )}
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={!audioFile || submitting || recording}
          >
            {submitting ? "Working on this device..." : "Transcribe and save"}
          </button>
          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

function SelectedFile({
  file,
  onClear,
}: {
  file: File;
  onClear: () => void;
}) {
  return (
    <div className="selected-file">
      <span className="file-icon">
        <FileIcon />
      </span>
      <span className="file-details">
        <div className="file-name">{file.name}</div>
        <div className="file-meta">{formatBytes(file.size)} · ready</div>
      </span>
      <button
        className="icon-button"
        type="button"
        onClick={onClear}
        aria-label="Remove selected audio"
        title="Remove selected audio"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function TranscriptPanel({
  note,
  onUpdated,
  onDeleted,
  onToast,
}: {
  note: VoiceNote | null;
  onUpdated: (note: VoiceNote) => void;
  onDeleted: (id: string) => void;
  onToast: (message: string) => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [saving, setSaving] = useState(false);

  if (!note) {
    return (
      <section className="panel transcript-panel">
        <div className="transcript-placeholder">
          <div className="transcript-placeholder-inner">
            <div className="eyebrow">Your words, organised</div>
            <h2>Turn spoken ideas into notes you can find.</h2>
            <p>
              Select a voice note to read its transcript, replay the source
              audio, rename it, or export the text.
            </p>
          </div>
        </div>
      </section>
    );
  }

  async function saveTitle() {
    if (!note) return;
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle === note.title) return;
    setSaving(true);
    try {
      const updatedNote = await renameLocalNote(note.id, cleanTitle);
      onUpdated(updatedNote);
      onToast("Title updated.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not rename note.");
      setTitle(note?.title ?? "");
    } finally {
      setSaving(false);
    }
  }

  async function copyTranscript() {
    await navigator.clipboard.writeText(note?.transcript ?? "");
    onToast("Transcript copied.");
  }

  function downloadTranscript() {
    if (!note) return;
    const blob = new Blob([`${note.title}\n\n${note.transcript}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    onToast("Transcript downloaded.");
  }

  async function deleteNote() {
    if (!note || !window.confirm(`Delete "${note.title}"?`)) return;
    try {
      await deleteLocalNote(note.id);
      onDeleted(note.id);
      onToast("Voice note deleted.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not delete note.");
    }
  }

  return (
    <section className="panel transcript-panel" aria-labelledby="transcript-title">
      <div className="panel-head">
        <div>
          <div className="panel-kicker">Transcript</div>
          <h2 className="panel-title">Reading view</h2>
        </div>
        <div className="transcript-toolbar">
          <button
            className="icon-button"
            type="button"
            onClick={() => void copyTranscript()}
            aria-label="Copy transcript"
            title="Copy transcript"
          >
            <CopyIcon />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={downloadTranscript}
            aria-label="Download transcript"
            title="Download transcript"
          >
            <DownloadIcon />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => void deleteNote()}
            aria-label="Delete note"
            title="Delete note"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
      <div className="transcript-body">
        <label className="sr-only" htmlFor="selected-note-title">
          Note title
        </label>
        <input
          className="title-editor"
          id="selected-note-title"
          value={title}
          maxLength={100}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => void saveTitle()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          aria-describedby="rename-help"
        />
        <span className="sr-only" id="rename-help">
          Edit the title and press Enter or leave the field to save.
        </span>
        <div className="transcript-meta">
          <span>{formatDate(note.createdAt)}</span>
          <span>{note.wordCount} words</span>
          <span>{formatBytes(note.fileSize)}</span>
          {saving && <span>saving...</span>}
        </div>
        <audio
          className="audio-player"
          src={note.audioUrl}
          controls
          preload="metadata"
        >
          Your browser does not support audio playback.
        </audio>
        <article className="transcript-copy" id="transcript-title">
          {note.transcript}
        </article>
      </div>
    </section>
  );
}
