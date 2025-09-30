# StudyWise
# Lecture Voice-to-Notes Generator - Backend API

A Node.js/Express API server that powers the Lecture Voice-to-Notes Generator application. This backend handles audio transcription, AI-powered content generation, and file exports.

## Features

- **Audio Transcription**: Uses OpenAI Whisper API to convert speech to text
- **Study Notes Generation**: Creates organized bullet-point notes from transcriptions
- **Quiz Generation**: Generates multiple-choice questions with answers
- **Flashcard Creation**: Produces question/answer flashcard pairs
- **Export Options**: PDF and CSV export functionality
- **File Upload**: Secure handling of audio file uploads

## Prerequisites

- Node.js 16+ and npm
- OpenAI API account and API key
- Audio files in supported formats (MP3, WAV, M4A, OGG, WebM, MP4)

## Installation

1. Clone or create the project directory:
```bash
mkdir lecture-notes-backend
cd lecture-notes-backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to the `.env` file

4. Create uploads directory:
```bash
mkdir uploads
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if the server is running

### Audio Processing
- **POST** `/api/transcribe` - Upload audio file for transcription
  - Accepts: multipart/form-data with audio file
  - Returns: `{ transcription: "text content" }`

### Content Generation
- **POST** `/api/generate-notes` - Generate study notes
  - Body: `{ transcription: "text" }`
  - Returns: `{ notes: ["note1", "note2", ...] }`

- **POST** `/api/generate-quiz` - Generate quiz questions
  - Body: `{ transcription: "text" }`
  - Returns: `{ quiz: [question_objects] }`

- **POST** `/api/generate-flashcards` - Generate flashcards
  - Body: `{ transcription: "text" }`
  - Returns: `{ flashcards: [card_objects] }`

### Export Functions
- **POST** `/api/export-pdf` - Export content as PDF
  - Body: `{ title, transcription, notes, quiz, flashcards }`
  - Returns: PDF file download

- **POST** `/api/export-csv` - Export data as CSV
  - Body: `{ type, data, title }`
  - Returns: CSV file download

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=your-openai-api-key-here
PORT=3000
NODE_ENV=development
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

### Supported Audio Formats

- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- OGG (.ogg)
- WebM (.webm)
- MP4 (.mp4)

Maximum file size: 100MB

## OpenAI API Usage

This application uses the following OpenAI APIs:
- **Whisper API**: For audio transcription ($0.006 per minute)
- **GPT-3.5-turbo**: For text generation and summarization

### Cost Estimation
- Audio transcription: ~$0.36 per hour of audio
- Text generation: ~$0.002 per 1K tokens (roughly 750 words)

## Development

### Project Structure
```
backend/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── .env.example          # Environment template
├── uploads/              # Audio file upload directory
└── README.md            # This file
```

### Adding New Features

1. **New API endpoints**: Add routes in `server.js`
2. **New AI prompts**: Modify the prompt templates in respective endpoints
3. **New export formats**: Add handlers in the export endpoints

### Error Handling

The API includes comprehensive error handling for:
- File upload validation
- OpenAI API errors
- File processing errors
- Invalid request data

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Configure proper CORS origins
3. Set up SSL/HTTPS
4. Configure file storage (consider cloud storage for scale)
5. Set up monitoring and logging
6. Configure rate limiting

## Security Considerations

- API keys are stored in environment variables
- File uploads are validated and limited in size
- Uploaded files are automatically cleaned up
- CORS is configured for allowed origins
- Input validation on all endpoints

## Troubleshooting

### Common Issues

1. **OpenAI API Key Error**: Ensure your API key is valid and has sufficient credits
2. **File Upload Failed**: Check file format and size limitations
3. **Port Already in Use**: Change the PORT in .env file
4. **CORS Errors**: Update ALLOWED_ORIGINS in environment

### Logs

Check server console for detailed error messages and API responses.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## License

This project is licensed under the MIT License.
