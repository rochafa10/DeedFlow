// Type definitions for Tax Deed Platform

export interface Property {
  id: string;
  parcelNumber: string;
  address: string;
  county: string;
  state: string;
  amountDue: number;
  squareFeet?: number;
  acres?: number;
  classification?: 'A' | 'B' | 'C';
  score?: number;
  updatedAt?: string;
  enrichmentData?: PropertyEnrichment;
  financialAnalysis?: FinancialAnalysis;
}

export interface PropertyEnrichment {
  propertyId: string;
  gisData: {
    parcelGeometry?: string;
    landUse?: string;
    zoning?: string;
    acres?: number;
    yearBuilt?: number;
  };
  imagery: {
    thumbnail?: string;
    fullSize?: string;
  };
  floodData: {
    floodZone: string;
    percentInFlood: number;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  slopeAnalysis: {
    medianSlope: number;
    percentAbove15: number;
    buildable?: boolean;
  };
  buildingFootprints: {
    count: number;
    totalArea: number;
  };
  roadAccess: {
    touchesRoad: boolean;
    nearestRoadFt: number;
  };
  utilities?: {
    electric: boolean;
    water: boolean;
    sewer: boolean;
    gas: boolean;
  };
  score: number;
  flags: string[];
  classification: 'A' | 'B' | 'C';
  enrichmentDate?: string;
}

export interface FinancialAnalysis {
  propertyId: string;
  exitStrategy: 'flip' | 'brrrr' | 'wholesale' | 'rental';
  marketValue: number;
  repairCosts: number;
  arv: number;
  minBid: number;
  maxBid: number;
  profit: number;
  roi: number;
  totalCosts: number;
  dealQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  recommendation: 'PROCEED' | 'PASS';
  financialMetrics: Record<string, any>;
  sensitivity?: {
    arvPlus10: number;
    arvMinus10: number;
    repairsPlus20: number;
  };
  analysisDate?: string;
}

export interface Auction {
  id: string;
  county: string;
  state: string;
  auctionDate: string;
  registrationDate: string;
  depositAmount: number;
  totalProperties: number;
  status: 'upcoming' | 'active' | 'completed';
  documents?: AuctionDocument[];
  rules?: string;
}

export interface AuctionDocument {
  name: string;
  url: string;
  type: 'rules' | 'registration' | 'property_list' | 'other';
}

export interface WebhookResponse<T = any> {
  status: 'ok' | 'error';
  data?: T;
  error?: string;
  run_id?: string;
  processingTime?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'investor' | 'viewer';
  createdAt: string;
}

export interface BiddingList {
  id: string;
  auctionId: string;
  userId: string;
  properties: BiddingProperty[];
  totalMaxBid: number;
  createdAt: string;
  updatedAt: string;
}

export interface BiddingProperty {
  propertyId: string;
  maxBid: number;
  priority: number;
  notes?: string;
}