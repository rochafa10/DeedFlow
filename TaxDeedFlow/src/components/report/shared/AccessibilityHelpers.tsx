"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Screen reader only text component
 * Content is visually hidden but accessible to screen readers
 */
export interface ScreenReaderOnlyProps {
  /** Content for screen readers */
  children: React.ReactNode;
  /** HTML element to render */
  as?: keyof JSX.IntrinsicElements;
}

export function ScreenReaderOnly({
  children,
  as: Component = "span",
}: ScreenReaderOnlyProps) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

/**
 * Announce changes to screen readers using ARIA live regions
 */
export interface LiveRegionProps {
  /** Content to announce */
  children: React.ReactNode;
  /** Politeness level - polite waits for idle, assertive interrupts */
  politeness?: "polite" | "assertive";
  /** Whether changes are atomic (announce all) or not */
  atomic?: boolean;
  /** What types of changes to announce */
  relevant?: "additions" | "removals" | "text" | "all";
  /** Additional CSS classes */
  className?: string;
}

export function LiveRegion({
  children,
  politeness = "polite",
  atomic = true,
  relevant = "additions",
  className,
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn("sr-only", className)}
    >
      {children}
    </div>
  );
}

/**
 * Hook to announce messages to screen readers
 */
export function useAnnounce() {
  const [announcement, setAnnouncement] = React.useState("");

  const announce = React.useCallback((message: string) => {
    // Clear first to ensure re-announcement of same message
    setAnnouncement("");
    // Use timeout to ensure state change is detected
    setTimeout(() => setAnnouncement(message), 50);
  }, []);

  const Announcer = React.useCallback(
    () => (
      <LiveRegion politeness="polite" atomic>
        {announcement}
      </LiveRegion>
    ),
    [announcement]
  );

  return { announce, Announcer };
}

/**
 * Visually hidden heading for accessibility
 * Provides document structure without visual display
 */
export interface HiddenHeadingProps {
  /** Heading level (h1-h6) */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** Heading content */
  children: React.ReactNode;
  /** ID for anchor links */
  id?: string;
}

export function HiddenHeading({ level, children, id }: HiddenHeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag id={id} className="sr-only">
      {children}
    </Tag>
  );
}

/**
 * Focus trap for modal-like components
 * Keeps focus within the component when tabbing
 */
export interface FocusTrapProps {
  /** Whether the trap is active */
  active: boolean;
  /** Content to trap focus within */
  children: React.ReactNode;
  /** Callback when user tries to escape (Escape key) */
  onEscape?: () => void;
}

export function FocusTrap({ active, children, onEscape }: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;

    // Store current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element
    const container = containerRef.current;
    if (container) {
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }

    // Restore focus on cleanup
    return () => {
      previousFocusRef.current?.focus();
    };
  }, [active]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!active) return;

      if (event.key === "Escape" && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [active, onEscape]
  );

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

/**
 * Accessible icon wrapper
 * Ensures icons are properly hidden or labeled for screen readers
 */
export interface AccessibleIconProps {
  /** Icon element */
  icon: React.ReactNode;
  /** Label for screen readers (if icon has meaning) */
  label?: string;
  /** Whether the icon is decorative only (hidden from screen readers) */
  decorative?: boolean;
}

export function AccessibleIcon({
  icon,
  label,
  decorative = false,
}: AccessibleIconProps) {
  if (decorative) {
    return <span aria-hidden="true">{icon}</span>;
  }

  if (label) {
    return (
      <span role="img" aria-label={label}>
        {icon}
      </span>
    );
  }

  // If neither decorative nor labeled, hide by default
  return <span aria-hidden="true">{icon}</span>;
}

/**
 * Skip link for keyboard navigation
 * Allows users to skip to main content
 */
export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId?: string;
  /** Link text */
  children?: React.ReactNode;
}

export function SkipLink({
  targetId = "main-content",
  children = "Skip to main content",
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
        "focus:px-4 focus:py-2",
        "focus:bg-primary focus:text-white",
        "focus:rounded-md focus:outline-none",
        "focus:ring-2 focus:ring-primary focus:ring-offset-2"
      )}
    >
      {children}
    </a>
  );
}

/**
 * Navigation landmarks menu for keyboard users
 * Provides quick access to page sections
 */
export interface LandmarkMenuProps {
  /** Array of landmark sections */
  landmarks: Array<{
    id: string;
    label: string;
  }>;
}

export function LandmarkMenu({ landmarks }: LandmarkMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (landmarks.length === 0) return null;

  return (
    <nav
      aria-label="Page sections"
      className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-4 focus-within:left-4 focus-within:z-[100] focus-within:bg-white focus-within:dark:bg-slate-800 focus-within:rounded-lg focus-within:shadow-lg focus-within:p-4 focus-within:border focus-within:border-slate-200 focus-within:dark:border-slate-700"
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Jump to section:
      </h2>
      <ul className="space-y-1">
        {landmarks.map((landmark) => (
          <li key={landmark.id}>
            <a
              href={`#${landmark.id}`}
              className="block px-2 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {landmark.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Accessible loading indicator
 */
export interface LoadingAnnouncerProps {
  /** Whether loading is in progress */
  isLoading: boolean;
  /** Message to announce when loading starts */
  loadingMessage?: string;
  /** Message to announce when loading completes */
  completeMessage?: string;
}

export function LoadingAnnouncer({
  isLoading,
  loadingMessage = "Loading content...",
  completeMessage = "Content loaded",
}: LoadingAnnouncerProps) {
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (isLoading) {
      setMessage(loadingMessage);
    } else {
      setMessage(completeMessage);
      // Clear after announcement
      const timer = setTimeout(() => setMessage(""), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingMessage, completeMessage]);

  return <LiveRegion politeness="polite">{message}</LiveRegion>;
}

/**
 * Table of contents for screen readers
 * Provides overview of document structure
 */
export interface TableOfContentsProps {
  /** Sections to include */
  sections: Array<{
    id: string;
    title: string;
    level?: number;
  }>;
  /** Whether to show visually (sr-only by default) */
  visuallyHidden?: boolean;
}

export function TableOfContents({
  sections,
  visuallyHidden = true,
}: TableOfContentsProps) {
  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className={cn(
        visuallyHidden && "sr-only focus-within:not-sr-only",
        "focus-within:block"
      )}
    >
      <h2 className="text-sm font-semibold mb-2">Contents</h2>
      <ol className="space-y-1 list-decimal list-inside">
        {sections.map((section) => (
          <li
            key={section.id}
            style={{ marginLeft: (section.level || 1) * 12 }}
          >
            <a
              href={`#${section.id}`}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Keyboard shortcut indicator
 */
export interface KeyboardShortcutProps {
  /** Key combination (e.g., "Ctrl+S", "Cmd+K") */
  keys: string;
  /** Description of what the shortcut does */
  description: string;
}

export function KeyboardShortcut({ keys, description }: KeyboardShortcutProps) {
  const keyParts = keys.split("+");

  return (
    <span className="inline-flex items-center gap-1" aria-label={`${description}: ${keys}`}>
      {keyParts.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span className="text-slate-400">+</span>}
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * Context for managing focus within a component tree
 */
export interface FocusManagerContextValue {
  /** Focus a specific element by ID */
  focusElement: (id: string) => void;
  /** Register a focusable element */
  registerElement: (id: string, ref: React.RefObject<HTMLElement>) => void;
  /** Unregister a focusable element */
  unregisterElement: (id: string) => void;
}

export const FocusManagerContext = React.createContext<FocusManagerContextValue | null>(null);

export function FocusManagerProvider({ children }: { children: React.ReactNode }) {
  const elementsRef = React.useRef<Map<string, React.RefObject<HTMLElement>>>(new Map());

  const focusElement = React.useCallback((id: string) => {
    const ref = elementsRef.current.get(id);
    ref?.current?.focus();
  }, []);

  const registerElement = React.useCallback((id: string, ref: React.RefObject<HTMLElement>) => {
    elementsRef.current.set(id, ref);
  }, []);

  const unregisterElement = React.useCallback((id: string) => {
    elementsRef.current.delete(id);
  }, []);

  const value = React.useMemo(
    () => ({ focusElement, registerElement, unregisterElement }),
    [focusElement, registerElement, unregisterElement]
  );

  return (
    <FocusManagerContext.Provider value={value}>
      {children}
    </FocusManagerContext.Provider>
  );
}

export function useFocusManager() {
  const context = React.useContext(FocusManagerContext);
  if (!context) {
    throw new Error("useFocusManager must be used within FocusManagerProvider");
  }
  return context;
}

export default {
  ScreenReaderOnly,
  LiveRegion,
  HiddenHeading,
  FocusTrap,
  AccessibleIcon,
  SkipLink,
  LandmarkMenu,
  LoadingAnnouncer,
  TableOfContents,
  KeyboardShortcut,
  FocusManagerProvider,
};
