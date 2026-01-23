/**
 * Chart Component Type Definitions
 *
 * Type definitions for Recharts callbacks and components to eliminate
 * excessive any type usage in chart implementations.
 *
 * @file Chart types for Recharts components
 * @author Claude Code Agent
 * @date 2026-01-22
 */

// ============================================
// Active Shape Props (Pie Chart)
// ============================================

/**
 * Props for custom active shape rendering in Recharts Pie charts
 *
 * @see https://recharts.org/en-US/api/Pie#activeShape
 */
export interface ActiveShapeProps<T = Record<string, unknown>> {
  /** Center X coordinate */
  cx: number;
  /** Center Y coordinate */
  cy: number;
  /** Inner radius of the pie slice */
  innerRadius: number;
  /** Outer radius of the pie slice */
  outerRadius: number;
  /** Start angle in degrees */
  startAngle: number;
  /** End angle in degrees */
  endAngle: number;
  /** Fill color */
  fill: string;
  /** Payload data for the slice */
  payload: T;
  /** Value of the slice */
  value: number;
  /** Percentage value (0-1) */
  percent: number;
  /** Index of the slice */
  index?: number;
  /** Name of the slice */
  name?: string;
  /** Corner radius */
  cornerRadius?: number;
  /** Padding angle */
  padAngle?: number;
}

// ============================================
// Tooltip Props
// ============================================

/**
 * Base payload item for tooltip
 */
export interface TooltipPayloadItem<T = Record<string, unknown>> {
  /** Data key */
  dataKey?: string;
  /** Display name */
  name?: string;
  /** Value */
  value?: number | string;
  /** Color */
  color?: string;
  /** Fill color */
  fill?: string;
  /** Stroke color */
  stroke?: string;
  /** Unit */
  unit?: string;
  /** Full payload data */
  payload: T;
}

/**
 * Props for custom tooltip components in Recharts
 *
 * @see https://recharts.org/en-US/api/Tooltip
 */
export interface TooltipProps<T = Record<string, unknown>> {
  /** Whether tooltip is active (mouse is over chart) */
  active?: boolean;
  /** Payload data array */
  payload?: TooltipPayloadItem<T>[];
  /** Label text */
  label?: string | number;
  /** Coordinate information */
  coordinate?: {
    x: number;
    y: number;
  };
  /** Separator between name and value */
  separator?: string;
  /** Content style */
  contentStyle?: React.CSSProperties;
  /** Item style */
  itemStyle?: React.CSSProperties;
  /** Label style */
  labelStyle?: React.CSSProperties;
  /** Wrapper style */
  wrapperStyle?: React.CSSProperties;
}

// ============================================
// Legend Props
// ============================================

/**
 * Payload item for legend
 */
export interface LegendPayloadItem {
  /** Value/name */
  value: string;
  /** Item ID */
  id?: string;
  /** Type of chart element */
  type?:
    | "line"
    | "plainline"
    | "square"
    | "rect"
    | "circle"
    | "cross"
    | "diamond"
    | "star"
    | "triangle"
    | "wye"
    | "none";
  /** Color */
  color?: string;
  /** Data key */
  dataKey?: string;
  /** Whether item is inactive */
  inactive?: boolean;
  /** Payload data */
  payload?: Record<string, unknown>;
}

/**
 * Props for custom legend components in Recharts
 *
 * @see https://recharts.org/en-US/api/Legend
 */
export interface LegendProps {
  /** Payload data array */
  payload?: LegendPayloadItem[];
  /** Width of legend */
  width?: number;
  /** Height of legend */
  height?: number;
  /** Icon size */
  iconSize?: number;
  /** Icon type */
  iconType?: LegendPayloadItem["type"];
  /** Layout orientation */
  layout?: "horizontal" | "vertical";
  /** Alignment */
  align?: "left" | "center" | "right";
  /** Vertical alignment */
  verticalAlign?: "top" | "middle" | "bottom";
  /** Content style */
  chartWidth?: number;
  /** Content style */
  chartHeight?: number;
  /** Margin */
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Content renderer */
  content?: React.ReactElement | ((props: LegendProps) => React.ReactNode);
  /** Wrapper style */
  wrapperStyle?: React.CSSProperties;
  /** On click handler */
  onClick?: (data: LegendPayloadItem, index: number, event: React.MouseEvent) => void;
  /** On mouse enter handler */
  onMouseEnter?: (data: LegendPayloadItem, index: number, event: React.MouseEvent) => void;
  /** On mouse leave handler */
  onMouseLeave?: (data: LegendPayloadItem, index: number, event: React.MouseEvent) => void;
}

// ============================================
// Label Props
// ============================================

/**
 * Props for custom label components in Recharts
 */
export interface LabelProps {
  /** X coordinate */
  x?: number;
  /** Y coordinate */
  y?: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Text anchor */
  textAnchor?: "start" | "middle" | "end" | "inherit";
  /** Vertical anchor */
  verticalAnchor?: "start" | "middle" | "end";
  /** Fill color */
  fill?: string;
  /** Stroke color */
  stroke?: string;
  /** Value to display */
  value?: string | number;
  /** Offset */
  offset?: number;
  /** Position */
  position?:
    | "top"
    | "left"
    | "right"
    | "bottom"
    | "inside"
    | "outside"
    | "insideLeft"
    | "insideRight"
    | "insideTop"
    | "insideBottom"
    | "insideTopLeft"
    | "insideTopRight"
    | "insideBottomLeft"
    | "insideBottomRight"
    | "center";
  /** View box */
  viewBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  /** Index */
  index?: number;
}

// ============================================
// Cell Props
// ============================================

/**
 * Props for Cell component in Recharts
 */
export interface CellProps {
  /** Fill color */
  fill?: string;
  /** Stroke color */
  stroke?: string;
  /** Stroke width */
  strokeWidth?: number;
}

// ============================================
// Mouse Event Handlers
// ============================================

/**
 * Mouse event data for chart interactions
 */
export interface ChartMouseEvent<T = Record<string, unknown>> {
  /** Active payload */
  activePayload?: TooltipPayloadItem<T>[];
  /** Active label */
  activeLabel?: string;
  /** Active coordinate */
  activeCoordinate?: {
    x: number;
    y: number;
  };
  /** Active tooltip index */
  activeTooltipIndex?: number;
  /** Chart X position */
  chartX?: number;
  /** Chart Y position */
  chartY?: number;
  /** Data for specific point clicked */
  value?: number | string;
  /** Index of data point */
  index?: number;
  /** Name/key of data point */
  name?: string;
}

/**
 * Handler for pie chart mouse enter event
 */
export type PieMouseEnterHandler = (
  data: Record<string, unknown>,
  index: number,
  event: React.MouseEvent
) => void;

/**
 * Handler for chart click event
 */
export type ChartClickHandler<T = Record<string, unknown>> = (
  data: ChartMouseEvent<T>,
  event: React.MouseEvent
) => void;

// ============================================
// Axis Tick Props
// ============================================

/**
 * Props for custom axis tick rendering
 */
export interface AxisTickProps {
  /** X coordinate */
  x?: number;
  /** Y coordinate */
  y?: number;
  /** Payload value */
  payload?: {
    value: string | number;
    coordinate?: number;
    index?: number;
    offset?: number;
  };
  /** Text anchor */
  textAnchor?: "start" | "middle" | "end" | "inherit";
  /** Vertical anchor */
  verticalAnchor?: "start" | "middle" | "end";
  /** Index */
  index?: number;
  /** Fill color */
  fill?: string;
  /** Stroke color */
  stroke?: string;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Orientation */
  orientation?: "left" | "right" | "top" | "bottom";
}

// ============================================
// Common Chart Data Types
// ============================================

/**
 * Generic chart data point
 */
export interface ChartDataPoint {
  /** Name/label */
  name: string;
  /** Value */
  value: number;
  /** Optional color */
  color?: string;
  /** Optional additional properties */
  [key: string]: unknown;
}

/**
 * Pie chart data item with required fields
 */
export interface PieChartDataItem {
  /** Name/label */
  name: string;
  /** Value */
  value: number;
  /** Color */
  color: string;
  /** Percentage (0-100) */
  percentage: number;
  /** Optional additional properties */
  [key: string]: unknown;
}

/**
 * Scatter chart data point
 */
export interface ScatterChartDataPoint {
  /** X coordinate value */
  x: number;
  /** Y coordinate value */
  y: number;
  /** Z value (for bubble size) */
  z?: number;
  /** Optional additional properties */
  [key: string]: unknown;
}
