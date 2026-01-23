/**
 * Title Search API Service
 *
 * Provides access to title search, lien identification, and deed chain data including:
 * - Title searches by address/parcel
 * - Lien identification and classification
 * - Deed chain tracking
 * - Title risk assessment
 * - Lien survivability analysis
 *
 * Phase 1: Mock implementation returning sample data
 * Phase 2: Real API integration with AttomData/DataTrace
 *
 * @module lib/api/services/title-service
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import { BaseApiService } from '../base-service';
import {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  ApiResponse,
} from '../types';
import { ValidationError } from '../errors';
import type {
  TitleSearchRequest,
  TitleSearchResponse,
  TitleReport,
  LienRecord,
  ChainOfTitle,
  ChainOfTitleEntry,
  TitleIssue,
  TitleResearchSummary,
  OwnershipRecord,
  RiskLevel,
} from '../../../types/title';

// ============================================================================
// Types
// ============================================================================

/**
 * Title search query parameters
 */
export interface TitleSearchQuery {
  /** Street address */
  address: string;
  /** City */
  city: string;
  /** State (2-letter code) */
  state: string;
  /** ZIP code */
  zip?: string;
  /** Parcel ID (alternative to address) */
  parcelId?: string;
  /** County name */
  county: string;
  /** Years of history to search (default: 30) */
  yearsToSearch?: number;
}

/**
 * Lien search result
 */
export interface LienSearchResult {
  /** Total liens found */
  totalLiens: number;
  /** Liens that survive tax sale */
  survivingLiens: LienRecord[];
  /** All lien records */
  allLiens: LienRecord[];
  /** Total amount of surviving liens */
  survivingLienAmount: number;
  /** Total amount of all liens */
  totalLienAmount: number;
}

/**
 * Batch title search request
 */
export interface BatchTitleSearchRequest {
  /** Array of property queries */
  properties: TitleSearchQuery[];
  /** Batch ID for tracking */
  batchId?: string;
  /** Priority level */
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Batch title search result
 */
export interface BatchTitleSearchResult {
  /** Batch ID */
  batchId: string;
  /** Total properties in batch */
  totalProperties: number;
  /** Successfully processed */
  successCount: number;
  /** Failed to process */
  failureCount: number;
  /** Individual results */
  results: TitleSearchResponse[];
  /** Overall batch status */
  status: 'pending' | 'in_progress' | 'completed' | 'partial_failure' | 'failed';
  /** Processing metadata */
  metadata?: {
    batchSize: number;
    successRate: number;
    durationMs: number;
    averageTimePerProperty: number;
    errors?: Array<{ property: any; error: string }>;
  };
}

// ============================================================================
// TitleService Class
// ============================================================================

/**
 * Title Search Service
 *
 * Provides comprehensive title search functionality including lien identification,
 * deed chain tracking, and title risk assessment.
 *
 * **Current Implementation:** Mock data (Phase 1)
 * **Future:** Real API integration with AttomData/DataTrace (Phase 2)
 */
export class TitleService extends BaseApiService {
  /**
   * Creates a new TitleService instance
   *
   * @param config - Optional API configuration overrides
   * @param cacheConfig - Optional cache configuration
   * @param circuitBreakerConfig - Optional circuit breaker configuration
   * @param rateLimitConfig - Optional rate limit configuration
   */
  constructor(
    config?: Partial<ApiConfig>,
    cacheConfig?: Partial<CacheConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    rateLimitConfig?: Partial<RateLimitConfig>
  ) {
    super(
      {
        baseUrl: config?.baseUrl || 'https://api.title-provider.example.com',
        serviceName: 'TitleService',
        timeout: 30000, // Title searches can take longer
        ...config,
      },
      {
        enabled: true,
        ttl: 7 * 24 * 60 * 60 * 1000, // Cache for 7 days (title data doesn't change frequently)
        maxSize: 100,
        ...cacheConfig,
      },
      {
        failureThreshold: 5,
        resetTimeout: 60000,
        ...circuitBreakerConfig,
      },
      {
        requestsPerSecond: 2, // Conservative rate limit for title API
        burstSize: 5,
        ...rateLimitConfig,
      }
    );
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Search title by address or parcel ID
   *
   * Performs a comprehensive title search including:
   * - Lien identification
   * - Deed chain tracking
   * - Title issue detection
   * - Risk assessment
   *
   * @param query - Title search query parameters
   * @returns Promise resolving to title search response
   */
  async searchTitleByAddress(query: TitleSearchQuery): Promise<ApiResponse<TitleSearchResponse>> {
    this.validateTitleSearchQuery(query);

    try {
      // Phase 1: Generate mock data
      // Phase 2: Will use real API call
      const titleSearchResponse = await this.generateMockTitleSearchResponse(query);

      return {
        data: titleSearchResponse,
        status: 200,
        headers: {},
        cached: false,
        requestId: this.generateRequestId(),
        responseTime: 0,
      };
    } catch (error) {
      this.logger.warn('Title search failed', {
        query,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get liens for a specific property
   *
   * @param query - Title search query parameters
   * @returns Promise resolving to lien search result
   */
  async searchLiens(query: TitleSearchQuery): Promise<ApiResponse<LienSearchResult>> {
    this.validateTitleSearchQuery(query);

    return this.request<LienSearchResult>('/v1/title/liens', {
      method: 'POST',
      body: query,
      cache: { enabled: true },
    });
  }

  /**
   * Get deed chain for a property
   *
   * @param query - Title search query parameters
   * @returns Promise resolving to chain of title
   */
  async getDeedChain(query: TitleSearchQuery): Promise<ApiResponse<ChainOfTitle>> {
    this.validateTitleSearchQuery(query);

    return this.request<ChainOfTitle>('/v1/title/deed-chain', {
      method: 'POST',
      body: query,
      cache: { enabled: true },
    });
  }

  /**
   * Process batch title searches
   *
   * Processes multiple properties with rate limiting and error handling.
   * Useful for bulk research operations.
   *
   * Pattern based on regrid_scraper.py batch processing:
   * - Sequential processing with rate limiting
   * - Individual error handling (failures don't stop batch)
   * - Progress tracking and logging
   * - Detailed error reporting
   *
   * @param request - Batch title search request
   * @returns Promise resolving to batch results
   */
  async processBatchTitleSearches(
    request: BatchTitleSearchRequest
  ): Promise<ApiResponse<BatchTitleSearchResult>> {
    if (!request.properties || request.properties.length === 0) {
      throw new ValidationError(
        'Batch request must include at least one property',
        '/batch-title-search',
        this.generateRequestId(),
        'properties',
        { minItems: '1' },
        request.properties
      );
    }

    const batchId = request.batchId || this.generateBatchId();
    const startTime = Date.now();

    this.logger.info('Starting batch title search', {
      batchId,
      totalProperties: request.properties.length,
      priority: request.priority || 'normal',
    });

    // For Phase 1 (mock), process sequentially with rate limiting
    // Phase 2 will use real batch API endpoint
    const results: TitleSearchResponse[] = [];
    const errors: Array<{ property: TitleSearchQuery; error: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    // Rate limiting: delay between requests (respect API limits)
    // Conservative: 500ms between requests (2 requests per second)
    const delayMs = request.priority === 'high' ? 250 : request.priority === 'low' ? 1000 : 500;

    for (let i = 0; i < request.properties.length; i++) {
      const property = request.properties[i];

      try {
        // Log progress every 10 properties
        if (i > 0 && i % 10 === 0) {
          this.logger.info('Batch progress update', {
            batchId,
            processed: i,
            total: request.properties.length,
            successCount,
            failureCount,
          });
        }

        // Execute title search
        const result = await this.searchTitleByAddress(property);

        if (result.data) {
          results.push(result.data);
          successCount++;
        }

        // Rate limiting: delay between requests (except after last item)
        if (i < request.properties.length - 1) {
          await this.delay(delayMs);
        }
      } catch (error) {
        failureCount++;

        const errorMessage = error instanceof Error ? error.message : String(error);

        // Track detailed error information
        errors.push({
          property,
          error: errorMessage,
        });

        // Log error but continue processing remaining properties
        this.logger.warn('Title search failed for property in batch', {
          batchId,
          propertyIndex: i,
          address: property.address,
          parcelId: property.parcelId,
          error: errorMessage,
        });

        // Still apply rate limiting after errors
        if (i < request.properties.length - 1) {
          await this.delay(delayMs);
        }
      }
    }

    const duration = Date.now() - startTime;

    // Determine overall batch status
    let status: BatchTitleSearchResult['status'];
    if (failureCount === 0) {
      status = 'completed';
    } else if (failureCount === request.properties.length) {
      status = 'failed';
    } else {
      status = 'partial_failure';
    }

    this.logger.info('Batch title search completed', {
      batchId,
      totalProperties: request.properties.length,
      successCount,
      failureCount,
      status,
      durationMs: duration,
    });

    const batchResult: BatchTitleSearchResult = {
      batchId,
      totalProperties: request.properties.length,
      successCount,
      failureCount,
      results,
      status,
      metadata: {
        batchSize: request.properties.length,
        successRate: (successCount / request.properties.length) * 100,
        durationMs: duration,
        averageTimePerProperty: duration / request.properties.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    };

    return {
      data: batchResult,
      cached: false,
      requestId: this.generateRequestId(),
      status: 200,
      headers: {},
      responseTime: duration,
    };
  }

  /**
   * Delay helper for rate limiting
   *
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Helper Methods (to be implemented in later subtasks)
  // ============================================================================

  /**
   * Determine if a lien survives a tax sale
   *
   * Implementation follows state-specific rules and lien priority.
   * Federal liens (IRS, EPA) ALWAYS survive tax sales.
   * Most other liens are wiped out, with some state-specific exceptions.
   *
   * Based on AGENT-5-TITLE-RESEARCH.md and SKILL-title-search-methodology.md
   *
   * @param lien - Lien record
   * @param state - State code (2-letter abbreviation)
   * @returns Whether the lien survives
   */
  determineLienSurvivability(lien: LienRecord, state: string): boolean {
    const lienTypeLower = lien.type.toLowerCase();
    const stateUpper = state.toUpperCase();

    // ========================================================================
    // FEDERAL LIENS - ALWAYS SURVIVE (CRITICAL!)
    // ========================================================================
    const federalLienTypes = [
      'irs',
      'irs_tax_lien',
      'federal_tax',
      'federal_tax_lien',
      'epa',
      'epa_lien',
      'environmental_lien',
      'federal_judgment',
      'sba',
      'sba_lien',
      'federal',
    ];

    if (federalLienTypes.includes(lienTypeLower)) {
      return true; // Federal liens ALWAYS survive - buyer inherits the debt!
    }

    // ========================================================================
    // LIENS THAT ARE ALWAYS WIPED OUT
    // ========================================================================
    const wipedOutLienTypes = [
      'property_tax',
      'tax', // Property tax being foreclosed
      'mortgage',
      'first_mortgage',
      'second_mortgage',
      'home_equity',
      'heloc',
      'judgment',
      'judgment_lien',
      'civil_judgment',
      'mechanic',
      'mechanics_lien',
      'materialman',
      'construction',
    ];

    if (wipedOutLienTypes.includes(lienTypeLower)) {
      return false; // These liens are wiped out by tax sale
    }

    // ========================================================================
    // STATE-SPECIFIC RULES
    // ========================================================================

    // HOA liens - survival depends on state and timing
    if (lienTypeLower.includes('hoa') || lienTypeLower.includes('homeowner')) {
      return this.determineHOALienSurvivability(lien, stateUpper);
    }

    // Municipal liens - survival depends on state and type
    if (
      lienTypeLower.includes('municipal') ||
      lienTypeLower.includes('utility') ||
      lienTypeLower.includes('water') ||
      lienTypeLower.includes('sewer')
    ) {
      return this.determineMunicipalLienSurvivability(lien, stateUpper);
    }

    // ========================================================================
    // DEFAULT: Unknown lien types
    // ========================================================================
    // For safety, assume unknown liens survive (conservative approach)
    this.logger.warn('Unknown lien type encountered', {
      lienType: lien.type,
      lienId: lien.id,
      state: stateUpper,
    });

    return true; // Conservative: assume it survives
  }

  /**
   * Determine if HOA lien survives based on state rules
   *
   * @param lien - HOA lien record
   * @param state - State code (uppercase)
   * @returns Whether the lien survives
   */
  private determineHOALienSurvivability(lien: LienRecord, state: string): boolean {
    // States where HOA liens typically survive
    const hoaSurvivesStates = ['FL', 'NV', 'CO', 'AZ', 'TX'];

    // States where HOA liens are typically wiped out
    const hoaWipedOutStates = ['PA', 'NY', 'NJ', 'CA', 'IL'];

    if (hoaSurvivesStates.includes(state)) {
      return true;
    }

    if (hoaWipedOutStates.includes(state)) {
      return false;
    }

    // Unknown state - conservative approach
    this.logger.warn('Unknown HOA lien survivability for state', {
      state,
      lienId: lien.id,
    });
    return true; // Conservative: assume it survives
  }

  /**
   * Determine if municipal lien survives based on state rules
   *
   * @param lien - Municipal lien record
   * @param state - State code (uppercase)
   * @returns Whether the lien survives
   */
  private determineMunicipalLienSurvivability(lien: LienRecord, state: string): boolean {
    const lienTypeLower = lien.type.toLowerCase();

    // Pennsylvania rules (example from pattern files)
    if (state === 'PA') {
      // Some municipal utility liens survive in PA
      if (lienTypeLower.includes('water') || lienTypeLower.includes('sewer')) {
        return true;
      }
      return false;
    }

    // Florida rules
    if (state === 'FL') {
      // Most municipal liens survive in FL
      return true;
    }

    // California rules
    if (state === 'CA') {
      // Most municipal liens wiped out in CA
      return false;
    }

    // Texas rules
    if (state === 'TX') {
      // Some municipal liens survive in TX
      if (lienTypeLower.includes('water') || lienTypeLower.includes('utility')) {
        return true;
      }
      return false;
    }

    // Unknown state - conservative approach
    this.logger.warn('Unknown municipal lien survivability for state', {
      state,
      lienType: lien.type,
      lienId: lien.id,
    });
    return true; // Conservative: assume it survives
  }

  /**
   * Calculate title risk score
   *
   * Follows scoring algorithm from AGENT-5-TITLE-RESEARCH.md:
   * - Surviving liens (weight: 0.50) - Major penalty for liens that survive tax sale
   * - High total liens (weight: 0.20) - Penalty if total liens > 80% of property value
   * - Deed chain issues (weight: 0.15) - Gaps and quitclaim deeds reduce score
   * - Critical issues (weight: 0.15) - Each critical issue significantly reduces score
   *
   * Score ranges:
   * - 0.70 - 1.00: Low risk (APPROVE)
   * - 0.40 - 0.69: Medium risk (CAUTION)
   * - 0.01 - 0.39: High risk (REJECT)
   * - 0.00: Critical risk (REJECT - automatic fail)
   *
   * @param liens - All lien records
   * @param issues - Title issues
   * @param chainOfTitle - Deed chain (optional, used to estimate property value)
   * @returns Risk level
   */
  calculateTitleRiskScore(
    liens: LienRecord[],
    issues: TitleIssue[],
    chainOfTitle?: ChainOfTitle
  ): RiskLevel {
    // Start with perfect score
    let score = 1.0;

    // ========================================================================
    // 1. Estimate property value (for lien ratio calculations)
    // ========================================================================
    let propertyValue = 100000; // Default fallback value

    // Use most recent transaction value from chain of title if available
    if (chainOfTitle?.entries && chainOfTitle.entries.length > 0) {
      const mostRecentEntry = chainOfTitle.entries[0]; // entries are newest first
      if (mostRecentEntry.consideration && mostRecentEntry.consideration > 0) {
        propertyValue = mostRecentEntry.consideration;
      }
    }

    // ========================================================================
    // 2. Surviving liens (weight: 0.50) - MOST CRITICAL FACTOR
    // ========================================================================
    const survivingLiens = liens.filter(
      (lien) => lien.survivesSale && lien.status === 'active'
    );
    const survivingLienAmount = survivingLiens.reduce(
      (sum, lien) => sum + (lien.currentBalance ?? lien.originalAmount),
      0
    );

    if (survivingLiens.length > 0) {
      score -= 0.50; // Major penalty for ANY surviving liens

      // Automatic fail if surviving liens > 30% of property value
      if (survivingLienAmount > propertyValue * 0.30) {
        score = 0;
        return 'critical'; // Immediate return - unacceptable risk
      }
    }

    // ========================================================================
    // 3. High total liens (weight: 0.20)
    // ========================================================================
    const totalLienAmount = liens
      .filter((lien) => lien.status === 'active')
      .reduce((sum, lien) => sum + (lien.currentBalance ?? lien.originalAmount), 0);

    if (totalLienAmount > propertyValue * 0.80) {
      score -= 0.20;
    }

    // ========================================================================
    // 4. Deed chain issues (weight: 0.15)
    // ========================================================================
    if (chainOfTitle) {
      // Check for gaps in chain
      if (chainOfTitle.gaps && chainOfTitle.gaps.length > 0) {
        score -= 0.10;
      }

      // Check for quitclaim deeds (may hide title issues)
      const quitclaimCount = chainOfTitle.entries?.filter((entry) =>
        entry.instrumentType.toLowerCase().includes('quitclaim')
      ).length ?? 0;

      if (quitclaimCount > 0) {
        score -= 0.05;
      }
    }

    // ========================================================================
    // 5. Title issues (weight: 0.15)
    // ========================================================================
    const criticalIssues = issues.filter(
      (issue) => issue.severity === 'critical' || issue.blocksPurchase
    );
    const highSeverityIssues = issues.filter((issue) => issue.severity === 'high');

    // Critical issues - major penalty each
    criticalIssues.forEach(() => {
      score -= 0.15;
    });

    // High severity issues - moderate penalty
    highSeverityIssues.forEach(() => {
      score -= 0.08;
    });

    // ========================================================================
    // 6. Normalize score to 0.0 - 1.0 range
    // ========================================================================
    score = Math.max(0, Math.min(1.0, score));

    // ========================================================================
    // 7. Convert numerical score to RiskLevel enum
    // ========================================================================
    if (score === 0 || issues.some((issue) => issue.blocksPurchase)) {
      return 'critical'; // 0.00 or blocking issues - DO NOT BUY
    }

    if (score < 0.40) {
      return 'high'; // 0.01 - 0.39 - REJECT
    }

    if (score < 0.70) {
      return 'medium'; // 0.40 - 0.69 - CAUTION
    }

    return 'low'; // 0.70 - 1.00 - APPROVE
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Validate title search query parameters
   *
   * @param query - Query to validate
   * @throws ValidationError if query is invalid
   */
  private validateTitleSearchQuery(query: TitleSearchQuery): void {
    if (!query.address && !query.parcelId) {
      throw new ValidationError(
        'Either address or parcelId is required',
        '/title-search',
        this.generateRequestId(),
        'address',
        { required: 'true' },
        query
      );
    }

    if (query.address && (!query.city || !query.state)) {
      throw new ValidationError(
        'City and state are required when searching by address',
        '/title-search',
        this.generateRequestId(),
        'city',
        { required: 'true' },
        query
      );
    }

    if (!query.county) {
      throw new ValidationError(
        'County is required',
        '/title-search',
        this.generateRequestId(),
        'county',
        { required: 'true' },
        query
      );
    }

    if (query.state && query.state.length !== 2) {
      throw new ValidationError(
        'State must be 2-letter code (e.g., PA, FL, CA)',
        '/title-search',
        this.generateRequestId(),
        'state',
        { format: '2-letter code' },
        query.state
      );
    }

    if (query.yearsToSearch && (query.yearsToSearch < 1 || query.yearsToSearch > 100)) {
      throw new ValidationError(
        'yearsToSearch must be between 1 and 100',
        '/title-search',
        this.generateRequestId(),
        'yearsToSearch',
        { min: '1', max: '100' },
        query.yearsToSearch
      );
    }
  }

  /**
   * Generate cache key from query parameters
   *
   * @param prefix - Cache key prefix
   * @param query - Query parameters
   * @returns Cache key string
   */
  private generateCacheKey(prefix: string, query: TitleSearchQuery): string {
    const key = query.parcelId || `${query.address}-${query.city}-${query.state}`;
    return `${prefix}:${query.county}:${key}`;
  }

  /**
   * Generate unique batch ID
   *
   * @returns Batch ID string
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique request ID
   *
   * @returns Request ID string
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate mock title search response (Phase 1 implementation)
   *
   * Creates realistic sample data for testing and development.
   * Phase 2 will replace this with real API integration.
   *
   * @param query - Title search query parameters
   * @returns Mock title search response
   */
  private async generateMockTitleSearchResponse(
    query: TitleSearchQuery
  ): Promise<TitleSearchResponse> {
    const yearsToSearch = query.yearsToSearch || 30;
    const reportId = `title_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Generate mock liens (0-3 liens)
    const liens: LienRecord[] = this.generateMockLiens(query.state);

    // Generate mock ownership history
    const ownershipHistory: OwnershipRecord[] = this.generateMockOwnershipHistory(yearsToSearch);

    // Generate mock chain of title
    const chainOfTitle: ChainOfTitle = this.generateMockChainOfTitle(ownershipHistory);

    // Generate mock title issues (0-2 issues)
    const issues: TitleIssue[] = this.generateMockTitleIssues();

    // Calculate surviving liens
    const survivingLiens = liens.filter((lien) => lien.survivesSale && lien.status === 'active');
    const totalLienAmount = liens.reduce(
      (sum, lien) => sum + (lien.currentBalance ?? lien.originalAmount),
      0
    );
    const survivingLienAmount = survivingLiens.reduce(
      (sum, lien) => sum + (lien.currentBalance ?? lien.originalAmount),
      0
    );

    // Calculate overall risk
    const overallRisk = this.calculateTitleRiskScore(liens, issues, chainOfTitle);

    // Create title research summary
    const summary: TitleResearchSummary = {
      searchCompleted: true,
      searchDate: new Date(),
      searchProvider: 'Mock Title Service (Phase 1)',
      totalLiens: liens.length,
      totalLienAmount,
      survivingLiensCount: survivingLiens.length,
      survivingLiensAmount: survivingLienAmount,
      issuesFound: issues.length,
      overallRisk,
      titleInsuranceAvailable: overallRisk !== 'critical' && !issues.some((i) => i.blocksPurchase),
      titleInsuranceCost: overallRisk === 'low' ? 500 : overallRisk === 'medium' ? 750 : 1200,
      estimatedClearingCost: survivingLienAmount + issues.reduce((sum, i) => sum + (i.estimatedCost ?? 0), 0),
    };

    // Generate recommendations
    const recommendations: string[] = [];
    if (survivingLiens.length > 0) {
      recommendations.push(`Contact lien holders to negotiate payoff of ${survivingLiens.length} surviving lien(s)`);
    }
    if (issues.some((i) => i.severity === 'high' || i.severity === 'critical')) {
      recommendations.push('Consult with real estate attorney before proceeding');
    }
    if (overallRisk === 'low') {
      recommendations.push('Property has clean title - proceed with purchase');
    }
    if (!summary.titleInsuranceAvailable) {
      recommendations.push('Title insurance not available - resolve blocking issues first');
    }

    // Create title report
    const report: TitleReport = {
      metadata: {
        reportDate: new Date(),
        reportId,
        examinerName: 'Mock Examiner',
        reportType: 'preliminary',
      },
      property: {
        legalDescription: `LOT 123, BLOCK 45, ${query.county.toUpperCase()} COUNTY SUBDIVISION`,
        streetAddress: query.address || 'N/A',
        parcelId: query.parcelId || 'MOCK-PARCEL-123',
        county: query.county,
        state: query.state,
      },
      summary,
      liens,
      ownershipHistory,
      chainOfTitle,
      issues,
      insurance: {
        available: summary.titleInsuranceAvailable,
        unavailabilityReason: summary.titleInsuranceAvailable
          ? undefined
          : 'Blocking title issues must be resolved',
        conditions: survivingLiens.length > 0 ? ['All surviving liens must be satisfied before closing'] : undefined,
        estimatedCost: summary.titleInsuranceCost,
        availableProviders: summary.titleInsuranceAvailable
          ? ['First American Title', 'Chicago Title', 'Fidelity National']
          : [],
      },
      recommendations,
    };

    // Create response with flattened structure
    const response: TitleSearchResponse = {
      requestId: this.generateRequestId(),
      status: 'completed',
      // Flatten report data to top level
      liens,
      survivingLiens,
      titleReport: {
        titleQuality: overallRisk === 'low' ? 'clear' : overallRisk === 'critical' ? 'defective' : 'clouded',
        marketabilityScore: overallRisk === 'low' ? 95 : overallRisk === 'medium' ? 75 : overallRisk === 'high' ? 50 : 25,
        insurable: summary.titleInsuranceAvailable,
        survivingLiensTotal: survivingLienAmount,
        wipeableLiensTotal: totalLienAmount - survivingLienAmount,
        riskScore: overallRisk === 'low' ? 0.9 : overallRisk === 'medium' ? 0.7 : overallRisk === 'high' ? 0.4 : 0.2,
        recommendation: overallRisk === 'low'
          ? 'Proceed with purchase'
          : overallRisk === 'medium'
            ? 'Review liens before proceeding'
            : overallRisk === 'high'
              ? 'Significant title concerns - consult attorney'
              : 'Do not proceed - critical title defects',
        estimatedClearingCost: summary.estimatedClearingCost || 0,
      },
      chainOfTitle,
      titleIssues: issues,
      ownershipHistory,
      progress: 100,
    };

    return response;
  }

  /**
   * Generate mock lien records
   *
   * Uses the determineLienSurvivability() method to calculate which liens survive.
   *
   * @param state - State code for lien survivability rules
   * @returns Array of mock lien records
   */
  private generateMockLiens(state: string): LienRecord[] {
    const lienCount = Math.floor(Math.random() * 4); // 0-3 liens
    const liens: LienRecord[] = [];

    // Lien types without hardcoded survivability (calculated dynamically)
    const lienTypes: Array<{ type: string; holder: string; amount: number }> = [
      { type: 'mortgage', holder: 'First National Bank', amount: 45000 },
      { type: 'irs', holder: 'Internal Revenue Service', amount: 8500 },
      { type: 'municipal', holder: `${state} Water Authority`, amount: 1200 },
      { type: 'hoa', holder: 'Homeowners Association', amount: 2400 },
      { type: 'judgment', holder: 'County Court', amount: 3500 },
      { type: 'second_mortgage', holder: 'Regional Credit Union', amount: 25000 },
      { type: 'mechanic', holder: 'ABC Construction Co.', amount: 7500 },
    ];

    for (let i = 0; i < lienCount; i++) {
      const lienType = lienTypes[Math.floor(Math.random() * lienTypes.length)];
      const recordingDate = new Date();
      recordingDate.setFullYear(recordingDate.getFullYear() - Math.floor(Math.random() * 10));

      // Create preliminary lien record
      const preliminaryLien: LienRecord = {
        id: `lien_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        type: lienType.type,
        holder: lienType.holder,
        originalAmount: lienType.amount,
        currentBalance: lienType.amount * (0.7 + Math.random() * 0.3),
        recordingDate,
        recordingRef: `REC-${Math.floor(Math.random() * 100000)}`,
        position: i + 1,
        survivesSale: false, // Temporary value
        status: Math.random() > 0.2 ? 'active' : 'satisfied',
        notes: '',
      };

      // Calculate survivability using the new logic
      const survives = this.determineLienSurvivability(preliminaryLien, state);

      // Update the lien with calculated survivability
      liens.push({
        ...preliminaryLien,
        survivesSale: survives,
        notes: survives
          ? `⚠️ WARNING: This lien survives tax sale - buyer inherits ${lienType.type} debt!`
          : `✓ Wiped out by tax sale`,
      });
    }

    return liens;
  }

  /**
   * Generate mock ownership history
   *
   * @param years - Years of history to generate
   * @returns Array of ownership records
   */
  private generateMockOwnershipHistory(years: number): OwnershipRecord[] {
    const owners: OwnershipRecord[] = [];
    const ownerNames = ['John Smith', 'Jane Doe', 'Robert Johnson', 'Mary Williams', 'Tax Deed Purchaser'];
    const deedTypes = ['Warranty Deed', 'Quitclaim Deed', 'Tax Deed', 'Special Warranty Deed'];

    let currentDate = new Date();
    const ownersToGenerate = Math.min(Math.ceil(years / 10), 3); // 1-3 previous owners

    for (let i = 0; i < ownersToGenerate; i++) {
      const yearsAgo = Math.floor((years / ownersToGenerate) * i);
      const acquiredDate = new Date(currentDate);
      acquiredDate.setFullYear(acquiredDate.getFullYear() - yearsAgo);

      owners.push({
        ownerName: ownerNames[i % ownerNames.length],
        acquiredDate,
        salePrice: Math.floor(50000 + Math.random() * 200000),
        documentRef: `DEED-${Math.floor(Math.random() * 100000)}`,
        deedType: deedTypes[Math.floor(Math.random() * deedTypes.length)],
      });
    }

    return owners.reverse(); // Chronological order (oldest first)
  }

  /**
   * Generate mock chain of title
   *
   * @param ownershipHistory - Ownership records to base chain on
   * @returns Chain of title
   */
  private generateMockChainOfTitle(ownershipHistory: OwnershipRecord[]): ChainOfTitle {
    const entries: ChainOfTitleEntry[] = [];

    for (let i = 0; i < ownershipHistory.length; i++) {
      const owner = ownershipHistory[i];
      const previousOwner = i > 0 ? ownershipHistory[i - 1].ownerName : 'Previous Owner';

      entries.push({
        transactionDate: owner.acquiredDate,
        grantor: previousOwner,
        grantee: owner.ownerName,
        instrumentType: owner.deedType || 'Warranty Deed',
        bookPage: `Book ${Math.floor(Math.random() * 500)}, Page ${Math.floor(Math.random() * 999)}`,
        documentNumber: owner.documentRef,
        consideration: owner.salePrice,
        notes: undefined,
      });
    }

    const currentOwner = ownershipHistory.length > 0
      ? ownershipHistory[ownershipHistory.length - 1].ownerName
      : 'Current Owner';

    return {
      currentOwner,
      entries: entries.reverse(), // Newest first
      yearsCovered: ownershipHistory.length > 0
        ? new Date().getFullYear() - ownershipHistory[0].acquiredDate.getFullYear()
        : 0,
      isComplete: true,
      gaps: undefined,
    };
  }

  /**
   * Generate mock title issues
   *
   * @returns Array of title issues (0-2 issues)
   */
  private generateMockTitleIssues(): TitleIssue[] {
    const issueCount = Math.floor(Math.random() * 3); // 0-2 issues
    const issues: TitleIssue[] = [];

    const possibleIssues: Array<Omit<TitleIssue, 'description'> & { description: string }> = [
      {
        type: 'easement_conflict',
        description: 'Utility easement recorded but location unclear',
        severity: 'low',
        estimatedCost: 500,
        resolution: 'Survey required to clarify easement boundaries',
        blocksPurchase: false,
      },
      {
        type: 'missing_signature',
        description: 'Spousal signature missing on 2015 deed',
        severity: 'medium',
        estimatedCost: 1500,
        resolution: 'Obtain quitclaim deed from spouse',
        blocksPurchase: false,
      },
      {
        type: 'boundary_dispute',
        description: 'Neighboring property claims fence encroachment',
        severity: 'high',
        estimatedCost: 5000,
        resolution: 'Boundary survey and potential legal action',
        blocksPurchase: false,
      },
      {
        type: 'probate_issue',
        description: 'Previous owner died intestate - heirs not identified',
        severity: 'critical',
        estimatedCost: 10000,
        resolution: 'Probate court proceedings required',
        blocksPurchase: true,
      },
    ];

    for (let i = 0; i < issueCount; i++) {
      const issue = possibleIssues[Math.floor(Math.random() * possibleIssues.length)];
      issues.push({ ...issue });
    }

    return issues;
  }
}

// ============================================================================
// Singleton Instance Factory
// ============================================================================

let titleServiceInstance: TitleService | null = null;

/**
 * Get singleton TitleService instance
 *
 * @param config - Optional configuration overrides
 * @returns TitleService instance
 */
export function getTitleService(config?: Partial<ApiConfig>): TitleService {
  if (!titleServiceInstance) {
    titleServiceInstance = new TitleService(config);
  }
  return titleServiceInstance;
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetTitleService(): void {
  titleServiceInstance = null;
}
