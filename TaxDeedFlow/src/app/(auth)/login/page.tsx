"use client"

import { useState, useEffect, useCallback, Suspense, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Mail, Lock, Eye, EyeOff, AlertCircle, Clock } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 1000 // 30 seconds

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()

  // Get redirect URL from query params
  const redirectUrl = searchParams.get("redirect") || "/"

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Rate limiting state
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [remainingLockoutTime, setRemainingLockoutTime] = useState(0)

  // Refs for accessibility
  const errorRef = useRef<HTMLDivElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  // Check if user is currently locked out
  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil

  // Update remaining lockout time
  useEffect(() => {
    if (!lockoutUntil) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, lockoutUntil - Date.now())
      setRemainingLockoutTime(Math.ceil(remaining / 1000))

      if (remaining <= 0) {
        setLockoutUntil(null)
        setLoginAttempts(0)
        setError("")
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lockoutUntil])

  // Redirect if already authenticated
  // Use router.replace to prevent browser back from going to login page
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace(redirectUrl)
    }
  }, [isAuthenticated, authLoading, router, redirectUrl])

  // Focus on error message when it appears for accessibility
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.focus()
    }
  }, [error])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if locked out
    if (isLockedOut) {
      setError(`Too many login attempts. Please wait ${remainingLockoutTime} seconds.`)
      return
    }

    setError("")
    setIsLoading(true)

    const result = await login({ email, password })

    if (result.success) {
      // Reset attempts on successful login
      setLoginAttempts(0)
      setLockoutUntil(null)
      // Use router.replace to prevent browser back from returning to login form
      router.replace(redirectUrl)
    } else {
      const newAttempts = loginAttempts + 1
      setLoginAttempts(newAttempts)

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        // Lock out the user
        const lockoutTime = Date.now() + LOCKOUT_DURATION_MS
        setLockoutUntil(lockoutTime)
        setRemainingLockoutTime(LOCKOUT_DURATION_MS / 1000)
        setError(`Too many failed attempts. Please wait 30 seconds before trying again.`)
      } else {
        const attemptsRemaining = MAX_LOGIN_ATTEMPTS - newAttempts
        setError(
          `${result.error || "Invalid credentials."} ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? "s" : ""} remaining.`
        )
      }
    }

    setIsLoading(false)
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <Building2 className="h-10 w-10 text-primary" />
        <span className="text-2xl font-bold text-slate-900">Tax Deed Flow</span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-600 mt-1">Sign in to your account to continue</p>
        </div>

        {/* Demo Credentials Notice */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Demo credentials (Admin):</strong><br />
            Email: demo@taxdeedflow.com<br />
            Password: demo123
          </p>
          <p className="text-sm text-blue-800 mt-2">
            <strong>Viewer credentials (Limited access):</strong><br />
            Email: viewer@taxdeedflow.com<br />
            Password: viewer123
          </p>
        </div>

        {/* Error Message - Accessible with ARIA live region */}
        {error && (
          <div
            ref={errorRef}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            tabIndex={-1}
            id="login-error"
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                ref={emailInputRef}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={error ? "true" : undefined}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-slate-900 placeholder:text-slate-400"
                placeholder="you@example.com"
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={error ? "true" : undefined}
                className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors text-slate-900 placeholder:text-slate-400"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Signing in..." : "Sign in"}
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

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-medium text-slate-700">Google</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="text-sm font-medium text-slate-700">GitHub</span>
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:text-primary/80 font-medium">
            Sign up
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-slate-500">
        &copy; {new Date().getFullYear()} Tax Deed Flow. All rights reserved.
      </p>
    </div>
  )
}

function LoginLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  )
}
