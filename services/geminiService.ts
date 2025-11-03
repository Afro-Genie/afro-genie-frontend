
import { GoogleGenAI, Type } from "@google/genai";
import type { AiAnalysisResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAiAnalysis(
  artist: string,
  title: string,
  lyrics: string,
  sourceLang: string,
  targetLang: string
): Promise<AiAnalysisResult> {
  const prompt = `
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
  `;

  try {
    const response = await ai.models.generateContent({
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
