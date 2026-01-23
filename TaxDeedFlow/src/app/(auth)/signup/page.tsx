"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Refs for accessibility
  const errorRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError("") // Clear error when user types
  }

  // Focus on error message when it appears for accessibility
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus()
    }
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Prevent duplicate submission if already successful
    if (success) {
      return
    }

    // Validation
    if (!formData.name.trim()) {
      setError("Name is required")
      return
    }

    if (!formData.email.trim()) {
      setError("Email is required")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call - in production, this would call Supabase auth
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check for existing email (demo simulation)
      // In production, this would be returned from the Supabase API
      const existingEmails = ["demo@taxdeedflow.com", "admin@taxdeedflow.com", "test@example.com"]
      if (existingEmails.includes(formData.email.toLowerCase())) {
        setError("An account with this email address already exists. Please try logging in instead, or use a different email address.")
        return
      }

      // Show success message
      setSuccess(true)

      // Redirect to login after a delay
      // Use router.replace instead of push to prevent duplicate submission on browser back
      setTimeout(() => {
        router.replace("/login")
      }, 2000)
    } catch (err) {
      // Handle specific error types with clear messages
      const errorMessage = err instanceof Error ? err.message : String(err)

      // Check for duplicate/constraint errors from database
      if (errorMessage.includes("duplicate") || errorMessage.includes("unique") || errorMessage.includes("already exists")) {
        setError("An account with this email address already exists. Please try logging in instead, or use a different email address.")
      } else if (errorMessage.includes("constraint")) {
        setError("This information conflicts with an existing record. Please check your details and try again.")
      } else {
        setError("An error occurred during registration. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Building2 className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold text-slate-900">Tax Deed Flow</span>
          </div>

          {/* Signup Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Create an account</h1>
              <p className="text-slate-600 mt-1">Get started with Tax Deed Flow</p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700">Account created successfully!</p>
                  <p className="text-sm text-green-600 mt-1">Redirecting to login page...</p>
                </div>
              </div>
            )}

            {/* Error Message - Accessible with ARIA live region */}
            {error && (
              <div
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                tabIndex={-1}
                id="signup-error"
                className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    ref={nameInputRef}
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    aria-describedby={error ? "signup-error" : undefined}
                    aria-invalid={error && error.includes("Name") ? "true" : undefined}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    aria-describedby={error ? "signup-error" : undefined}
                    aria-invalid={error && error.includes("Email") ? "true" : undefined}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    aria-describedby={error && error.includes("Password") ? "signup-error password-hint" : "password-hint"}
                    aria-invalid={error && error.includes("Password") ? "true" : undefined}
                    className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                <p id="password-hint" className="mt-1 text-xs text-slate-500">Must be at least 6 characters</p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    aria-describedby={error && error.includes("match") ? "signup-error" : undefined}
                    aria-invalid={error && error.includes("match") ? "true" : undefined}
                    className="w-full pl-10 pr-12 py-2.5 rounded-lg border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-pressed={showConfirmPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Creating account..." : "Create account"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={isLoading}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-medium text-slate-700">Google</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={isLoading}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="text-sm font-medium text-slate-700">GitHub</span>
              </button>
            </div>

            {/* Login Link */}
            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-500 mt-8">
            © 2026 Tax Deed Flow. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
