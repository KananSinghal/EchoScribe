

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const Note = require('../models/note.model');

const router = express.Router();



// Ensure the 'uploads' directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Store files in the 'uploads' directory with their original name + timestamp
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// --- OpenAI Whisper API Configuration ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';



/**
 * @route   GET /api/notes
 * @desc    Get all transcribed notes
 */
router.get('/', async (req, res) => {
  try {
    // Find all notes and sort by newest first
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err.message);
    res.status(500).json({ error: 'Server error while fetching notes.' });
  }
});

/**
 * @route   POST /api/notes/transcribe
 * @desc    Upload audio file, transcribe it, and save to DB
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file was uploaded.' });
  }

  const filePath = req.file.path;

  try {
    // --- 1. Call Whisper API ---
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    // You can add more options here, like 'response_format', 'language', etc.

    let transcriptText = '';

    try {
      const whisperResponse = await axios.post(WHISPER_API_URL, formData, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders()
        }
      });
      transcriptText = whisperResponse.data.text;
      
    } catch (apiError) {
      // Handle potential errors from the Whisper API
      console.error('Whisper API error:', apiError.response ? apiError.response.data : apiError.message);
      // Don't delete the file, maybe transcription failed but upload is ok
      // fs.unlinkSync(filePath); // Clean up the uploaded file
      return res.status(500).json({ error: 'Failed to transcribe audio.' });
    }

    // --- 2. Save to MongoDB ---
    const newNote = new Note({
      title: req.body.title || `Note: ${req.file.originalname}`,
      transcript: transcriptText,
      audioUrl: `/${req.file.path}`, // Path to access it via the server
      originalFilename: req.file.originalname,
    });

    await newNote.save();
    
    // Send the new note back to the client
    res.status(201).json(newNote);

  } catch (err) {
    // Handle database or other server errors
    console.error('Server error during transcription:', err.message);
    // Clean up the file if saving to DB fails
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    res.status(500).json({ error: 'Server error during transcription process.' });
  }
});

module.exports = router;