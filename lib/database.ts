import { supabase } from './supabase';
import type { Property, PropertyEnrichment, FinancialAnalysis } from './types';

export class DatabaseService {
  // Properties
  static async getProperties(filters?: {
    state?: string;
    county?: string;
    classification?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase
        .from('properties')
        .select(`
          *,
          counties(name, state_code),
          property_valuations(*),
          property_owners(*),
          property_legal(*)
        `);

      if (filters?.state && filters.state !== 'all') {
        query = query.eq('state', filters.state);
      }

      if (filters?.county && filters.county !== 'all') {
        query = query.eq('county_id', filters.county);
      }

      if (filters?.classification && filters.classification !== 'all') {
        query = query.eq('classification', filters.classification);
      }

      if (filters?.search) {
        query = query.or(`parcel_number.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return { data, count };
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  static async getPropertyById(id: string) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          counties(name, state_code),
          property_valuations(*),
          property_owners(*),
          property_legal(*),
          property_liens(*),
          inspection_reports(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }

  static async createProperty(propertyData: Partial<Property>) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  static async updateProperty(id: string, updates: Partial<Property>) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  }

  // Property Enrichment
  static async enrichProperty(propertyId: string, enrichmentData: PropertyEnrichment) {
    try {
      const { data, error } = await supabase
        .from('property_enrichments')
        .upsert([{
          property_id: propertyId,
          ...enrichmentData,
          enrichment_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error enriching property:', error);
      throw error;
    }
  }

  // Financial Analysis
  static async saveFinancialAnalysis(analysisData: FinancialAnalysis) {
    try {
      const { data, error } = await supabase
        .from('financial_analyses')
        .upsert([{
          ...analysisData,
          analysis_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving financial analysis:', error);
      throw error;
    }
  }

  // Auctions
  static async getAuctions(filters?: {
    state?: string;
    county?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    try {
      let query = supabase
        .from('auctions')
        .select(`
          *,
          counties(name, state_code),
          auction_properties(*)
        `);

      if (filters?.state) {
        query = query.eq('state', filters.state);
      }

      if (filters?.county) {
        query = query.eq('county_id', filters.county);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.startDate) {
        query = query.gte('auction_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('auction_date', filters.endDate);
      }

      const { data, error } = await query.order('auction_date', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching auctions:', error);
      throw error;
    }
  }

  // User Lists
  static async getUserLists(userId: string) {
    try {
      const { data, error } = await supabase
        .from('bidding_lists')
        .select(`
          *,
          bidding_properties(
            *,
            properties(*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user lists:', error);
      throw error;
    }
  }

  static async createBiddingList(listData: {
    auction_id: string;
    user_id: string;
    properties: Array<{
      property_id: string;
      max_bid: number;
      priority: number;
      notes?: string;
    }>;
  }) {
    try {
      const { data, error } = await supabase
        .from('bidding_lists')
        .insert([{
          auction_id: listData.auction_id,
          user_id: listData.user_id,
          total_max_bid: listData.properties.reduce((sum, p) => sum + p.max_bid, 0)
        }])
        .select()
        .single();

      if (error) throw error;

      // Insert bidding properties
      const biddingProperties = listData.properties.map(p => ({
        ...p,
        bidding_list_id: data.id
      }));

      const { error: propertiesError } = await supabase
        .from('bidding_properties')
        .insert(biddingProperties);

      if (propertiesError) throw propertiesError;

      return data;
    } catch (error) {
      console.error('Error creating bidding list:', error);
      throw error;
    }
  }

  // Search and Analytics
  static async searchProperties(searchTerm: string, filters?: any) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          counties(name, state_code),
          property_valuations(*)
        `)
        .or(`parcel_number.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
        .limit(50);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  static async getPropertyStats() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('classification, score, amount_due');

      if (error) throw error;

      // Calculate statistics
      const stats = {
        totalProperties: data.length,
        byClassification: {} as Record<string, number>,
        averageScore: 0,
        totalValue: 0,
        averageAmountDue: 0
      };

      let totalScore = 0;
      let totalAmountDue = 0;

      data.forEach(property => {
        // Classification counts
        if (property.classification) {
          stats.byClassification[property.classification] = 
            (stats.byClassification[property.classification] || 0) + 1;
        }

        // Score and amount calculations
        if (property.score) totalScore += property.score;
        if (property.amount_due) totalAmountDue += property.amount_due;
      });

      stats.averageScore = totalScore / data.length;
      stats.totalValue = totalAmountDue;
      stats.averageAmountDue = totalAmountDue / data.length;

      return stats;
    } catch (error) {
      console.error('Error fetching property stats:', error);
      throw error;
    }
  }
}
