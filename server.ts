import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to get fallback end dates
const getDeadlineFallback = (): string => {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59:59`;
};

// Initialize GoogleGenAI with high-priority backend environment key
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Retry wrapper with exponential backoff for Resource Exhausted (429) errors
async function generateContentWithRetry(params: {
  model: string;
  contents: any;
  config?: any;
}) {
  let attempts = 0;
  const maxAttempts = 3;
  let delay = 2000; // Start with 2 seconds

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const ai = getGeminiClient();
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errStr = String(err);
      const isRateLimit =
        err.status === "RESOURCE_EXHAUSTED" ||
        err.code === 429 ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("429") ||
        errStr.includes("quota") ||
        errStr.includes("Quota");

      if (isRateLimit && attempts < maxAttempts) {
        let waitMs = delay * attempts + Math.floor(Math.random() * 1000);
        try {
          if (err.details && Array.isArray(err.details)) {
            for (const detail of err.details) {
              if (detail.retryDelay) {
                const parsedSeconds = parseFloat(detail.retryDelay);
                if (!isNaN(parsedSeconds)) {
                  waitMs = parsedSeconds * 1000;
                }
              }
            }
          }
        } catch (pe) {
          // Ignore parsing issues
        }

        // Limit maximum retry wait to keep connection stable
        const maxWaitMs = 8000;
        const finalWaitMs = Math.min(waitMs, maxWaitMs);

        console.warn(`[Gemini API API Quota] Got 429. Retrying ${attempts}/${maxAttempts} in ${finalWaitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, finalWaitMs));
        delay = waitMs;
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retry attempts exceeded due to Gemini API rate-limiting.");
}

// API routes for Gemini proxying
app.post("/api/extract-info", async (req, res) => {
  try {
    const { text, file, isSheet, csvData } = req.body;
    const model = "gemini-3.5-flash"; 

    if (isSheet && csvData) {
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

      const response = await generateContentWithRetry({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The main heading or title." },
                summary: { type: Type.STRING, description: "A brief summary." },
                eligibility: { type: Type.STRING, description: "Eligibility criteria." },
                location: { type: Type.STRING, description: "The location." },
                start: { type: Type.STRING, description: "The optional start date/time in YYYY-MM-DDTHH:MM:SS format." },
                end: { type: Type.STRING, description: "The end date/time in YYYY-MM-DDTHH:MM:SS format." },
                category: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of relevant categories for the event." },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text.trim());
      const mapped = Array.isArray(parsed)
        ? parsed.map((item: any) => ({
            ...item,
            end: item.end || getDeadlineFallback(),
            originalSource: file?.name || "Uploaded Spreadsheet",
          }))
        : [];
      return res.json({ success: true, data: mapped });
    }

    // Normal extraction (Image, PDF, Document text, or Pasted text)
    const prompt = `
      Analyze the provided content (image, PDF, and/or text) and extract a list of all logical events, applications, opportunities, deadlines, or tasks mentioned.
      If it represents a single event or document, return an array containing that single item. If it mentions multiple events, deadlines or items, extract all of them as separate objects in the array.
      Format the output as a JSON array of objects matching the provided schema.
      For each item, identify and extract:

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
          - If absolutely no deadline can be found for an item, default it to today's date at 23:59:59. Today is ${new Date().toLocaleDateString("en-CA")}.

      - Category: Classify into relevant categories like "Business", "Personal", "Competition", "Grant", "Meeting", "Deadline". Return an array of strings. If none fit, use ["General"].
    `;

    const parts: any[] = [{ text: prompt }];
    if (file && file.data && file.mimeType) {
      parts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType,
        },
      });
    }
    if (text) {
      parts.push({ text: `User provided text: """${text}"""` });
    }

    const response = await generateContentWithRetry({
      model,
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The main heading or title." },
              summary: { type: Type.STRING, description: "A brief summary." },
              eligibility: { type: Type.STRING, description: "Eligibility criteria." },
              location: { type: Type.STRING, description: "The location." },
              start: { type: Type.STRING, description: "The optional start date/time in YYYY-MM-DDTHH:MM:SS format." },
              end: { type: Type.STRING, description: "The critical deadline or submission date. IGNORE \"last updated\" or \"posted on\" dates. Format as YYYY-MM-DDTHH:MM:SS." },
              category: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of relevant categories for the event." },
            },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text.trim());
    const items = Array.isArray(parsedData) ? parsedData : [parsedData];
    const finalResults = items.map((item: any) => {
      if (!item.end) {
        item.end = getDeadlineFallback();
      }
      return {
        ...item,
        originalSource: file?.name || `Pasted Text: "${text.substring(0, 20)}..."`,
      };
    });

    res.json({ success: true, data: finalResults });
  } catch (err: any) {
    console.error("Error in /api/extract-info:", err);
    res.status(500).json({ success: false, error: err.message || "An unexpected error occurred during extraction." });
  }
});

app.post("/api/extract-lead-info", async (req, res) => {
  try {
    const { text, file, isSheet, csvData } = req.body;
    const model = "gemini-3.5-flash";

    if (isSheet && csvData) {
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
        - category: Classify the lead into relevant categories like "Prospect", "Client", "Partner", "Vendor". Return an array of strings. Default to ["Prospect"] if unsure.
        
        IMPORTANT RULES:
        1. The output MUST be a valid JSON array. Each element in the array is an object representing one row.
        2. If a 'name' column is missing or a row has no value for it, try to infer it from other columns like email or company name. If not possible, you can skip the row.
        3. If the spreadsheet is empty or contains no useful data, return an empty array [].
      `;

      const response = await generateContentWithRetry({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "The name of the person or business." },
                phoneNumber: { type: Type.STRING, description: "The primary contact phone number." },
                email: { type: Type.STRING, description: "The primary contact email address." },
                contactPerson: { type: Type.STRING, description: "The name of a specific contact person, if different from the main name." },
                links: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of all relevant links found (e.g., website, social media)." },
                category: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of relevant categories for the lead." },
              },
            },
          },
        },
      });

      const parsed = JSON.parse(response.text.trim());
      const mapped = Array.isArray(parsed)
        ? parsed.map((item: any) => ({
            ...item,
            originalSource: file?.name || "Uploaded Spreadsheet",
          }))
        : [];
      return res.json({ success: true, data: mapped });
    }

    // Normal extraction
    const prompt = `
      Analyze the provided content (image, PDF, and/or text) and extract a list of all logical contacts or leads mentioned.
      If it is a single contact or business card, return an array containing that single item. If it lists multiple contacts, extract all of them as separate objects in the array.
      Format the output as a JSON array of objects matching the provided schema.
      For each lead, identify and extract:

      - name: The full name of the person or the name of the business. This is the primary identifier.
      - phoneNumber: The primary contact phone number. Extract the full number including country or area codes if available.
      - email: The primary contact email address.
      - contactPerson: If the main name is a business, this is the name of a specific contact person to contact at that business.
      - links: An array of all relevant URLs found, such as the company website, LinkedIn profile, or other social media links.
      - category: Classify the lead into relevant categories like "Prospect", "Client", "Partner", "Vendor". Return an array of strings. Default to ["Prospect"] if unsure.
    `;

    const parts: any[] = [{ text: prompt }];
    if (file && file.data && file.mimeType) {
      parts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType,
        },
      });
    }
    if (text) {
      parts.push({ text: `User provided text: """${text}"""` });
    }

    const response = await generateContentWithRetry({
      model,
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "The name of the person or business." },
              phoneNumber: { type: Type.STRING, description: "The primary contact phone number." },
              email: { type: Type.STRING, description: "The primary contact email address." },
              contactPerson: { type: Type.STRING, description: "The name of a specific contact person, if different from the main name." },
              links: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of all relevant links found (e.g., website, social media)." },
              category: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of relevant categories for the lead." },
            },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text.trim());
    const items = Array.isArray(parsedData) ? parsedData : [parsedData];
    const finalResults = items.map((item: any) => ({
      ...item,
      originalSource: file?.name || `Pasted Text: "${text.substring(0, 20)}..."`,
    }));

    res.json({ success: true, data: finalResults });
  } catch (err: any) {
    console.error("Error in /api/extract-lead-info:", err);
    res.status(500).json({ success: false, error: err.message || "An unexpected error occurred during lead extraction." });
  }
});

app.post("/api/structure-data", async (req, res) => {
  try {
    const { templatePart, dataPart } = req.body;
    const model = "gemini-3.5-flash"; // Fully authorized robust model

    const prompt = `
You are an expert data transformation AI. Your job is to act like a 'mail merge' function. You will receive a "Template Document" which defines a structure, and a "Data Document" which contains raw information.

Your task is to:
1.  Thoroughly analyze the structure, layout, and formatting of the "Template Document". Identify all placeholders, sections, and formatting cues.
2.  Carefully extract all relevant pieces of information from the "Data Document".
3.  Generate a new document by populating the structure from the "Template Document" with the extracted information from the "Data Document".
4.  The final output must strictly follow the template's format. Do not add any extra text, explanations, or formatting like Markdown unless it was present in the template.
5.  If you cannot find a specific piece of information in the "Data Document" to fill a part of the template, leave that part blank or write "[DATA NOT FOUND]".
    `;

    const parts: any[] = [
      { text: prompt },
      { text: "\n\n--- TEMPLATE DOCUMENT ---\n" },
      templatePart,
      { text: "\n\n--- DATA DOCUMENT ---\n" },
      dataPart,
      { text: "\n\n--- ORGANIZED OUTPUT ---\n" },
    ];

    const response = await generateContentWithRetry({
      model,
      contents: [{ parts }],
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    console.error("Error in /api/structure-data:", err);
    res.status(500).json({ success: false, error: err.message || "An unexpected error occurred during data structuring." });
  }
});

// Start function handling development vs production configurations
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
