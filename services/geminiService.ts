
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

export async function getAiAnalysis(
  artist: string,
  title: string,
  lyrics: string,
  sourceLang: string,
  targetLang: string
): Promise<AiAnalysisResult> {
  const hasLyrics = lyrics.trim().length > 0 && !lyrics.includes('Provide cultural context');
  
  const prompt = hasLyrics ? `
    You are an expert in music, linguistics, and cultural studies, specializing in African music.
    Your task is to analyze the provided song lyrics.

    Here is the song information:
    - Artist: ${artist}
    - Song Title: ${title}
    - Original Language: ${sourceLang}
    - Target Language for Translation: ${targetLang}
    - Lyrics:
    ---
    ${lyrics}
    ---

    Please perform the following two tasks and provide the output in a single, valid JSON object, adhering strictly to the provided schema. Do not include any text, markdown formatting like \`\`\`json, or any other characters outside of the JSON object itself.

    1.  **Translate the lyrics**: Translate the provided lyrics from ${sourceLang} to ${targetLang}. The translation should be accurate and capture the poetic and emotional essence of the original lyrics. The result should be a single string with line breaks.

    2.  **Provide cultural context**: Analyze the original lyrics and provide a detailed cultural context as a single string. This should include:
        - A brief summary of the song's story or message.
        - Explanations of any slang, idioms, or culturally specific references.
        - Insights into the cultural or historical background relevant to the song.
        Use markdown-style formatting within the string (e.g., using ### for headings, ** for bold) to structure the context for better readability.

    The final output must be ONLY the JSON object.
  ` : `
    You are an expert in music, linguistics, and cultural studies, specializing in African music.
    Your task is to provide cultural context and meaning for a song even without the exact lyrics.

    Here is the song information:
    - Artist: ${artist}
    - Song Title: ${title}
    - Original Language: ${sourceLang}
    - Target Language for Analysis: ${targetLang}
    - Note: Lyrics were not provided

    Please perform the following two tasks and provide the output in a single, valid JSON object, adhering strictly to the provided schema. Do not include any text, markdown formatting like \`\`\`json, or any other characters outside of the JSON object itself.

    1.  **Provide suggestive meaning**: Based on the artist's typical themes and the song title, provide a suggestive interpretation of what the song might be about in ${targetLang}. Clearly state this is suggestive and based on cultural context, not exact lyrics. The result should be a single string.

    2.  **Provide cultural context**: Provide detailed cultural context about this song as a single string. This should include:
        - Information about the artist and their musical style
        - What this song title might suggest in the cultural context
        - Common themes in this artist's work
        - The cultural significance or impact of this song if known
        - Any slang or idioms commonly associated with this artist
        Use markdown-style formatting within the string (e.g., using ### for headings, ** for bold) to structure the context for better readability.

    IMPORTANT: Make it clear that without lyrics, this is a suggestive analysis based on cultural knowledge and the artist's typical themes.

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
            culturalContext: {
              type: Type.STRING,
              description: 'A detailed analysis of the song\'s cultural context, including slang explanations and storytelling. Formatted as a single string with markdown-style formatting.',
            },
          },
          required: ["translatedLyrics", "culturalContext"],
        },
      },
    });

    const jsonString = response.text.trim();
    const parsedResult = JSON.parse(jsonString) as AiAnalysisResult;
    
    if (!parsedResult.translatedLyrics || !parsedResult.culturalContext) {
      throw new Error("AI response is missing required fields.");
    }

    return parsedResult;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get analysis from AI. The model may have returned an invalid response.");
  }
}
