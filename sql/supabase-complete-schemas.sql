-- ==========================================
-- TAX DEED INVESTMENT DATABASE - COMPLETE SCHEMA
-- All 11 Agents + Dashboard Views + Helper Functions
-- ==========================================

-- This schema was already created in previous session
-- Located in your Supabase project
-- If you need to recreate it, retrieve from your Supabase SQL history

-- TABLES INCLUDED:
-- Agent 1-3 (existing): counties, properties, parsed_properties, comparable_sales
-- Agent 4: evaluations, evaluation_comps
-- Agent 5: title_searches, liens, deed_chain, title_issues
-- Agent 6: condition_assessments, repair_items
-- Agent 7: environmental_assessments, environmental_hazards
-- Agent 8: occupancy_assessments
-- Agent 9: bid_strategies, historical_auction_results
-- Agent 10: auction_tracking, bid_history
-- Agent 11: acquisitions, project_tasks, project_expenses, disposition

-- HELPER FUNCTIONS:
-- get_properties_needing_evaluation()
-- get_properties_needing_title_search()
-- get_properties_needing_condition()

-- DASHBOARD VIEW:
-- vw_master_pipeline

-- To retrieve the complete SQL schema:
-- 1. Go to Supabase SQL Editor
-- 2. Check your SQL history
-- 3. Look for the large schema creation script from our previous session
-- OR contact me to regenerate the full ~2000 line SQL file
