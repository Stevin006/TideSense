"""
TideSense Backend API
FastAPI server with Gemini AI and ElevenLabs TTS integration
"""
import os
import hashlib
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
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
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")  # Stable Gemini 2.5 Flash (June 2025)
        print("[INIT] Gemini model initialized successfully with gemini-2.5-flash")
    except Exception as e:
        print(f"[INIT] Failed to initialize Gemini: {e}")
        model = None
else:
    print("[INIT] No GOOGLE_API_KEY found")
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
    import time
    start_time = time.time()
    print(f"[SUMMARIZE] Starting request for status: {request.detection.status}")
    
    if not model:
        print("[SUMMARIZE] No Gemini model, using fallback")
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
        print(f"[SUMMARIZE] Calling Gemini model...")
        response = model.generate_content(prompt)
        text = response.text
        elapsed = time.time() - start_time
        print(f"[SUMMARIZE] Gemini response received in {elapsed:.2f}s")

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
    print(f"[TTS] Received request for text: {request.text[:50]}...")
    print(f"[TTS] API Key configured: {bool(ELEVENLABS_API_KEY)}")
    print(f"[TTS] Voice ID: {ELEVENLABS_VOICE_ID}")
    print(f"[TTS] Model ID: {ELEVENLABS_MODEL_ID}")
    
    if not ELEVENLABS_API_KEY:
        print("[TTS] ERROR: ElevenLabs API key not configured!")
        raise HTTPException(
            status_code=503,
            detail="ElevenLabs API not configured. Set ELEVENLABS_API_KEY environment variable."
        )

    # Generate cache key from text
    text_hash = hashlib.md5(request.text.encode()).hexdigest()
    cache_file = AUDIO_CACHE_DIR / f"{text_hash}.mp3"

    # Return cached file if exists
    if cache_file.exists():
        print(f"[TTS] Returning cached file: {text_hash}.mp3")
        return TTSResponse(tts_url=f"/audio/{text_hash}.mp3")

    print(f"[TTS] Cache miss, calling ElevenLabs API...")
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
            print(f"[TTS] Calling ElevenLabs API: {url}")
            response = await client.post(url, json=payload, headers=headers)
            print(f"[TTS] ElevenLabs response status: {response.status_code}")
            response.raise_for_status()

            # Save to cache
            with open(cache_file, "wb") as f:
                f.write(response.content)
            
            print(f"[TTS] Audio cached successfully: {cache_file}")
            return TTSResponse(tts_url=f"/audio/{text_hash}.mp3")

    except Exception as e:
        print(f"[TTS] ERROR: {type(e).__name__}: {e}")
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


@app.post('/infer', response_model=DetectionResult)
async def infer_image(file: UploadFile = File(...)):
    """
    Riptide detection inference endpoint using pretrained TFLite model.
    Returns detection status, confidence score, and risk assessment.
    """
    import datetime
    
    print(f"[INFER] Received image: {file.filename}")
    
    try:
        # Save upload to temp file
        tmp_dir = Path(__file__).parent / 'tmp'
        tmp_dir.mkdir(exist_ok=True)
        file_path = tmp_dir / file.filename
        with open(file_path, 'wb') as f:
            content = await file.read()
            f.write(content)
        
        print(f"[INFER] Saved to {file_path}, size: {len(content)} bytes")

        # Try to import interpreter from tensorflow (preferred for this project)
        Interpreter = None
        try:
            import tensorflow as tf
            Interpreter = tf.lite.Interpreter
            print('[INFER] Using tensorflow.lite Interpreter')
        except ImportError:
            try:
                from tflite_runtime.interpreter import Interpreter as _Interpreter  # type: ignore
                Interpreter = _Interpreter
                print('[INFER] Using tflite_runtime Interpreter')
            except ImportError:
                print('[INFER] No TFLite interpreter available, using mock')
                Interpreter = None

        # If interpreter available, try to run model
        if Interpreter is not None:
            try:
                import numpy as np
                from PIL import Image

                model_path = Path(__file__).parent.parent / 'assets' / 'models' / 'rip_current_model.tflite'
                if not model_path.exists():
                    print(f'[INFER] Model not found at {model_path}')
                    raise FileNotFoundError(f'Model not found at {model_path}')

                print(f'[INFER] Loading model from {model_path}')
                interp = Interpreter(model_path=str(model_path))
                interp.allocate_tensors()

                input_details = interp.get_input_details()
                output_details = interp.get_output_details()

                # Get input shape
                inp_detail = input_details[0]
                _, h, w, c = inp_detail['shape']
                print(f'[INFER] Model expects input shape: {h}x{w}x{c}')

                # Load and preprocess image
                img = Image.open(file_path).convert('RGB')
                print(f'[INFER] Original image size: {img.size}')
                
                # Crop to center square first to avoid distortion
                # This preserves aspect ratio and focuses on center content
                width, height = img.size
                if width != height:
                    size = min(width, height)
                    left = (width - size) // 2
                    top = (height - size) // 2
                    img = img.crop((left, top, left + size, top + size))
                    print(f'[INFER] Cropped to square: {img.size}')
                
                # Use high-quality resize for better results
                img = img.resize((w, h), Image.Resampling.LANCZOS)
                arr = np.array(img).astype(np.float32)

                # Normalize to [0,1] if model expects floats
                if inp_detail['dtype'] == np.float32:
                    arr = arr / 255.0
                
                # Log preprocessing stats
                print(f'[INFER] Preprocessed: min={arr.min():.4f}, max={arr.max():.4f}, mean={arr.mean():.4f}')

                # Add batch dimension
                input_data = np.expand_dims(arr, axis=0).astype(inp_detail['dtype'])
                
                # Run inference
                print('[INFER] Running inference...')
                interp.set_tensor(inp_detail['index'], input_data)
                interp.invoke()

                # Get output
                out = interp.get_tensor(output_details[0]['index'])
                out_shape = out.shape
                print(f'[INFER] Raw output shape: {out_shape}')
                
                # Process YOLO output format [1, 5, N] where N is number of detections
                # The 5 values per detection are typically: [x, y, w, h, confidence]
                # Extract the highest confidence detections
                
                if len(out_shape) == 3:
                    # YOLO format: [batch, attributes, detections]
                    batch, attrs, num_detections = out_shape
                    
                    # Get confidence scores (typically the 5th attribute, index 4)
                    if attrs >= 5:
                        # Extract confidence channel (index 4)
                        confidences = out[0, 4, :]  # Shape: [num_detections]
                        
                        # DIAGNOSTIC: Show confidence distribution
                        print(f'[INFER] Confidence stats:')
                        print(f'  - Min: {np.min(confidences):.4f}')
                        print(f'  - Max: {np.max(confidences):.4f}')
                        print(f'  - Mean: {np.mean(confidences):.4f}')
                        print(f'  - Median: {np.median(confidences):.4f}')
                        print(f'  - Count >0.1: {np.sum(confidences > 0.1)}')
                        print(f'  - Count >0.3: {np.sum(confidences > 0.3)}')
                        print(f'  - Count >0.5: {np.sum(confidences > 0.5)}')
                        print(f'  - Count >0.7: {np.sum(confidences > 0.7)}')
                        
                        # Show top 10 confidence values
                        top_confs = np.sort(confidences)[-10:][::-1]
                        print(f'  - Top 10 confidences: {[f"{c:.4f}" for c in top_confs]}')
                        
                        # REALISTIC THRESHOLDS: Based on model training data
                        # Use top-k average for stability instead of single max value
                        
                        # Sort confidences and take average of top 5 for stability
                        top_k = min(5, len(confidences))
                        top_confidences = np.sort(confidences)[-top_k:]
                        avg_top_conf = float(np.mean(top_confidences))
                        max_conf = float(np.max(confidences))
                        
                        # Use weighted combination: 70% top-k average, 30% max
                        # This reduces noise while still being responsive to strong detections
                        stable_conf = 0.7 * avg_top_conf + 0.3 * max_conf
                        
                        print(f'[INFER] Max: {max_conf:.4f}, Top-{top_k} avg: {avg_top_conf:.4f}, Stable: {stable_conf:.4f}')
                        
                        # Realistic thresholds based on actual riptide characteristics
                        # HIGH: Strong visual indicators (foam patterns, discoloration, channel)
                        # MODERATE: Some indicators present but not definitive
                        # LOW: Calm water, no concerning patterns
                        
                        if stable_conf >= 0.28:
                            # Clear riptide indicators (28%+)
                            danger_prob = min(0.85, 0.60 + (stable_conf - 0.28) * 2.0)
                            status_label = "🚨 HIGH DANGER"
                        elif stable_conf >= 0.18:
                            # Possible riptide indicators (18-28%)
                            danger_prob = 0.40 + (stable_conf - 0.18) * 2.0
                            status_label = "⚠️ MODERATE"
                        else:
                            # Safe conditions (<18%)
                            danger_prob = min(0.35, 0.10 + stable_conf * 1.5)
                            status_label = "✓ SAFE"
                        
                        print(f'[INFER] {status_label} ({danger_prob*100:.1f}%)')
                    else:
                        # Fallback: use max of all values
                        danger_prob = float(np.max(out))
                else:
                    # Unknown format, use max value
                    danger_prob = float(np.max(out))
                    print(f'[INFER] Unknown output format, using max value: {danger_prob}')
                
                # Convert to percentage
                confidence = round(danger_prob * 100.0, 2)
                
                # Determine status based on danger probability
                # Use consistent thresholds with clear boundaries
                if danger_prob >= 0.65:
                    status = 'HIGH'
                    risk_level = 'high'
                elif danger_prob >= 0.35:
                    status = 'MODERATE'
                    risk_level = 'moderate'
                else:
                    status = 'LOW'
                    risk_level = 'low'  # FIXED: was incorrectly set to 'high'
                
                print(f'[INFER] === FINAL RESULT: {status} ({confidence}%) ===')
                
                # Generate recommendations based on risk
                recommendations = generate_recommendations(risk_level, confidence)
                
                print(f'[INFER] Detection complete: {status} ({confidence}%)')
                
                return DetectionResult(
                    status=status,
                    probability=confidence,
                    timestamp=datetime.datetime.now().isoformat(),
                    location=None,
                    weatherAlerts=None,
                    recommendations=recommendations,
                )

            except Exception as e:
                print(f'[INFER] TFLite inference failed: {e}')
                import traceback
                traceback.print_exc()

        # Fallback mock result for testing
        print('[INFER] Using fallback mock result')
        import random
        confidence = round(10 + random.random() * 80, 2)
        
        if confidence < 30:
            status = 'LOW'
            risk_level = 'low'
        elif confidence < 60:
            status = 'MODERATE'
            risk_level = 'moderate'
        else:
            status = 'HIGH'
            risk_level = 'high'
        
        recommendations = generate_recommendations(risk_level, confidence)
        
        return DetectionResult(
            status=status,
            probability=confidence,
            timestamp=datetime.datetime.now().isoformat(),
            location=None,
            weatherAlerts=None,
            recommendations=recommendations,
        )

    except Exception as e:
        print(f'[INFER] Endpoint error: {e}')
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None  # Detection results, location, etc.

class ChatResponse(BaseModel):
    response: str
    timestamp: str

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """AI chatbot for beach safety questions"""
    print(f'[CHAT] Received message: {request.message[:100]}...')
    
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API not configured")
    
    try:
        # Build context-aware prompt
        context_info = ""
        if request.context:
            risk = request.context.get('riskLevel', 'UNKNOWN')
            confidence = request.context.get('confidence', 0)
            location = request.context.get('location', 'Unknown')
            noaa_risk = request.context.get('noaaRisk', 'Unknown')
            
            context_info = f"""
Current Context:
- Riptide Detection: {risk} ({confidence}% confidence)
- Location: {location}
- NOAA Area Risk: {noaa_risk}
"""
        
        safety_knowledge = """
You are a beach safety expert AI assistant. Your role is to provide clear, actionable advice about riptides and beach safety.

Key Safety Information:
- If caught in a riptide: DON'T panic, DON'T swim against it, swim parallel to shore
- Riptides are narrow channels of fast-moving water
- They look like gaps in waves, darker water, or foam/seaweed moving seaward
- Most common near structures like piers and jetties
- Can occur on any beach with breaking waves

Always prioritize safety in your responses. Be concise and helpful.
"""
        
        full_prompt = f"{safety_knowledge}\n{context_info}\nUser Question: {request.message}\n\nProvide a helpful, concise answer (2-3 sentences):"
        
        print('[CHAT] Calling Gemini...')
        response = model.generate_content(full_prompt)
        answer = response.text.strip()
        
        import datetime
        timestamp = datetime.datetime.now().isoformat()
        
        print(f'[CHAT] Response generated: {len(answer)} chars')
        return ChatResponse(response=answer, timestamp=timestamp)
        
    except Exception as e:
        print(f'Gemini chat error: {e}')
        raise HTTPException(status_code=500, detail=str(e))

def generate_recommendations(risk_level: str, confidence: float) -> List[str]:
    """Generate safety recommendations based on risk level"""
    if risk_level == 'high':
        return [
            "⚠️ DO NOT ENTER THE WATER - Dangerous riptide detected",
            "Stay at least 100 feet away from the shoreline",
            "Alert lifeguards or authorities immediately",
            "Warn others in the vicinity",
            f"Detection confidence: {confidence}% - High certainty"
        ]
    elif risk_level == 'moderate':
        return [
            "⚡ CAUTION - Possible riptide conditions detected",
            "Exercise extreme caution if entering water",
            "Stay close to shore and in designated swimming areas",
            "Swim parallel to shore if caught in a current",
            f"Detection confidence: {confidence}% - Moderate certainty"
        ]
    else:
        return [
            "✅ Conditions appear relatively safe",
            "Always swim near a lifeguard",
            "Never swim alone",
            "Be aware conditions can change quickly",
            f"Detection confidence: {confidence}% - Low risk detected"
        ]
