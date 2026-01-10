"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Calendar, AlertCircle, CheckCircle2 } from "lucide-react"

interface DateInputProps {
  /** Label for the input */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Current value (YYYY-MM-DD format) */
  value?: string
  /** Callback when value changes */
  onChange?: (value: string, isValid: boolean) => void
  /** Callback when an error occurs */
  onError?: (error: string) => void
  /** Whether the field is required */
  required?: boolean
  /** Minimum date (YYYY-MM-DD format) */
  minDate?: string
  /** Maximum date (YYYY-MM-DD format) */
  maxDate?: string
  /** Whether the component is disabled */
  disabled?: boolean
  /** Help text shown below the input */
  helpText?: string
  /** Custom error message for invalid format */
  formatErrorMessage?: string
  /** Custom error message for date before minDate */
  minDateErrorMessage?: string
  /** Custom error message for date after maxDate */
  maxDateErrorMessage?: string
}

function isValidDateFormat(dateString: string): boolean {
  // Check YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false

  // Parse the date components directly to avoid timezone issues
  const [year, month, day] = dateString.split("-").map(Number)

  // Create date using local timezone (month is 0-indexed)
  const date = new Date(year, month - 1, day)

  // Verify the date components match (handles invalid dates like Feb 30)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

function formatDateDisplay(dateString: string): string {
  if (!isValidDateFormat(dateString)) return dateString
  const [year, month, day] = dateString.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  })
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function DateInput({
  label,
  placeholder = "YYYY-MM-DD",
  value = "",
  onChange,
  onError,
  required = false,
  minDate,
  maxDate,
  disabled = false,
  helpText,
  formatErrorMessage = "Please enter a valid date in YYYY-MM-DD format",
  minDateErrorMessage,
  maxDateErrorMessage,
}: DateInputProps) {
  const [inputValue, setInputValue] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [isTouched, setIsTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update internal state when external value changes
  useEffect(() => {
    setInputValue(value)
    if (value) {
      validateDate(value, false)
    }
  }, [value])

  const validateDate = useCallback((dateValue: string, reportError: boolean = true): boolean => {
    // Empty value handling
    if (!dateValue.trim()) {
      if (required) {
        const errorMsg = "Date is required"
        if (reportError) {
          setError(errorMsg)
          onError?.(errorMsg)
        }
        setIsValid(false)
        return false
      }
      setError(null)
      setIsValid(false)
      return true
    }

    // Format validation
    if (!isValidDateFormat(dateValue)) {
      if (reportError) {
        setError(formatErrorMessage)
        onError?.(formatErrorMessage)
      }
      setIsValid(false)
      return false
    }

    const dateToValidate = parseLocalDate(dateValue)

    // Min date validation
    if (minDate) {
      const min = parseLocalDate(minDate)
      if (dateToValidate < min) {
        const errorMsg = minDateErrorMessage || `Date must be on or after ${formatDateDisplay(minDate)}`
        if (reportError) {
          setError(errorMsg)
          onError?.(errorMsg)
        }
        setIsValid(false)
        return false
      }
    }

    // Max date validation
    if (maxDate) {
      const max = parseLocalDate(maxDate)
      if (dateToValidate > max) {
        const errorMsg = maxDateErrorMessage || `Date must be on or before ${formatDateDisplay(maxDate)}`
        if (reportError) {
          setError(errorMsg)
          onError?.(errorMsg)
        }
        setIsValid(false)
        return false
      }
    }

    // All validations passed
    setError(null)
    setIsValid(true)
    return true
  }, [required, minDate, maxDate, formatErrorMessage, minDateErrorMessage, maxDateErrorMessage, onError])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Only validate on change if field has been touched
    if (isTouched) {
      const valid = validateDate(newValue)
      onChange?.(newValue, valid)
    } else {
      onChange?.(newValue, false)
    }
  }, [isTouched, validateDate, onChange])

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setIsTouched(true)
    // Use the current input value from the event target to ensure we validate the latest value
    const currentValue = e.target.value
    setInputValue(currentValue)
    const valid = validateDate(currentValue)
    onChange?.(currentValue, valid)
  }, [validateDate, onChange])

  const handleFocus = useCallback(() => {
    // Clear error on focus to allow re-entry
    if (error) {
      setError(null)
    }
  }, [error])

  const getInputClasses = () => {
    const baseClasses = "w-full pl-10 pr-10 py-2.5 rounded-lg border outline-none transition-colors"

    if (disabled) {
      return `${baseClasses} bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed`
    }

    if (error && isTouched) {
      return `${baseClasses} border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20`
    }

    if (isValid && inputValue) {
      return `${baseClasses} border-green-300 bg-green-50 focus:border-green-500 focus:ring-2 focus:ring-green-500/20`
    }

    return `${baseClasses} border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20`
  }

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <Calendar
          className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${
            disabled ? "text-slate-300" : "text-slate-400"
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error && isTouched ? "true" : undefined}
          aria-describedby={error && isTouched ? "date-error" : helpText ? "date-help" : undefined}
          className={getInputClasses()}
        />
        {/* Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {error && isTouched && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          {isValid && inputValue && !error && (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && isTouched && (
        <div
          id="date-error"
          role="alert"
          aria-live="polite"
          className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Valid Display */}
      {isValid && inputValue && !error && isTouched && (
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{formatDateDisplay(inputValue)}</span>
        </div>
      )}

      {/* Help Text */}
      {helpText && !error && (
        <p id="date-help" className="mt-1.5 text-sm text-slate-500">
          {helpText}
        </p>
      )}
    </div>
  )
}
