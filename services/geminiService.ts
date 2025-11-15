
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from '../types';

declare var XLSX: any; // From the script tag in index.html
declare var mammoth: any; // From the script tag in index.html

type ExtractedDataResult = Omit<ExtractedData, 'source'> & { originalSource?: string };


const getDeadlineFallback = (): string => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    // Format to YYYY-MM-DDTHH:MM:SS
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59:59`;
};

export const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const extractFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

const extractFromSheet = async (file: File): Promise<ExtractedDataResult[]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const csvData = XLSX.utils.sheet_to_csv(worksheet);

    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-2.5-flash";
    
    const prompt = `
        Analyze the following CSV data from a spreadsheet. The data represents a list of events, tasks, or deadlines.
        Your task is to extract the information for EACH ROW and format it as an array of JSON objects.
        
        The CSV data is:
        """
        ${csvData}
        """

        For each row, identify the following fields from the columns:
        - title: The main title or name of the event/task.
        - summary: A brief description. If not available, use the title.
        - location: The location, if any.
        - deadline: The deadline for the task.
        - category: A relevant category like "Business", "Personal", "Competition", "Grant", "Meeting", etc. Choose the most fitting one.
        
        IMPORTANT RULES:
        1. The output MUST be a valid JSON array. Each element in the array is an object representing one row of the spreadsheet.
        2. If a 'deadline' column is missing or a row has no value for it, you MUST create a valid deadline. Default to today's date at 23:59:59 if no other information can be inferred. Today is ${new Date().toISOString()}.
        3. Format all deadlines as YYYY-MM-DDTHH:MM:SS.
        4. If the spreadsheet is empty or contains no useful data, return an empty array [].
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: 'The main heading or title.' },
                    summary: { type: Type.STRING, description: 'A brief summary.' },
                    eligibility: { type: Type.STRING, description: 'Eligibility criteria.' },
                    location: { type: Type.STRING, description: 'The location.' },
                    deadline: { type: Type.STRING, description: 'The deadline in YYYY-MM-DDTHH:MM:SS format.' },
                    category: { type: Type.STRING, description: 'A relevant category for the event.' },
                }
            }
          },
        },
    });

    try {
        const jsonString = response.text.trim();
        const parsedData = JSON.parse(jsonString);
        if (Array.isArray(parsedData)) {
            return parsedData.map(item => ({ 
                ...item,
                deadline: item.deadline || getDeadlineFallback(),
                originalSource: file.name
            }));
        }
        return [];
    } catch (e) {
        console.error("Failed to parse Gemini response for sheet:", response.text);
        throw new Error("Could not parse the response from the AI model for the spreadsheet.");
    }
}

const convertFileToTextOrGenerativePart = async (file: File) => {
    if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        return { text: `File content from ${file.name} (spreadsheet):\n\n${csvData}` };
    }
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const docxText = await extractFromDocx(file);
        return { text: `File content from ${file.name} (Word document):\n\n${docxText}` };
    }
    // Default to sending the file directly for supported mime types like images/pdf
    return fileToGenerativePart(file);
};


export const extractInfo = async (file: File | null, text: string): Promise<ExtractedDataResult[]> => {
  const originalSourceName = file?.name || `Pasted Text: "${text.substring(0, 20)}..."`;
  if (file) {
    if (file.type.includes('spreadsheet') || file.type.includes('csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        return extractFromSheet(file);
    }
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const docxText = await extractFromDocx(file);
        text = `CONTEXT FROM DOCX FILE (${file.name}):\n\n${docxText}`;
        file = null; 
    }
  }

  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const model = "gemini-2.5-flash";

  const prompt = `
    Analyze the provided content (image, PDF, and/or text) and extract the following information.
    The content could be from a poster, screenshot, document, or pasted text about an event, application, or deadline.
    Format the output as a JSON object matching the provided schema.
    If a piece of information is not available, return null for that field.
    - Title: The main heading or title of the event/opportunity.
    - Summary: A brief one or two-sentence summary of the description.
    - Eligibility Criteria: Any requirements or criteria for participation.
    - Location: The physical or virtual location.
    - Deadline: The absolute final date and time for submission or attendance. Extract it in YYYY-MM-DDTHH:MM:SS format. Today is ${new Date().toLocaleDateString('en-CA')}. If no time is mentioned, use 23:59:59. If only a date is available, return it as YYYY-MM-DD. If no date is available at all, return null.
    - Category: Classify the item into a relevant category such as "Business", "Personal", "Competition", "Grant", "Meeting", or "Deadline". Choose the most fitting one.
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
          category: { type: Type.STRING, description: 'A relevant category for the event.' },
        },
      },
    },
  });
  
  try {
    const jsonString = response.text.trim();
    const parsedData = JSON.parse(jsonString) as ExtractedDataResult;
    
    if (!parsedData.deadline) {
        parsedData.deadline = getDeadlineFallback();
    }
    
    return [{ ...parsedData, originalSource: originalSourceName }];
  } catch (e) {
      console.error("Failed to parse Gemini response:", response.text);
      throw new Error("Could not parse the response from the AI model.");
  }
};

export const structureDataFromTemplate = async (templateFile: File, dataFile: File): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-pro"; // Use Pro for better structural understanding

  const templatePart = await convertFileToTextOrGenerativePart(templateFile);
  const dataPart = await convertFileToTextOrGenerativePart(dataFile);

  const prompt = `
    You are a highly intelligent data structuring assistant. Your task is to reformat the content of a "Data Document" to perfectly match the structure and layout of a "Template Document".

    INSTRUCTIONS:
    1. Analyze the "Template Document" to understand its formatting, including headings, paragraphs, lists, and any other structural elements.
    2. Read the "Data Document" to find the corresponding information.
    3. Generate a new document where the information from the "Data Document" is placed into the structure of the "Template Document".
    4. The output should be plain text that mimics the template's layout. Do NOT output Markdown, JSON, or any other code format unless the template itself is in that format.
    5. If the template contains placeholders (e.g., "[Name]", "[Date]"), replace them with the correct data from the data document.
    6. If the data document is missing information for a field in the template, leave that field blank or use a clear indicator like "[Not Found]".

    Here are the documents:
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      { parts: [{ text: prompt }] },
      { parts: [{ text: "TEMPLATE DOCUMENT:" }, templatePart] },
      { parts: [{ text: "DATA DOCUMENT:" }, dataPart] },
      { parts: [{ text: "Please provide the ORGANIZED OUTPUT based on the instructions." }] },
    ],
  });

  return response.text;
};
