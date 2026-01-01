
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
              1. Extract strictly the FRENCH text visible in the image.
              2. IGNORE any English text or translations that might appear on the page.
              3. Do NOT translate the French text yourself in the 'french' field (write it exactly as seen).
              4. Provide the English translation in the 'english' field.
              5. Do not include page numbers.
              6. Identify 2-5 key vocabulary words (nouns, verbs, adjectives). ALWAYS extract at least 2 words.
              7. Generate the page title STRICTLY IN FRENCH.
            `}
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A short title for this specific page scene. STRICTLY IN FRENCH." },
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

  async processBookFromText(fullText: string, voiceName: VoiceName): Promise<{ title: string; pages: any[] }> {
    const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
    const ai = new GoogleGenAI({ apiKey });

    try {
      console.log("Segmenting book text...");

      // Step 1: Analyze text to split into pages and get ONE visual prompt
      const segmentationResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          parts: [{
            text: `You are a professional children's book editor.
            Analyze the following text and split it into logical "pages" for a picture book.
            
            Input Text:
            "${fullText}"

            Instructions:
            1. Split the text into pages. Break the text where it makes sense narratively (e.g., scene changes, pauses).
            2. Aim for roughly 4-5 lines per page, but PRIORITIZE narrative flow over strict line counts.
            3. Create a single, vibrant image generation prompt for the BOOK COVER that represents the whole story.
            4. Create a catchy Title for the book. STRICTLY IN FRENCH.
            5. For each page, create a short title. STRICTLY IN FRENCH. Do NOT use English.
            
            Output JSON Schema:
            {
              "bookTitle": "string (The title MUST be in French language)",
              "coverImagePrompt": "string (visual description for the whole book)",
              "pages": [
                { "text": "string (the text for this page)", "title": "string (Title MUST be in French)" }
              ]
            }`
          }]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bookTitle: { type: Type.STRING },
              coverImagePrompt: { type: Type.STRING },
              pages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    title: { type: Type.STRING }
                  },
                  required: ["text", "title"]
                }
              }
            },
            required: ["bookTitle", "coverImagePrompt", "pages"]
          }
        }
      });

      const bookStructure = JSON.parse(segmentationResponse.text || "{}");
      console.log(`Split into ${bookStructure.pages?.length} pages.`);

      const processedPages = [];
      const bookTitle = bookStructure.bookTitle || "Histoire Générée";

      // Step 2: Generate ONE Cover Image
      let coverImageBase64 = "";
      // Skipped AI Gen: gemini-2.0-flash is not an image model. 
      // We will generate a canvas cover in the App.

      // Step 3: Process each page (Text Analysis + Audio)
      const globalUsedWords = new Set<string>();

      for (const [index, pageData] of bookStructure.pages.entries()) {
        console.log(`Processing Page ${index + 1}...`);

        // Analyze Text for Sentences/Keywords
        const analysis = await this.processTextChunk(pageData.text, voiceName, Array.from(globalUsedWords));

        // Add new keywords to global set to avoid repetition
        if (analysis.keywords) {
          analysis.keywords.forEach((k: any) => globalUsedWords.add(k.word.toLowerCase()));
        }

        processedPages.push({
          title: pageData.title,
          sentences: analysis.sentences,
          keywords: analysis.keywords,
          audio: analysis.audio,
          image: coverImageBase64 // Use the cover image for every page
        });

        // Brief pause to help rate limits
        await new Promise(r => setTimeout(r, 500));
      }

      return { title: bookTitle, pages: processedPages };

    } catch (error) {
      console.error("Book Processing Error:", error);
      throw error;
    }
  },

  // Helper to process a single pre-segmented chunk
  async processTextChunk(text: string, voiceName: VoiceName, excludeWords: string[] = []) {
    const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{
          text: `Analyze the following French text: "${text}". 
          Instructions:
          1. Extract the text into sentences.
          2. For each sentence, provide the exact 'french' text and its 'english' translation.
          3. The 'french' field must contain ONLY French text.
          4. The 'english' field must contain ONLY English text.
          5. Identify 3-5 key vocabulary words. You MUST extract at least 3 words, even if they are simple (e.g., 'le', 'et', 'chat') or if the text is very short.
          6. For keywords, provide the word, pronunciation, and simple explanation.
          7. Do NOT include these words as keywords (already used): ${excludeWords.join(', ')}.`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentences: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { french: { type: Type.STRING }, english: { type: Type.STRING } }, required: ["french", "english"] } },
            keywords: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { word: { type: Type.STRING }, pronunciation: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["word", "pronunciation", "explanation"] } }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "{}");

    // Audio
    const fullText = (data.sentences || []).map((s: any) => s.french).join(". ");
    let audio = "";
    if (fullText) {
      try { audio = await this.getAudioBytes(fullText, voiceName); } catch (e) { }
    }
    return { ...data, audio };
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
          name: (() => {
            switch (voiceName) {
              case 'Marie': return 'fr-FR-Neural2-A';
              case 'Pierre': return 'fr-FR-Neural2-B';
              case 'Léa': return 'fr-FR-Neural2-C';
              case 'Thomas': return 'fr-FR-Neural2-D';
              default: return 'fr-FR-Neural2-A';
            }
          })()
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

  async playCachedAudio(base64: string, text: string, onEnd: () => void, onProgress?: (charIndex: number) => void) {
    if (!base64 && text) {
      this.browserSpeak(text, onEnd, undefined); // No boundary events for simple text fallback yet
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    try {
      const buffer = await decodeAudioData(decode(base64), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      const startTime = audioContext.currentTime;
      const duration = buffer.duration;
      let animationFrameId: number;

      const trackProgress = () => {
        const elapsed = audioContext.currentTime - startTime;
        if (elapsed < duration) {
          if (onProgress) {
            // Estimated char index based on linear time mapping
            // This assumes constant speaking rate, which isn't perfect but is a good approximation for sentence tracking
            const progress = elapsed / duration;
            const estimatedIndex = Math.floor(progress * text.length);
            onProgress(estimatedIndex);
          }
          animationFrameId = requestAnimationFrame(trackProgress);
        }
      };

      source.onended = () => {
        if (onProgress) onProgress(text.length); // Ensure we finish at the end
        cancelAnimationFrame(animationFrameId);
        onEnd();
        audioContext.close();
      };

      source.start();
      if (onProgress) trackProgress();

    } catch (error) {
      console.error("Playback error:", error);
      this.browserSpeak(text, onEnd, undefined); // Fallback
      audioContext.close();
    }
  },

  browserSpeak(text: string, onEnd: () => void, onBoundary?: (e: SpeechSynthesisEvent) => void) {
    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.onend = onEnd;
    if (onBoundary) {
      utterance.onboundary = onBoundary;
    }
    window.speechSynthesis.speak(utterance);
  }
};
