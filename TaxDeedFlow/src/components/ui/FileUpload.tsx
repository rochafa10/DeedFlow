"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react"

interface FileUploadProps {
  /** Accepted file types (e.g., ".pdf,.csv,.xlsx") */
  accept?: string
  /** Maximum file size in bytes (default: 10MB) */
  maxSize?: number
  /** Whether multiple files can be uploaded */
  multiple?: boolean
  /** Callback when files are successfully selected */
  onUpload?: (files: File[]) => void
  /** Callback when an error occurs */
  onError?: (error: string) => void
  /** Label for the upload area */
  label?: string
  /** Help text shown below the upload area */
  helpText?: string
  /** Whether the component is disabled */
  disabled?: boolean
}

// Map of common file types to friendly names
const FILE_TYPE_NAMES: Record<string, string> = {
  ".pdf": "PDF",
  ".csv": "CSV",
  ".xlsx": "Excel",
  ".xls": "Excel",
  ".doc": "Word",
  ".docx": "Word",
  ".png": "PNG image",
  ".jpg": "JPEG image",
  ".jpeg": "JPEG image",
  ".gif": "GIF image",
  ".txt": "Text",
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAcceptedTypesDisplay(accept: string): string {
  const types = accept.split(",").map((t) => t.trim())
  const friendlyTypes = types.map((t) => FILE_TYPE_NAMES[t.toLowerCase()] || t)
  return friendlyTypes.join(", ")
}

export function FileUpload({
  accept = ".pdf,.csv,.xlsx",
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onUpload,
  onError,
  label = "Upload files",
  helpText,
  disabled = false,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedExtensions = accept.split(",").map((t) => t.trim().toLowerCase())

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`
      if (!acceptedExtensions.includes(extension)) {
        const acceptedTypesDisplay = getAcceptedTypesDisplay(accept)
        return `Invalid file type. Please upload ${acceptedTypesDisplay} files only.`
      }

      // Check file size
      if (file.size > maxSize) {
        return `File is too large. Maximum size is ${formatFileSize(maxSize)}.`
      }

      // Check for empty file
      if (file.size === 0) {
        return "File appears to be empty. Please select a valid file."
      }

      return null
    },
    [accept, acceptedExtensions, maxSize]
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return

      setError(null)
      setUploadSuccess(false)

      const fileArray = Array.from(files)
      const errors: string[] = []
      const validFiles: File[] = []

      for (const file of fileArray) {
        const validationError = validateFile(file)
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`)
        } else {
          validFiles.push(file)
        }
      }

      if (errors.length > 0) {
        const errorMessage = errors.length === 1
          ? errors[0]
          : `Multiple errors:\n${errors.join("\n")}`
        setError(errorMessage)
        onError?.(errorMessage)
        return
      }

      if (validFiles.length > 0) {
        setSelectedFiles(validFiles)
        setUploadSuccess(true)
        onUpload?.(validFiles)
      }
    },
    [validateFile, onUpload, onError]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (disabled) return

      handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [handleFiles]
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const clearSelection = useCallback(() => {
    setSelectedFiles([])
    setError(null)
    setUploadSuccess(false)
  }, [])

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label}
        </label>
      )}

      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${disabled
            ? "bg-slate-50 border-slate-200 cursor-not-allowed"
            : isDragOver
              ? "border-primary bg-primary/5"
              : error
                ? "border-red-300 bg-red-50 hover:border-red-400"
                : uploadSuccess
                  ? "border-green-300 bg-green-50"
                  : "border-slate-300 hover:border-primary hover:bg-slate-50"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
        />

        <div className="flex flex-col items-center gap-2">
          {error ? (
            <AlertCircle className="w-10 h-10 text-red-500" />
          ) : uploadSuccess ? (
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          ) : (
            <Upload className={`w-10 h-10 ${disabled ? "text-slate-300" : "text-slate-400"}`} />
          )}

          <div className={disabled ? "text-slate-400" : "text-slate-600"}>
            {uploadSuccess ? (
              <span className="font-medium text-green-700">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
              </span>
            ) : (
              <>
                <span className="font-medium">Click to upload</span>
                <span className="text-slate-500"> or drag and drop</span>
              </>
            )}
          </div>

          <p className={`text-sm ${disabled ? "text-slate-300" : "text-slate-500"}`}>
            {getAcceptedTypesDisplay(accept)} (max {formatFileSize(maxSize)})
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Upload Error</p>
              <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearSelection()
              }}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && !error && (
        <div className="mt-3 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
            >
              <FileText className="w-5 h-5 text-slate-400" />
              <span className="flex-1 text-sm text-slate-700 truncate">
                {file.name}
              </span>
              <span className="text-xs text-slate-500">
                {formatFileSize(file.size)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearSelection()
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      {helpText && (
        <p className="mt-2 text-sm text-slate-500">{helpText}</p>
      )}
    </div>
  )
}
