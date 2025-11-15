import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// Return type omits 'source' as it's added client-side in App.tsx
export const extractInfo = async (file: File | null, text: string): Promise<Omit<ExtractedData, 'source'>> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const model = "gemini-2.5-flash";

  const prompt = `
    Analyze the provided content (image and/or text) and extract the following information.
    The content could be from a poster, screenshot, document, or pasted text about an event, application, or deadline.
    Format the output as a JSON object matching the provided schema.
    If a piece of information is not available, return null for that field.
    - Title: The main heading or title of the event/opportunity.
    - Summary: A brief one or two-sentence summary of the description.
    - Eligibility Criteria: Any requirements or criteria for participation.
    - Location: The physical or virtual location.
    - Deadline: The absolute final date and time for submission or attendance. Extract it in YYYY-MM-DDTHH:MM:SS format. Today is ${new Date().toLocaleDateString('en-CA')}. If a timezone is mentioned, convert it to UTC. If no time is mentioned, return only the date part (YYYY-MM-DD).
  `;
  
  const parts: any[] = [{ text: prompt }];
  if (file) {
      parts.push(await fileToGenerativePart(file));
  }
  if (text) {
      parts.push({ text: `User provided text: """${text}"""` });
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'The main heading or title.' },
          summary: { type: Type.STRING, description: 'A brief summary.' },
          eligibility: { type: Type.STRING, description: 'Eligibility criteria.' },
          location: { type: Type.STRING, description: 'The location.' },
          deadline: { type: Type.STRING, description: 'The deadline in YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD format.' },
        },
      },
    },
  });
  
  try {
    const jsonString = response.text.trim();
    const parsedData = JSON.parse(jsonString);
    return parsedData as Omit<ExtractedData, 'source'>;
  } catch (e) {
      console.error("Failed to parse Gemini response:", response.text);
      throw new Error("Could not parse the response from the AI model.");
  }
};