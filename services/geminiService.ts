import { ExtractedData, ExtractedLead } from "../types";

declare var XLSX: any; // From the script tag in index.html
declare var mammoth: any; // From the script tag in index.html

type ExtractedDataResult = Omit<ExtractedData, "source" | "recurring"> & { originalSource?: string };
type ExtractedLeadResult = Omit<ExtractedLead, "source"> & { originalSource?: string };

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = (error) => reject(error);
  });
};

const extractFromDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

// Converts the file on the client side into either text or a base64 payload
const prepareFilePayload = async (file: File) => {
  const mimeType = file.type || "";
  const isSheet =
    mimeType.includes("spreadsheet") ||
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls") ||
    file.name.endsWith(".csv") ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (isSheet) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const csvData = XLSX.utils.sheet_to_csv(worksheet);
    return { isSheet: true, csvData };
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
    const docxText = await extractFromDocx(file);
    return { isDocx: true, text: `File content from ${file.name} (Word document):\n\n${docxText}` };
  }

  // Convert to base64 for image/PDF
  const base64Data = await fileToBase64(file);
  return {
    isImageOrPdf: true,
    file: {
      data: base64Data,
      mimeType: file.type || "application/octet-stream",
      name: file.name,
    },
  };
};

export const extractInfo = async (file: File | null, text: string): Promise<ExtractedDataResult[]> => {
  try {
    let payloadFile: any = null;
    let payloadText = text;
    let isSheet = false;
    let csvData = "";

    if (file) {
      const prep = await prepareFilePayload(file);
      if (prep.isSheet) {
        isSheet = true;
        csvData = prep.csvData;
      } else if (prep.isDocx) {
        payloadText = prep.text + (text ? `\n\n${text}` : "");
      } else if (prep.isImageOrPdf) {
        payloadFile = prep.file;
      }
    }

    const response = await fetch("/api/extract-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: payloadText,
        file: payloadFile,
        isSheet,
        csvData,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Server error during info extraction.");
    }

    const result = await response.json();
    return result.data;
  } catch (err: any) {
    console.error("Failed to extract info via server proxy:", err);
    throw err;
  }
};

export const extractLeadInfo = async (file: File | null, text: string): Promise<ExtractedLeadResult[]> => {
  try {
    let payloadFile: any = null;
    let payloadText = text;
    let isSheet = false;
    let csvData = "";

    if (file) {
      const prep = await prepareFilePayload(file);
      if (prep.isSheet) {
        isSheet = true;
        csvData = prep.csvData;
      } else if (prep.isDocx) {
        payloadText = prep.text + (text ? `\n\n${text}` : "");
      } else if (prep.isImageOrPdf) {
        payloadFile = prep.file;
      }
    }

    const response = await fetch("/api/extract-lead-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: payloadText,
        file: payloadFile,
        isSheet,
        csvData,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Server error during lead extraction.");
    }

    const result = await response.json();
    return result.data;
  } catch (err: any) {
    console.error("Failed to extract lead info via server proxy:", err);
    throw err;
  }
};

export const structureDataFromTemplate = async (templateFile: File, dataFile: File): Promise<string> => {
  try {
    const prepTemplate = await prepareFilePayload(templateFile);
    const prepData = await prepareFilePayload(dataFile);

    let templatePart: any = {};
    if (prepTemplate.isSheet) {
      templatePart = { text: `File content from ${templateFile.name} (spreadsheet):\n\n${prepTemplate.csvData}` };
    } else if (prepTemplate.isDocx) {
      templatePart = { text: prepTemplate.text };
    } else if (prepTemplate.isImageOrPdf) {
      templatePart = {
        inlineData: {
          data: prepTemplate.file.data,
          mimeType: prepTemplate.file.mimeType,
        },
      };
    }

    let dataPart: any = {};
    if (prepData.isSheet) {
      dataPart = { text: `File content from ${dataFile.name} (spreadsheet):\n\n${prepData.csvData}` };
    } else if (prepData.isDocx) {
      dataPart = { text: prepData.text };
    } else if (prepData.isImageOrPdf) {
      dataPart = {
        inlineData: {
          data: prepData.file.data,
          mimeType: prepData.file.mimeType,
        },
      };
    }

    const response = await fetch("/api/structure-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        templatePart,
        dataPart,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Server error during data structuring.");
    }

    const result = await response.json();
    return result.text;
  } catch (err: any) {
    console.error("Failed to structure data via server proxy:", err);
    throw err;
  }
};
