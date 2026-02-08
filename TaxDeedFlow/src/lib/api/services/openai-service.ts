/**
 * OpenAI API Service
 *
 * Provides AI-powered analysis and text generation for property reports.
 * Requires API key from OpenAI.
 *
 * API Documentation: https://platform.openai.com/docs/api-reference
 */

import { BaseApiService } from '../base-service';
import {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  ApiResponse,
} from '../types';
import { ValidationError, ApiError } from '../errors';

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Image URL content for vision messages
 */
export interface ImageUrlContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * Text content for vision messages
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Vision message content (can be text, image, or array of both)
 */
export type VisionMessageContent = string | Array<TextContent | ImageUrlContent>;

/**
 * Chat message (supports both text and vision content)
 */
export interface ChatMessage {
  role: MessageRole;
  content: VisionMessageContent;
}

/**
 * Legacy text-only chat message (for backward compatibility)
 */
export interface TextChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

/**
 * Chat completion response
 */
export interface ChatCompletion {
  id: string;
  model: string;
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Property analysis request
 */
export interface PropertyAnalysisRequest {
  propertyData: {
    address: string;
    parcelId?: string;
    propertyType?: string;
    lotSize?: number;
    buildingSize?: number;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
  };
  financialData?: {
    taxesOwed?: number;
    assessedValue?: number;
    estimatedMarketValue?: number;
    comparableSales?: Array<{
      address: string;
      salePrice: number;
      saleDate: string;
    }>;
  };
  locationData?: {
    crimeRate?: string;
    schoolRating?: number;
    walkScore?: number;
    nearbyAmenities?: string[];
  };
  riskData?: {
    floodZone?: string;
    floodRisk?: string;
    environmentalIssues?: string[];
    climateRisks?: string[];
  };
}

/**
 * Property analysis response
 */
export interface PropertyAnalysis {
  executiveSummary: string;
  investmentPotential: 'excellent' | 'good' | 'fair' | 'poor';
  keyStrengths: string[];
  keyRisks: string[];
  recommendedAction: string;
  estimatedROI?: string;
  fullAnalysis: string;
}

/**
 * Property imagery analysis type
 */
export type PropertyImageryAnalysisType = 'satellite' | 'street_view' | 'combined';

/**
 * Condition flag categories for property imagery analysis
 */
export type ConditionFlag =
  | 'roof_damage'
  | 'structural_damage'
  | 'overgrowth'
  | 'debris'
  | 'fire_damage'
  | 'water_damage'
  | 'vandalism'
  | 'excellent_condition'
  | 'good_condition'
  | 'fair_condition'
  | 'poor_condition';

/**
 * Property imagery analysis request
 */
export interface PropertyImageryAnalysisRequest {
  propertyId: string;
  imageUrls: string[];
  analysisType: PropertyImageryAnalysisType;
  propertyContext?: {
    address?: string;
    parcelId?: string;
    propertyType?: string;
    yearBuilt?: number;
  };
}

/**
 * Visible issue identified in imagery analysis
 */
export interface VisibleIssue {
  category: ConditionFlag;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  confidence: number; // 0-1
  location?: string; // e.g., "front yard", "roof", "north side"
}

/**
 * Property imagery analysis findings (structured JSON)
 */
export interface PropertyImageryFindings {
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  visibleIssues: VisibleIssue[];
  positiveFeatures: string[];
  concerns: string[];
  roofCondition?: 'excellent' | 'good' | 'fair' | 'poor' | 'not_visible';
  landscapingCondition?: 'well_maintained' | 'moderate' | 'overgrown' | 'not_visible';
  structuralObservations?: string;
  surroundingArea?: string;
  accessibilityNotes?: string;
}

/**
 * Property imagery analysis response
 */
export interface PropertyImageryAnalysisResponse {
  propertyId: string;
  analysisType: PropertyImageryAnalysisType;
  aiModel: string;
  findings: PropertyImageryFindings;
  conditionFlags: ConditionFlag[];
  visibleIssues: VisibleIssue[];
  recommendation: string;
  confidenceScore: number; // 0-1
  analyzedAt: string; // ISO 8601 timestamp
}

// ============================================================================
// Visual Validation / Investability Types
// ============================================================================

/**
 * Image input for property investability analysis.
 *
 * Each image is tagged with its source type so the AI model can weigh
 * satellite imagery differently from street-level photos.
 */
export interface VisualValidationImage {
  /** Publicly-accessible URL to the image */
  url: string;
  /** Source / perspective of the image */
  type: 'satellite' | 'map' | 'street_view' | 'regrid';
  /** Detail level to request from GPT-4o vision */
  detail: 'high' | 'low';
}

/**
 * Structured result from GPT-4o property investability screening.
 *
 * The `status` field drives downstream pipeline routing:
 * - APPROVED  -> continue to condition / title analysis
 * - CAUTION   -> flag for manual review before proceeding
 * - REJECTED  -> skip all further analysis for this property
 */
export interface VisualValidationResult {
  /** Overall screening decision */
  status: 'APPROVED' | 'CAUTION' | 'REJECTED';
  /** Model confidence in the decision (0-100) */
  confidence: number;
  /** 1-2 sentence overview of the property */
  summary: string;
  /** Positive findings that support investability */
  positives: string[];
  /** Concerns that warrant caution / manual review */
  concerns: string[];
  /** Immediate disqualifiers that trigger rejection */
  redFlags: string[];
  /** Actionable next-step recommendation */
  recommendation: string;
  /** AI's best determination of property type (e.g. "single-family residential") */
  propertyType: string;
  /** Whether a built structure is visible on the parcel */
  structurePresent: boolean;
  /** Whether the parcel has visible road frontage / access */
  roadAccess: boolean;
  /** Observed land use category (e.g. "residential", "commercial", "vacant") */
  landUseObserved: string;
}

/**
 * Context about the property that supplements the images.
 * All fields are optional -- the model works with whatever is available.
 */
export interface VisualValidationPropertyContext {
  address?: string;
  parcelId?: string;
  lotSize?: string;
  propertyType?: string;
  zoning?: string;
}

// ============================================================================
// Service Configuration
// ============================================================================

/**
 * OpenAI Service Configuration
 */
export interface OpenAIServiceConfig {
  apiKey?: string;
  defaultModel?: string;
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_OPENAI_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://api.openai.com/v1',
  timeout: 60000, // 60 seconds for AI generation
  retries: 2,
  retryDelay: 3000,
  serviceName: 'openai',
};

/**
 * Default cache config - no caching for unique analyses
 */
const DEFAULT_OPENAI_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: false, // Each property is unique
  ttl: 0,
  maxSize: 0,
};

/**
 * Default rate limit - OpenAI has tier-based limits
 */
const DEFAULT_OPENAI_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 3,
  burstSize: 10,
  queueExcess: true,
};

/**
 * Default model
 */
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * OpenAI API Service
 *
 * Provides AI-powered text generation for property analysis reports.
 */
export class OpenAIService extends BaseApiService {
  private apiKey: string;
  private defaultModel: string;

  constructor(config?: OpenAIServiceConfig) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';

    if (!apiKey) {
      console.warn('[OpenAIService] No OPENAI_API_KEY found. API calls will fail.');
    }

    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_OPENAI_CONFIG,
      baseUrl: DEFAULT_OPENAI_CONFIG.baseUrl!,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    super(
      apiConfig,
      { ...DEFAULT_OPENAI_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_OPENAI_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.apiKey = apiKey;
    this.defaultModel = config?.defaultModel || DEFAULT_MODEL;
    this.logger.info(`OpenAIService initialized (model: ${this.defaultModel})`);
  }

  /**
   * Create a chat completion
   *
   * @param messages - Array of chat messages
   * @param options - Completion options
   * @returns Promise resolving to chat completion
   */
  public async createChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ApiResponse<ChatCompletion>> {
    if (!messages || messages.length === 0) {
      throw new ValidationError(
        'At least one message is required',
        'messages',
        'validation',
        'messages',
        { required: 'true' },
        messages
      );
    }

    const endpoint = '/chat/completions';

    const requestBody = {
      model: options?.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      top_p: options?.topP ?? 1,
      frequency_penalty: options?.frequencyPenalty ?? 0,
      presence_penalty: options?.presencePenalty ?? 0,
      stop: options?.stop,
    };

    const response = await this.post<{
      id: string;
      model: string;
      choices: Array<{
        message: { content: string };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    }>(endpoint, requestBody);

    const choice = response.data.choices[0];

    if (!choice) {
      throw new ApiError(
        'No completion generated',
        500,
        endpoint,
        response.requestId
      );
    }

    return {
      ...response,
      data: {
        id: response.data.id,
        model: response.data.model,
        content: choice.message.content,
        finishReason: choice.finish_reason,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      },
    };
  }

  /**
   * Generate an executive summary for a property
   *
   * @param data - Property analysis request data
   * @returns Promise resolving to executive summary
   */
  public async generateExecutiveSummary(
    data: PropertyAnalysisRequest
  ): Promise<ApiResponse<string>> {
    const systemPrompt = `You are an expert real estate investment analyst specializing in tax deed properties.
Generate concise, professional executive summaries for property investment reports.
Focus on key investment factors: value proposition, risks, and recommended action.
Keep summaries to 2-3 paragraphs.`;

    const userPrompt = `Generate an executive summary for this tax deed property:

Property: ${data.propertyData.address}
${data.propertyData.propertyType ? `Type: ${data.propertyData.propertyType}` : ''}
${data.propertyData.lotSize ? `Lot Size: ${data.propertyData.lotSize} sqft` : ''}
${data.propertyData.buildingSize ? `Building: ${data.propertyData.buildingSize} sqft` : ''}
${data.propertyData.yearBuilt ? `Year Built: ${data.propertyData.yearBuilt}` : ''}

${data.financialData ? `Financial:
- Taxes Owed: $${data.financialData.taxesOwed?.toLocaleString() || 'Unknown'}
- Assessed Value: $${data.financialData.assessedValue?.toLocaleString() || 'Unknown'}
- Est. Market Value: $${data.financialData.estimatedMarketValue?.toLocaleString() || 'Unknown'}` : ''}

${data.riskData ? `Risk Factors:
- Flood Zone: ${data.riskData.floodZone || 'Unknown'}
- Environmental: ${data.riskData.environmentalIssues?.join(', ') || 'None identified'}` : ''}

${data.locationData ? `Location:
- Crime Rate: ${data.locationData.crimeRate || 'Unknown'}
- School Rating: ${data.locationData.schoolRating || 'Unknown'}/10` : ''}`;

    const response = await this.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 500,
    });

    return {
      ...response,
      data: response.data.content,
    };
  }

  /**
   * Generate full property analysis
   *
   * @param data - Property analysis request data
   * @returns Promise resolving to property analysis
   */
  public async generatePropertyAnalysis(
    data: PropertyAnalysisRequest
  ): Promise<ApiResponse<PropertyAnalysis>> {
    const systemPrompt = `You are an expert real estate investment analyst specializing in tax deed and distressed property investments.
Provide detailed, actionable analysis for investors considering tax deed property purchases.
Be realistic about both opportunities and risks.
Format your response as JSON with the following structure:
{
  "executiveSummary": "2-3 paragraph summary",
  "investmentPotential": "excellent|good|fair|poor",
  "keyStrengths": ["strength1", "strength2", ...],
  "keyRisks": ["risk1", "risk2", ...],
  "recommendedAction": "clear recommendation",
  "estimatedROI": "estimated return if applicable",
  "fullAnalysis": "detailed analysis paragraphs"
}`;

    const userPrompt = `Analyze this tax deed property for investment potential:

PROPERTY DETAILS:
- Address: ${data.propertyData.address}
- Parcel ID: ${data.propertyData.parcelId || 'Unknown'}
- Type: ${data.propertyData.propertyType || 'Unknown'}
- Lot Size: ${data.propertyData.lotSize ? `${data.propertyData.lotSize} sqft` : 'Unknown'}
- Building Size: ${data.propertyData.buildingSize ? `${data.propertyData.buildingSize} sqft` : 'Unknown'}
- Year Built: ${data.propertyData.yearBuilt || 'Unknown'}
- Bed/Bath: ${data.propertyData.bedrooms || '?'}/${data.propertyData.bathrooms || '?'}

FINANCIAL DATA:
${data.financialData ? `- Taxes Owed: $${data.financialData.taxesOwed?.toLocaleString() || 'Unknown'}
- Assessed Value: $${data.financialData.assessedValue?.toLocaleString() || 'Unknown'}
- Est. Market Value: $${data.financialData.estimatedMarketValue?.toLocaleString() || 'Unknown'}
${data.financialData.comparableSales?.length ? `- Recent Comparables:
${data.financialData.comparableSales.map((c) => `  * ${c.address}: $${c.salePrice.toLocaleString()} (${c.saleDate})`).join('\n')}` : ''}` : 'No financial data available'}

LOCATION DATA:
${data.locationData ? `- Crime Rate: ${data.locationData.crimeRate || 'Unknown'}
- School Rating: ${data.locationData.schoolRating || 'Unknown'}/10
- Walk Score: ${data.locationData.walkScore || 'Unknown'}
- Nearby: ${data.locationData.nearbyAmenities?.join(', ') || 'Unknown'}` : 'No location data available'}

RISK FACTORS:
${data.riskData ? `- Flood Zone: ${data.riskData.floodZone || 'Unknown'}
- Flood Risk: ${data.riskData.floodRisk || 'Unknown'}
- Environmental: ${data.riskData.environmentalIssues?.join(', ') || 'None identified'}
- Climate Risks: ${data.riskData.climateRisks?.join(', ') || 'None identified'}` : 'No risk data available'}

Provide your analysis in the JSON format specified.`;

    const response = await this.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 2000,
    });

    // Parse the JSON response
    let analysis: PropertyAnalysis;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.data.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      analysis = JSON.parse(jsonStr);
    } catch {
      // If JSON parsing fails, create a structured response from the text
      analysis = {
        executiveSummary: response.data.content.substring(0, 500),
        investmentPotential: 'fair',
        keyStrengths: ['Unable to parse detailed analysis'],
        keyRisks: ['Analysis parsing error'],
        recommendedAction: 'Please review the raw analysis',
        fullAnalysis: response.data.content,
      };
    }

    return {
      ...response,
      data: analysis,
    };
  }

  /**
   * Generate risk explanation in plain English
   *
   * @param riskFactors - Object containing risk data
   * @returns Promise resolving to risk explanation
   */
  public async generateRiskExplanation(
    riskFactors: Record<string, unknown>
  ): Promise<ApiResponse<string>> {
    const systemPrompt = `You are a real estate risk analyst explaining property risks to investors in clear, plain English.
Explain what each risk means, how serious it is, and what the investor should consider.
Be helpful but realistic about potential issues.`;

    const userPrompt = `Explain these property risk factors in plain English for an investor:

${JSON.stringify(riskFactors, null, 2)}

Provide a clear explanation of what each risk means and its potential impact on the investment.`;

    const response = await this.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 800,
    });

    return {
      ...response,
      data: response.data.content,
    };
  }

  /**
   * Generate investment recommendation
   *
   * @param propertyData - Property data
   * @param maxBid - Maximum recommended bid
   * @param estimatedValue - Estimated after-repair value
   * @returns Promise resolving to recommendation
   */
  public async generateInvestmentRecommendation(
    propertyData: PropertyAnalysisRequest['propertyData'],
    maxBid: number,
    estimatedValue: number
  ): Promise<ApiResponse<{ recommendation: string; reasoning: string }>> {
    const systemPrompt = `You are an investment advisor for tax deed property auctions.
Provide clear, actionable recommendations on whether to bid and at what price.
Consider potential profit margins, risks, and market conditions.`;

    const userPrompt = `Should an investor bid on this property?

Property: ${propertyData.address}
Type: ${propertyData.propertyType || 'Unknown'}
Size: ${propertyData.buildingSize || 'Unknown'} sqft
Year: ${propertyData.yearBuilt || 'Unknown'}

Calculated Max Bid: $${maxBid.toLocaleString()}
Estimated Value (ARV): $${estimatedValue.toLocaleString()}
Potential Profit: $${(estimatedValue - maxBid).toLocaleString()}
ROI Potential: ${((estimatedValue - maxBid) / maxBid * 100).toFixed(1)}%

Provide a clear recommendation (BID or PASS) with reasoning.`;

    const response = await this.createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], {
      temperature: 0.7,
      maxTokens: 400,
    });

    const content = response.data.content;
    const isBid = content.toLowerCase().includes('bid') && !content.toLowerCase().includes('do not bid') && !content.toLowerCase().includes('pass');

    return {
      ...response,
      data: {
        recommendation: isBid ? 'BID' : 'PASS',
        reasoning: content,
      },
    };
  }

  /**
   * Analyze property images using GPT-4o vision
   *
   * @param request - Property imagery analysis request
   * @returns Promise resolving to property imagery analysis
   */
  public async analyzePropertyImages(
    request: PropertyImageryAnalysisRequest
  ): Promise<ApiResponse<PropertyImageryAnalysisResponse>> {
    // Validate request
    if (!request.imageUrls || request.imageUrls.length === 0) {
      throw new ValidationError(
        'At least one image URL is required',
        'imageUrls',
        'validation',
        'imageUrls',
        { required: 'true', minLength: '1' },
        request.imageUrls
      );
    }

    // Build system prompt for vision analysis
    const systemPrompt = `You are an expert property inspector analyzing imagery for real estate investment decisions.
Analyze the provided property images and identify:
1. Overall condition (excellent/good/fair/poor)
2. Visible issues (roof damage, structural damage, overgrowth, debris, etc.)
3. Positive features (well-maintained, good landscaping, etc.)
4. Concerns (damage, deterioration, safety issues)
5. Specific observations about roof, landscaping, structure, and surroundings

Provide your analysis in the following JSON format:
{
  "overallCondition": "excellent|good|fair|poor|unknown",
  "visibleIssues": [
    {
      "category": "roof_damage|structural_damage|overgrowth|debris|fire_damage|water_damage|vandalism|excellent_condition|good_condition|fair_condition|poor_condition",
      "severity": "low|medium|high|critical",
      "description": "detailed description",
      "confidence": 0.0-1.0,
      "location": "specific location if visible"
    }
  ],
  "positiveFeatures": ["feature1", "feature2"],
  "concerns": ["concern1", "concern2"],
  "roofCondition": "excellent|good|fair|poor|not_visible",
  "landscapingCondition": "well_maintained|moderate|overgrown|not_visible",
  "structuralObservations": "observations about structure",
  "surroundingArea": "observations about neighborhood/area",
  "accessibilityNotes": "notes about access, roads, etc."
}

Be thorough but realistic. Consider the image type (satellite vs street view).`;

    // Build user prompt with property context
    let userPromptText = `Analyze the following property images:\n\n`;

    if (request.propertyContext) {
      userPromptText += `Property Context:\n`;
      if (request.propertyContext.address) {
        userPromptText += `- Address: ${request.propertyContext.address}\n`;
      }
      if (request.propertyContext.parcelId) {
        userPromptText += `- Parcel ID: ${request.propertyContext.parcelId}\n`;
      }
      if (request.propertyContext.propertyType) {
        userPromptText += `- Type: ${request.propertyContext.propertyType}\n`;
      }
      if (request.propertyContext.yearBuilt) {
        userPromptText += `- Year Built: ${request.propertyContext.yearBuilt}\n`;
      }
      userPromptText += `\n`;
    }

    userPromptText += `Analysis Type: ${request.analysisType}\n`;
    userPromptText += `Number of Images: ${request.imageUrls.length}\n\n`;
    userPromptText += `Please analyze the images and provide your assessment in the specified JSON format.`;

    // Build vision message content with text and images
    const visionContent: Array<TextContent | ImageUrlContent> = [
      {
        type: 'text',
        text: userPromptText,
      },
    ];

    // Add all images to the content array
    for (const imageUrl of request.imageUrls) {
      visionContent.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'high', // Use high detail for thorough property analysis
        },
      });
    }

    // Create chat completion with vision
    const response = await this.createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: visionContent },
      ],
      {
        model: 'gpt-4o', // Use GPT-4o for vision capabilities
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 2000,
      }
    );

    // Parse the JSON response
    let findings: PropertyImageryFindings;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response.data.content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      findings = JSON.parse(jsonStr);
    } catch (error) {
      // If JSON parsing fails, create a fallback response
      throw new ApiError(
        `Failed to parse vision analysis response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        '/chat/completions',
        response.requestId
      );
    }

    // Extract condition flags from visible issues
    const conditionFlags: ConditionFlag[] = findings.visibleIssues.map(
      (issue) => issue.category
    );

    // Calculate overall confidence score
    const confidenceScore =
      findings.visibleIssues.length > 0
        ? findings.visibleIssues.reduce((sum, issue) => sum + issue.confidence, 0) /
          findings.visibleIssues.length
        : 0.8; // Default confidence if no issues found

    // Generate recommendation based on findings
    let recommendation = '';
    if (findings.overallCondition === 'excellent' || findings.overallCondition === 'good') {
      recommendation = 'Property appears to be in good condition with no major visible issues.';
    } else if (findings.overallCondition === 'fair') {
      recommendation = 'Property shows some wear or minor issues. Further inspection recommended.';
    } else if (findings.overallCondition === 'poor') {
      recommendation = 'Property shows significant issues. Detailed inspection and cost assessment required.';
    } else {
      recommendation = 'Unable to fully assess property condition from available imagery.';
    }

    // Add critical issue warnings to recommendation
    const criticalIssues = findings.visibleIssues.filter(
      (issue) => issue.severity === 'critical' || issue.severity === 'high'
    );
    if (criticalIssues.length > 0) {
      recommendation += ` CAUTION: ${criticalIssues.length} high-severity issue(s) identified.`;
    }

    // Build final response
    const analysisResponse: PropertyImageryAnalysisResponse = {
      propertyId: request.propertyId,
      analysisType: request.analysisType,
      aiModel: 'gpt-4o',
      findings,
      conditionFlags,
      visibleIssues: findings.visibleIssues,
      recommendation,
      confidenceScore,
      analyzedAt: new Date().toISOString(),
    };

    return {
      ...response,
      data: analysisResponse,
    };
  }

  // ==========================================================================
  // Property Investability Screening (Visual Validation)
  // ==========================================================================

  /**
   * System prompt that instructs GPT-4o to act as a property investment
   * screener. Contains the full REJECT / CAUTION / APPROVED decision tree.
   */
  private static readonly INVESTABILITY_SYSTEM_PROMPT = `You are an expert property investment screener for a tax deed auction investor.

Your job is to analyze aerial, satellite, map, and street-level images of a property parcel and determine whether it is worth investing in.

Return your analysis as a JSON object with these exact fields:
{
  "status": "APPROVED" | "CAUTION" | "REJECTED",
  "confidence": <number 0-100>,
  "summary": "<1-2 sentence overview>",
  "positives": ["<positive finding>", ...],
  "concerns": ["<caution flag>", ...],
  "redFlags": ["<disqualifier>", ...],
  "recommendation": "<what the investor should do next>",
  "propertyType": "<your best guess at the property type>",
  "structurePresent": <boolean>,
  "roadAccess": <boolean>,
  "landUseObserved": "<observed land use category>"
}

DECISION RULES (apply strictly):

REJECT immediately if ANY of the following are true:
- Cemetery (headstones, grave markers, memorial park layout visible)
- Water body covering >30% of the parcel (lake, pond, river, reservoir)
- Utility property (power lines, substations, electrical towers on the parcel)
- Railroad property (tracks running on or through the parcel)
- Landlocked parcel (no visible road access or frontage whatsoever)
- Sliver lot (extremely narrow strip of land that is clearly unbuildable)
- Public infrastructure (roads, bridges, dams, government facilities)
- Landfill or waste disposal facility
Any single disqualifier -> status MUST be "REJECTED".
List each disqualifier in the "redFlags" array.

Flag as CAUTION if none of the above disqualifiers are present BUT any of these are true:
- Vacant lot under approximately 0.1 acres with no structure
- Industrial or heavy-commercial zone surroundings
- Flood-prone area indicators (near waterway, low terrain, retention pond adjacent)
- Steep terrain or hillside that may limit buildability
- Irregular or flag-shaped lot
- Mobile home or manufactured housing visible
- Heavy forest cover obscuring the ground (cannot confirm land use)
- No street-view imagery available (reduces confidence)
- Parcel is directly adjacent to active railroad tracks or major highway
- Signs of environmental contamination (discolored soil, barrels, industrial runoff)
If no disqualifiers but 2 or more caution flags -> status = "CAUTION".

APPROVE if:
- Residential structure is visible on the parcel
- Lot shape is regular (rectangular or square)
- Road frontage is clearly visible
- Surrounding area is a residential neighborhood
- Utilities (power lines to the structure, fire hydrant, etc.) appear present
If zero disqualifiers and fewer than 2 caution flags -> status = "APPROVED".

ADDITIONAL INSTRUCTIONS:
- Be conservative. When uncertain, lean toward CAUTION over APPROVED.
- Confidence should reflect how clearly the images support your decision.
- If only low-resolution or map-only images are provided, lower your confidence accordingly.
- Always provide at least one item in the "positives" array when the property is not REJECTED.
- Keep the "summary" to 1-2 concise sentences.
- "recommendation" should be a single actionable next step for the investor.
- Respond ONLY with the JSON object. No markdown, no commentary.`;

  /**
   * Analyze property images to determine investment suitability.
   *
   * Uses GPT-4o vision to screen aerial/satellite/street-level images against
   * a strict REJECT / CAUTION / APPROVED decision tree. This method is the
   * AI backbone of the Visual Validation pipeline stage.
   *
   * @param images - 1-4 images of the property from different sources
   * @param propertyContext - Optional metadata about the property
   * @returns Structured validation result and token usage count
   *
   * @example
   * ```ts
   * const { result, tokensUsed } = await openai.analyzePropertyInvestability(
   *   [
   *     { url: 'https://...satellite.png', type: 'satellite', detail: 'high' },
   *     { url: 'https://...street.png', type: 'street_view', detail: 'high' },
   *   ],
   *   { address: '456 Oak St, Altoona, PA 16602', parcelId: '01.01-04..-156.00-000' }
   * );
   * console.log(result.status); // "APPROVED" | "CAUTION" | "REJECTED"
   * ```
   */
  public async analyzePropertyInvestability(
    images: VisualValidationImage[],
    propertyContext?: VisualValidationPropertyContext
  ): Promise<{ result: VisualValidationResult; tokensUsed: number }> {
    // ---- Input validation ------------------------------------------------
    if (!images || images.length === 0) {
      throw new ValidationError(
        'At least one image is required for investability analysis',
        'images',
        'validation',
        'images',
        { required: 'true', minLength: '1' },
        images
      );
    }

    if (images.length > 4) {
      throw new ValidationError(
        'A maximum of 4 images are supported per analysis',
        'images',
        'validation',
        'images',
        { maxLength: '4' },
        images
      );
    }

    // ---- Build the user message content (text + images) ------------------
    let userText = 'Analyze the following property images for investment suitability.\n\n';

    // Append property context when available
    if (propertyContext) {
      userText += 'Property Context:\n';
      if (propertyContext.address) {
        userText += `- Address: ${propertyContext.address}\n`;
      }
      if (propertyContext.parcelId) {
        userText += `- Parcel ID: ${propertyContext.parcelId}\n`;
      }
      if (propertyContext.lotSize) {
        userText += `- Lot Size: ${propertyContext.lotSize}\n`;
      }
      if (propertyContext.propertyType) {
        userText += `- Property Type: ${propertyContext.propertyType}\n`;
      }
      if (propertyContext.zoning) {
        userText += `- Zoning: ${propertyContext.zoning}\n`;
      }
      userText += '\n';
    }

    // Describe each image to the model so it knows the perspective
    userText += `Images provided (${images.length}):\n`;
    images.forEach((img, i) => {
      userText += `  ${i + 1}. Type: ${img.type} | Detail: ${img.detail}\n`;
    });
    userText += '\nApply the REJECT / CAUTION / APPROVED rules and return your JSON assessment.';

    // Assemble multi-modal content array
    const visionContent: Array<TextContent | ImageUrlContent> = [
      { type: 'text', text: userText },
    ];

    for (const img of images) {
      visionContent.push({
        type: 'image_url',
        image_url: {
          url: img.url,
          detail: img.detail,
        },
      });
    }

    // ---- Call the OpenAI API with JSON response format -------------------
    // We bypass createChatCompletion() here because we need to set
    // response_format: { type: "json_object" } which is not exposed
    // through the generic chat completion options.
    const endpoint = '/chat/completions';

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: OpenAIService.INVESTABILITY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: visionContent,
        },
      ],
      temperature: 0.2,       // Deterministic for consistent screening decisions
      max_tokens: 800,
      response_format: { type: 'json_object' as const },
    };

    try {
      const response = await this.post<{
        id: string;
        model: string;
        choices: Array<{
          message: { content: string };
          finish_reason: string;
        }>;
        usage: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
      }>(endpoint, requestBody);

      const choice = response.data.choices[0];
      if (!choice) {
        throw new ApiError(
          'No completion generated for investability analysis',
          500,
          endpoint,
          response.requestId
        );
      }

      // ---- Parse the JSON response --------------------------------------
      let parsed: VisualValidationResult;
      try {
        parsed = JSON.parse(choice.message.content);
      } catch (parseError) {
        throw new ApiError(
          `Failed to parse investability JSON response: ${
            parseError instanceof Error ? parseError.message : 'Unknown error'
          }`,
          500,
          endpoint,
          response.requestId
        );
      }

      // ---- Validate and sanitize the parsed result -----------------------
      const result = this.sanitizeInvestabilityResult(parsed);

      const tokensUsed = response.data.usage.total_tokens;

      return { result, tokensUsed };
    } catch (error) {
      // Re-throw known API errors without wrapping
      if (error instanceof ApiError || error instanceof ValidationError) {
        throw error;
      }

      // Wrap unexpected errors
      throw new ApiError(
        `Investability analysis failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        500,
        endpoint,
        'unknown'
      );
    }
  }

  /**
   * Validates and normalizes a parsed VisualValidationResult, applying
   * safe defaults for any missing or malformed fields.
   *
   * @param raw - The raw parsed JSON from the model response
   * @returns A well-formed VisualValidationResult
   */
  private sanitizeInvestabilityResult(raw: Partial<VisualValidationResult>): VisualValidationResult {
    // Ensure status is one of the valid enum values
    const validStatuses: VisualValidationResult['status'][] = ['APPROVED', 'CAUTION', 'REJECTED'];
    const status = validStatuses.includes(raw.status as VisualValidationResult['status'])
      ? (raw.status as VisualValidationResult['status'])
      : 'CAUTION'; // Default to CAUTION when uncertain

    // Clamp confidence to 0-100
    const confidence = typeof raw.confidence === 'number'
      ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
      : 50;

    return {
      status,
      confidence,
      summary: typeof raw.summary === 'string' ? raw.summary : 'Unable to generate summary from imagery.',
      positives: Array.isArray(raw.positives) ? raw.positives.filter((s) => typeof s === 'string') : [],
      concerns: Array.isArray(raw.concerns) ? raw.concerns.filter((s) => typeof s === 'string') : [],
      redFlags: Array.isArray(raw.redFlags) ? raw.redFlags.filter((s) => typeof s === 'string') : [],
      recommendation: typeof raw.recommendation === 'string' ? raw.recommendation : 'Manual review recommended.',
      propertyType: typeof raw.propertyType === 'string' ? raw.propertyType : 'unknown',
      structurePresent: typeof raw.structurePresent === 'boolean' ? raw.structurePresent : false,
      roadAccess: typeof raw.roadAccess === 'boolean' ? raw.roadAccess : false,
      landUseObserved: typeof raw.landUseObserved === 'string' ? raw.landUseObserved : 'unknown',
    };
  }
}

/**
 * Singleton instance
 */
let openaiServiceInstance: OpenAIService | null = null;

export function getOpenAIService(config?: OpenAIServiceConfig): OpenAIService {
  if (!openaiServiceInstance) {
    openaiServiceInstance = new OpenAIService(config);
  }
  return openaiServiceInstance;
}

export function resetOpenAIService(): void {
  openaiServiceInstance = null;
}

export default OpenAIService;
