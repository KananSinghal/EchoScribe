// --- Main Server File (server.js) ---

console.log('--- DEBUG 1: Server script execution started ---');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
// Loads environment variables from a .env file into process.env
require('dotenv').config();

// --- CRITICAL CHECK FOR ENVIRONMENT VARIABLES ---
const MONGO_URI = process.env.MONGO_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!MONGO_URI) {
    // If MONGO_URI is missing, log the fatal error and exit immediately.
    console.error("FATAL ERROR: MONGO_URI is missing. Please check your .env file location and format.");
    process.exit(1);
}

if (!OPENAI_API_KEY) {
    // If the API key is missing, warn the user but allow the server to start.
    console.warn("WARNING: OPENAI_API_KEY is missing. Transcription API calls will fail.");
}

console.log(`--- DEBUG 2: Environment variables loaded (MONGO_URI status: ${MONGO_URI ? 'FOUND' : 'MISSING - Should not see this if FATAL ERROR appears!'}) ---`);

// Assuming ./routes/note.routes.js exists and handles API logic
const noteRoutes = require('./routes/note.routes');

const app = express();
// PORT will now respect the .env file, or default to 5000 if not set.
const PORT = process.env.PORT || 3880; 


// --- Middleware ---

// Allow requests from the React app running on localhost:3000
app.use(cors({
  origin: 'http://localhost:3000' 
}));
// To parse incoming JSON request bodies
app.use(express.json());
// Serve static audio files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('--- DEBUG 3: Attempting MongoDB Connection ---');

// Connect to MongoDB using the validated URI
mongoose.connect(MONGO_URI) 
  .then(() => console.log("MongoDB connected successfully."))
  .catch(err => console.error("MongoDB connection error:", err));

console.log('--- DEBUG 4: MongoDB connection promise initiated ---');

// --- API Routes ---
app.use('/api/notes', noteRoutes);

// --- Global Error Handler (Simple) ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

console.log('--- DEBUG 5: App Listen command executed (should keep process open) ---');