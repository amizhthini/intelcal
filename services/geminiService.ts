
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData, ExtractedLead } from '../types';

declare var XLSX: any; // From the script tag in index.html
declare var mammoth: any; // From the script tag in index.html

type ExtractedDataResult = Omit<ExtractedData, 'source' | 'recurring'> & { originalSource?: string };
type ExtractedLeadResult = Omit<ExtractedLead, 'source'> & { originalSource?: string };


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
        - start: The optional start date and time.
        - end: The end date and time or deadline.
        - category: An array of relevant categories like "Business", "Personal", "Competition", "Grant", "Meeting", etc. Choose the most fitting ones.
        
        IMPORTANT RULES:
        1. The output MUST be a valid JSON array. Each element in the array is an object representing one row of the spreadsheet.
        2. If an 'end' date column is missing or a row has no value for it, you MUST create a valid end date. Default to today's date at 23:59:59 if no other information can be inferred. Today is ${new Date().toISOString()}.
        3. Format all dates and times as YYYY-MM-DDTHH:MM:SS.
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
                    start: { type: Type.STRING, description: 'The optional start date/time in YYYY-MM-DDTHH:MM:SS format.' },
                    end: { type: Type.STRING, description: 'The end date/time in YYYY-MM-DDTHH:MM:SS format.' },
                    category: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'An array of relevant categories for the event.' },
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
                end: item.end || getDeadlineFallback(),
                originalSource: file.name
            }));
        }
        return [];
    } catch (e) {
        console.error("Failed to parse Gemini response for sheet:", response.text);
        throw new Error("Could not parse the response from the AI model for the spreadsheet.");
    }
}

const extractLeadsFromSheet = async (file: File): Promise<ExtractedLeadResult[]> => {
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
        Analyze the following CSV data from a spreadsheet. The data represents a list of contacts or leads.
        Your task is to extract the lead information for EACH ROW and format it as an array of JSON objects.
        
        The CSV data is:
        """
        ${csvData}
        """

        For each row, identify the following fields from the columns:
        - name: The full name of the person or the name of the business. This is the most important field.
        - phoneNumber: The primary contact phone number.
        - email: The primary contact email address.
        - contactPerson: If the main name is a business, this is the name of a specific person.
        - links: An array of all relevant URLs found (website, social media, etc.).
        
        IMPORTANT RULES:
        1. The output MUST be a valid JSON array. Each element in the array is an object representing one row.
        2. If a 'name' column is missing or a row has no value for it, try to infer it from other columns like email or company name. If not possible, you can skip the row.
        3. If the spreadsheet is empty or contains no useful data, return an empty array [].
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
                    name: { type: Type.STRING, description: 'The name of the person or business.' },
                    phoneNumber: { type: Type.STRING, description: 'The primary contact phone number.' },
                    email: { type: Type.STRING, description: 'The primary contact email address.' },
                    contactPerson: { type: Type.STRING, description: 'The name of a specific contact person, if different from the main name.' },
                    links: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'An array of all relevant links found (e.g., website, social media).' },
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
                originalSource: file.name
            }));
        }
        return [];
    } catch (e) {
        console.error("Failed to parse Gemini response for lead sheet:", response.text);
        throw new Error("Could not parse the response from the AI model for the spreadsheet.");
    }
}

const convertFileToTextOrGenerativePart = async (file: File) => {
    const mimeType = file.type || '';
    if (mimeType.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv') || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        return { text: `File content from ${file.name} (spreadsheet):\n\n${csvData}` };
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
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
    The content is about an event, application, or opportunity. Your primary goal is to find the main deadline.
    Format the output as a JSON object matching the provided schema.
    If a piece of information is not available, return null for that field.

    - Title: The main heading or title of the event/opportunity.
    - Summary: A brief one or two-sentence summary.
    - Eligibility Criteria: Any requirements or criteria for participation.
    - Location: The physical or virtual location.
    - Start Date & Time: The optional start date. If a date is found but no time is present, default time to 00:00:00. Format as YYYY-MM-DDTHH:MM:SS.
    
    - End Date & Time: THIS IS THE MOST IMPORTANT FIELD. It represents the final deadline for action.
        - Synonyms for this field include: "deadline", "submission date", "due by", "ends on", "application deadline", "closing date", "apply before".
        - Search diligently for these keywords. The date associated with these keywords is the correct 'end' date.
        - **CRITICAL: IGNORE** dates that refer to when the document was published or updated (e.g., "Last updated:", "Posted on:", "Date modified:"). These are NOT the deadline.
        - If a specific time is mentioned (e.g., "5:00 PM", "23:59"), you MUST include it. Account for timezones if mentioned, but format the final output without the timezone identifier.
        - If ONLY a date is found for the deadline without a specific time, you MUST default the time to 23:59:59.
        - The final format must be YYYY-MM-DDTHH:MM:SS.
        - If absolutely no deadline can be found, return null for this field. Today's date is ${new Date().toLocaleDateString('en-CA')}.

    - Category: Classify into relevant categories like "Business", "Personal", "Competition", "Grant", "Meeting", "Deadline". Return an array of strings. If none fit, use ["General"].
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
          start: { type: Type.STRING, description: 'The optional start date/time in YYYY-MM-DDTHH:MM:SS format. Default time to 00:00:00 if not specified.' },
          end: { type: Type.STRING, description: 'The critical deadline or submission date. IGNORE "last updated" or "posted on" dates. Format as YYYY-MM-DDTHH:MM:SS. If the source text provides a date but no time, you MUST use 23:59:59 as the time.' },
          category: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'An array of relevant categories for the event.' },
        },
      },
    },
  });
  
  try {
    const jsonString = response.text.trim();
    const parsedData = JSON.parse(jsonString) as ExtractedDataResult;
    
    if (!parsedData.end) {
        parsedData.end = getDeadlineFallback();
    }
    
    return [{ ...parsedData, originalSource: originalSourceName }];
  } catch (e) {
      console.error("Failed to parse Gemini response:", response.text);
      throw new Error("Could not parse the response from the AI model.");
  }
};

export const extractLeadInfo = async (file: File | null, text: string): Promise<ExtractedLeadResult[]> => {
  const originalSourceName = file?.name || `Pasted Text: "${text.substring(0, 20)}..."`;
  if (file) {
    if (file.type.includes('spreadsheet') || file.type.includes('csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        return extractLeadsFromSheet(file);
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
    Analyze the provided content (image, PDF, and/or text) and extract lead information.
    The content could be a business card, a contact page, an email signature, or a directory listing.
    Format the output as a JSON object matching the provided schema.
    If a piece of information is not available, return null for that field.

    - name: The full name of the person or the name of the business. This is the primary identifier.
    - phoneNumber: The primary contact phone number. Extract the full number including country or area codes if available.
    - email: The primary contact email address.
    - contactPerson: If the main name is a business, this is the name of a specific person to contact at that business. If not available or if the lead is a person, this can be null.
    - links: An array of all relevant URLs found, such as the company website, LinkedIn profile, or other social media links.
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
          name: { type: Type.STRING, description: 'The name of the person or business.' },
          phoneNumber: { type: Type.STRING, description: 'The primary contact phone number.' },
          email: { type: Type.STRING, description: 'The primary contact email address.' },
          contactPerson: { type: Type.STRING, description: 'The name of a specific contact person, if different from the main name.' },
          links: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'An array of all relevant links found (e.g., website, social media).' },
        },
      },
    },
  });
  
  try {
    const jsonString = response.text.trim();
    const parsedData = JSON.parse(jsonString) as ExtractedLeadResult;
    return [{ ...parsedData, originalSource: originalSourceName }];
  } catch (e) {
      console.error("Failed to parse Gemini response for lead:", response.text);
      throw new Error("Could not parse the response from the AI model.");
  }
};


export const structureDataFromTemplate = async (templateFile: File, dataFile: File): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-pro"; // Use for better structural understanding

  const templatePart = await convertFileToTextOrGenerativePart(templateFile);
  const dataPart = await convertFileToTextOrGenerativePart(dataFile);

  const prompt = `
You are an expert data transformation AI. Your job is to act like a 'mail merge' function. You will receive a "Template Document" which defines a structure, and a "Data Document" which contains raw information.

Your task is to:
1.  Thoroughly analyze the structure, layout, and formatting of the "Template Document". Identify all placeholders, sections, and formatting cues.
2.  Carefully extract all relevant pieces of information from the "Data Document".
3.  Generate a new document by populating the structure from the "Template Document" with the extracted information from the "Data Document".
4.  The final output must strictly follow the template's format. Do not add any extra text, explanations, or formatting like Markdown unless it was present in the template.
5.  If you cannot find a specific piece of information in the "Data Document" to fill a part of the template, leave that part blank or write "[DATA NOT FOUND]".
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: [{
      parts: [
        { text: prompt },
        { text: "\n\n--- TEMPLATE DOCUMENT ---\n" },
        templatePart,
        { text: "\n\n--- DATA DOCUMENT ---\n" },
        dataPart,
        { text: "\n\n--- ORGANIZED OUTPUT ---\n" }
      ]
    }],
  });

  return response.text;
};