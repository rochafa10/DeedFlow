"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily:
              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              background: "white",
              borderRadius: "1rem",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "4rem",
                height: "4rem",
                background: "#fee2e2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.5rem",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#dc2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: "#0f172a",
                marginBottom: "0.5rem",
              }}
            >
              Something Went Wrong
            </h1>

            {/* Description */}
            <p
              style={{
                color: "#64748b",
                marginBottom: "1.5rem",
                lineHeight: "1.5",
              }}
            >
              We encountered an unexpected error. Please try refreshing the page
              or return to the home page.
            </p>

            {/* Error ID */}
            {error.digest && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#94a3b8",
                  marginBottom: "1.5rem",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <button
                onClick={reset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  background: "#0f766e",
                  color: "white",
                  fontWeight: "500",
                  borderRadius: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  background: "#f1f5f9",
                  color: "#334155",
                  fontWeight: "500",
                  borderRadius: "0.5rem",
                  textDecoration: "none",
                  fontSize: "1rem",
                }}
              >
                Go Home
              </a>
            </div>

            {/* Help text */}
            <p
              style={{
                fontSize: "0.875rem",
                color: "#64748b",
                marginTop: "1.5rem",
              }}
            >
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
