-- County Tax Auction Database Schema
-- This schema stores comprehensive tax auction information for counties across the US

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Table 1: Counties (Master list of counties we've researched)
CREATE TABLE IF NOT EXISTS counties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_name TEXT NOT NULL,
    state_code TEXT NOT NULL CHECK (length(state_code) = 2),
    state_name TEXT,
    auction_system TEXT, -- e.g., "PA Upset->Judicial->Repository", "FL Tax Lien"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_researched_at TIMESTAMPTZ,
    
    -- Unique constraint: one record per county/state combo
    UNIQUE(county_name, state_code)
);

-- Table 2: Official Links (Government websites and contact info)
CREATE TABLE IF NOT EXISTS official_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
    link_type TEXT NOT NULL, -- 'main_website', 'tax_sale_page', 'registration', 'contact', etc.
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Upcoming Sales (Scheduled auction dates)
CREATE TABLE IF NOT EXISTS upcoming_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
    sale_type TEXT NOT NULL, -- 'Upset', 'Judicial', 'Repository', 'Lien', 'Deed', etc.
    sale_date TIMESTAMPTZ,
    registration_deadline TIMESTAMPTZ,
    location TEXT, -- Physical location or 'Online'
    platform TEXT, -- 'Bid4Assets', 'RealAuction', 'In-Person', etc.
    deposit_required NUMERIC,
    deposit_currency TEXT DEFAULT 'USD',
    property_count INTEGER,
    notice_url TEXT, -- Link to official notice PDF
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: Documents (PDFs, property lists, forms, etc.)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES upcoming_sales(id) ON DELETE SET NULL, -- Optional link to specific sale
    document_type TEXT NOT NULL, -- 'property_list', 'legal_notice', 'registration_form', 'results', 'terms', etc.
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    file_format TEXT, -- 'pdf', 'xlsx', 'csv', 'html'
    file_size_kb INTEGER,
    publication_date DATE,
    year INTEGER, -- Year this document applies to
    property_count INTEGER, -- If it's a property list
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 5: Vendor Portals (Bid4Assets, RealAuction, etc.)
CREATE TABLE IF NOT EXISTS vendor_portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
    vendor_name TEXT NOT NULL, -- 'Bid4Assets', 'RealAuction', 'Grant Street Group', etc.
    main_portal_url TEXT,
    county_specific_url TEXT,
    registration_url TEXT,
    property_search_url TEXT,
    is_primary BOOLEAN DEFAULT false, -- Is this the primary vendor for this county?
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 6: Additional Resources (Assessment, GIS, Recorder, etc.)
CREATE TABLE IF NOT EXISTS additional_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- 'assessment', 'gis', 'recorder_deeds', 'treasurer', etc.
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 7: Important Notes (Key information, requirements, deadlines)
CREATE TABLE IF NOT EXISTS important_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
    note_type TEXT, -- 'requirement', 'warning', 'tip', 'deadline', 'general'
    note_text TEXT NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher number = more important
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 8: Research Log (Track when we researched each county)
CREATE TABLE IF NOT EXISTS research_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
    research_date TIMESTAMPTZ DEFAULT NOW(),
    researcher TEXT, -- 'claude', 'manual', 'automation'
    sources_checked TEXT[], -- Array of URLs checked
    data_quality_score INTEGER, -- 1-10 rating
    notes TEXT
);

-- Table 9: Property Notes (User-specific notes and annotations on properties)
CREATE TABLE IF NOT EXISTS property_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'concern', 'opportunity', 'action'
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure note_type is one of the allowed values
    CONSTRAINT check_note_type CHECK (note_type IN ('general', 'concern', 'opportunity', 'action'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_counties_state ON counties(state_code);
CREATE INDEX idx_counties_name ON counties(county_name);
CREATE INDEX idx_upcoming_sales_date ON upcoming_sales(sale_date);
CREATE INDEX idx_upcoming_sales_status ON upcoming_sales(status);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_year ON documents(year);
CREATE INDEX idx_vendor_portals_vendor ON vendor_portals(vendor_name);
CREATE INDEX idx_property_notes_property ON property_notes(property_id);
CREATE INDEX idx_property_notes_user ON property_notes(user_id);
CREATE INDEX idx_property_notes_type ON property_notes(note_type);

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- View: Complete county information with all related data
CREATE OR REPLACE VIEW vw_county_complete AS
SELECT 
    c.id,
    c.county_name,
    c.state_code,
    c.state_name,
    c.auction_system,
    c.last_researched_at,
    
    -- Count of upcoming sales
    (SELECT COUNT(*) FROM upcoming_sales WHERE county_id = c.id AND status = 'scheduled') as upcoming_sales_count,
    
    -- Count of documents
    (SELECT COUNT(*) FROM documents WHERE county_id = c.id) as documents_count,
    
    -- Primary vendor
    (SELECT vendor_name FROM vendor_portals WHERE county_id = c.id AND is_primary = true LIMIT 1) as primary_vendor,
    
    -- Next sale date
    (SELECT MIN(sale_date) FROM upcoming_sales WHERE county_id = c.id AND status = 'scheduled' AND sale_date > NOW()) as next_sale_date
    
FROM counties c;

-- View: Latest property lists
CREATE OR REPLACE VIEW vw_latest_property_lists AS
SELECT 
    c.county_name,
    c.state_code,
    d.title,
    d.url,
    d.file_format,
    d.publication_date,
    d.year,
    d.property_count
FROM documents d
JOIN counties c ON d.county_id = c.id
WHERE d.document_type = 'property_list'
ORDER BY d.year DESC, d.publication_date DESC;

-- View: Upcoming sales calendar
CREATE OR REPLACE VIEW vw_sales_calendar AS
SELECT 
    c.county_name,
    c.state_code,
    us.sale_type,
    us.sale_date,
    us.registration_deadline,
    us.platform,
    us.property_count,
    us.notice_url
FROM upcoming_sales us
JOIN counties c ON us.county_id = c.id
WHERE us.status = 'scheduled' 
  AND us.sale_date >= NOW()
ORDER BY us.sale_date;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - OPTIONAL BUT RECOMMENDED
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE important_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all tables
CREATE POLICY "Allow public read access" ON counties FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON official_links FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON upcoming_sales FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON documents FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON vendor_portals FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON additional_resources FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON important_notes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON research_log FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert/update
-- (You'll need to modify this based on your auth setup)
CREATE POLICY "Allow authenticated insert" ON counties FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON counties FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- RLS POLICIES FOR PROPERTY NOTES (User-Specific Access)
-- ============================================================================

-- Policy: Users can only view their own notes
CREATE POLICY "Users can view own notes" ON property_notes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own notes
CREATE POLICY "Users can insert own notes" ON property_notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own notes" ON property_notes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own notes" ON property_notes
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get or create county
CREATE OR REPLACE FUNCTION get_or_create_county(
    p_county_name TEXT,
    p_state_code TEXT
) RETURNS UUID AS $$
DECLARE
    v_county_id UUID;
BEGIN
    -- Try to find existing county
    SELECT id INTO v_county_id
    FROM counties
    WHERE county_name = p_county_name 
      AND state_code = p_state_code;
    
    -- If not found, create it
    IF v_county_id IS NULL THEN
        INSERT INTO counties (county_name, state_code)
        VALUES (p_county_name, p_state_code)
        RETURNING id INTO v_county_id;
    END IF;
    
    RETURN v_county_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update county last_researched timestamp
CREATE OR REPLACE FUNCTION update_county_research_timestamp(p_county_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE counties
    SET last_researched_at = NOW(),
        updated_at = NOW()
    WHERE id = p_county_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Query 1: Find all counties in Pennsylvania
-- SELECT * FROM counties WHERE state_code = 'PA';

-- Query 2: Get all upcoming sales in the next 30 days
-- SELECT * FROM vw_sales_calendar WHERE sale_date <= NOW() + INTERVAL '30 days';

-- Query 3: Find all property lists for Blair County, PA
-- SELECT * FROM vw_latest_property_lists WHERE county_name = 'Blair' AND state_code = 'PA';

-- Query 4: Get complete information for a county
-- SELECT * FROM vw_county_complete WHERE county_name = 'Blair' AND state_code = 'PA';

-- Query 5: Find all counties that use Bid4Assets
-- SELECT DISTINCT c.* FROM counties c
-- JOIN vendor_portals vp ON c.id = vp.county_id
-- WHERE vp.vendor_name = 'Bid4Assets';
