#!/bin/bash

# TideSense AI Setup Script
# Run this to quickly set up your app with Gemini and ElevenLabs

set -e  # Exit on error

echo "🌊 TideSense AI Setup Script"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this from the project root.${NC}"
    exit 1
fi

# Step 1: Install Node dependencies
echo -e "${YELLOW}Step 1/5: Installing React Native dependencies...${NC}"
npm install
echo -e "${GREEN}✓ React Native dependencies installed${NC}"
echo ""

# Step 2: Check Python
echo -e "${YELLOW}Step 2/5: Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is required but not installed.${NC}"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ Found: $PYTHON_VERSION${NC}"
echo ""

# Step 3: Install Python dependencies
echo -e "${YELLOW}Step 3/5: Installing Python backend dependencies...${NC}"
cd server
pip3 install -r requirements.txt
cd ..
echo -e "${GREEN}✓ Python dependencies installed${NC}"
echo ""

# Step 4: Set up environment file
echo -e "${YELLOW}Step 4/5: Setting up environment configuration...${NC}"
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo -e "${GREEN}✓ Created server/.env file${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: You need to add your API keys to server/.env${NC}"
    echo ""
    echo "Required:"
    echo "  1. Get Gemini API key: https://aistudio.google.com/app/apikey"
    echo "  2. Add to server/.env as GOOGLE_API_KEY=your_key_here"
    echo ""
    echo "Optional (for better voice):"
    echo "  3. Get ElevenLabs key: https://elevenlabs.io"
    echo "  4. Add to server/.env as ELEVENLABS_API_KEY=your_key_here"
    echo ""
else
    echo -e "${GREEN}✓ server/.env already exists${NC}"
fi
echo ""

# Step 5: Update navigation (optional)
echo -e "${YELLOW}Step 5/5: Checking navigation setup...${NC}"
if grep -q "ChatScreen" src/navigation/AppNavigator.tsx; then
    echo -e "${GREEN}✓ ChatScreen already added to navigation${NC}"
else
    echo -e "${YELLOW}⚠️  ChatScreen not yet added to navigation${NC}"
    echo "You'll need to manually add it to src/navigation/AppNavigator.tsx"
fi
echo ""

# Final instructions
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup Complete! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Add your API keys to server/.env (if not done already)"
echo "   - Required: GOOGLE_API_KEY"
echo "   - Optional: ELEVENLABS_API_KEY"
echo ""
echo "2. Start the backend server:"
echo -e "   ${YELLOW}cd server && python3 main.py${NC}"
echo ""
echo "3. In a new terminal, start the app:"
echo -e "   ${YELLOW}npm start${NC}"
echo ""
echo "4. Optional improvements:"
echo "   - Replace src/screens/ResultsScreen.tsx with ResultsScreenImproved.tsx"
echo "   - Add ChatScreen to your navigator (see IMPLEMENTATION_GUIDE.md)"
echo ""
echo "📚 See IMPLEMENTATION_GUIDE.md for detailed instructions"
echo "📊 See IMPROVEMENTS_SUMMARY.md for what's been added"
echo ""
echo "Test your setup:"
echo "  - Backend health: http://localhost:8000/health"
echo "  - API docs: http://localhost:8000/docs"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
