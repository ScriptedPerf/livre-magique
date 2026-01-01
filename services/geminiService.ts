
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
  async processPage(imageBase64: string, voiceName: VoiceName): Promise<{ title: string; sentences: { french: string; english: string }[]; keywords: { word: string; pronunciation: string; explanation: string }[]; audio: string }> {
    const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
    const ai = new GoogleGenAI({ apiKey });

    try {
      console.log("Analyzing page text content with Schema...");

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          parts: [
            { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
            {
              text: `Analyze this page of a French children's book.
              Instructions:
              1. Extract ALL French text exactly as written.
              2. Do not include page numbers or irrelevant text.
              3. Provide an English translation for each sentence.
              4. Identify 2-5 key vocabulary words (nouns, verbs, adjectives). ALWAYS extract at least 2 words.
            `}
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A short title for this specific page scene." },
              sentences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    french: { type: Type.STRING, description: "The exact French sentence." },
                    english: { type: Type.STRING, description: "English translation." },
                  },
                  required: ["french", "english"],
                },
              },
              keywords: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING, description: "French word." },
                    pronunciation: { type: Type.STRING, description: "Phonetic pronunciation guide." },
                    explanation: { type: Type.STRING, description: "Simple definition or translation." },
                  },
                  required: ["word", "pronunciation", "explanation"],
                },
              },
            },
            required: ["title", "sentences", "keywords"],
          },
        },
      });

      const result = JSON.parse(response.text || "{}");
      console.log("Raw Schema Result:", result);

      let title = result.title || "Page sans titre";
      let sentences = (result.sentences || []).filter((s: any) => s.french && s.french.trim().length > 0);
      let keywords = result.keywords || [];

      // Fallback if schema fails to extract sentences (rare with strict schema)
      if (sentences.length === 0) {
        title = "Page sans texte";
        sentences = [];
      }

      console.log("Synthesizing audio...");
      let audioBase64 = "";
      if (sentences.length > 0) {
        try {
          // Speak only the French parts
          const fullText = sentences.map((s: any) => s.french).join(". ");
          audioBase64 = await this.getAudioBytes(fullText, voiceName);
        } catch (e) {
          console.error("Audio Synthesis error:", e);
        }
      }

      return { title, sentences, keywords, audio: audioBase64 };

    } catch (error: any) {
      console.error("Gemini Schema Error:", error);
      // Fallback to simple processing or re-throw
      if (error.message?.includes("429")) {
        throw new Error("Rate limit exceeded. Please wait a moment.");
      }
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
