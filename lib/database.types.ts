// Database types generated from Supabase schema

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          parcel_number: string;
          alternate_key: string | null;
          county_id: string | null;
          address: string;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          latitude: number | null;
          longitude: number | null;
          property_type: PropertyType | null;
          year_built: number | null;
          living_area: number | null;
          lot_size: number | null;
          acres: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          garage_spaces: number | null;
          pool: boolean;
          stories: number | null;
          roof_type: string | null;
          roof_age: number | null;
          hvac_type: string | null;
          hvac_age: number | null;
          classification: PropertyClassification | null;
          score: number | null;
          certificate_number: string | null;
          amount_due: number | null;
          minimum_bid: number | null;
          deposit_amount: number | null;
          estimated_taxes: number | null;
          additional_fees: number | null;
          sale_date: string | null;
          redemption_deadline: string | null;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'last_updated'> & {
          id?: string;
          created_at?: string;
          last_updated?: string;
        };
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      property_valuations: {
        Row: {
          id: string;
          property_id: string;
          assessed_value: number | null;
          market_value: number | null;
          land_value: number | null;
          building_value: number | null;
          last_sale_price: number | null;
          last_sale_date: string | null;
          estimated_rent_min: number | null;
          estimated_rent_max: number | null;
          median_area_rent: number | null;
          cap_rate: number | null;
          gross_yield: number | null;
          cash_on_cash: number | null;
          arv_estimate: number | null;
          rehab_estimate: number | null;
          holding_costs: number | null;
          profit_potential: number | null;
          valuation_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['property_valuations']['Row'], 'id' | 'created_at' | 'updated_at' | 'valuation_date'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          valuation_date?: string;
        };
        Update: Partial<Database['public']['Tables']['property_valuations']['Insert']>;
      };
      counties: {
        Row: {
          id: string;
          state_id: string | null;
          name: string;
          state_code: string;
          tax_collector_url: string | null;
          auction_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['counties']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['counties']['Insert']>;
      };
      states: {
        Row: {
          id: string;
          code: string;
          name: string;
          auction_type: AuctionType;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['states']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['states']['Insert']>;
      };
      auctions: {
        Row: {
          id: string;
          county_id: string | null;
          auction_date: string;
          auction_time: string | null;
          auction_type: AuctionType;
          location: string | null;
          is_online: boolean;
          registration_deadline: string | null;
          deposit_required: number | null;
          minimum_bid_increment: number | null;
          total_properties: number | null;
          status: string;
          auction_url: string | null;
          rules_url: string | null;
          property_list_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['auctions']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['auctions']['Insert']>;
      };
      property_owners: {
        Row: {
          id: string;
          property_id: string;
          owner_name: string | null;
          owner_address: string | null;
          owner_city: string | null;
          owner_state: string | null;
          owner_zip: string | null;
          owner_occupied: boolean;
          occupancy_status: OccupancyStatus | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['property_owners']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['property_owners']['Insert']>;
      };
      enrichment_logs: {
        Row: {
          id: string;
          property_id: string;
          source: string;
          status: string;
          data_retrieved: any | null;
          error_message: string | null;
          run_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['enrichment_logs']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['enrichment_logs']['Insert']>;
      };
    };
    Enums: {
      property_classification: 'A' | 'B' | 'C' | 'D' | 'F';
      auction_type: 'Tax Deed' | 'Tax Lien';
      property_type: 'Single Family Residential' | 'Multi Family Residential' | 'Condominium' | 
                     'Townhouse' | 'Vacant Land' | 'Commercial' | 'Industrial' | 'Agricultural' | 'Mixed Use';
      occupancy_status: 'Vacant' | 'Owner Occupied' | 'Tenant Occupied' | 'Unknown';
      inspection_status: 'good' | 'fair' | 'poor' | 'not_applicable';
      lien_type: 'Property Tax' | 'Water/Sewer' | 'Code Violation' | 'HOA' | 'Mortgage' | 'IRS' | 'Other';
      risk_level: 'Low' | 'Medium' | 'High';
    };
  };
};

// Type exports for easier use
export type PropertyClassification = Database['public']['Enums']['property_classification'];
export type AuctionType = Database['public']['Enums']['auction_type'];
export type PropertyType = Database['public']['Enums']['property_type'];
export type OccupancyStatus = Database['public']['Enums']['occupancy_status'];
export type InspectionStatus = Database['public']['Enums']['inspection_status'];
export type LienType = Database['public']['Enums']['lien_type'];
export type RiskLevel = Database['public']['Enums']['risk_level'];

// Table Row Types
export type Property = Database['public']['Tables']['properties']['Row'];
export type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
export type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export type PropertyValuation = Database['public']['Tables']['property_valuations']['Row'];
export type County = Database['public']['Tables']['counties']['Row'];
export type State = Database['public']['Tables']['states']['Row'];
export type Auction = Database['public']['Tables']['auctions']['Row'];
export type PropertyOwner = Database['public']['Tables']['property_owners']['Row'];
export type EnrichmentLog = Database['public']['Tables']['enrichment_logs']['Row'];