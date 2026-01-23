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
