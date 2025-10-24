"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimpleFileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
  maxSizeInMB?: number;
  className?: string;
  isUploading?: boolean;
  uploadedFile?: File | null;
  onRemoveFile?: () => void;
}

export function SimpleFileUpload({
  onFileSelect,
  disabled = false,
  acceptedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff"],
  maxSizeInMB = 10,
  className,
  isUploading = false,
  uploadedFile = null,
  onRemoveFile,
}: SimpleFileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!acceptedTypes.includes(fileExtension)) {
        return `File type ${fileExtension} is not supported. Please use: ${acceptedTypes.join(
          ", "
        )}`;
      }

      // Check file size
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        return `File size must be less than ${maxSizeInMB}MB`;
      }

      return null;
    },
    [acceptedTypes, maxSizeInMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      console.log(
        "SimpleFileUpload: handleFile called with:",
        file.name,
        file.type,
        file.size
      );
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        console.log("SimpleFileUpload: validation error:", validationError);
        setError(validationError);
        return;
      }
      console.log("SimpleFileUpload: calling onFileSelect");
      onFileSelect(file);
    },
    [onFileSelect, validateFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // If file is uploaded, show file info instead of upload area
  if (uploadedFile && !isUploading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-900">
                  {uploadedFile.name}
                </p>
                <p className="text-sm text-green-700">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {onRemoveFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemoveFile}
                className="text-green-700 hover:text-green-900 hover:bg-green-100"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer group",
          "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed",
          isUploading && "border-blue-500 bg-blue-50"
        )}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-muted-foreground transition-colors group-hover:text-primary">
            {isUploading ? (
              <svg
                className="w-full h-full animate-spin text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ) : (
              <svg
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isUploading ? "Processing your file..." : "Upload PDF or Image"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isUploading
                ? "Please wait while we extract text from your file"
                : "Click to browse and select a file"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: {acceptedTypes.join(", ")} • Max {maxSizeInMB}MB
            </p>
          </div>

          {!isUploading && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="mt-4"
            >
              Choose File
            </Button>
          )}
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-full p-3 shadow-lg">
              <svg
                className="w-6 h-6 text-blue-500 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-red-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
