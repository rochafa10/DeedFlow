/**
 * PDF Export Utility
 *
 * Client-side PDF generation using html2pdf.js for property analysis reports.
 * Converts HTML content to downloadable PDF files with proper formatting.
 *
 * @module lib/pdf-export
 * @author Claude Code Agent
 * @date 2026-01-17
 */

/**
 * Type definition for html2pdf.js library (untyped module)
 * Provides minimal type safety for the chainable API
 */
interface Html2PdfInstance {
  set(options: PDFExportOptions): Html2PdfInstance;
  from(element: HTMLElement): Html2PdfInstance;
  save(): Promise<void>;
  outputPdf(type: 'blob'): Promise<Blob>;
  toPdf(): Html2PdfInstance;
  get(type: 'pdf'): Html2PdfInstance;
  then(callback: (pdf: Html2PdfDocument) => void): Promise<void>;
}

interface Html2PdfDocument {
  output(type: 'bloburl'): string;
}

type Html2PdfFactory = () => Html2PdfInstance;

// html2pdf.js is a UMD module without TypeScript types
// Store the factory function after dynamic import
let html2pdfFactory: Html2PdfFactory | null = null;

/**
 * Configuration options for PDF export
 */
export interface PDFExportOptions {
  /** Output filename (default: 'property-report.pdf') */
  filename?: string;
  /** Page margin in mm (default: 10) */
  margin?: number | [number, number, number, number];
  /** Image settings for rendering */
  image?: {
    /** Image type: 'jpeg' or 'png' */
    type?: 'jpeg' | 'png';
    /** Image quality 0-1 (default: 0.98) */
    quality?: number;
  };
  /** html2canvas configuration */
  html2canvas?: {
    /** Render scale multiplier (default: 2 for high DPI) */
    scale?: number;
    /** Allow cross-origin images */
    useCORS?: boolean;
    /** Enable logging for debugging */
    logging?: boolean;
    /** Letter box color for page boundaries */
    letterRendering?: boolean;
    /** Window width for rendering */
    windowWidth?: number;
  };
  /** jsPDF configuration */
  jsPDF?: {
    /** Unit of measurement: 'mm', 'pt', 'in', 'cm' */
    unit?: 'mm' | 'pt' | 'in' | 'cm';
    /** Paper format: 'a4', 'letter', 'legal', etc. */
    format?: 'a4' | 'letter' | 'legal' | [number, number];
    /** Page orientation */
    orientation?: 'portrait' | 'landscape';
  };
  /** Page break settings */
  pagebreak?: {
    /** Mode for page breaks: 'avoid-all', 'css', 'legacy' */
    mode?: ('avoid-all' | 'css' | 'legacy')[];
    /** CSS selectors to avoid breaking before */
    before?: string[];
    /** CSS selectors to avoid breaking after */
    after?: string[];
    /** CSS selectors to avoid breaking */
    avoid?: string[];
  };
}

/**
 * Default configuration for property report PDFs
 */
const DEFAULT_OPTIONS: PDFExportOptions = {
  filename: 'property-report.pdf',
  margin: 10,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    letterRendering: true,
  },
  jsPDF: {
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  },
  pagebreak: {
    mode: ['avoid-all', 'css', 'legacy'],
    avoid: ['section', '.no-break'],
  },
};

/**
 * Dynamically loads html2pdf.js library
 * Only loads on client-side to avoid SSR issues
 */
async function loadHtml2Pdf(): Promise<void> {
  if (html2pdfFactory) return;

  if (typeof window === 'undefined') {
    throw new Error('PDF export is only available in browser environment');
  }

  // Dynamic import for client-side only
  const html2pdfModule = await import('html2pdf.js');
  html2pdfFactory = (html2pdfModule.default || html2pdfModule) as unknown as Html2PdfFactory;
}

/**
 * Gets the html2pdf factory, ensuring it's loaded
 */
function getHtml2Pdf(): Html2PdfFactory {
  if (!html2pdfFactory) {
    throw new Error('html2pdf not loaded. Call loadHtml2Pdf() first.');
  }
  return html2pdfFactory;
}

/**
 * Sanitizes address string for use in filename
 * Removes special characters and replaces spaces with hyphens
 *
 * @param address - Property address to sanitize
 * @returns Filename-safe string
 */
function sanitizeForFilename(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .substring(0, 50); // Limit length
}

/**
 * Generates a formatted date string for filename
 *
 * @returns Date string in YYYY-MM-DD format
 */
function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates a descriptive filename for the property report PDF
 *
 * @param address - Property address
 * @param reportId - Optional report ID
 * @returns Formatted filename
 */
export function generateReportFilename(
  address?: string,
  reportId?: string
): string {
  const dateStr = getDateString();

  if (address) {
    const sanitizedAddress = sanitizeForFilename(address);
    return `property-report-${sanitizedAddress}-${dateStr}.pdf`;
  }

  if (reportId) {
    return `property-report-${reportId}-${dateStr}.pdf`;
  }

  return `property-report-${dateStr}.pdf`;
}

/**
 * Prepares the DOM element for PDF export
 * Adds necessary classes and temporarily modifies styles
 *
 * @param element - The HTML element to prepare
 * @returns Cleanup function to restore original state
 */
function prepareElementForExport(element: HTMLElement): () => void {
  // Store original styles
  const originalStyles: { [key: string]: string } = {};
  const elementsToRestore: Array<{ el: HTMLElement; style: string }> = [];

  // Hide elements that shouldn't be in PDF
  const hideElements = element.querySelectorAll('.print\\:hidden, .no-print');
  hideElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    elementsToRestore.push({ el: htmlEl, style: htmlEl.style.display });
    htmlEl.style.display = 'none';
  });

  // Ensure backgrounds are rendered
  originalStyles.colorAdjust = element.style.getPropertyValue(
    '-webkit-print-color-adjust'
  );
  element.style.setProperty('-webkit-print-color-adjust', 'exact');
  element.style.setProperty('print-color-adjust', 'exact');

  // Return cleanup function
  return () => {
    // Restore hidden elements
    elementsToRestore.forEach(({ el, style }) => {
      el.style.display = style;
    });

    // Restore original color adjust
    if (originalStyles.colorAdjust) {
      element.style.setProperty(
        '-webkit-print-color-adjust',
        originalStyles.colorAdjust
      );
    } else {
      element.style.removeProperty('-webkit-print-color-adjust');
    }
    element.style.removeProperty('print-color-adjust');
  };
}

/**
 * Exports an HTML element to PDF
 *
 * @param elementId - The ID of the HTML element to export
 * @param filename - Output filename (default: auto-generated)
 * @param options - PDF generation options
 * @throws Error if element not found or export fails
 *
 * @example
 * ```typescript
 * // Basic usage
 * await exportReportToPDF('report-container');
 *
 * // With custom filename
 * await exportReportToPDF('report-container', 'my-report.pdf');
 *
 * // With custom options
 * await exportReportToPDF('report-container', undefined, {
 *   margin: 15,
 *   jsPDF: { orientation: 'landscape' }
 * });
 * ```
 */
export async function exportReportToPDF(
  elementId: string,
  filename?: string,
  options?: Partial<PDFExportOptions>
): Promise<void> {
  // Ensure library is loaded
  await loadHtml2Pdf();
  const html2pdf = getHtml2Pdf();

  // Find the element
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Merge options with defaults
  const mergedOptions: PDFExportOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    filename: filename || options?.filename || DEFAULT_OPTIONS.filename,
    image: { ...DEFAULT_OPTIONS.image, ...options?.image },
    html2canvas: { ...DEFAULT_OPTIONS.html2canvas, ...options?.html2canvas },
    jsPDF: { ...DEFAULT_OPTIONS.jsPDF, ...options?.jsPDF },
    pagebreak: { ...DEFAULT_OPTIONS.pagebreak, ...options?.pagebreak },
  };

  // Prepare element for export
  const cleanup = prepareElementForExport(element);

  try {
    // Generate PDF
    await html2pdf().set(mergedOptions).from(element).save();
  } finally {
    // Always cleanup, even on error
    cleanup();
  }
}

/**
 * Exports an HTML element to PDF and returns it as a Blob
 * Useful for programmatic handling (e.g., email attachments, uploads)
 *
 * @param elementId - The ID of the HTML element to export
 * @param options - PDF generation options
 * @returns PDF as Blob
 */
export async function exportReportToPDFBlob(
  elementId: string,
  options?: Partial<PDFExportOptions>
): Promise<Blob> {
  // Ensure library is loaded
  await loadHtml2Pdf();
  const html2pdf = getHtml2Pdf();

  // Find the element
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Merge options with defaults
  const mergedOptions: PDFExportOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    image: { ...DEFAULT_OPTIONS.image, ...options?.image },
    html2canvas: { ...DEFAULT_OPTIONS.html2canvas, ...options?.html2canvas },
    jsPDF: { ...DEFAULT_OPTIONS.jsPDF, ...options?.jsPDF },
    pagebreak: { ...DEFAULT_OPTIONS.pagebreak, ...options?.pagebreak },
  };

  // Prepare element for export
  const cleanup = prepareElementForExport(element);

  try {
    // Generate PDF as blob
    const pdfBlob = await html2pdf()
      .set(mergedOptions)
      .from(element)
      .outputPdf('blob');

    return pdfBlob;
  } finally {
    // Always cleanup, even on error
    cleanup();
  }
}

/**
 * Opens a print preview of the PDF in a new window
 * Alternative to direct download for user preview
 *
 * @param elementId - The ID of the HTML element to preview
 * @param options - PDF generation options
 */
export async function previewReportPDF(
  elementId: string,
  options?: Partial<PDFExportOptions>
): Promise<void> {
  // Ensure library is loaded
  await loadHtml2Pdf();
  const html2pdf = getHtml2Pdf();

  // Find the element
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Merge options with defaults
  const mergedOptions: PDFExportOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    image: { ...DEFAULT_OPTIONS.image, ...options?.image },
    html2canvas: { ...DEFAULT_OPTIONS.html2canvas, ...options?.html2canvas },
    jsPDF: { ...DEFAULT_OPTIONS.jsPDF, ...options?.jsPDF },
    pagebreak: { ...DEFAULT_OPTIONS.pagebreak, ...options?.pagebreak },
  };

  // Prepare element for export
  const cleanup = prepareElementForExport(element);

  try {
    // Generate PDF and open in new window
    await html2pdf()
      .set(mergedOptions)
      .from(element)
      .toPdf()
      .get('pdf')
      .then((pdf: Html2PdfDocument) => {
        window.open(pdf.output('bloburl'), '_blank');
      });
  } finally {
    // Always cleanup, even on error
    cleanup();
  }
}
