-- Migration: Add Business Data Fields to Counties Table
-- Description: Enriches counties table with business and economic data from Census Bureau
-- Date: December 2024

-- Add business data columns to counties table
ALTER TABLE counties 
ADD COLUMN IF NOT EXISTS business_establishments INTEGER,
ADD COLUMN IF NOT EXISTS business_employees INTEGER,
ADD COLUMN IF NOT EXISTS business_payroll BIGINT,
ADD COLUMN IF NOT EXISTS top_industries JSONB,
ADD COLUMN IF NOT EXISTS economic_health_score INTEGER CHECK (economic_health_score >= 0 AND economic_health_score <= 100),
ADD COLUMN IF NOT EXISTS business_data_updated_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_counties_business_establishments ON counties(business_establishments);
CREATE INDEX IF NOT EXISTS idx_counties_business_employees ON counties(business_employees);
CREATE INDEX IF NOT EXISTS idx_counties_economic_health_score ON counties(economic_health_score);
CREATE INDEX IF NOT EXISTS idx_counties_business_data_updated_at ON counties(business_data_updated_at);

-- Add comments for documentation
COMMENT ON COLUMN counties.business_establishments IS 'Total number of business establishments in the county';
COMMENT ON COLUMN counties.business_employees IS 'Total number of employees across all businesses in the county';
COMMENT ON COLUMN counties.business_payroll IS 'Total annual payroll for all businesses in the county (in dollars)';
COMMENT ON COLUMN counties.top_industries IS 'JSON array of top 5 industries by employment in the county';
COMMENT ON COLUMN counties.economic_health_score IS 'Calculated economic health score (0-100) based on business diversity, employment, and payroll';
COMMENT ON COLUMN counties.business_data_updated_at IS 'Timestamp when business data was last updated from Census Bureau';

-- Create a view for counties with business data
CREATE OR REPLACE VIEW counties_with_business_data AS
SELECT 
    c.*,
    s.name as state_name,
    s.auction_type,
    CASE 
        WHEN c.economic_health_score >= 80 THEN 'Excellent'
        WHEN c.economic_health_score >= 60 THEN 'Good'
        WHEN c.economic_health_score >= 40 THEN 'Fair'
        WHEN c.economic_health_score >= 20 THEN 'Poor'
        ELSE 'Unknown'
    END as economic_health_rating,
    CASE 
        WHEN c.business_establishments > 1000 THEN 'Major Business Hub'
        WHEN c.business_establishments > 500 THEN 'Business Hub'
        WHEN c.business_establishments > 100 THEN 'Moderate Business Activity'
        WHEN c.business_establishments > 50 THEN 'Limited Business Activity'
        ELSE 'Minimal Business Activity'
    END as business_activity_level,
    ROUND(
        CASE 
            WHEN c.business_employees > 0 AND c.business_payroll > 0 
            THEN c.business_payroll::DECIMAL / c.business_employees 
            ELSE 0 
        END, 2
    ) as average_annual_salary
FROM counties c
JOIN states s ON c.state_id = s.id;

-- Create a function to calculate economic health score
CREATE OR REPLACE FUNCTION calculate_economic_health_score(
    p_establishments INTEGER,
    p_employees INTEGER,
    p_payroll BIGINT,
    p_industry_count INTEGER
) RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 50; -- Base score
    employment_density DECIMAL;
    avg_salary DECIMAL;
BEGIN
    -- Factor in business diversity (industry count)
    IF p_industry_count > 10 THEN
        score := score + 20;
    ELSIF p_industry_count > 5 THEN
        score := score + 10;
    ELSIF p_industry_count > 2 THEN
        score := score + 5;
    END IF;
    
    -- Factor in employment density (per 1000 residents - assuming county population)
    IF p_employees > 0 THEN
        employment_density := p_employees::DECIMAL / 1000;
        IF employment_density > 50 THEN
            score := score + 15;
        ELSIF employment_density > 25 THEN
            score := score + 10;
        ELSIF employment_density > 10 THEN
            score := score + 5;
        END IF;
    END IF;
    
    -- Factor in average salary (economic prosperity)
    IF p_employees > 0 AND p_payroll > 0 THEN
        avg_salary := p_payroll::DECIMAL / p_employees;
        IF avg_salary > 50000 THEN
            score := score + 15;
        ELSIF avg_salary > 35000 THEN
            score := score + 10;
        ELSIF avg_salary > 25000 THEN
            score := score + 5;
        END IF;
    END IF;
    
    -- Cap at 100
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Create a function to update business data for a county
CREATE OR REPLACE FUNCTION update_county_business_data(
    p_county_id UUID,
    p_establishments INTEGER,
    p_employees INTEGER,
    p_payroll BIGINT,
    p_top_industries JSONB
) RETURNS VOID AS $$
DECLARE
    v_industry_count INTEGER;
    v_economic_score INTEGER;
BEGIN
    -- Count industries from top_industries JSON
    v_industry_count := jsonb_array_length(p_top_industries);
    
    -- Calculate economic health score
    v_economic_score := calculate_economic_health_score(
        p_establishments, 
        p_employees, 
        p_payroll, 
        v_industry_count
    );
    
    -- Update the county record
    UPDATE counties 
    SET 
        business_establishments = p_establishments,
        business_employees = p_employees,
        business_payroll = p_payroll,
        top_industries = p_top_industries,
        economic_health_score = v_economic_score,
        business_data_updated_at = NOW()
    WHERE id = p_county_id;
    
    -- Raise notice for logging
    RAISE NOTICE 'Updated county % with business data: establishments=%, employees=%, score=%', 
        p_county_id, p_establishments, p_employees, v_economic_score;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get counties needing business data updates
CREATE OR REPLACE FUNCTION get_counties_needing_business_update(
    p_days_threshold INTEGER DEFAULT 30
) RETURNS TABLE(
    id UUID,
    name VARCHAR(100),
    state_code VARCHAR(2),
    business_data_updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.state_code,
        c.business_data_updated_at
    FROM counties c
    WHERE c.business_data_updated_at IS NULL 
       OR c.business_data_updated_at < NOW() - INTERVAL '1 day' * p_days_threshold
    ORDER BY c.business_data_updated_at NULLS FIRST, c.name;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get business data summary for a state
CREATE OR REPLACE FUNCTION get_state_business_summary(
    p_state_code VARCHAR(2)
) RETURNS TABLE(
    county_name VARCHAR(100),
    establishments INTEGER,
    employees INTEGER,
    payroll BIGINT,
    economic_score INTEGER,
    top_industry VARCHAR(200),
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name,
        c.business_establishments,
        c.business_employees,
        c.business_payroll,
        c.economic_health_score,
        (c.top_industries->0->>'name')::VARCHAR(200) as top_industry,
        c.business_data_updated_at
    FROM counties c
    JOIN states s ON c.state_id = s.id
    WHERE s.code = p_state_code
      AND c.business_data_updated_at IS NOT NULL
    ORDER BY c.economic_health_score DESC NULLS LAST, c.name;
END;
$$ LANGUAGE plpgsql;

-- Insert sample business data for testing (optional)
-- This can be removed in production
INSERT INTO counties (id, state_id, name, state_code, business_establishments, business_employees, business_payroll, economic_health_score, business_data_updated_at)
SELECT 
    gen_random_uuid(),
    s.id,
    'Sample County',
    s.code,
    150,
    2500,
    125000000,
    75,
    NOW()
FROM states s
WHERE s.code = 'FL'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON counties_with_business_data TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_economic_health_score TO authenticated;
GRANT EXECUTE ON FUNCTION update_county_business_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_counties_needing_business_update TO authenticated;
GRANT EXECUTE ON FUNCTION get_state_business_summary TO authenticated;
