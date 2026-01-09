import { GoogleGenAI, Modality, Type } from "@google/genai";
import { LandmarkData } from "../types";
import { decodeAudioData } from "./audioUtils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Step 1: Identify the landmark from the image using gemini-3-pro-preview
 */
export async function identifyLandmark(base64Image: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          {
            text: "Identify the main landmark in this photo. Return ONLY the name of the landmark and the city. If there is no recognizable landmark, return 'Unknown'."
          }
        ]
      }
    });

    const text = response.text || "Unknown";
    console.log("Landmark identified:", text);
    return text.trim();
  } catch (error) {
    console.error("Error identifying landmark:", error);
    throw new Error("Failed to identify landmark.");
  }
}

/**
 * Step 2: Fetch details using gemini-3-flash-preview with googleSearch tool
 */
export async function getLandmarkDetails(landmarkName: string): Promise<LandmarkData> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Find interesting historical facts and tourist information about ${landmarkName}. Write a short, engaging 3-sentence summary suitable for a narration.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: "A 3-sentence engaging summary of the landmark history.",
            },
          },
        }
      }
    });

    // Extract text from JSON response
    const jsonText = response.text;
    let description = "No description available.";
    
    if (jsonText) {
        try {
            const parsed = JSON.parse(jsonText);
            description = parsed.description;
        } catch (e) {
            console.warn("Failed to parse JSON description, using raw text", e);
            description = jsonText;
        }
    }

    // Extract sources
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => chunk.web)
      .filter((web: any) => web && web.uri && web.title) || [];

    return {
      name: landmarkName,
      description,
      sources
    };
  } catch (error) {
    console.error("Error fetching details:", error);
    throw new Error("Failed to get landmark details.");
  }
}

/**
 * Step 3: Generate speech using gemini-2.5-flash-preview-tts
 */
export async function generateNarration(text: string): Promise<AudioBuffer> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned from API");
    }

    // Initialize AudioContext only when needed (user interaction usually required before this, but here we prepare it)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const buffer = await decodeAudioData(base64Audio, audioContext, 24000, 1);
    
    // Close context to prevent leaking resources (browser limit is typically 6)
    await audioContext.close();

    return buffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate narration.");
  }
}