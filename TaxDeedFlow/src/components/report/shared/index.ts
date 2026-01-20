/**
 * Report Shared Components Index
 *
 * Exports all shared/reusable components for property analysis reports.
 */

// Report section wrapper
export {
  ReportSection,
  ReportSubsection,
  type ReportSectionProps,
  type ReportSubsectionProps,
} from "./ReportSection";

// Grade display components
export {
  GradeDisplay,
  GradeBadge,
  CategoryGrade,
  type GradeDisplayProps,
  type GradeBadgeProps,
  type CategoryGradeProps,
} from "./GradeDisplay";

// Risk indicator components
export {
  RiskIndicator,
  RiskDot,
  RiskMeter,
  RiskSummary,
  type RiskIndicatorProps,
  type RiskDotProps,
  type RiskMeterProps,
  type RiskSummaryProps,
} from "./RiskIndicator";

// Metric display components
export {
  MetricDisplay,
  InlineMetric,
  MetricGrid,
  MetricCard,
  ComparisonMetric,
  MetricList,
  StatWithIcon,
  type MetricDisplayProps,
  type InlineMetricProps,
  type MetricGridProps,
  type MetricCardProps,
  type ComparisonMetricProps,
  type MetricListProps,
  type StatWithIconProps,
} from "./MetricDisplay";

// Accessibility helpers
export {
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
  useFocusManager,
  useAnnounce,
  FocusManagerContext,
  type ScreenReaderOnlyProps,
  type LiveRegionProps,
  type HiddenHeadingProps,
  type FocusTrapProps,
  type AccessibleIconProps,
  type SkipLinkProps,
  type LandmarkMenuProps,
  type LoadingAnnouncerProps,
  type TableOfContentsProps,
  type KeyboardShortcutProps,
} from "./AccessibilityHelpers";

// Loading state components
export {
  LoadingState,
  ReportSectionSkeleton,
  GradeSkeleton,
  MetricGridSkeleton,
  ChartSkeleton,
  TableSkeleton,
  ReportLoadingSkeleton,
  InlineLoading,
  LoadingProgress,
  type LoadingStateProps,
  type ReportSectionSkeletonProps,
  type LoadingProgressProps,
} from "./LoadingState";

// Error state components
export {
  ErrorState,
  InlineError,
  EmptyState,
  DataUnavailable,
  ErrorBoundaryFallback,
  PartialDataWarning,
  type ErrorStateProps,
  type ErrorSeverity,
  type InlineErrorProps,
  type EmptyStateProps,
  type DataUnavailableProps,
  type ErrorBoundaryFallbackProps,
  type PartialDataWarningProps,
} from "./ErrorState";
