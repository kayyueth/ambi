// Dynamic imports to avoid issues with Next.js
let pdf: typeof import("pdf-parse").default | null = null;
let createWorker: typeof import("tesseract.js").createWorker | null = null;

export interface FileProcessingResult {
  text: string;
  method: "pdf-text" | "ocr";
  confidence?: number;
  error?: string;
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
    console.log("Starting OCR processing for image type:", mimeType);

    // Add timeout for OCR processing to prevent infinite hanging
    const OCR_TIMEOUT = 45000; // 45 seconds timeout

    const ocrPromise = performOCR(buffer, mimeType);
    const timeoutPromise = new Promise<FileProcessingResult>((_, reject) => {
      setTimeout(
        () => reject(new Error("OCR processing timeout")),
        OCR_TIMEOUT
      );
    });

    return await Promise.race([ocrPromise, timeoutPromise]);
  } catch (error) {
    console.error("OCR processing error:", error);
    return {
      text: "",
      method: "ocr",
      error: `OCR processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

async function performOCR(
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
      console.log("Importing tesseract.js...");
      const tesseractModule = await import("tesseract.js");
      createWorker = tesseractModule.createWorker;
    }

    console.log("Creating Tesseract worker...");
    // Create worker with optimized settings for deployment
    const worker = await createWorker({
      logger: (m) => console.log(m), // Minimal logging for deployment
      workerPath: "/tesseract/worker.min.js",
      langPath: "/tesseract",
      corePath: "/tesseract/tesseract-core.wasm.js",
    });

    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    // Set optimized parameters for faster processing
    await worker.setParameters({
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?()-",
      tessedit_pageseg_mode: "6", // Assume a single uniform block of text
    });

    console.log("Recognizing text from image...");
    // Use optimized recognition with preprocessing
    const {
      data: { text, confidence },
    } = await worker.recognize(buffer, {
      rectangle: { top: 0, left: 0, width: 0, height: 0 }, // Process full image
    });
    await worker.terminate();

    const cleanText = text.trim();
    console.log("OCR result:", { textLength: cleanText.length, confidence });

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
    console.error("OCR processing error:", error);
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
 * @returns Object containing whether PDF has selectable text and the parsed data
 */
export async function checkPDFAndExtractText(
  buffer: Buffer
): Promise<{ hasSelectableText: boolean; text: string; error?: string }> {
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
    return {
      hasSelectableText: text.length > 100,
      text: text,
    };
  } catch (error) {
    console.error("Error checking PDF text selectability:", error);
    return {
      hasSelectableText: false,
      text: "",
      error: `PDF parsing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
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
  console.log("Processing uploaded file:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  // Validate file first
  const validation = validateFile(file);
  if (!validation.valid) {
    console.log("File validation failed:", validation.error);
    return {
      text: "",
      method: "pdf-text",
      error: validation.error,
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    console.log("File buffer created, size:", buffer.length);

    // Handle PDF files
    if (mimeType === "application/pdf") {
      console.log("Processing PDF file...");
      // Use optimized single-pass PDF parsing
      const pdfResult = await checkPDFAndExtractText(buffer);

      if (pdfResult.error) {
        return {
          text: "",
          method: "pdf-text",
          error: pdfResult.error,
        };
      }

      if (pdfResult.hasSelectableText) {
        console.log(
          "PDF has selectable text, extracted:",
          pdfResult.text.length,
          "characters"
        );
        return {
          text: pdfResult.text,
          method: "pdf-text",
        };
      } else {
        console.log("PDF appears to be scanned, suggesting image upload");
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
      console.log("Processing image file...");
      return await extractTextFromImage(buffer, mimeType);
    }

    // Unsupported file type (shouldn't reach here due to validation)
    console.log("Unsupported file type:", mimeType);
    return {
      text: "",
      method: "pdf-text",
      error: `Unsupported file type: ${mimeType}. Please upload PDF or image files.`,
    };
  } catch (error) {
    console.error("File processing error:", error);
    return {
      text: "",
      method: "pdf-text",
      error: `File processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
