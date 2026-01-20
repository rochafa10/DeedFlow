import Link from "next/link"
import { Home, AlertCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-red-100 rounded-full">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          Page Not Found
        </h2>
        <p className="text-slate-500 mb-8 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Home className="h-5 w-5" />
          Return to Home
        </Link>
      </div>
    </div>
  )
}
