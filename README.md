# 📖 Livre Magique (Magic Story Cards)

Transform your French picture books into an interactive multimodal experience. `Livre Magique` takes any PDF and uses AI to generate "Magic Story Cards" with automatic OCR, summaries, and professional studio narration.

![Aesthetic](https://img.shields.io/badge/Aesthetics-Premium-blueviolet)
![Service](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-blue)
![Audio](https://img.shields.io/badge/Audio-Google%20Cloud%20TTS-green)

---

## 📚 Documentation
- [**Architecture Overview**](./ARCHITECTURE.md) - How the pieces fit together.
- [**Contributing Guide**](./CONTRIBUTING.md) - How to set up for development.
- [**Deployment Guide**](./DEPLOY.md) - How to run with Docker or defined on Cloud Run.

## ✨ Features

- **🪄 Magic Story Cards**: Each page of your PDF is transformed into a sleek, interactive card containing the original image and transcribed text.
- **👁️ Intelligent OCR**: Uses Gemini 2.0 Flash to precisely transcribe French text from images, handling stylized fonts and complex layouts.
- **🎙️ Studio Quality Narration**: Integration with Google Cloud Text-to-Speech (Neural2 voices) provides high-quality, professional French narration.
- **🔊 Hybrid Audio System**: Includes a "Voix système" (System Voice) toggle to switch between premium AI voices and local browser-based voices for zero-cost playback.
- **📚 Personal Library**: Books are saved locally in your browser (IndexedDB) so you can build your collection over time.
- **⚡ Performance First**: Page-by-page processing with rate-limit protection and error resilience.

## 🛠️ Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Vanilla CSS with modern glassmorphism and premium aesthetics
- **AI/LLM**: Google Gemini 2.0 Flash API (via `@google/genai`)
- **TTS**: Google Cloud Text-to-Speech REST API
- **Storage**: Browser IndexedDB (via a custom DB service)

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Google Cloud Project** with the following APIs enabled:
  - Generative Language API (Gemini)
  - Cloud Text-to-Speech API

### 2. Environment Setup
Get your API key from [Google AI Studio](https://aistudio.google.com/).
Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_api_key_here
```
*Note: The app currently uses the same key for both Gemini and Cloud TTS. Ensure your API key has permissions for both services.*

### 3. Installation
```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

## 📖 Usage
1. **Launch**:
   - **Local Dev**: Open `http://localhost:3001`
   - **Docker/Production**: Open `http://localhost:8080` (or your Cloud Run URL)
2. **Import**: Click **"Importer un livre"**.
   - **PDF**: Upload a scan of a children's book.
   - **Text**: Upload a `.txt` file or paste text directly. The AI will segment it into pages and generate an artistic cover.
3. **Wait**: The "IA active" indicator will show progress.
4. **Read & Listen**: Click a book to open. Click the big Play button to hear the narration.
   - **Karaoke Mode**: Text highlights as it is spoken.
   - **Vocabulary**: Click on keywords at the bottom of the card to hear pronunciation and definitions.

## ❓ Troubleshooting

**"Error: Cloud TTS Error"**
- Check that the Cloud Text-to-Speech API is enabled in your Google Cloud Console.
- Verify your API Key has the correct restrictions (or lack thereof) to access the TTS endpoint.

**"Rate limit exceeded"**
- Gemini 2.0 Flash has generous free tier limits, but if you import a massive 50-page PDF instantly, you might hit them. The app attempts to space out requests (2 seconds per page).

**"Invalid API Key"**
- Double-check `.env.local`. Restart the dev server (`npm run dev`) after changing environment variables.

## 🔒 Privacy
All data, including your processed books, images, and audio, are stored **locally** in your browser's IndexedDB. No book content is uploaded to any private server (other than the temporary processing by Google APIs).

---
*Created with ❤️ for French learners and story lovers.*
