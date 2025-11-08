// --- React App (client/src/App.jsx) ---
// This single file contains the entire frontend logic and styling.

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- Configuration ---
// The base URL for our backend server
const API_URL = 'http://localhost:3880';

// --- Icon Components (using SVG) ---
// Simple icons to avoid external dependencies.

const IconUpload = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconLoader = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

// --- Main App Component ---
function App() {
  return (
    <div className="bg-gray-900 min-h-screen text-gray-100 font-sans">
      <Header />
      <main className="max-w-4xl mx-auto p-4">
        <EchoScribeApp />
      </main>
      <Footer />
    </div>
  );
}

// --- Header Component ---
const Header = () => (
  <header className="bg-gray-800 shadow-md">
    <nav className="max-w-4xl mx-auto p-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-white tracking-wider">
        Echo<span className="text-cyan-400">Scribe</span>
      </h1>
      <p className="text-gray-400">Your AI Voice Note Companion</p>
    </nav>
  </header>
);

// --- Footer Component ---
const Footer = () => (
  <footer className="text-center p-4 mt-8 text-gray-500 text-sm">
    © {new Date().getFullYear()} EchoScribe. Powered by React, Node.js, and Whisper.
  </footer>
);

// --- Core Application Logic Component ---
const EchoScribeApp = () => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all notes from the server on initial component mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/api/notes`);
        setNotes(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch notes:', err);
        setError('Failed to load notes. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, []);

  // Callback function to add a new note to the list
  // This is passed to the UploadForm component
  const onNoteAdded = (newNote) => {
    setNotes([newNote, ...notes]);
  };

  return (
    <div className="space-y-8">
      {/* --- Upload Form Section --- */}
      <UploadForm onNoteAdded={onNoteAdded} />

      {/* --- Notes List Section --- */}
      <div className="bg-gray-800 rounded-lg shadow-xl p-6">
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">My Voice Notes</h2>
        {isLoading && <p>Loading notes...</p>}
        {error && <p className="text-red-400">{error}</p>}
        
        {!isLoading && !error && (
          <div className="space-y-6">
            {notes.length === 0 ? (
              <p className="text-gray-400">You don't have any notes yet. Upload one to get started!</p>
            ) : (
              notes.map((note) => (
                <NoteItem key={note._id} note={note} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Upload Form Component ---
const UploadForm = ({ onNoteAdded }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [fileName, setFileName] = useState('No file selected');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      
      // Auto-fill title based on file name (without extension)
      const nameWithoutExtension = selectedFile.name.split('.').slice(0, -1).join('.');
      setTitle(nameWithoutExtension || selectedFile.name);
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select an audio file to upload.');
      return;
    }
    if (!title.trim()) {
      setUploadError('Please provide a title for your note.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', title);

    try {
      // Post the form data to our backend 'transcribe' endpoint
      const response = await axios.post(`${API_URL}/api/notes/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Pass the new note (from the server response) up to the parent
      onNoteAdded(response.data);

      // Reset the form
      setFile(null);
      setTitle('');
      setFileName('No file selected');
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6">
      <h2 className="text-xl font-semibold mb-4 text-cyan-400">Transcribe New Note</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
            Note Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={handleTitleChange}
            placeholder="e.g., 'My Great Idea' or 'Meeting Notes'"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            required
          />
        </div>

        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Audio File
          </label>
          <div 
            className="flex items-center px-3 py-2 bg-gray-700 border border-dashed border-gray-600 rounded-md cursor-pointer hover:border-cyan-500"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <IconUpload />
            <span className="text-gray-400 truncate">{fileName}</span>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
          />
        </div>

        {/* Upload Button */}
        <button
          type="submit"
          disabled={isUploading}
          className="w-full flex justify-center items-center px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md shadow-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <IconLoader />
              Transcribing...
            </>
          ) : (
            'Upload & Transcribe'
          )}
        </button>

        {/* Error Message */}
        {uploadError && (
          <p className="text-sm text-red-400 text-center">{uploadError}</p>
        )}
      </form>
    </div>
  );
};

// --- Single Note Item Component ---
const NoteItem = ({ note }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const fullAudioUrl = `${API_URL}${note.audioUrl.replace(/\\/g, '/')}`;

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };
  
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleEnded = () => setIsPlaying(false);

  return (
    <div className="bg-gray-700 p-4 rounded-lg shadow-md transition-shadow hover:shadow-lg">
      <div className="flex justify-between items-center mb-3">
        {/* Title and Date */}
        <div>
          <h3 className="text-lg font-semibold text-white">{note.title}</h3>
          <p className="text-xs text-gray-400">
            {new Date(note.createdAt).toLocaleString()}
          </p>
        </div>
        
        {/* Audio Player Control */}
        <button
          onClick={togglePlay}
          className="p-2 bg-cyan-600 text-white rounded-full shadow-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-700"
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {/* We only need a 'Play' icon. The browser's native controls will show pause. */}
          {/* For a custom player, we'd toggle this icon. */}
          {/* For simplicity, we just use a play button to start. */}
          <IconPlay />
        </button>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={fullAudioUrl}
        controls // Show native browser controls
        className="w-full h-10 mt-2"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      >
        Your browser does not support the audio element.
      </audio>

      {/* Transcript */}
      <div className="mt-4 p-3 bg-gray-800 rounded-md">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Transcript:</h4>
        <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
          {note.transcript}
        </p>
      </div>
    </div>
  );
};

export default App;