# TideSense Backend Server

FastAPI backend for TideSense with Gemini AI and ElevenLabs TTS integration.

## Setup

1. **Install Python dependencies**:
   ```bash
   cd server
   pip install -r requirements.txt
   ```

2. **Configure API keys**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Get API Keys**:
   - **Google Gemini**: https://aistudio.google.com/app/apikey
   - **ElevenLabs**: https://elevenlabs.io (optional for TTS)

## Running the Server

```bash
cd server
python main.py
```

Server will run at `http://localhost:8000`

## API Endpoints

### `GET /health`
Health check and API configuration status

### `POST /summarize`
Generate AI summary of riptide detection
```json
{
  "detection": {
    "status": "SAFE",
    "probability": 85,
    "timestamp": "2024-01-01T12:00:00Z",
    "location": {"name": "Santa Monica Beach"},
    "weatherAlerts": [],
    "recommendations": []
  },
  "history": []
}
```

### `POST /tts`
Convert text to speech (cached)
```json
{
  "text": "The beach conditions are safe. Swim near a lifeguard."
}
```

### `POST /chat`
Conversational AI about beach safety
```json
{
  "message": "What should I do if I see someone caught in a riptide?",
  "detection": {...},
  "history": []
}
```

### `GET /audio/{filename}`
Serve cached audio files

## Features

- ✅ Gemini 1.5 Flash for AI summaries and chat
- ✅ ElevenLabs TTS with local caching
- ✅ Graceful fallbacks when APIs unavailable
- ✅ CORS enabled for React Native
- ✅ Proper error handling
- ✅ Audio file caching to reduce API costs

## Development

The server automatically creates `static/audio/` directory for caching TTS responses.
