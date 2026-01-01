
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VoiceName } from "../types";

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return audioBuffer;
}

export const geminiService = {
  async processPage(imageBase64: string, voiceName: VoiceName): Promise<{ title: string; keySentences: string[]; audio: string }> {
    const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
    const ai = new GoogleGenAI({ apiKey });

    const getAnalysis = async (promptType: 'json' | 'list' = 'json') => {
      const modelName = 'gemini-2.0-flash';
      const prompt = promptType === 'json'
        ? `Precisely transcribe ALL French sentences on this page. Output JSON ONLY: {"title": "page title", "keySentences": ["transcribed sentence 1", "..."]}`
        : `Listing the text on this page. Transcribe exactly what is written in French. No other text.`;

      try {
        // Use gemini-1.5-flash-latest for stable OCR
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{
            parts: [
              { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
              { text: prompt }
            ]
          }],
          // Only use JSON mode for the 'json' prompt type
          config: promptType === 'json' ? { responseMimeType: "application/json" } : undefined
        });
        return response.text;
      } catch (e: any) {
        if (e.message?.includes("429")) {
          console.warn("Analysis rate limit, waiting...");
          await new Promise(r => setTimeout(r, 8000));
          return null;
        }
        throw e;
      }
    };

    try {
      console.log("Analyzing page text content...");
      let rawText = await getAnalysis('json');

      // If empty or null, try once more with JSON
      if (!rawText || rawText === "{}" || rawText.includes("[]")) {
        console.log("Empty JSON response, retrying with simple list prompt...");
        rawText = await getAnalysis('list');
      }

      if (!rawText) throw new Error("Analysis failed");

      let title = "Page sans titre";
      let keySentences: string[] = [];

      try {
        // Attempt to parse JSON
        if (rawText.trim().startsWith('{')) {
          const result = JSON.parse(rawText);
          title = result.title || title;
          keySentences = result.keySentences || [];
        } else {
          // Fallback for non-JSON text (from the 'list' prompt)
          keySentences = rawText.split('\n').filter(line => line.trim().length > 3);
          title = keySentences[0]?.substring(0, 20) || title;
        }
      } catch (p) {
        console.error("JSON Parse failed, treating as raw list");
        keySentences = rawText.split('\n').filter(line => line.trim().length > 3);
      }

      console.log("Synthesizing audio...");
      let audioBase64 = "";
      if (keySentences.length > 0) {
        try {
          audioBase64 = await this.getAudioBytes(keySentences.join(". "), voiceName);
        } catch (e) {
          console.error("Audio Synthesis error:", e);
        }
      }

      return { title, keySentences: keySentences.slice(0, 5), audio: audioBase64 };
    } catch (error: any) {
      console.error("Gemini Error:", error);
      throw error;
    }
  },

  async generateCover(prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: (process.env.API_KEY || process.env.GEMINI_API_KEY) as string });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: `Vibrant children's book cover: ${prompt}` }] }],
    });
    const data = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (!data) throw new Error("Cover failed");
    return data;
  },

  async getAudioBytes(text: string, voiceName: VoiceName): Promise<string> {
    const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'fr-FR',
          name: (voiceName as string) === 'Aoife' ? 'fr-FR-Neural2-A' : 'fr-FR-Neural2-B'
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          sampleRateHertz: 24000
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Cloud TTS Error: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.audioContent;
  },

  async playCachedAudio(base64: string, text: string, onEnd: () => void) {
    if (!base64 && text) {
      this.browserSpeak(text, onEnd);
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    try {
      const buffer = await decodeAudioData(decode(base64), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => { onEnd(); audioContext.close(); };
      source.start();
    } catch (error) {
      console.error("Playback error:", error);
      this.browserSpeak(text, onEnd);
      audioContext.close();
    }
  },

  browserSpeak(text: string, onEnd: () => void) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.onend = onEnd;
    window.speechSynthesis.speak(utterance);
  }
};
