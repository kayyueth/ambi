// Dynamic imports to avoid issues with Next.js
let pdf: any = null;
let createWorker: any = null;

export interface FileProcessingResult {
  text: string;
  method: "pdf-text" | "ocr";
  confidence?: number;
  error?: string;
}

/**
 * Extract text from PDF file
 * @param buffer - PDF file buffer
 * @returns Extracted text and processing method
 */
export async function extractTextFromPDF(
  buffer: Buffer
): Promise<FileProcessingResult> {
  try {
    // Dynamic import to avoid Next.js issues
    if (!pdf) {
      const pdfModule = await import("pdf-parse");
      pdf = pdfModule.default;
    }

    const data = await pdf(buffer);
    const text = data.text.trim();

    if (!text) {
      return {
        text: "",
        method: "pdf-text",
        error: "No text content found in PDF",
      };
    }

    return {
      text,
      method: "pdf-text",
    };
  } catch (error) {
    return {
      text: "",
      method: "pdf-text",
      error: `PDF processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Extract text from image using OCR
 * @param buffer - Image file buffer
 * @param mimeType - MIME type of the image
 * @returns Extracted text and confidence score
 */
export async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<FileProcessingResult> {
  try {
    // Validate image type
    const supportedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/tiff",
    ];
    if (!supportedTypes.includes(mimeType)) {
      return {
        text: "",
        method: "ocr",
        error: `Unsupported image type: ${mimeType}`,
      };
    }

    // Dynamic import to avoid Next.js issues
    if (!createWorker) {
      const tesseractModule = await import("tesseract.js");
      createWorker = tesseractModule.createWorker;
    }

    const worker = await createWorker("eng", 1, {
      logger: (m) => console.log(m),
    });

    const {
      data: { text, confidence },
    } = await worker.recognize(buffer);
    await worker.terminate();

    const cleanText = text.trim();

    if (!cleanText) {
      return {
        text: "",
        method: "ocr",
        confidence: confidence || 0,
        error: "No text detected in image",
      };
    }

    return {
      text: cleanText,
      method: "ocr",
      confidence: confidence || 0,
    };
  } catch (error) {
    return {
      text: "",
      method: "ocr",
      error: `OCR processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * Determine if a PDF has selectable text or is scanned
 * @param buffer - PDF file buffer
 * @returns true if PDF has selectable text, false if scanned
 */
export async function isPDFSelectableText(buffer: Buffer): Promise<boolean> {
  try {
    // Dynamic import to avoid Next.js issues
    if (!pdf) {
      const pdfModule = await import("pdf-parse");
      pdf = pdfModule.default;
    }

    const data = await pdf(buffer);
    const text = data.text.trim();

    // If we get substantial text content, it's likely selectable
    // Scanned PDFs typically have very little or no text content
    return text.length > 100;
  } catch (error) {
    console.error("Error checking PDF text selectability:", error);
    return false;
  }
}

/**
 * Validate file size and type
 * @param file - Uploaded file
 * @returns Validation result
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const supportedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/tiff",
  ];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
    };
  }

  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Supported types: PDF, JPEG, PNG, GIF, BMP, TIFF`,
    };
  }

  return { valid: true };
}

/**
 * Process uploaded file and extract text
 * @param file - Uploaded file
 * @returns Processing result with extracted text
 */
export async function processUploadedFile(
  file: File
): Promise<FileProcessingResult> {
  // Validate file first
  const validation = validateFile(file);
  if (!validation.valid) {
    return {
      text: "",
      method: "pdf-text",
      error: validation.error,
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // Handle PDF files
    if (mimeType === "application/pdf") {
      const hasSelectableText = await isPDFSelectableText(buffer);

      if (hasSelectableText) {
        // Extract text directly from PDF
        return await extractTextFromPDF(buffer);
      } else {
        // For scanned PDFs, we would need to convert to image first
        // For now, we'll return an error suggesting the user upload as image
        return {
          text: "",
          method: "pdf-text",
          error:
            "Scanned PDF detected. Please convert to image format (PNG/JPEG) and upload again for OCR processing.",
        };
      }
    }

    // Handle image files
    if (mimeType.startsWith("image/")) {
      return await extractTextFromImage(buffer, mimeType);
    }

    // Unsupported file type (shouldn't reach here due to validation)
    return {
      text: "",
      method: "pdf-text",
      error: `Unsupported file type: ${mimeType}. Please upload PDF or image files.`,
    };
  } catch (error) {
    return {
      text: "",
      method: "pdf-text",
      error: `File processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
