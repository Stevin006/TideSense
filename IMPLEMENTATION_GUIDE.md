# TideSense AI Implementation Guide

This guide will help you integrate Gemini AI and ElevenLabs TTS into your TideSense riptide detection app.

## 🎯 What We're Building

Based on the Emergent app example, we're adding:
1. **AI-powered summaries** of riptide detection results using Google Gemini
2. **Text-to-speech** audio playback with ElevenLabs (with device TTS fallback)
3. **Conversational AI chatbot** for beach safety questions
4. **Improved UI/UX** with loading states, animations, and better visual design

## 📦 Setup Steps

### 1. Install Dependencies

```bash
# Install React Native dependencies
npm install

# Install Python backend dependencies
cd server
pip install -r requirements.txt
cd ..
```

### 2. Configure API Keys

```bash
# Copy the environment file
cp server/.env.example server/.env
```

Edit `server/.env` and add your API keys:

```bash
# Get from: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_gemini_api_key_here

# Get from: https://elevenlabs.io (optional but recommended)
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

**Getting API Keys:**

- **Google Gemini (Required)**:
  - Go to https://aistudio.google.com/app/apikey
  - Sign in with Google account
  - Click "Create API Key"
  - Free tier: 60 requests per minute

- **ElevenLabs (Optional)**:
  - Go to https://elevenlabs.io
  - Sign up for free account
  - Get 10,000 characters/month free
  - Find API key in your profile settings

### 3. Update ResultsScreen

Replace your current `ResultsScreen.tsx` with the improved version:

```bash
# Backup your current version
mv src/screens/ResultsScreen.tsx src/screens/ResultsScreen.tsx.backup

# Use the new improved version
mv src/screens/ResultsScreenImproved.tsx src/screens/ResultsScreen.tsx
```

### 4. Add ChatScreen to Navigation

Edit `src/navigation/AppNavigator.tsx`:

```typescript
import { ChatScreen } from '../screens/ChatScreen';

// Inside Stack.Navigator, add:
<Stack.Screen name="Chat" component={ChatScreen} />
```

### 5. Add Chat Button to ResultsScreen

In your ResultsScreen, add this button to the action buttons section:

```typescript
<SecondaryButton
  onPress={() => navigation.navigate('Chat', { detection: result })}
  activeOpacity={0.85}
>
  <Ionicons name="chatbubbles" size={18} color={theme.colors.textPrimary} />
  <SecondaryButtonLabel>Ask AI</SecondaryButtonLabel>
</SecondaryButton>
```

## 🚀 Running the App

### Terminal 1: Start Backend Server
```bash
cd server
python main.py
```

Server runs at `http://localhost:8000`
- View API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Terminal 2: Start React Native App
```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- Scan QR code for physical device

## ✅ Testing Checklist

### Backend Tests
- [ ] Visit http://localhost:8000/health - should show `{"status": "ok"}`
- [ ] Check that `gemini_configured: true` appears in health check
- [ ] Check that `elevenlabs_configured: true` (if you added the key)

### Frontend Tests
- [ ] Take a photo with the camera
- [ ] See AI summary load automatically on Results screen
- [ ] Click "Play Audio" to hear summary
- [ ] Audio progress bar appears and updates
- [ ] Click "Ask AI" to open chat
- [ ] Send a message in chat
- [ ] AI responds with relevant safety info
- [ ] Suggested questions appear
- [ ] Click a suggestion to auto-send

## 🎨 Features Explained

### 1. AI Summary (Gemini)
- Automatically generates on results screen
- 3 bullet point format for quick readability
- Contextual based on detection status (safe/unsafe)
- Includes location and weather alerts when available

### 2. Text-to-Speech (ElevenLabs)
- Converts AI summary to natural-sounding voice
- Caches audio files to save API costs
- Falls back to device TTS if ElevenLabs unavailable
- Shows playback progress bar

### 3. Conversational Chat
- Ask follow-up questions about ocean safety
- Context-aware (knows your detection results)
- Suggests relevant questions
- Remembers conversation history (last 10 messages)

### 4. UI Improvements
- Smooth animations and transitions
- Loading states for all async operations
- Pulsing "Play Audio" button when ready
- Horizontal scrolling action buttons
- Error messages with helpful context

## 🐛 Troubleshooting

### Issue: "Connection failed" in app

**Check:**
1. Is backend server running? (`python main.py` in Terminal 1)
2. iOS uses `127.0.0.1:8000`, Android uses `10.0.2.2:8000`
3. Check terminal for error messages

### Issue: "Summary unavailable"

**Causes:**
- Backend server not running
- No Gemini API key set
- API key invalid or quota exceeded

**Fix:**
- Check `GOOGLE_API_KEY` in `server/.env`
- Verify key at https://aistudio.google.com/app/apikey
- Check backend logs for errors

### Issue: Audio plays with robotic voice

**Causes:**
- ElevenLabs API key not set (using fallback device TTS)
- ElevenLabs API error

**Fix:**
- Add `ELEVENLABS_API_KEY` to `server/.env`
- Check ElevenLabs account has available credits
- Fallback TTS still works, just less natural

### Issue: Chat not responding

**Check:**
1. Backend server running
2. Gemini API key configured
3. Network connectivity
4. Check browser console at http://localhost:8000/docs

## 📊 API Endpoints Reference

### POST /summarize
Generates AI summary from detection results.

**Request:**
```json
{
  "detection": {
    "status": "UNSAFE",
    "probability": 85,
    "timestamp": "2024-01-15T10:30:00Z",
    "location": {"name": "Santa Monica Beach"},
    "recommendations": ["Stay out of water"]
  }
}
```

**Response:**
```json
{
  "summary": "Dangerous riptide conditions detected...",
  "bullets": [
    "Stay out of the water immediately",
    "If caught, swim parallel to shore",
    "Alert others and notify lifeguards"
  ]
}
```

### POST /tts
Converts text to speech audio file.

**Request:**
```json
{
  "text": "Dangerous riptide detected. Stay out of water."
}
```

**Response:**
```json
{
  "tts_url": "/audio/abc123.mp3"
}
```

### POST /chat
Conversational AI about beach safety.

**Request:**
```json
{
  "message": "What should I do if caught in a riptide?",
  "detection": {...},
  "history": [...]
}
```

**Response:**
```json
{
  "response": "If caught in a riptide, stay calm...",
  "suggestions": [
    "How can I spot a riptide?",
    "What are the warning signs?",
    "Should I call for help?"
  ]
}
```

## 🔄 Integration with YOLO Model

When you're ready to integrate your Roboflow YOLO model for actual riptide detection:

1. The detection results from YOLO should match this format:
```typescript
{
  status: 'SAFE' | 'UNSAFE',
  probability: number,  // 0-100
  timestamp: string,
  location: string,
  waveHeight: string,
  currentStrength: string,
  recommendations: string[]
}
```

2. Pass this to `/summarize` endpoint
3. AI will provide contextual safety advice based on actual detection

## 🎯 Next Steps

- [ ] Add authentication/user accounts
- [ ] Save chat history to database
- [ ] Add weather forecast integration
- [ ] Implement push notifications for alerts
- [ ] Add map view showing safe/unsafe beaches
- [ ] Multi-language support (ElevenLabs supports 29 languages!)

## 📚 Resources

- **Gemini API Docs**: https://ai.google.dev/docs
- **ElevenLabs Docs**: https://elevenlabs.io/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **React Native Navigation**: https://reactnavigation.org
- **Expo Audio**: https://docs.expo.dev/versions/latest/sdk/audio/

## 💡 Tips for Best Experience

1. **Cost Optimization**:
   - Audio files are cached locally (check `server/static/audio/`)
   - Same text = same cached file (no re-generation)
   - Gemini free tier is generous (60 req/min)

2. **Performance**:
   - Summaries generate in ~2 seconds
   - TTS takes ~3-5 seconds first time, instant from cache
   - Chat responds in ~1-2 seconds

3. **User Experience**:
   - Always show loading states
   - Provide fallbacks when APIs fail
   - Test on slow networks
   - Cache aggressively

## 🆘 Need Help?

- Check backend logs: Look at terminal running `python main.py`
- Check React Native logs: Look at Metro bundler terminal
- API playground: Visit http://localhost:8000/docs to test endpoints
- Check this guide's Troubleshooting section above

---

**Good luck with your hackathon! 🌊🏄‍♂️**
