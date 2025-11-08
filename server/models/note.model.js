


const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  // Title for the note
  title: {
    type: String,
    required: true,
  },
  // The full transcript text from Whisper
  transcript: {
    type: String,
    required: true,
  },
  // Path to the saved audio file on the server
  // e.g., "/uploads/1678886400000-myaudio.mp3"
  audioUrl: {
    type: String, 
    required: true,
  },
  // Original name of the uploaded file
  originalFilename: {
    type: String,
    required: true,
  }
}, {
  // Adds createdAt and updatedAt timestamps
  timestamps: true 
});

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;