# 📖 Livre Magique (Magic Story Cards)

Transform your French picture books into an interactive multimodal experience. `Livre Magique` takes any PDF and uses AI to generate "Magic Story Cards" with automatic OCR, summaries, and professional studio narration.

![Aesthetic](https://img.shields.io/badge/Aesthetics-Premium-blueviolet)
![Service](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-blue)
![Audio](https://img.shields.io/badge/Audio-Google%20Cloud%20TTS-green)

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
- **AI/LLM**: Google Gemini 2.0 Flash API
- **TTS**: Google Cloud Text-to-Speech REST API
- **Storage**: Browser IndexedDB (via a custom DB service)

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- A Google AI Studio API Key (for Gemini)
- Google Cloud TTS API enabled for that key

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Installation
```bash
npm install
npm run dev
```

## 📖 Usage
1. Open the app in your browser (usually `http://localhost:5173`).
2. Click **"Importer un livre"** and select a PDF file.
3. Wait for the "Magic" to happen as the IA processes each page.
4. Once finished, click on your book in the library to open the story scroll.
5. Use the **"Écouter la page"** button to hear the narration. Toggle **"Voix système"** in the header if you want to use your computer's local voices instead.

## 🔒 Privacy
All data, including your processed books and images, are stored **locally** in your browser's IndexedDB. No book content is stored on our servers.

---
*Created with ❤️ for French learners and story lovers.*
