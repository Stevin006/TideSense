"""
TideSense Backend API
FastAPI server with Gemini AI and ElevenLabs TTS integration
"""
import os
import hashlib
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="TideSense API", version="1.0.0")

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure API keys from environment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
ELEVENLABS_MODEL_ID = os.getenv("ELEVENLABS_MODEL_ID", "eleven_turbo_v2_5")

# Configure Gemini
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-pro")
else:
    model = None

# Audio cache directory
AUDIO_CACHE_DIR = Path(__file__).parent / "static" / "audio"
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)


# Request/Response models
class DetectionResult(BaseModel):
    status: str
    probability: float
    timestamp: str
    location: Optional[dict] = None
    weatherAlerts: Optional[List[dict]] = None
    recommendations: Optional[List[str]] = None


class SummarizeRequest(BaseModel):
    detection: DetectionResult
    history: List[dict] = []


class SummarizeResponse(BaseModel):
    summary: str
    bullets: List[str]


class TTSRequest(BaseModel):
    text: str


class TTSResponse(BaseModel):
    tts_url: str


class ChatRequest(BaseModel):
    message: str
    detection: Optional[DetectionResult] = None
    history: List[dict] = []


class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None


# Routes
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "gemini_configured": GOOGLE_API_KEY is not None,
        "elevenlabs_configured": ELEVENLABS_API_KEY is not None,
    }


@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_detection(request: SummarizeRequest):
    """
    Generate AI summary of riptide detection results using Gemini
    """
    if not model:
        # Fallback to rule-based summary
        return generate_fallback_summary(request.detection)

    try:
        # Build context for Gemini
        status = request.detection.status
        probability = request.detection.probability
        location_name = "Unknown location"

        if request.detection.location:
            location_name = request.detection.location.get("name", location_name)

        # Check for weather alerts
        alert_info = ""
        if request.detection.weatherAlerts:
            alerts = request.detection.weatherAlerts
            alert_info = f"\n- Active weather alerts: {len(alerts)} alert(s)"
            for alert in alerts[:2]:  # First 2 alerts
                alert_info += f"\n  * {alert.get('event', 'Alert')}"

        # Create prompt for Gemini
        prompt = f"""You are a beach safety AI assistant. Analyze this riptide detection result and provide a concise, actionable summary.

Detection Results:
- Status: {status}
- Confidence: {probability}%
- Location: {location_name}{alert_info}

Generate a response with:
1. A brief assessment (1-2 sentences)
2. Exactly 3 bullet points with specific safety advice
3. Tone: Professional but friendly, safety-focused

Format your response as:
SUMMARY: [2 sentence overview]
BULLETS:
- [First specific action]
- [Second specific action]
- [Third specific action]

Keep it concise and actionable. Focus on what the user should DO."""

        # Call Gemini
        response = model.generate_content(prompt)
        text = response.text

        # Parse response
        summary_part = ""
        bullets = []

        if "SUMMARY:" in text and "BULLETS:" in text:
            parts = text.split("BULLETS:")
            summary_part = parts[0].replace("SUMMARY:", "").strip()
            bullets_text = parts[1].strip()
            bullets = [
                line.strip("- ").strip()
                for line in bullets_text.split("\n")
                if line.strip().startswith("-")
            ]
        else:
            # Fallback parsing
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            summary_part = lines[0] if lines else ""
            bullets = [l.strip("- ").strip() for l in lines[1:4] if l.startswith("-")]

        # Ensure we have bullets
        if not bullets:
            bullets = generate_fallback_summary(request.detection).bullets

        return SummarizeResponse(
            summary=summary_part or "Analysis complete.",
            bullets=bullets[:3]  # Max 3 bullets
        )

    except Exception as e:
        print(f"Gemini API error: {e}")
        # Fallback to rule-based summary
        return generate_fallback_summary(request.detection)


@app.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using ElevenLabs with caching
    """
    if not ELEVENLABS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs API not configured. Set ELEVENLABS_API_KEY environment variable."
        )

    # Generate cache key from text
    text_hash = hashlib.md5(request.text.encode()).hexdigest()
    cache_file = AUDIO_CACHE_DIR / f"{text_hash}.mp3"

    # Return cached file if exists
    if cache_file.exists():
        return TTSResponse(tts_url=f"/audio/{text_hash}.mp3")

    try:
        # Call ElevenLabs API
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
        }
        payload = {
            "text": request.text,
            "model_id": ELEVENLABS_MODEL_ID,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()

            # Save to cache
            with open(cache_file, "wb") as f:
                f.write(response.content)

            return TTSResponse(tts_url=f"/audio/{text_hash}.mp3")

    except Exception as e:
        print(f"ElevenLabs API error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Conversational AI chat about beach safety and riptides (like Emergent's chatbot)
    """
    if not model:
        raise HTTPException(
            status_code=503,
            detail="Gemini API not configured. Set GOOGLE_API_KEY environment variable."
        )

    try:
        # Build context
        context = "You are a beach safety expert AI assistant helping users understand riptides and ocean safety."

        if request.detection:
            context += f"\n\nCurrent detection: {request.detection.status} ({request.detection.probability}% confidence)"
            if request.detection.location:
                context += f" at {request.detection.location.get('name', 'your location')}"

        # Build conversation history
        conversation = ""
        for msg in request.history[-5:]:  # Last 5 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", "")
            conversation += f"\n{role.upper()}: {content}"

        conversation += f"\nUSER: {request.message}"

        prompt = f"""{context}

Conversation:
{conversation}

Respond naturally and helpfully. If asked about the current detection, provide specific advice. Keep responses concise (2-3 sentences) and actionable.

After your response, suggest 2-3 relevant follow-up questions the user might ask, formatted as:
SUGGESTIONS:
- [Question 1]
- [Question 2]
- [Question 3]"""

        # Call Gemini
        response = model.generate_content(prompt)
        text = response.text

        # Parse suggestions
        main_response = text
        suggestions = None

        if "SUGGESTIONS:" in text:
            parts = text.split("SUGGESTIONS:")
            main_response = parts[0].strip()
            suggestions_text = parts[1].strip()
            suggestions = [
                line.strip("- ").strip()
                for line in suggestions_text.split("\n")
                if line.strip().startswith("-")
            ][:3]

        return ChatResponse(
            response=main_response,
            suggestions=suggestions
        )

    except Exception as e:
        print(f"Chat API error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.get("/audio/{filename}")
async def serve_audio(filename: str):
    """Serve cached audio files"""
    file_path = AUDIO_CACHE_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/mpeg")


# Helper functions
def generate_fallback_summary(detection: DetectionResult) -> SummarizeResponse:
    """Generate rule-based summary when Gemini is unavailable"""
    status = detection.status
    probability = detection.probability

    if status == "SAFE":
        summary = f"Conditions appear safe with {probability}% confidence. Always exercise caution in ocean environments."
        bullets = [
            "Swim near a lifeguard whenever possible",
            "Check for any posted warnings or flags before entering",
            "Never swim alone, use the buddy system",
        ]
    else:
        summary = f"DANGER: Riptide detected with {probability}% confidence. Do not enter the water."
        bullets = [
            "Stay out of the water - riptide conditions detected",
            "If caught in a riptide: Stay calm, swim parallel to shore",
            "Alert others nearby and notify lifeguards immediately",
        ]

    return SummarizeResponse(summary=summary, bullets=bullets)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
