/**
 * Title Search System - Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the
 * title search and lien analysis functionality.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import type { RiskLevel } from './report';

// Re-export RiskLevel for external consumers
export type { RiskLevel } from './report';

// ============================================
// Lien and Encumbrance Types
// ============================================

/**
 * Lien status classification
 */
export type LienStatus = 'active' | 'satisfied' | 'released' | 'unknown';

/**
 * Lien or encumbrance record
 */
export interface LienRecord {
  /** Unique identifier */
  id: string;
  /** Type of lien (mortgage, tax, municipal, judgment, mechanic, HOA, IRS, other) */
  type: string;
  /** Lien holder name */
  holder: string;
  /** Original amount */
  originalAmount: number;
  /** Current balance (if known) */
  currentBalance?: number;
  /** Recording date */
  recordingDate: Date;
  /** Recording reference number */
  recordingRef?: string;
  /** Priority position */
  position?: number;
  /** Whether this lien survives the tax sale */
  survivesSale: boolean;
  /** Status */
  status: LienStatus;
  /** Notes */
  notes?: string;
}

/**
 * Lien type classification
 */
export type LienType =
  | 'mortgage'
  | 'tax'
  | 'municipal'
  | 'judgment'
  | 'mechanic'
  | 'hoa'
  | 'irs'
  | 'other';

/**
 * Extended lien record with calculated fields
 */
export interface EnrichedLienRecord extends LienRecord {
  /** Whether this is a priority lien */
  isPriority: boolean;
  /** Days since recording */
  daysSinceRecording: number;
  /** Estimated cost to clear */
  estimatedClearingCost?: number;
}

// ============================================
// Ownership and Chain of Title Types
// ============================================

/**
 * Ownership history record
 */
export interface OwnershipRecord {
  /** Owner name */
  ownerName: string;
  /** Acquisition date */
  acquiredDate: Date;
  /** Sale price (if recorded) */
  salePrice?: number;
  /** Document reference */
  documentRef?: string;
  /** Deed type */
  deedType?: string;
}

/**
 * Chain of title entry
 */
export interface ChainOfTitleEntry {
  /** Date of transaction */
  transactionDate: Date;
  /** Grantor (seller) */
  grantor: string;
  /** Grantee (buyer) */
  grantee: string;
  /** Type of instrument */
  instrumentType: string;
  /** Book and page reference */
  bookPage?: string;
  /** Document number */
  documentNumber?: string;
  /** Consideration amount */
  consideration?: number;
  /** Notes about the transaction */
  notes?: string;
}

/**
 * Complete chain of title
 */
export interface ChainOfTitle {
  /** Current owner */
  currentOwner: string;
  /** Chain entries in chronological order (newest first) */
  entries: ChainOfTitleEntry[];
  /** Years of history covered */
  yearsCovered: number;
  /** Whether the chain is complete */
  isComplete: boolean;
  /** Any gaps or issues in the chain */
  gaps?: string[];
}

// ============================================
// Title Issue Types
// ============================================

/**
 * Title issue severity levels
 */
export type TitleIssueSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Title issue item
 */
export interface TitleIssue {
  /** Issue type */
  type: string;
  /** Description */
  description: string;
  /** Severity */
  severity: TitleIssueSeverity;
  /** Estimated cost to resolve */
  estimatedCost?: number;
  /** Resolution steps */
  resolution?: string;
  /** Whether this blocks purchase */
  blocksPurchase: boolean;
}

/**
 * Common title issue types
 */
export type TitleIssueType =
  | 'missing_deed'
  | 'incorrect_legal_description'
  | 'boundary_dispute'
  | 'easement_conflict'
  | 'probate_issue'
  | 'divorce_settlement'
  | 'fraud_concern'
  | 'forgery_concern'
  | 'missing_signature'
  | 'incompetent_grantor'
  | 'undisclosed_heir'
  | 'building_code_violation'
  | 'zoning_violation'
  | 'environmental_lien'
  | 'lis_pendens'
  | 'other';

/**
 * Extended title issue with categorization
 */
export interface CategorizedTitleIssue extends TitleIssue {
  /** Category of issue */
  category: TitleIssueType;
  /** Priority for resolution */
  priority: number;
  /** Recommended specialist (attorney, surveyor, etc.) */
  recommendedSpecialist?: string;
}

// ============================================
// Title Search and Summary Types
// ============================================

/**
 * Title search provider information
 */
export interface TitleSearchProvider {
  /** Provider name */
  name: string;
  /** Provider type (attorney, title company, online service) */
  type: 'attorney' | 'title_company' | 'online_service' | 'self_search';
  /** Contact information */
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

/**
 * Title research summary
 */
export interface TitleResearchSummary {
  /** Search completed */
  searchCompleted: boolean;
  /** Search date */
  searchDate?: Date;
  /** Search provider */
  searchProvider?: string;
  /** Total liens found */
  totalLiens: number;
  /** Total lien amount */
  totalLienAmount: number;
  /** Surviving liens count */
  survivingLiensCount: number;
  /** Surviving liens amount */
  survivingLiensAmount: number;
  /** Title issues found */
  issuesFound: number;
  /** Overall title risk */
  overallRisk: RiskLevel;
  /** Title insurance available */
  titleInsuranceAvailable: boolean;
  /** Estimated title insurance cost */
  titleInsuranceCost?: number;
  /** Estimated clearing cost */
  estimatedClearingCost?: number;
}

/**
 * Extended title research summary with recommendations
 */
export interface ExtendedTitleResearchSummary extends TitleResearchSummary {
  /** Years of search conducted */
  yearsSearched: number;
  /** Counties/jurisdictions searched */
  jurisdictionsSearched: string[];
  /** Recommended actions */
  recommendations: string[];
  /** Red flags requiring immediate attention */
  redFlags: string[];
  /** Estimated time to clear title */
  estimatedClearingTimeDays?: number;
}

// ============================================
// Title Insurance Types
// ============================================

/**
 * Title insurance policy type
 */
export type TitleInsurancePolicyType = 'owners' | 'lenders' | 'both';

/**
 * Title insurance quote
 */
export interface TitleInsuranceQuote {
  /** Policy type */
  policyType: TitleInsurancePolicyType;
  /** Coverage amount */
  coverageAmount: number;
  /** Premium cost (one-time) */
  premium: number;
  /** Endorsements included */
  endorsements: string[];
  /** Exclusions */
  exclusions: string[];
  /** Insurance company */
  insuranceCompany: string;
  /** Quote valid until */
  validUntil: Date;
  /** Quote reference number */
  quoteReference?: string;
}

/**
 * Title insurance availability
 */
export interface TitleInsuranceAvailability {
  /** Whether insurance is available */
  available: boolean;
  /** Reason if not available */
  unavailabilityReason?: string;
  /** Conditions that must be met */
  conditions?: string[];
  /** Estimated cost */
  estimatedCost?: number;
  /** Providers willing to insure */
  availableProviders: string[];
}

// ============================================
// Municipal and Tax Lien Types
// ============================================

/**
 * Municipal lien details
 */
export interface MunicipalLien {
  /** Type of municipal lien */
  type: 'water' | 'sewer' | 'trash' | 'code_enforcement' | 'other';
  /** Municipality name */
  municipality: string;
  /** Amount owed */
  amount: number;
  /** Service period */
  servicePeriod?: string;
  /** Account number */
  accountNumber?: string;
  /** Contact for payment */
  paymentContact?: {
    department: string;
    phone?: string;
    website?: string;
  };
}

/**
 * Tax lien details
 */
export interface TaxLien {
  /** Tax year(s) */
  taxYears: string[];
  /** Total amount owed */
  totalAmount: number;
  /** Penalties */
  penalties?: number;
  /** Interest */
  interest?: number;
  /** Tax ID number */
  taxId?: string;
  /** Whether this is the lien being foreclosed */
  isForelosureLien: boolean;
}

// ============================================
// Title Report Types
// ============================================

/**
 * Complete title report data
 */
export interface TitleReport {
  /** Report metadata */
  metadata: {
    /** Report date */
    reportDate: Date;
    /** Report ID */
    reportId: string;
    /** Examiner name */
    examinerName?: string;
    /** Report type */
    reportType: 'preliminary' | 'final' | 'commitment';
  };
  /** Property information */
  property: {
    /** Legal description */
    legalDescription: string;
    /** Street address */
    streetAddress: string;
    /** Parcel/tax ID */
    parcelId: string;
    /** County */
    county: string;
    /** State */
    state: string;
  };
  /** Title summary */
  summary: TitleResearchSummary;
  /** Lien records */
  liens: LienRecord[];
  /** Ownership history */
  ownershipHistory: OwnershipRecord[];
  /** Chain of title */
  chainOfTitle?: ChainOfTitle;
  /** Title issues */
  issues: TitleIssue[];
  /** Title insurance availability */
  insurance?: TitleInsuranceAvailability;
  /** Recommendations */
  recommendations: string[];
}

// ============================================
// Search Request and Response Types
// ============================================

/**
 * Title search request
 */
export interface TitleSearchRequest {
  /** Property identifier */
  propertyId: string;
  /** Parcel ID */
  parcelId: string;
  /** Street address */
  address: string;
  /** County */
  county: string;
  /** State */
  state: string;
  /** Years of history to search */
  yearsToSearch: number;
  /** Type of search */
  searchType: 'basic' | 'standard' | 'comprehensive';
  /** Include chain of title */
  includeChainOfTitle: boolean;
  /** Include title insurance quote */
  includeTitleInsuranceQuote: boolean;
}

/**
 * Title search response
 * Flattened structure for direct access to title data
 */
export interface TitleSearchResponse {
  /** Request ID */
  requestId: string;
  /** Search status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  // Flattened title data - directly accessible
  /** All liens found */
  liens: LienRecord[];
  /** Liens that survive the tax sale */
  survivingLiens: LienRecord[];
  /** Title quality summary */
  titleReport: {
    titleQuality: string;
    marketabilityScore: number;
    insurable: boolean;
    survivingLiensTotal: number;
    wipeableLiensTotal: number;
    riskScore: number;
    recommendation: string;
    estimatedClearingCost: number;
  };
  /** Chain of title */
  chainOfTitle: ChainOfTitle;
  /** Title issues found */
  titleIssues: TitleIssue[];
  /** Ownership history */
  ownershipHistory: OwnershipRecord[];

  // Metadata
  /** Error message (if failed) */
  error?: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Estimated completion time */
  estimatedCompletionTime?: Date;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Determine if a lien type typically survives a tax sale
 */
export function lienTypeSurvivesTaxSale(lienType: string): boolean {
  const survivingTypes = ['irs', 'federal_tax', 'senior_mortgage', 'hoa'];
  return survivingTypes.includes(lienType.toLowerCase());
}

/**
 * Calculate total lien amount from an array of liens
 */
export function calculateTotalLienAmount(liens: LienRecord[]): number {
  return liens.reduce(
    (total, lien) => total + (lien.currentBalance ?? lien.originalAmount),
    0
  );
}

/**
 * Filter liens by status
 */
export function filterLiensByStatus(
  liens: LienRecord[],
  status: LienStatus | LienStatus[]
): LienRecord[] {
  const statuses = Array.isArray(status) ? status : [status];
  return liens.filter((lien) => statuses.includes(lien.status));
}

/**
 * Filter liens that survive the tax sale
 */
export function filterSurvivingLiens(liens: LienRecord[]): LienRecord[] {
  return liens.filter((lien) => lien.survivesSale && lien.status === 'active');
}

/**
 * Sort liens by priority
 */
export function sortLiensByPriority(liens: LienRecord[]): LienRecord[] {
  return [...liens].sort((a, b) => {
    // First by position if available
    if (a.position !== undefined && b.position !== undefined) {
      return a.position - b.position;
    }
    // Then by recording date (earlier = higher priority)
    return a.recordingDate.getTime() - b.recordingDate.getTime();
  });
}

/**
 * Calculate estimated clearing cost for title issues
 */
export function calculateEstimatedClearingCost(
  issues: TitleIssue[],
  survivingLiens: LienRecord[]
): number {
  const issueCosts = issues.reduce(
    (total, issue) => total + (issue.estimatedCost ?? 0),
    0
  );
  const lienCosts = calculateTotalLienAmount(survivingLiens);
  return issueCosts + lienCosts;
}

/**
 * Determine overall title risk based on issues and liens
 */
export function determineOverallTitleRisk(
  issues: TitleIssue[],
  survivingLiens: LienRecord[]
): RiskLevel {
  // Critical if any blocking issues or critical severity issues
  if (issues.some((issue) => issue.blocksPurchase || issue.severity === 'critical')) {
    return 'critical';
  }

  // High if surviving liens > $10k or high severity issues
  const survivingLienAmount = calculateTotalLienAmount(survivingLiens);
  if (survivingLienAmount > 10000 || issues.some((issue) => issue.severity === 'high')) {
    return 'high';
  }

  // Medium if any surviving liens or medium severity issues
  if (survivingLiens.length > 0 || issues.some((issue) => issue.severity === 'medium')) {
    return 'medium';
  }

  // Low otherwise
  return 'low';
}

/**
 * Get lien status display label
 */
export function getLienStatusLabel(status: LienStatus): string {
  const labels: Record<LienStatus, string> = {
    active: 'Active',
    satisfied: 'Satisfied',
    released: 'Released',
    unknown: 'Unknown',
  };
  return labels[status];
}

/**
 * Get lien type display label
 */
export function getLienTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    mortgage: 'Mortgage',
    tax: 'Tax Lien',
    municipal: 'Municipal Lien',
    judgment: 'Judgment',
    mechanic: "Mechanic's Lien",
    hoa: 'HOA Lien',
    irs: 'IRS Tax Lien',
    other: 'Other Lien',
  };
  return labels[type.toLowerCase()] || type;
}

/**
 * Format legal description for display
 */
export function formatLegalDescription(legalDescription: string): string {
  // Remove excessive whitespace and normalize line breaks
  return legalDescription.trim().replace(/\s+/g, ' ');
}
