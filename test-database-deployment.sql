-- ==========================================
-- Database Deployment Verification Script
-- Smart Deal Alerts Feature
-- ==========================================

-- Check if alert_rules table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'alert_rules'
) AS alert_rules_exists;

-- Check if property_alerts table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'property_alerts'
) AS property_alerts_exists;

-- Check if notification_frequency ENUM exists
SELECT EXISTS (
    SELECT FROM pg_type
    WHERE typname = 'notification_frequency'
) AS notification_frequency_enum_exists;

-- List all alert-related functions
SELECT
    proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND proname LIKE '%alert%'
ORDER BY proname;

-- If tables exist, show their structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('alert_rules', 'property_alerts')
ORDER BY table_name, ordinal_position;

-- Check indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('alert_rules', 'property_alerts')
ORDER BY tablename, indexname;

-- Count existing data (if any)
SELECT
    (SELECT COUNT(*) FROM alert_rules) AS alert_rules_count,
    (SELECT COUNT(*) FROM property_alerts) AS property_alerts_count;
