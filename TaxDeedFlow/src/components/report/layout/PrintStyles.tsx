"use client";

import * as React from "react";

/**
 * PrintStyles - Global print styles for property reports
 *
 * This component injects print-specific CSS that optimizes the
 * report layout for printing. Include this once in your report layout.
 *
 * Features:
 * - Hides non-essential elements (nav, footer, buttons)
 * - Ensures proper page breaks
 * - Maintains chart/visualization legibility
 * - Preserves colors and backgrounds where needed
 * - Optimizes text for print
 *
 * @example
 * ```tsx
 * function ReportLayout({ children }) {
 *   return (
 *     <>
 *       <PrintStyles />
 *       <main>{children}</main>
 *     </>
 *   );
 * }
 * ```
 */
export function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        /* ============================================
         * GENERAL PRINT SETTINGS
         * ============================================ */

        /* Reset margins for full-width printing */
        @page {
          size: letter;
          margin: 0.5in;
        }

        /* Set base print styles */
        body {
          font-size: 11pt;
          line-height: 1.4;
          color: #000 !important;
          background: #fff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* ============================================
         * HIDE NON-ESSENTIAL ELEMENTS
         * ============================================ */

        /* Elements to always hide when printing */
        .no-print,
        .print\\:hidden,
        nav,
        header nav,
        footer,
        .skip-link,
        [role="navigation"],
        button[aria-label="Print report"],
        button[aria-label="Download report"],
        button[aria-label="Share report"],
        .sticky,
        .fixed:not(.print-fixed) {
          display: none !important;
        }

        /* Hide interactive elements */
        .hover\\:*,
        .focus\\:*,
        [role="tooltip"],
        .tooltip,
        dialog,
        [role="dialog"],
        .modal,
        .dropdown-menu,
        .context-menu {
          display: none !important;
        }

        /* Hide scrollbars */
        * {
          overflow: visible !important;
        }

        /* ============================================
         * PAGE BREAK CONTROLS
         * ============================================ */

        /* Avoid breaks inside these elements */
        .recharts-wrapper,
        .chart-container,
        figure,
        table,
        img,
        .print-avoid-break,
        [role="figure"],
        .rounded-lg {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* Force page break before these */
        .page-break,
        .print-break-before,
        .print\\:break-before-page {
          page-break-before: always !important;
          break-before: page !important;
        }

        /* Force page break after these */
        .print-break-after {
          page-break-after: always !important;
          break-after: page !important;
        }

        /* Prevent orphaned headings */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }

        /* ============================================
         * LAYOUT ADJUSTMENTS
         * ============================================ */

        /* Make containers full width */
        .container,
        .max-w-7xl,
        .max-w-6xl,
        .max-w-5xl,
        .max-w-4xl,
        .max-w-3xl {
          max-width: 100% !important;
          width: 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        /* Remove shadows and rounded corners where not needed */
        .shadow,
        .shadow-sm,
        .shadow-md,
        .shadow-lg,
        .shadow-xl {
          box-shadow: none !important;
        }

        /* Keep borders visible */
        .border,
        .border-slate-200 {
          border-color: #ccc !important;
        }

        /* Adjust grid layouts for print */
        .grid-cols-4 {
          grid-template-columns: repeat(4, 1fr) !important;
        }

        .grid-cols-3 {
          grid-template-columns: repeat(3, 1fr) !important;
        }

        .grid-cols-2 {
          grid-template-columns: repeat(2, 1fr) !important;
        }

        /* ============================================
         * TYPOGRAPHY
         * ============================================ */

        /* Ensure text is black */
        h1, h2, h3, h4, h5, h6,
        p, span, div, td, th, li {
          color: #000 !important;
        }

        /* Keep muted text slightly gray */
        .text-slate-500,
        .text-slate-600,
        .text-slate-400 {
          color: #666 !important;
        }

        /* Ensure links are visible */
        a {
          color: #000 !important;
          text-decoration: underline !important;
        }

        /* Show URLs after links */
        a[href^="http"]:after {
          content: " (" attr(href) ")";
          font-size: 0.8em;
          color: #666;
        }

        /* Don't show URL for internal links */
        a[href^="#"]:after,
        a[href^="/"]:after {
          content: none;
        }

        /* ============================================
         * COLORS AND BACKGROUNDS
         * ============================================ */

        /* Force color printing for important elements */
        .print-bg,
        .print\\:bg-visible,
        [class*="bg-green"],
        [class*="bg-blue"],
        [class*="bg-yellow"],
        [class*="bg-orange"],
        [class*="bg-red"],
        .grade-badge,
        .risk-badge {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Light backgrounds for sections */
        .bg-slate-50,
        .bg-slate-100 {
          background-color: #f8f8f8 !important;
        }

        /* Ensure grade colors are visible */
        .bg-green-100 { background-color: #d1fae5 !important; }
        .bg-blue-100 { background-color: #dbeafe !important; }
        .bg-yellow-100 { background-color: #fef3c7 !important; }
        .bg-orange-100 { background-color: #ffedd5 !important; }
        .bg-red-100 { background-color: #fee2e2 !important; }

        .text-green-800 { color: #166534 !important; }
        .text-blue-800 { color: #1e40af !important; }
        .text-yellow-800 { color: #854d0e !important; }
        .text-orange-800 { color: #c2410c !important; }
        .text-red-800 { color: #991b1b !important; }

        /* ============================================
         * CHARTS AND VISUALIZATIONS
         * ============================================ */

        /* Ensure SVG charts print correctly */
        svg {
          max-width: 100%;
          height: auto;
        }

        .recharts-wrapper {
          width: 100% !important;
        }

        /* Ensure chart colors print */
        .recharts-sector,
        .recharts-rectangle,
        .recharts-curve,
        .recharts-dot {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* ============================================
         * TABLES
         * ============================================ */

        table {
          border-collapse: collapse;
          width: 100%;
        }

        th, td {
          border: 1px solid #ccc;
          padding: 4px 8px;
          text-align: left;
        }

        th {
          background-color: #f0f0f0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* ============================================
         * IMAGES
         * ============================================ */

        img {
          max-width: 100% !important;
          height: auto !important;
        }

        /* Property screenshots */
        img[alt*="Aerial"],
        img[alt*="Property"] {
          max-height: 2in !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* ============================================
         * REPORT-SPECIFIC ELEMENTS
         * ============================================ */

        /* Report header */
        .report-header {
          margin-bottom: 0.5in;
        }

        /* Section spacing */
        section {
          margin-bottom: 0.25in;
        }

        /* Disclaimer section */
        .disclaimer {
          font-size: 9pt;
          color: #666 !important;
          border-top: 1px solid #ccc;
          padding-top: 0.25in;
          margin-top: 0.5in;
        }

        /* ============================================
         * FOOTER
         * ============================================ */

        /* Print footer with page numbers */
        @page {
          @bottom-center {
            content: counter(page) " of " counter(pages);
          }
        }
      }

      /* ============================================
       * PRINT PREVIEW SIMULATION (for testing)
       * ============================================ */

      .print-preview {
        background: #fff;
        color: #000;
        max-width: 8.5in;
        margin: 0 auto;
        padding: 0.5in;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }

      .print-preview .no-print {
        display: none;
      }
    `}</style>
  );
}

/**
 * PrintPreview - Wrapper component for previewing print layout
 *
 * Applies print-like styling to preview how the report will look when printed.
 */
export interface PrintPreviewProps {
  /** Content to preview */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function PrintPreview({ children, className }: PrintPreviewProps) {
  return (
    <div className={`print-preview ${className || ""}`}>
      {children}
    </div>
  );
}

/**
 * PageBreak - Explicit page break component
 */
export function PageBreak() {
  return (
    <div
      className="h-0 overflow-hidden print:block print-break-after"
      aria-hidden="true"
    />
  );
}

/**
 * NoPrint - Wrapper to hide content when printing
 */
export function NoPrint({ children }: { children: React.ReactNode }) {
  return <div className="print:hidden">{children}</div>;
}

/**
 * PrintOnly - Wrapper to show content only when printing
 */
export function PrintOnly({ children }: { children: React.ReactNode }) {
  return <div className="hidden print:block">{children}</div>;
}

export default PrintStyles;
