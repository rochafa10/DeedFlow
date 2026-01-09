"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState("")

  // Security: Generic message regardless of whether email exists
  // This prevents account enumeration attacks
  const GENERIC_SUCCESS_MESSAGE =
    "If an account exists with this email address, you will receive a password reset link shortly."

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Basic validation
    if (!email) {
      setError("Please enter your email address")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // In development mode, log the reset link to console
      // In production, this would send an actual email
      const resetToken = Math.random().toString(36).substring(2, 15)
      const resetLink = `${window.location.origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

      console.log("[Password Reset] Reset link generated for:", email)
      console.log("[Password Reset] Reset Link:", resetLink)
      console.log("[Password Reset] Token:", resetToken)

      // SECURITY: Always show the same success message
      // This prevents attackers from determining which emails have accounts
      setIsSubmitted(true)
    } catch (err) {
      console.error("[Password Reset] Error:", err)
      // SECURITY: Even on error, show generic message to prevent enumeration
      setIsSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state - shown after form submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="p-2 rounded-lg">
              <svg
                className="h-8 w-8 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">Tax Deed Flow</span>
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-2">
                Check Your Email
              </h1>
              <p className="text-slate-600 mb-6">
                {GENERIC_SUCCESS_MESSAGE}
              </p>
              <p className="text-sm text-slate-500 mb-6">
                The link will expire in 1 hour. If you don't see the email, check your spam folder.
              </p>

              {/* Development Mode Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>Development Mode:</strong> Reset link has been logged to the browser console.
                  Press F12 to view.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </div>

          {/* Resend Link */}
          <p className="text-center text-sm text-slate-500 mt-4">
            Didn't receive the email?{" "}
            <button
              onClick={() => {
                setIsSubmitted(false)
                setEmail("")
              }}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="p-2 rounded-lg">
            <svg
              className="h-8 w-8 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <span className="text-xl font-bold text-slate-900">Tax Deed Flow</span>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              Forgot Password?
            </h1>
            <p className="text-slate-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                  }}
                  placeholder="you@example.com"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 border rounded-lg text-slate-900 placeholder:text-slate-400",
                    "focus:outline-none focus:ring-2 focus:border-transparent",
                    error
                      ? "border-red-300 focus:ring-red-500"
                      : "border-slate-200 focus:ring-primary"
                  )}
                  disabled={isSubmitting}
                />
              </div>
              {error && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-colors",
                isSubmitting
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          © 2026 Tax Deed Flow. All rights reserved.
        </p>
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
