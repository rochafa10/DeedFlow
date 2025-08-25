import { supabase } from '@/lib/supabase';
import type { Property, PropertyInsert, PropertyUpdate, PropertyValuation, County } from '@/lib/database.types';

export class PropertyService {
  /**
   * Get all properties with optional filters
   */
  static async getProperties(filters?: {
    state?: string;
    county?: string;
    classification?: string;
    minPrice?: number;
    maxPrice?: number;
    minScore?: number;
    maxScore?: number;
  }) {
    try {
      let query = supabase
        .from('properties')
        .select(`
          *,
          counties!county_id (
            id,
            name,
            state_code
          ),
          property_valuations (
            market_value,
            arv_estimate,
            estimated_rent_min,
            estimated_rent_max
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.state && filters.state !== 'all') {
        query = query.eq('state', filters.state);
      }
      
      if (filters?.classification && filters.classification !== 'all') {
        query = query.eq('classification', filters.classification);
      }
      
      if (filters?.minPrice) {
        query = query.gte('amount_due', filters.minPrice);
      }
      
      if (filters?.maxPrice) {
        query = query.lte('amount_due', filters.maxPrice);
      }
      
      if (filters?.minScore) {
        query = query.gte('score', filters.minScore);
      }
      
      if (filters?.maxScore) {
        query = query.lte('score', filters.maxScore);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get a single property by ID
   */
  static async getPropertyById(id: string) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          counties!county_id (*),
          property_valuations (*),
          property_owners (*),
          property_liens (*),
          risk_assessments (*),
          neighborhood_analysis (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error fetching property:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Create a new property
   */
  static async createProperty(property: PropertyInsert) {
    try {
      // First, ensure county exists or create it
      let countyId = property.county_id;
      
      if (!countyId && property.state) {
        const countyName = property.city || 'Unknown';
        const { data: existingCounty } = await supabase
          .from('counties')
          .select('id')
          .eq('name', countyName)
          .eq('state_code', property.state)
          .single();

        if (existingCounty) {
          countyId = existingCounty.id;
        } else {
          // Create county if it doesn't exist
          const { data: newCounty } = await supabase
            .from('counties')
            .insert({
              name: countyName,
              state_code: property.state,
              is_active: true
            })
            .select('id')
            .single();
          
          if (newCounty) {
            countyId = newCounty.id;
          }
        }
      }

      const { data, error } = await supabase
        .from('properties')
        .insert({
          ...property,
          county_id: countyId
        })
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error creating property:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Update a property
   */
  static async updateProperty(id: string, updates: PropertyUpdate) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating property:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Delete a property
   */
  static async deleteProperty(id: string) {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Error deleting property:', error);
      return { error: error.message };
    }
  }

  /**
   * Enrich property with additional data
   */
  static async enrichProperty(propertyId: string, enrichmentData: any) {
    try {
      // Log the enrichment
      await supabase
        .from('enrichment_logs')
        .insert({
          property_id: propertyId,
          source: 'n8n',
          status: 'success',
          data_retrieved: enrichmentData,
          run_id: enrichmentData.run_id
        });

      // Update property with enriched data
      const updates: PropertyUpdate = {};
      
      if (enrichmentData.yearBuilt) updates.year_built = enrichmentData.yearBuilt;
      if (enrichmentData.livingArea) updates.living_area = enrichmentData.livingArea;
      if (enrichmentData.lotSize) updates.lot_size = enrichmentData.lotSize;
      if (enrichmentData.bedrooms) updates.bedrooms = enrichmentData.bedrooms;
      if (enrichmentData.bathrooms) updates.bathrooms = enrichmentData.bathrooms;
      if (enrichmentData.score !== undefined) updates.score = enrichmentData.score;
      if (enrichmentData.classification) updates.classification = enrichmentData.classification;

      // Update property
      await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId);

      // If valuation data exists, update or create valuation record
      if (enrichmentData.valuation) {
        const { data: existingValuation } = await supabase
          .from('property_valuations')
          .select('id')
          .eq('property_id', propertyId)
          .single();

        if (existingValuation) {
          await supabase
            .from('property_valuations')
            .update(enrichmentData.valuation)
            .eq('property_id', propertyId);
        } else {
          await supabase
            .from('property_valuations')
            .insert({
              property_id: propertyId,
              ...enrichmentData.valuation
            });
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error enriching property:', error);
      
      // Log the failure
      await supabase
        .from('enrichment_logs')
        .insert({
          property_id: propertyId,
          source: 'n8n',
          status: 'error',
          error_message: error.message
        });
      
      return { error: error.message };
    }
  }

  /**
   * Add property to user's saved list
   */
  static async saveProperty(propertyId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('user_saved_properties')
        .insert({
          user_id: userId,
          property_id: propertyId
        });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Error saving property:', error);
      return { error: error.message };
    }
  }

  /**
   * Remove property from user's saved list
   */
  static async unsaveProperty(propertyId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('user_saved_properties')
        .delete()
        .eq('property_id', propertyId)
        .eq('user_id', userId);

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Error unsaving property:', error);
      return { error: error.message };
    }
  }

  /**
   * Get user's saved properties
   */
  static async getSavedProperties(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_saved_properties')
        .select(`
          property_id,
          properties!property_id (
            *,
            counties!county_id (
              name,
              state_code
            )
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      
      // Extract just the properties
      const properties = data?.map(item => item.properties).filter(Boolean) || [];
      return { data: properties, error: null };
    } catch (error: any) {
      console.error('Error fetching saved properties:', error);
      return { data: null, error: error.message };
    }
  }
}