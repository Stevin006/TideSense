# TideSense Feature Enhancement Plan
**Inspired by Emergent Crisis Simulation Platform**

## Current Status
- ✅ Camera-based riptide detection (TFLite model)
- ✅ Location-based NOAA risk assessment
- ✅ Basic risk display (SAFE/MODERATE/HIGH)
- ⏳ Detection threshold at 0.21/0.27 (needs testing)

## Priority 1: PDF Safety Report (Actionable Steps)
**Why**: User specifically asked "Actionable steps as a pdf?"
**Inspired by**: Emergent's After-Action Report feature

### Implementation:
- **Library**: `expo-print` + `expo-sharing`
- **Content**:
  - Detection results (risk level, confidence, timestamp)
  - Location info (GPS coordinates, NOAA area risk)
  - **Actionable Safety Steps** for each risk level:
    - SAFE: Enjoy the beach, check NOAA updates
    - MODERATE: Stay alert, avoid swimming alone, swim near lifeguards
    - HIGH: Do NOT enter water, evacuate if already in water, call lifeguards
  - Emergency contacts (911, local lifeguard stations)
  - Detection image thumbnail
  - QR code linking to NOAA beach forecast

### Screens Affected:
- `ResultsScreen.tsx` - Add "Download Safety Report" button
- New component: `SafetyReportGenerator.tsx`

**Estimated Time**: 4-6 hours

---

## Priority 2: Detection History Timeline
**Why**: Users need to track riptide patterns over time
**Inspired by**: Emergent's Timeline Replay feature

### Implementation:
- **Storage**: AsyncStorage or SQLite (expo-sqlite)
- **Data to Save**:
  - Timestamp
  - Risk level + confidence
  - Location (lat/lon)
  - Photo thumbnail (base64 compressed)
  - NOAA area risk at time of scan

### New Screen:
- `HistoryScreen.tsx` with:
  - Timeline list view (most recent first)
  - Filter by risk level (SAFE/MODERATE/HIGH)
  - Filter by location/date range
  - Tap item to see full details + re-export PDF
  - Stats summary: Total scans, risk breakdown chart

**Estimated Time**: 6-8 hours

---

## Priority 3: Emergency Actions Panel
**Why**: Quick access to safety actions during high-risk situations
**Inspired by**: Emergent's Action Control Panel

### Implementation:
- **Quick Action Buttons** on ResultsScreen:
  - 📞 **Call 911** (tel: link, only shows for HIGH risk)
  - 🏖️ **Find Nearest Lifeguard** (opens Maps with query)
  - 📡 **Check NOAA Forecast** (deep link to NOAA website)
  - 🔔 **Set Beach Alert** (local notification if risk increases)
  - 📍 **Share Location** (SMS with GPS + risk level to emergency contact)

### UI Changes:
- Add bottom sheet/modal on `ResultsScreen` with action buttons
- Color-coded by urgency (red for HIGH, yellow for MODERATE)
- Haptic feedback on press

**Estimated Time**: 3-4 hours

---

## Priority 4: AI Safety Chatbot
**Why**: Interactive guidance for beach safety questions
**Inspired by**: Emergent's ChatbotPanel feature

### Implementation:
- **Backend**: Use existing Gemini API (already in server)
- **New Endpoint**: `/chat` with context:
  - Current detection results
  - NOAA area risk
  - User location
  - Beach safety knowledge base

### Features:
- Ask questions like:
  - "What should I do if I'm caught in a riptide?"
  - "Is it safe to swim right now?"
  - "How long until conditions improve?"
- Provide context-aware answers based on current scan
- Text-to-Speech responses (using existing ElevenLabs TTS)

### New Components:
- `ChatScreen.tsx` with message history
- Add "Ask AI" button on ResultsScreen

**Estimated Time**: 5-6 hours

---

## Priority 5: Multi-Photo Comparison Mode
**Why**: Show risk changes over time (like Emergent's period-by-period view)
**Inspired by**: Emergent's Operational Periods feature

### Implementation:
- **Capture Mode**: Take 3 photos 30 seconds apart
- **Display**: Side-by-side or carousel view showing:
  - Photo 1: 0:00 - Risk X%
  - Photo 2: 0:30 - Risk Y%
  - Photo 3: 1:00 - Risk Z%
- **Trend Analysis**:
  - "Risk is INCREASING - avoid water"
  - "Risk is STABLE - conditions unchanged"
  - "Risk is DECREASING - improving conditions"

### UI:
- Toggle on CameraScreen: "Single Scan" vs "Time Series"
- Graph showing confidence over 3 captures
- Final verdict based on trend (not just max confidence)

**Estimated Time**: 4-5 hours

---

## Bonus Features (Lower Priority)

### 6. Emergency Contact Widget
- Pre-configure emergency contacts (lifeguards, family)
- One-tap to call/text with location + risk level

### 7. Beach Safety Tips Library
- Database of riptide safety tips
- How to spot riptides visually
- What to do if caught
- Searchable/browsable

### 8. Community Reports
- Users can mark riptide locations
- Crowdsourced danger zones
- Requires backend database

---

## Recommended Implementation Order

**Phase 1** (This week):
1. PDF Safety Report (Priority 1) - User's explicit request
2. Emergency Actions Panel (Priority 3) - Quick win, high impact

**Phase 2** (Next week):
3. Detection History (Priority 2) - Core feature for long-term value
4. Multi-Photo Comparison (Priority 5) - Improves detection consistency

**Phase 3** (Future):
5. AI Safety Chatbot (Priority 4) - Nice-to-have, depends on API limits

---

## Technical Notes

### Dependencies to Install:
```bash
npx expo install expo-print expo-sharing  # PDF generation
npx expo install expo-sqlite              # History storage
npx expo install expo-linking             # Deep links for emergency calls
```

### API Changes Needed:
- Add `/chat` endpoint for AI chatbot
- Add `/history/save` and `/history/get` for detection storage
- Consider rate limiting for Gemini API (currently hitting 50/day limit)

---

## Success Metrics
- ✅ Users can export safety PDF within 2 taps
- ✅ Emergency actions accessible within 1 tap from results
- ✅ Detection history persists across app restarts
- ✅ Trend analysis reduces false positives by 20%+
- ✅ AI chatbot answers 80%+ of safety questions correctly

---

## Questions to Resolve
1. **Storage**: Should history be local-only or sync to backend?
2. **PDF Design**: Want to include TideSense branding/logo?
3. **Emergency Contacts**: Hard-code lifeguard numbers or let users customize?
4. **Gemini API**: Need to upgrade from free tier (50/day) for chatbot feature?
