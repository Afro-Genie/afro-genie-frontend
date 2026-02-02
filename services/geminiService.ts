
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
    
    CRITICAL: Distinguish carefully between Standard English ('en') and Nigerian Pidgin ('pidgin').
    If the text contains Pidgin markers such as "dey", "na", "wey", "una", "abeg", "wetin", "don", "fit", "sabi", or "pikin", classify it as 'pidgin', NOT 'en'.
    
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

    // Handle different response structures - check multiple possible paths
    let responseText = '';
    if (typeof response === 'string') {
      responseText = response;
    } else if (response && typeof response === 'object') {
      // Check if text is a function (common in Google GenAI SDKs)
      if (typeof (response as any).text === 'function') {
        responseText = (response as any).text();
      } else {
        responseText = (response as any).text ||
          (response as any).response?.text ||
          (response as any).candidates?.[0]?.content?.parts?.[0]?.text ||
          '';
      }
    }

    if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
      console.warn('Language detection returned invalid response format:', { response, type: typeof response });
      return 'en'; // Fallback to English
    }

    const detectedCode = responseText.trim().toLowerCase();

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
    // Don't throw, just return default 'en' to allow flow to continue
    return 'en';
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
    You are an expert translator specializing in African music lyrics and linguistics.
    Your task is to translate the provided song lyrics accurately into ${targetLang}, preserving the poetic and emotional essence.

    IMPORTANT: African songs often feature "code-switching" - mixing different languages (e.g., English, Pidgin, Yoruba, Igbo, Hausa) within the same song or even the same line.
    
    1. Do NOT assume the entire song is in a single language, even if a primary language is detected as '${sourceLang}'.
    2. Analyze each line and distinct phrase to identify its specific language or dialect based on context.
    3. Translate ALL parts into ${targetLang}.
    4. If a phrase is already in ${targetLang} (e.g. English lines when translating to English), leave them as is or refine them for clarity if requested.
    
    Here is the song information:
    - Artist: ${artist}
    - Song Title: ${title}
    - Primary Language (Detected): ${sourceLang}
    - Target Language: ${targetLang}
    - Lyrics:
    ---
    ${lyrics}
    ---

    Translate the provided lyrics to ${targetLang}. Handle any code-switching or mixed languages contextually. The translation should be accurate and capture the poetic and emotional essence of the original lyrics. The result should be a single string with line breaks preserved.

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

    // Handle different response structures - check multiple possible paths
    let responseText = '';
    if (typeof response === 'string') {
      responseText = response;
    } else if (response && typeof response === 'object') {
      // Check if text is a function (common in Google GenAI SDKs)
      if (typeof (response as any).text === 'function') {
        responseText = (response as any).text();
      } else {
        responseText = (response as any).text ||
          (response as any).response?.text ||
          (response as any).candidates?.[0]?.content?.parts?.[0]?.text ||
          '';
      }
    }

    if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
      console.error('Translation response missing text content:', { response, type: typeof response });
      throw new Error("AI response is missing text content.");
    }

    // Strip markdown code blocks if present (e.g. ```json ... ```)
    let jsonString = responseText.trim();
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    }

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
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse AI response. The model returned invalid JSON.");
    }
    throw new Error("Failed to get translation from AI. The model may have returned an invalid response or the service is unavailable.");
  }
}
