
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const { createObjectCsvWriter } = require('csv-writer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.mp4'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload audio files only.'));
    }
  }
});

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key-here';

// Helper function to call OpenAI API
async function callOpenAI(prompt, model = 'gpt-3.5-turbo', maxTokens = 1500) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    throw new Error('Failed to process with OpenAI');
  }
}

// Helper function for speech-to-text using OpenAI Whisper
async function transcribeAudio(audioFilePath) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', 'whisper-1');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    return response.data.text;
  } catch (error) {
    console.error('Whisper API Error:', error.response?.data || error.message);
    throw new Error('Failed to transcribe audio');
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Lecture Voice-to-Notes API is running' });
});

// Transcribe audio endpoint
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const transcription = await transcribeAudio(req.file.path);

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    res.json({ transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Generate study notes endpoint
app.post('/api/generate-notes', async (req, res) => {
  try {
    const { transcription } = req.body;

    if (!transcription) {
      return res.status(400).json({ error: 'No transcription provided' });
    }

    const prompt = `Convert the following lecture transcription into well-organized study notes. Format the response as bullet points covering key concepts, definitions, and important information. Make it suitable for student review and studying:

${transcription}

Please provide clear, concise bullet points that capture the main ideas and important details.`;

    const notes = await callOpenAI(prompt, 'gpt-3.5-turbo', 1000);

    // Parse notes into array format
    const notesArray = notes.split('\n').filter(line => line.trim() !== '').map(line => line.replace(/^[•\-\*]\s*/, ''));

    res.json({ notes: notesArray });
  } catch (error) {
    console.error('Notes generation error:', error);
    res.status(500).json({ error: 'Failed to generate study notes' });
  }
});

// Generate quiz endpoint
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { transcription } = req.body;

    if (!transcription) {
      return res.status(400).json({ error: 'No transcription provided' });
    }

    const prompt = `Based on the following lecture transcription, create 5 multiple-choice quiz questions. Format the response as a JSON array where each question has the following structure:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "id": 1
}

The "correct" field should be the index (0-3) of the correct answer in the options array.

Lecture content:
${transcription}

Please provide exactly 5 well-crafted questions that test understanding of key concepts.`;

    const quizResponse = await callOpenAI(prompt, 'gpt-3.5-turbo', 1500);

    try {
      const quiz = JSON.parse(quizResponse);
      res.json({ quiz });
    } catch (parseError) {
      // Fallback: create a basic quiz structure
      const basicQuiz = [
        {
          question: "What was the main topic of this lecture?",
          options: ["Topic A", "Topic B", "Topic C", "Topic D"],
          correct: 0,
          id: 1
        }
      ];
      res.json({ quiz: basicQuiz });
    }
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ error: 'Failed to generate quiz questions' });
  }
});

// Generate flashcards endpoint
app.post('/api/generate-flashcards', async (req, res) => {
  try {
    const { transcription } = req.body;

    if (!transcription) {
      return res.status(400).json({ error: 'No transcription provided' });
    }

    const prompt = `Based on the following lecture transcription, create 6 flashcards for studying. Format the response as a JSON array where each flashcard has the following structure:
{
  "question": "Question or term",
  "answer": "Answer or definition",
  "id": 1
}

Create flashcards that focus on key terms, concepts, and important information from the lecture.

Lecture content:
${transcription}

Please provide exactly 6 flashcards.`;

    const flashcardsResponse = await callOpenAI(prompt, 'gpt-3.5-turbo', 1200);

    try {
      const flashcards = JSON.parse(flashcardsResponse);
      res.json({ flashcards });
    } catch (parseError) {
      // Fallback: create basic flashcards
      const basicFlashcards = [
        {
          question: "Key concept from this lecture",
          answer: "Answer based on lecture content",
          id: 1
        }
      ];
      res.json({ flashcards: basicFlashcards });
    }
  } catch (error) {
    console.error('Flashcards generation error:', error);
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// Export to PDF endpoint
app.post('/api/export-pdf', async (req, res) => {
  try {
    const { title, transcription, notes, quiz, flashcards } = req.body;

    const doc = new PDFDocument();
    let buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title || 'lecture-notes'}.pdf"`);
      res.send(pdfData);
    });

    // PDF Content
    doc.fontSize(20).text(title || 'Lecture Notes', { align: 'center' });
    doc.moveDown();

    if (transcription) {
      doc.fontSize(16).text('Transcription', { underline: true });
      doc.fontSize(12).text(transcription, { align: 'justify' });
      doc.moveDown();
    }

    if (notes && notes.length > 0) {
      doc.fontSize(16).text('Study Notes', { underline: true });
      notes.forEach(note => {
        doc.fontSize(12).text(`• ${note}`);
      });
      doc.moveDown();
    }

    if (quiz && quiz.length > 0) {
      doc.fontSize(16).text('Quiz Questions', { underline: true });
      quiz.forEach((q, index) => {
        doc.fontSize(12).text(`${index + 1}. ${q.question}`);
        q.options.forEach((option, optIndex) => {
          const marker = optIndex === q.correct ? '✓' : ' ';
          doc.text(`   ${String.fromCharCode(65 + optIndex)}. ${option} ${marker}`);
        });
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// Export to CSV endpoint
app.post('/api/export-csv', async (req, res) => {
  try {
    const { type, data, title } = req.body;

    let csvData = [];
    let filename = `${title || 'lecture-data'}.csv`;

    if (type === 'notes' && data) {
      csvData = data.map((note, index) => ({
        'Note Number': index + 1,
        'Note Content': note
      }));
    } else if (type === 'quiz' && data) {
      csvData = data.map(q => ({
        'Question': q.question,
        'Option A': q.options[0],
        'Option B': q.options[1], 
        'Option C': q.options[2],
        'Option D': q.options[3],
        'Correct Answer': q.options[q.correct]
      }));
    } else if (type === 'flashcards' && data) {
      csvData = data.map(card => ({
        'Question': card.question,
        'Answer': card.answer
      }));
    }

    // Convert to CSV format
    if (csvData.length === 0) {
      return res.status(400).json({ error: 'No data to export' });
    }

    const headers = Object.keys(csvData[0]);
    let csvContent = headers.join(',') + '\n';

    csvData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in CSV
        return `"${value.toString().replace(/"/g, '""')}"`;
      });
      csvContent += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
    }
  }

  console.error(error);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Lecture Voice-to-Notes API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
