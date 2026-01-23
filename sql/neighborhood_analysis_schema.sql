-- Neighborhood Analysis Tables - For Property Context & Access Analysis
-- Stores comprehensive neighborhood data, road access analysis, and landlocked detection

-- ============================================================================
-- TABLE: neighborhood_analysis
-- Stores neighborhood characteristics and access analysis for properties
-- ============================================================================
CREATE TABLE IF NOT EXISTS neighborhood_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Crime Statistics (from FBI Crime API)
  crime_statistics JSONB, -- {violent_crime_rate, property_crime_rate, safety_rating, data_year}
  crime_data_source TEXT, -- fbi_ucr, local_pd, estimated
  crime_last_updated TIMESTAMP,

  -- Demographics (from Census API)
  demographics JSONB, -- {population, median_income, poverty_rate, median_age, education_level}
  demographics_source TEXT, -- census_acs, census_decennial
  demographics_last_updated TIMESTAMP,

  -- Road Access & Landlocked Analysis (from OpenStreetMap)
  landlocked_status BOOLEAN DEFAULT false, -- true if no direct road access
  road_access_type TEXT, -- public_road, private_road, easement, none
  distance_to_public_road_ft NUMERIC(10,2), -- Distance in feet to nearest public road
  access_notes TEXT, -- Additional context about access
  access_analysis_date TIMESTAMP,

  -- School Ratings (from GreatSchools API or similar)
  school_ratings JSONB, -- {elementary: {name, rating, distance_mi}, middle: {...}, high: {...}}
  school_data_source TEXT, -- greatschools, niche, local_district
  school_last_updated TIMESTAMP,

  -- Amenities & Distance Analysis
  amenity_distances JSONB, -- {grocery_mi, hospital_mi, shopping_mi, park_mi, transit_mi}
  amenity_data_source TEXT, -- osm, google_places
  amenity_last_updated TIMESTAMP,

  -- Overall Scores
  neighborhood_score NUMERIC(4,2), -- 0.00 to 10.00 composite score
  safety_score NUMERIC(4,2), -- 0.00 to 10.00 based on crime data
  walkability_score NUMERIC(4,2), -- 0.00 to 10.00 based on amenities
  school_score NUMERIC(4,2), -- 0.00 to 10.00 average of school ratings
  access_score NUMERIC(4,2), -- 0.00 to 10.00 based on road access (0 if landlocked)

  -- Data Quality
  data_completeness NUMERIC(3,2), -- 0.00 to 1.00 (percentage of fields populated)
  analysis_confidence NUMERIC(3,2), -- 0.00 to 1.00 (confidence in analysis)

  -- Metadata
  analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_property_neighborhood UNIQUE (property_id)
);

-- Indexes for performance
CREATE INDEX idx_neighborhood_analysis_property ON neighborhood_analysis(property_id);
CREATE INDEX idx_neighborhood_landlocked ON neighborhood_analysis(landlocked_status);
CREATE INDEX idx_neighborhood_score ON neighborhood_analysis(neighborhood_score);
CREATE INDEX idx_neighborhood_access_type ON neighborhood_analysis(road_access_type);
CREATE INDEX idx_neighborhood_analyzed_at ON neighborhood_analysis(analyzed_at);

-- ============================================================================
-- HELPER FUNCTION: Get Properties Needing Neighborhood Analysis
-- ============================================================================
CREATE OR REPLACE FUNCTION get_properties_needing_neighborhood_analysis(
  p_county_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
) RETURNS TABLE (
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  city TEXT,
  state_code TEXT,
  county_name TEXT,
  latitude NUMERIC,
  longitude NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_id,
    p.property_address,
    p.city,
    p.state_code,
    c.county_name,
    p.latitude,
    p.longitude
  FROM properties p
  JOIN counties c ON c.id = p.county_id
  LEFT JOIN neighborhood_analysis na ON na.property_id = p.id
  WHERE
    (p_county_id IS NULL OR p.county_id = p_county_id)
    AND na.id IS NULL -- Not yet analyzed
    AND p.latitude IS NOT NULL -- Need coordinates for analysis
    AND p.longitude IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: UPSERT Neighborhood Analysis
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_neighborhood_analysis(
  p_property_id UUID,
  p_crime_statistics JSONB DEFAULT NULL,
  p_crime_data_source TEXT DEFAULT NULL,
  p_demographics JSONB DEFAULT NULL,
  p_demographics_source TEXT DEFAULT NULL,
  p_landlocked_status BOOLEAN DEFAULT false,
  p_road_access_type TEXT DEFAULT NULL,
  p_distance_to_public_road_ft NUMERIC DEFAULT NULL,
  p_access_notes TEXT DEFAULT NULL,
  p_school_ratings JSONB DEFAULT NULL,
  p_school_data_source TEXT DEFAULT NULL,
  p_amenity_distances JSONB DEFAULT NULL,
  p_amenity_data_source TEXT DEFAULT NULL,
  p_neighborhood_score NUMERIC DEFAULT NULL,
  p_safety_score NUMERIC DEFAULT NULL,
  p_walkability_score NUMERIC DEFAULT NULL,
  p_school_score NUMERIC DEFAULT NULL,
  p_access_score NUMERIC DEFAULT NULL,
  p_data_completeness NUMERIC DEFAULT NULL,
  p_analysis_confidence NUMERIC DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_analysis_id UUID;
BEGIN
  INSERT INTO neighborhood_analysis (
    property_id,
    crime_statistics,
    crime_data_source,
    crime_last_updated,
    demographics,
    demographics_source,
    demographics_last_updated,
    landlocked_status,
    road_access_type,
    distance_to_public_road_ft,
    access_notes,
    access_analysis_date,
    school_ratings,
    school_data_source,
    school_last_updated,
    amenity_distances,
    amenity_data_source,
    amenity_last_updated,
    neighborhood_score,
    safety_score,
    walkability_score,
    school_score,
    access_score,
    data_completeness,
    analysis_confidence,
    analyzed_at,
    updated_at
  ) VALUES (
    p_property_id,
    p_crime_statistics,
    p_crime_data_source,
    CASE WHEN p_crime_statistics IS NOT NULL THEN NOW() ELSE NULL END,
    p_demographics,
    p_demographics_source,
    CASE WHEN p_demographics IS NOT NULL THEN NOW() ELSE NULL END,
    p_landlocked_status,
    p_road_access_type,
    p_distance_to_public_road_ft,
    p_access_notes,
    CASE WHEN p_road_access_type IS NOT NULL THEN NOW() ELSE NULL END,
    p_school_ratings,
    p_school_data_source,
    CASE WHEN p_school_ratings IS NOT NULL THEN NOW() ELSE NULL END,
    p_amenity_distances,
    p_amenity_data_source,
    CASE WHEN p_amenity_distances IS NOT NULL THEN NOW() ELSE NULL END,
    p_neighborhood_score,
    p_safety_score,
    p_walkability_score,
    p_school_score,
    p_access_score,
    p_data_completeness,
    p_analysis_confidence,
    NOW(),
    NOW()
  )
  ON CONFLICT (property_id)
  DO UPDATE SET
    crime_statistics = COALESCE(EXCLUDED.crime_statistics, neighborhood_analysis.crime_statistics),
    crime_data_source = COALESCE(EXCLUDED.crime_data_source, neighborhood_analysis.crime_data_source),
    crime_last_updated = CASE WHEN EXCLUDED.crime_statistics IS NOT NULL THEN NOW() ELSE neighborhood_analysis.crime_last_updated END,
    demographics = COALESCE(EXCLUDED.demographics, neighborhood_analysis.demographics),
    demographics_source = COALESCE(EXCLUDED.demographics_source, neighborhood_analysis.demographics_source),
    demographics_last_updated = CASE WHEN EXCLUDED.demographics IS NOT NULL THEN NOW() ELSE neighborhood_analysis.demographics_last_updated END,
    landlocked_status = COALESCE(EXCLUDED.landlocked_status, neighborhood_analysis.landlocked_status),
    road_access_type = COALESCE(EXCLUDED.road_access_type, neighborhood_analysis.road_access_type),
    distance_to_public_road_ft = COALESCE(EXCLUDED.distance_to_public_road_ft, neighborhood_analysis.distance_to_public_road_ft),
    access_notes = COALESCE(EXCLUDED.access_notes, neighborhood_analysis.access_notes),
    access_analysis_date = CASE WHEN EXCLUDED.road_access_type IS NOT NULL THEN NOW() ELSE neighborhood_analysis.access_analysis_date END,
    school_ratings = COALESCE(EXCLUDED.school_ratings, neighborhood_analysis.school_ratings),
    school_data_source = COALESCE(EXCLUDED.school_data_source, neighborhood_analysis.school_data_source),
    school_last_updated = CASE WHEN EXCLUDED.school_ratings IS NOT NULL THEN NOW() ELSE neighborhood_analysis.school_last_updated END,
    amenity_distances = COALESCE(EXCLUDED.amenity_distances, neighborhood_analysis.amenity_distances),
    amenity_data_source = COALESCE(EXCLUDED.amenity_data_source, neighborhood_analysis.amenity_data_source),
    amenity_last_updated = CASE WHEN EXCLUDED.amenity_distances IS NOT NULL THEN NOW() ELSE neighborhood_analysis.amenity_last_updated END,
    neighborhood_score = COALESCE(EXCLUDED.neighborhood_score, neighborhood_analysis.neighborhood_score),
    safety_score = COALESCE(EXCLUDED.safety_score, neighborhood_analysis.safety_score),
    walkability_score = COALESCE(EXCLUDED.walkability_score, neighborhood_analysis.walkability_score),
    school_score = COALESCE(EXCLUDED.school_score, neighborhood_analysis.school_score),
    access_score = COALESCE(EXCLUDED.access_score, neighborhood_analysis.access_score),
    data_completeness = COALESCE(EXCLUDED.data_completeness, neighborhood_analysis.data_completeness),
    analysis_confidence = COALESCE(EXCLUDED.analysis_confidence, neighborhood_analysis.analysis_confidence),
    analyzed_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_analysis_id;

  RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Landlocked Properties
-- ============================================================================
CREATE OR REPLACE FUNCTION get_landlocked_properties(
  p_county_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  city TEXT,
  state_code TEXT,
  county_name TEXT,
  road_access_type TEXT,
  distance_to_public_road_ft NUMERIC,
  access_notes TEXT,
  total_due NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_id,
    p.property_address,
    p.city,
    p.state_code,
    c.county_name,
    na.road_access_type,
    na.distance_to_public_road_ft,
    na.access_notes,
    p.total_due
  FROM properties p
  JOIN counties c ON c.id = p.county_id
  JOIN neighborhood_analysis na ON na.property_id = p.id
  WHERE
    (p_county_id IS NULL OR p.county_id = p_county_id)
    AND na.landlocked_status = true
  ORDER BY p.total_due DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Get Properties With Poor Neighborhood Scores
-- ============================================================================
CREATE OR REPLACE FUNCTION get_properties_poor_neighborhood(
  p_county_id UUID DEFAULT NULL,
  p_max_score NUMERIC DEFAULT 5.0,
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  property_id UUID,
  parcel_id TEXT,
  property_address TEXT,
  city TEXT,
  state_code TEXT,
  county_name TEXT,
  neighborhood_score NUMERIC,
  safety_score NUMERIC,
  school_score NUMERIC,
  landlocked_status BOOLEAN,
  total_due NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.parcel_id,
    p.property_address,
    p.city,
    p.state_code,
    c.county_name,
    na.neighborhood_score,
    na.safety_score,
    na.school_score,
    na.landlocked_status,
    p.total_due
  FROM properties p
  JOIN counties c ON c.id = p.county_id
  JOIN neighborhood_analysis na ON na.property_id = p.id
  WHERE
    (p_county_id IS NULL OR p.county_id = p_county_id)
    AND na.neighborhood_score IS NOT NULL
    AND na.neighborhood_score <= p_max_score
  ORDER BY na.neighborhood_score ASC, p.total_due DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEW: Complete Property with Neighborhood Data
-- Joins properties with neighborhood analysis for easy querying
-- ============================================================================
CREATE OR REPLACE VIEW vw_properties_with_neighborhood AS
SELECT
  p.id AS property_id,
  p.parcel_id,
  p.property_address,
  p.city,
  p.state_code,
  p.zip_code,
  c.county_name,
  c.state_code AS county_state,
  p.property_type,
  p.total_due,
  p.assessed_value,
  p.sale_date,
  p.latitude,
  p.longitude,

  -- Neighborhood Analysis
  na.landlocked_status,
  na.road_access_type,
  na.distance_to_public_road_ft,
  na.access_notes,
  na.crime_statistics,
  na.demographics,
  na.school_ratings,
  na.amenity_distances,
  na.neighborhood_score,
  na.safety_score,
  na.walkability_score,
  na.school_score,
  na.access_score,
  na.data_completeness,
  na.analysis_confidence,
  na.analyzed_at,

  -- Additional context
  CASE
    WHEN na.landlocked_status = true THEN 'LANDLOCKED - High Risk'
    WHEN na.road_access_type = 'private_road' THEN 'Private Road Access - Caution'
    WHEN na.road_access_type = 'easement' THEN 'Easement Access - Verify Rights'
    WHEN na.neighborhood_score IS NOT NULL AND na.neighborhood_score < 5.0 THEN 'Poor Neighborhood - Review'
    ELSE 'OK'
  END AS access_warning,

  CASE
    WHEN na.id IS NULL THEN 'Not Analyzed'
    WHEN na.data_completeness < 0.5 THEN 'Partial Data'
    WHEN na.data_completeness >= 0.8 THEN 'Complete'
    ELSE 'Moderate Data'
  END AS data_status

FROM properties p
JOIN counties c ON c.id = p.county_id
LEFT JOIN neighborhood_analysis na ON na.property_id = p.id;

-- ============================================================================
-- VIEW: Neighborhood Analysis Summary
-- Summary statistics for neighborhood analysis coverage
-- ============================================================================
CREATE OR REPLACE VIEW vw_neighborhood_analysis_summary AS
SELECT
  c.county_name,
  c.state_code,
  COUNT(DISTINCT p.id) AS total_properties,
  COUNT(DISTINCT na.id) AS analyzed_properties,
  COUNT(DISTINCT CASE WHEN na.landlocked_status = true THEN na.id END) AS landlocked_count,
  COUNT(DISTINCT CASE WHEN na.neighborhood_score < 5.0 THEN na.id END) AS poor_neighborhood_count,
  AVG(na.neighborhood_score) AS avg_neighborhood_score,
  AVG(na.safety_score) AS avg_safety_score,
  AVG(na.school_score) AS avg_school_score,
  AVG(na.data_completeness) AS avg_data_completeness
FROM counties c
LEFT JOIN properties p ON p.county_id = c.id
LEFT JOIN neighborhood_analysis na ON na.property_id = p.id
GROUP BY c.county_name, c.state_code
ORDER BY analyzed_properties DESC;
