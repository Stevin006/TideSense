# 🚀 TideSense AI - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Node.js installed
- Python 3.8+ installed
- React Native development environment set up
- Expo CLI installed (`npm install -g expo-cli`)

## ⚡ Fast Setup (5 Minutes)

### 1. Run Automated Setup
```bash
./setup.sh
```

This will:
- Install Node dependencies
- Install Python dependencies
- Create `.env` file from template
- Check your environment

### 2. Get API Keys (2 minutes)

**Required - Google Gemini:**
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**Optional - ElevenLabs (for better voice):**
1. Visit: https://elevenlabs.io
2. Sign up (free)
3. Get API key from profile

### 3. Add Keys to `.env`

Edit `server/.env`:
```bash
GOOGLE_API_KEY=your_gemini_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here  # Optional
```

### 4. Start Backend Server

```bash
cd server
python3 main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 5. Start React Native App (New Terminal)

```bash
npm start
```

Then press:
- `i` for iOS
- `a` for Android
- Scan QR for device

## ✅ Verify It Works

### Test Backend:
```bash
# In a new terminal
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "ok",
  "gemini_configured": true,
  "elevenlabs_configured": true
}
```

### Test Frontend:
1. Take a photo with camera
2. See AI summary load automatically ✅
3. Click "Play Audio" ✅
4. See audio progress bar ✅

## 🎯 Key Features to Try

1. **AI Summary**: Automatic on results screen
2. **Audio Playback**: Natural voice guidance
3. **Chat Bot**: Ask follow-up questions
4. **Share Alert**: Share detection with others

## 📱 Optional Improvements

### Use Improved Results Screen:

```bash
# Backup current version
mv src/screens/ResultsScreen.tsx src/screens/ResultsScreen.tsx.old

# Use improved version
mv src/screens/ResultsScreenImproved.tsx src/screens/ResultsScreen.tsx
```

### Add Chat Screen:

Edit `src/navigation/AppNavigator.tsx`:

```typescript
// Add import
import { ChatScreen } from '../screens/ChatScreen';

// Add to Stack.Navigator:
<Stack.Screen name="Chat" component={ChatScreen} />
```

### Add "Ask AI" Button to Results:

In your ResultsScreen, add this button:

```typescript
<SecondaryButton
  onPress={() => navigation.navigate('Chat', { detection: result })}
  activeOpacity={0.85}
>
  <Ionicons name="chatbubbles" size={18} color={theme.colors.textPrimary} />
  <SecondaryButtonLabel>Ask AI</SecondaryButtonLabel>
</SecondaryButton>
```

## 🐛 Common Issues

### ❌ "Connection refused" in app
**Fix:** Make sure backend is running (`python3 server/main.py`)

### ❌ "Summary unavailable"
**Fix:** Check `GOOGLE_API_KEY` in `server/.env`

### ❌ Backend won't start
```bash
cd server
pip3 install -r requirements.txt
python3 main.py
```

### ❌ Frontend build errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Module not found: expo-av"
```bash
npm install expo-av expo-speech
```

## 📂 Project Structure

```
TideSense/
├── src/
│   ├── screens/
│   │   ├── CameraScreen.tsx          # Take photo
│   │   ├── ResultsScreen.tsx         # Show results
│   │   ├── ResultsScreenImproved.tsx # Better version
│   │   └── ChatScreen.tsx            # AI chat
│   └── navigation/
│       ├── AppNavigator.tsx          # Routes
│       └── types.ts                  # Types
├── server/
│   ├── main.py                       # FastAPI server
│   ├── requirements.txt              # Python deps
│   ├── .env.example                  # Template
│   └── .env                          # Your keys (don't commit!)
├── IMPLEMENTATION_GUIDE.md           # Detailed guide
├── IMPROVEMENTS_SUMMARY.md           # What's new
├── README_AI_FEATURES.md             # AI docs
├── QUICKSTART.md                     # This file
└── setup.sh                          # Auto setup
```

## 🎓 Next Steps

### Learn More:
- Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for details
- Read [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md) for features
- Read [README_AI_FEATURES.md](./README_AI_FEATURES.md) for AI docs

### Customize:
- Change AI voice (see `server/.env.example`)
- Adjust UI colors (see theme files)
- Add more chat suggestions
- Integrate real YOLO model

### Deploy:
- Backend: Railway, Render, or Vercel
- Frontend: Expo build service
- See deployment guides in main docs

## 💡 Pro Tips

1. **Audio Caching**: Same text = instant playback!
2. **Free Tier**: Enough for entire hackathon
3. **Fallbacks**: Works even if APIs fail
4. **Testing**: Use http://localhost:8000/docs for API testing
5. **Logs**: Watch backend terminal for debug info

## 📚 API Playground

Visit http://localhost:8000/docs when backend is running to:
- Test API endpoints interactively
- See request/response formats
- Debug issues
- Understand the API

## 🎉 You're Ready!

Your app now has:
- ✅ AI-powered detection analysis
- ✅ Natural voice guidance
- ✅ Conversational safety assistant
- ✅ Production-ready error handling
- ✅ Professional UI/UX

## 🤝 Need Help?

1. Check [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
2. Check backend logs (terminal running `python3 main.py`)
3. Check frontend logs (Metro bundler terminal)
4. Test APIs at http://localhost:8000/docs

## 🌟 What Makes This Special

Compared to basic implementations:
- ✨ Production-ready error handling
- ✨ Cost-efficient caching
- ✨ Great user experience
- ✨ Well-documented
- ✨ Inspired by award-winning apps
- ✨ Type-safe and tested

---

**Happy building! 🌊🏄‍♂️**

Now go make the beach safer with AI! 🤖
