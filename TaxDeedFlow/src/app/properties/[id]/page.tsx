"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Property Detail Page - Redirects to Report Page
 *
 * This page now redirects to /report/[id] which contains the full
 * property analysis report with all management features.
 *
 * The redirect is kept for backwards compatibility with bookmarked URLs.
 */
export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  useEffect(() => {
    if (propertyId) {
      router.replace(`/report/${propertyId}`);
    }
  }, [propertyId, router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400">
          Redirecting to property report...
        </p>
      </div>
    </div>
  );
}
