
import { GoogleGenAI, Type } from "@google/genai";
import type { AiAnalysisResult } from '../types';

// Get API key from environment (Vite maps GEMINI_API_KEY to process.env.API_KEY)
const getAPIKey = (): string => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable is not set.");
    console.error("Please set GEMINI_API_KEY in your .env.local file");
    throw new Error("API_KEY environment variable is not set.");
  }
  return apiKey;
};

let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: getAPIKey() });
  }
  return ai;
};

/**
 * Detect the language of lyrics using AI
 * Returns ISO 639-1 language code (e.g., 'en', 'yo', 'fr')
 */
export async function detectLanguage(lyrics: string): Promise<string> {
  if (!lyrics || lyrics.trim().length === 0) {
    throw new Error('Lyrics cannot be empty for language detection');
  }

  const prompt = `
    You are an expert in language detection, specializing in African languages and dialects.
    
    Analyze the following lyrics and determine the primary language. Return ONLY the ISO 639-1 language code.
    
    Common languages to consider:
    - English: 'en'
    - French: 'fr'
    - Spanish: 'es'
    - Portuguese: 'pt'
    - Arabic: 'ar'
    - Swahili: 'sw'
    - Yoruba: 'yo'
    - Igbo: 'ig'
    - Hausa: 'ha'
    - Nigerian Pidgin: 'pidgin'
    - Zulu: 'zu'
    - Xhosa: 'xh'
    - Amharic: 'am'
    - Twi: 'tw'
    - Fula: 'ff'
    
    If the language is a dialect or variant (like Nigerian Pidgin), use 'pidgin' for Nigerian Pidgin.
    If you cannot determine the language with confidence, return 'en' as default.
    
    Lyrics to analyze:
    ---
    ${lyrics.substring(0, 1000)}${lyrics.length > 1000 ? '...' : ''}
    ---
    
    Return ONLY the language code, nothing else. No explanation, no JSON, just the code.
  `;

  try {
    const aiInstance = getAI();
    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 10
      }
    });

    const detectedCode = response.text.trim().toLowerCase();
    
    // Validate and normalize the code
    const validCodes = ['en', 'fr', 'es', 'pt', 'ar', 'sw', 'yo', 'ig', 'ha', 'pidgin', 'zu', 'xh', 'am', 'tw', 'ff'];
    if (validCodes.includes(detectedCode)) {
      return detectedCode;
    }
    
    // Try to extract code from response if it contains extra text
    const codeMatch = detectedCode.match(/\b(en|fr|es|pt|ar|sw|yo|ig|ha|pidgin|zu|xh|am|tw|ff)\b/);
    if (codeMatch) {
      return codeMatch[1];
    }
    
    // Fallback to English if detection fails
    console.warn('Language detection returned invalid code, defaulting to English:', detectedCode);
    return 'en';
  } catch (error) {
    console.error("Error detecting language with Gemini API:", error);
    throw new Error("Failed to detect language. Please select the language manually.");
  }
}

export async function getAiAnalysis(
  artist: string,
  title: string,
  lyrics: string,
  sourceLang: string,
  targetLang: string
): Promise<AiAnalysisResult> {
  const hasLyrics = lyrics.trim().length > 0 && !lyrics.includes('Provide cultural context');

  const prompt = hasLyrics ? `
    You are an expert translator specializing in African music lyrics.
    Your task is to translate the provided song lyrics accurately while preserving the poetic and emotional essence.

    Here is the song information:
    - Artist: ${artist}
    - Song Title: ${title}
    - Original Language: ${sourceLang}
    - Target Language for Translation: ${targetLang}
    - Lyrics:
    ---
    ${lyrics}
    ---

    Translate the provided lyrics from ${sourceLang} to ${targetLang}. The translation should be accurate and capture the poetic and emotional essence of the original lyrics. The result should be a single string with line breaks preserved.

    Provide the output in a single, valid JSON object, adhering strictly to the provided schema. Do not include any text, markdown formatting like \`\`\`json, or any other characters outside of the JSON object itself.

    The final output must be ONLY the JSON object.
  ` : `
    You are an expert translator specializing in African music.
    Your task is to provide a suggestive translation based on the song title and artist information.

    Here is the song information:
    - Artist: ${artist}
    - Song Title: ${title}
    - Original Language: ${sourceLang}
    - Target Language for Translation: ${targetLang}
    - Note: Lyrics were not provided

    Based on the artist's typical themes and the song title, provide a suggestive interpretation of what the song might be about in ${targetLang}. Clearly state this is suggestive and based on the title and artist context, not exact lyrics. The result should be a single string.

    Provide the output in a single, valid JSON object, adhering strictly to the provided schema. Do not include any text, markdown formatting like \`\`\`json, or any other characters outside of the JSON object itself.

    IMPORTANT: Make it clear that without lyrics, this is a suggestive translation based on the song title and artist context.

    The final output must be ONLY the JSON object.
  `;

  try {
    const aiInstance = getAI();
    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedLyrics: {
              type: Type.STRING,
              description: 'The full lyrics translated into the target language as a single string with newline characters preserved.',
            },
          },
          required: ["translatedLyrics"],
        },
      },
    });

    const jsonString = response.text.trim();
    const parsedResult = JSON.parse(jsonString) as AiAnalysisResult;

    if (!parsedResult.translatedLyrics) {
      throw new Error("AI response is missing required fields.");
    }

    // Return only translation, no cultural context (AI only handles translation now)
    return {
      translatedLyrics: parsedResult.translatedLyrics
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get translation from AI. The model may have returned an invalid response.");
  }
}
