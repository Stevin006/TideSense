#!/usr/bin/env python3
"""
Quick script to check available Gemini models
"""
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("❌ No GOOGLE_API_KEY found in .env file")
    exit(1)

print(f"✓ Using API key: {GOOGLE_API_KEY[:10]}...")
print("\nConfiguring Gemini API...")

genai.configure(api_key=GOOGLE_API_KEY)

print("\n📋 Available Models:\n")
print("-" * 80)

try:
    models = genai.list_models()
    
    for model in models:
        # Check if it supports generateContent
        supports_generate = 'generateContent' in model.supported_generation_methods
        
        if supports_generate:
            print(f"✅ {model.name}")
            print(f"   Display Name: {model.display_name}")
            print(f"   Description: {model.description}")
            print(f"   Supported Methods: {', '.join(model.supported_generation_methods)}")
            print("-" * 80)
    
    print("\n🎯 Recommended models for generateContent:")
    print("-" * 80)
    
    for model in models:
        if 'generateContent' in model.supported_generation_methods:
            # Extract just the model name without the 'models/' prefix
            model_name = model.name.replace('models/', '')
            print(f"   model = genai.GenerativeModel('{model_name}')")
    
except Exception as e:
    print(f"\n❌ Error listing models: {e}")
    print("\nThis might be due to:")
    print("  1. Invalid API key")
    print("  2. API key doesn't have proper permissions")
    print("  3. Network connectivity issues")
