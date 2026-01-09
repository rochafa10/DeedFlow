# Tax Deed Flow - Application Specification

## Document Information
- **Version**: 1.0.0
- **Created**: January 9, 2026
- **Purpose**: Complete specification for building the Tax Deed Flow web application
- **Target**: AI code generation tools (Cursor, Claude, etc.)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Application Architecture](#5-application-architecture)
6. [Page Specifications](#6-page-specifications)
7. [Component Library](#7-component-library)
8. [API Endpoints](#8-api-endpoints)
9. [Real-time Features](#9-real-time-features)
10. [Background Jobs](#10-background-jobs)
11. [Integrations](#11-integrations)
12. [UI/UX Design System](#12-uiux-design-system)
13. [State Management](#13-state-management)
14. [Error Handling](#14-error-handling)
15. [Testing Requirements](#15-testing-requirements)
16. [Deployment](#16-deployment)
17. [File Structure](#17-file-structure)

---

## 1. Executive Summary

### 1.1 Product Overview
Tax Deed Flow is a comprehensive web application for managing tax deed auction investments. It automates the research, analysis, and bidding process for tax lien and tax deed properties across multiple U.S. counties.

### 1.2 Core Features
1. **Dashboard** - Real-time pipeline overview with KPIs and alerts
2. **Orchestration Console** - Manage AI agent sessions and work delegation
3. **County Research** - Browse and manage researched counties
4. **Property Pipeline** - Track properties through analysis stages
5. **Auction Calendar** - View upcoming auctions with countdown timers
6. **Batch Processing** - Monitor and control batch jobs
7. **Data Integrity** - Audit tools and data quality reports
8. **Settings** - User preferences and system configuration

### 1.3 User Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| **Admin** | Full system access | All features, user management, system config |
| **Analyst** | Property analysis | View all, edit properties, run agents |
| **Viewer** | Read-only access | View dashboards and reports only |

### 1.4 Key Metrics to Track
- Properties in pipeline by stage
- Days until next auction
- Completion percentage by county
- Agent processing rates
- Bottleneck severity scores
- Session costs (token usage)

---

## 2. Technology Stack

### 2.1 Frontend
```
Framework:        Next.js 14+ (App Router)
Language:         TypeScript 5.x
Styling:          Tailwind CSS 3.x
Component Library: shadcn/ui (based on Radix UI)
Charts:           Recharts or Tremor
Tables:           TanStack Table v8
Forms:            React Hook Form + Zod validation
State:            Zustand (global) + TanStack Query (server)
Icons:            Lucide React
Date Handling:    date-fns
Maps:             Leaflet or Mapbox GL JS
```

### 2.2 Backend
```
Database:         Supabase (PostgreSQL)
Auth:             Supabase Auth
Storage:          Supabase Storage (screenshots, PDFs)
Real-time:        Supabase Realtime (WebSockets)
Edge Functions:   Supabase Edge Functions (Deno)
```

### 2.3 External Services
```
n8n:              Workflow automation (self-hosted)
Perplexity API:   AI research
Google Custom Search: Document finding
Regrid API:       Property data enrichment
```

### 2.4 Development Tools
```
Package Manager:  pnpm
Linting:          ESLint + Prettier
Testing:          Vitest + Playwright
CI/CD:            GitHub Actions
Hosting:          Vercel
```

---

## 3. Database Schema

### 3.1 Existing Tables (Already in Supabase)

#### Core Tables
```sql
-- Counties (master list)
CREATE TABLE counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  state_name TEXT,
  fips_code TEXT,
  population INTEGER,
  timezone TEXT,
  last_researched_at TIMESTAMPTZ,
  research_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(county_name, state_code)
);

-- Properties (extracted from PDFs)
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES counties(id),
  document_id UUID REFERENCES documents(id),
  parcel_id TEXT NOT NULL,
  property_address TEXT,
  owner_name TEXT,
  tax_amount DECIMAL(12,2),
  total_due DECIMAL(12,2),
  tax_year INTEGER,
  sale_type TEXT, -- 'upset', 'judicial', 'repository', 'tax_certificate'
  sale_date DATE,
  auction_status TEXT DEFAULT 'active', -- 'active', 'expired', 'sold', 'withdrawn'
  has_regrid_data BOOLEAN DEFAULT FALSE,
  has_screenshot BOOLEAN DEFAULT FALSE,
  visual_validation_status TEXT, -- 'APPROVED', 'CAUTION', 'REJECT', NULL
  pipeline_stage TEXT DEFAULT 'parsed', -- 'parsed', 'enriched', 'validated', 'analyzed', 'ready'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regrid Data (property enrichment)
CREATE TABLE regrid_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  regrid_id TEXT,
  property_type TEXT,
  property_class TEXT,
  land_use TEXT,
  zoning TEXT,
  lot_size_sqft DECIMAL(12,2),
  lot_size_acres DECIMAL(10,4),
  lot_dimensions TEXT,
  building_sqft INTEGER,
  year_built INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  assessed_value DECIMAL(12,2),
  market_value DECIMAL(12,2),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  screenshot_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visual Validation Results
CREATE TABLE property_visual_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  validation_status TEXT NOT NULL, -- 'APPROVED', 'CAUTION', 'REJECT'
  confidence_score DECIMAL(5,2),
  structure_present BOOLEAN,
  road_access BOOLEAN,
  land_use_observed TEXT,
  lot_shape TEXT,
  red_flags JSONB, -- array of issues
  skip_reason TEXT,
  images_analyzed JSONB,
  regrid_screenshot_url TEXT,
  google_maps_url TEXT,
  street_view_url TEXT,
  zillow_url TEXT,
  findings JSONB,
  notes TEXT,
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by TEXT
);

-- Upcoming Sales (auction dates)
CREATE TABLE upcoming_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES counties(id),
  sale_type TEXT NOT NULL,
  sale_date TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  platform TEXT,
  deposit_required DECIMAL(12,2),
  property_count INTEGER,
  location TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (PDFs, property lists)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES counties(id),
  document_type TEXT NOT NULL, -- 'property_list', 'legal_notice', 'registration'
  title TEXT,
  url TEXT,
  file_format TEXT,
  publication_date DATE,
  year INTEGER,
  property_count INTEGER,
  parsing_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  parsed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orchestration Sessions
CREATE TABLE orchestration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  session_type TEXT, -- 'full_pipeline', 'single_agent', 'priority_batch'
  trigger_source TEXT, -- 'manual', 'scheduled', 'webhook'
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'failed'
  work_assigned JSONB,
  work_completed JSONB,
  total_items_processed INTEGER DEFAULT 0,
  total_items_failed INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Assignments
CREATE TABLE agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES orchestration_sessions(id),
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  property_ids UUID[],
  county_id UUID REFERENCES counties(id),
  batch_size INTEGER,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  execution_method TEXT, -- 'claude', 'n8n', 'hybrid'
  n8n_execution_id TEXT,
  result_summary JSONB,
  notes TEXT
);

-- Pipeline Metrics
CREATE TABLE pipeline_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  stage TEXT NOT NULL,
  county_id UUID REFERENCES counties(id),
  pending_count INTEGER,
  completed_today INTEGER,
  avg_processing_time_seconds INTEGER,
  bottleneck_score DECIMAL(3,2)
);

-- Batch Jobs
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  county_id UUID REFERENCES counties(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'paused', 'completed', 'failed'
  batch_size INTEGER DEFAULT 50,
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  current_offset INTEGER DEFAULT 0,
  last_processed_id UUID,
  error_log JSONB,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 New Tables to Create

```sql
-- User Preferences
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
  default_county_id UUID REFERENCES counties(id),
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_digest TEXT DEFAULT 'daily', -- 'none', 'daily', 'weekly'
  dashboard_layout JSONB,
  table_preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log (audit trail)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT, -- 'property', 'county', 'session', 'batch_job'
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Filters
CREATE TABLE saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'properties', 'counties', 'auctions'
  filter_config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'auction_reminder', 'job_complete', 'error', 'bottleneck'
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property Notes (user annotations)
CREATE TABLE property_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- 'general', 'concern', 'opportunity', 'research'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  max_bid DECIMAL(12,2),
  notes TEXT,
  alert_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Auction Rules (requirements, deposits, procedures per county/sale type)
CREATE TABLE auction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
  sale_type TEXT NOT NULL, -- 'upset', 'judicial', 'repository', etc.

  -- Registration
  registration_required BOOLEAN DEFAULT TRUE,
  registration_deadline_days INTEGER,
  registration_form_url TEXT,
  deposit_amount DECIMAL(12,2),
  deposit_refundable BOOLEAN DEFAULT TRUE,
  deposit_payment_methods TEXT[],

  -- Bidding
  minimum_bid_rule TEXT, -- 'taxes_owed', 'fixed', 'percentage'
  minimum_bid_amount DECIMAL(12,2),
  bid_increment DECIMAL(12,2),
  buyers_premium_pct DECIMAL(5,2),

  -- Payment
  payment_deadline_hours INTEGER,
  payment_methods TEXT[],
  financing_allowed BOOLEAN DEFAULT FALSE,

  -- Post-Sale
  deed_recording_timeline TEXT,
  redemption_period_days INTEGER,
  possession_timeline TEXT,

  -- Disclaimers
  as_is_sale BOOLEAN DEFAULT TRUE,
  liens_survive TEXT[],
  title_insurance_available BOOLEAN DEFAULT FALSE,

  -- Metadata
  rules_source_url TEXT,
  last_verified_at TIMESTAMPTZ,
  notes TEXT,
  raw_rules_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(county_id, sale_type)
);

-- Auction Alerts (notifications about deadlines, new auctions)
CREATE TABLE auction_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES upcoming_sales(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'new_auction', 'auction_imminent', 'registration_deadline', etc.
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  message TEXT,
  days_until_event INTEGER,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auction Summaries (investor briefings and analysis)
CREATE TABLE auction_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id UUID REFERENCES counties(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES upcoming_sales(id) ON DELETE CASCADE,
  summary_type TEXT DEFAULT 'investor_briefing',
  executive_summary TEXT,
  key_dates JSONB,
  requirements_summary TEXT,
  bidding_summary TEXT,
  risks_and_notes TEXT,
  recommended_actions TEXT[],
  property_count INTEGER,
  approved_count INTEGER,
  total_tax_due DECIMAL(12,2),
  avg_minimum_bid DECIMAL(12,2),
  estimated_market_value DECIMAL(12,2),
  competition_level TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Database Views

```sql
-- Pipeline Status by County
CREATE VIEW vw_county_pipeline_status AS
SELECT
  c.id as county_id,
  c.county_name,
  c.state_code,
  COUNT(p.id) as total_properties,
  COUNT(CASE WHEN p.has_regrid_data THEN 1 END) as regrid_complete,
  COUNT(CASE WHEN p.visual_validation_status IS NOT NULL THEN 1 END) as validated,
  COUNT(CASE WHEN p.visual_validation_status = 'APPROVED' THEN 1 END) as approved,
  COUNT(CASE WHEN p.visual_validation_status = 'CAUTION' THEN 1 END) as caution,
  COUNT(CASE WHEN p.visual_validation_status = 'REJECT' THEN 1 END) as rejected,
  ROUND(COUNT(CASE WHEN p.has_regrid_data THEN 1 END)::DECIMAL / NULLIF(COUNT(p.id), 0) * 100, 1) as completion_pct,
  MIN(us.sale_date) as next_auction,
  EXTRACT(DAY FROM MIN(us.sale_date) - NOW()) as days_until_auction
FROM counties c
LEFT JOIN properties p ON c.id = p.county_id AND p.auction_status = 'active'
LEFT JOIN upcoming_sales us ON c.id = us.county_id AND us.sale_date > NOW()
GROUP BY c.id, c.county_name, c.state_code;

-- Properties with Full Details
CREATE VIEW vw_properties_full AS
SELECT
  p.*,
  c.county_name,
  c.state_code,
  rd.property_type,
  rd.lot_size_acres,
  rd.building_sqft,
  rd.year_built,
  rd.assessed_value,
  rd.market_value,
  rd.latitude,
  rd.longitude,
  rd.screenshot_url,
  pvv.validation_status,
  pvv.confidence_score,
  pvv.red_flags,
  pvv.findings
FROM properties p
JOIN counties c ON p.county_id = c.id
LEFT JOIN regrid_data rd ON p.id = rd.property_id
LEFT JOIN property_visual_validation pvv ON p.id = pvv.property_id;

-- Upcoming Auctions with Details
CREATE VIEW vw_upcoming_auctions AS
SELECT
  us.*,
  c.county_name,
  c.state_code,
  COUNT(p.id) as current_property_count,
  COUNT(CASE WHEN p.visual_validation_status = 'APPROVED' THEN 1 END) as approved_count,
  EXTRACT(DAY FROM us.sale_date - NOW()) as days_until
FROM upcoming_sales us
JOIN counties c ON us.county_id = c.id
LEFT JOIN properties p ON c.id = p.county_id AND p.auction_status = 'active'
WHERE us.sale_date > NOW()
GROUP BY us.id, c.county_name, c.state_code
ORDER BY us.sale_date;

-- Active Batch Jobs
CREATE VIEW vw_active_batch_jobs AS
SELECT
  bj.*,
  c.county_name,
  c.state_code,
  ROUND((bj.processed_items::DECIMAL / NULLIF(bj.total_items, 0)) * 100, 1) as progress_pct,
  bj.total_items - bj.processed_items as remaining_items
FROM batch_jobs bj
LEFT JOIN counties c ON bj.county_id = c.id
WHERE bj.status IN ('pending', 'in_progress', 'paused');
```

### 3.4 Database Functions

```sql
-- Get Dashboard Stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_counties', (SELECT COUNT(*) FROM counties WHERE research_status = 'completed'),
    'total_properties', (SELECT COUNT(*) FROM properties WHERE auction_status = 'active'),
    'properties_approved', (SELECT COUNT(*) FROM properties WHERE visual_validation_status = 'APPROVED'),
    'properties_pending_regrid', (SELECT COUNT(*) FROM properties WHERE NOT has_regrid_data AND auction_status = 'active'),
    'properties_pending_validation', (SELECT COUNT(*) FROM properties WHERE has_regrid_data AND visual_validation_status IS NULL),
    'upcoming_auctions_7d', (SELECT COUNT(*) FROM upcoming_sales WHERE sale_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'),
    'upcoming_auctions_30d', (SELECT COUNT(*) FROM upcoming_sales WHERE sale_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'),
    'active_sessions', (SELECT COUNT(*) FROM orchestration_sessions WHERE status = 'active'),
    'active_batch_jobs', (SELECT COUNT(*) FROM batch_jobs WHERE status IN ('in_progress', 'paused'))
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Get Pipeline Funnel Data
CREATE OR REPLACE FUNCTION get_pipeline_funnel()
RETURNS TABLE (
  stage TEXT,
  count INTEGER,
  percentage DECIMAL
) AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM properties WHERE auction_status = 'active';

  RETURN QUERY
  SELECT 'Parsed'::TEXT,
         COUNT(*)::INTEGER,
         ROUND(COUNT(*)::DECIMAL / NULLIF(total, 0) * 100, 1)
  FROM properties WHERE auction_status = 'active'
  UNION ALL
  SELECT 'Regrid Enriched'::TEXT,
         COUNT(*)::INTEGER,
         ROUND(COUNT(*)::DECIMAL / NULLIF(total, 0) * 100, 1)
  FROM properties WHERE has_regrid_data AND auction_status = 'active'
  UNION ALL
  SELECT 'Validated'::TEXT,
         COUNT(*)::INTEGER,
         ROUND(COUNT(*)::DECIMAL / NULLIF(total, 0) * 100, 1)
  FROM properties WHERE visual_validation_status IS NOT NULL AND auction_status = 'active'
  UNION ALL
  SELECT 'Approved'::TEXT,
         COUNT(*)::INTEGER,
         ROUND(COUNT(*)::DECIMAL / NULLIF(total, 0) * 100, 1)
  FROM properties WHERE visual_validation_status = 'APPROVED' AND auction_status = 'active';
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow
```
1. User navigates to /login
2. Supabase Auth handles OAuth or email/password
3. On success, JWT stored in httpOnly cookie
4. Middleware validates JWT on each request
5. User session refreshed automatically
```

### 4.2 Auth Providers
- Email/Password (primary)
- Google OAuth (optional)
- Magic Link (optional)

### 4.3 Protected Routes
```typescript
// middleware.ts
const publicRoutes = ['/login', '/signup', '/forgot-password'];
const adminRoutes = ['/settings/users', '/settings/system'];

// All other routes require authentication
```

### 4.4 Role-Based Access Control

```typescript
// types/auth.ts
type UserRole = 'admin' | 'analyst' | 'viewer';

interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  execute: boolean; // Run agents/jobs
}

const rolePermissions: Record<UserRole, Record<string, Permission>> = {
  admin: {
    properties: { view: true, create: true, edit: true, delete: true, execute: true },
    counties: { view: true, create: true, edit: true, delete: true, execute: true },
    sessions: { view: true, create: true, edit: true, delete: true, execute: true },
    users: { view: true, create: true, edit: true, delete: true, execute: false },
  },
  analyst: {
    properties: { view: true, create: false, edit: true, delete: false, execute: true },
    counties: { view: true, create: false, edit: false, delete: false, execute: true },
    sessions: { view: true, create: true, edit: false, delete: false, execute: true },
    users: { view: false, create: false, edit: false, delete: false, execute: false },
  },
  viewer: {
    properties: { view: true, create: false, edit: false, delete: false, execute: false },
    counties: { view: true, create: false, edit: false, delete: false, execute: false },
    sessions: { view: true, create: false, edit: false, delete: false, execute: false },
    users: { view: false, create: false, edit: false, delete: false, execute: false },
  },
};
```

---

## 5. Application Architecture

### 5.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  Next.js App Router + React + TanStack Query + Zustand      │
├─────────────────────────────────────────────────────────────┤
│                     API Layer                                │
│  Next.js Route Handlers + Supabase Client                   │
├─────────────────────────────────────────────────────────────┤
│                    Supabase                                  │
│  PostgreSQL + Auth + Storage + Realtime + Edge Functions    │
├─────────────────────────────────────────────────────────────┤
│                  External Services                           │
│  n8n (workflows) + Perplexity + Google Search + Regrid      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Data Flow
```
1. User interacts with UI
2. React component calls TanStack Query hook
3. Hook calls API route or Supabase directly
4. Data returned and cached
5. UI updates reactively
6. Real-time subscriptions push updates
```

### 5.3 Folder Structure
```
src/
├── app/                      # Next.js App Router pages
│   ├── (auth)/               # Auth pages (login, signup)
│   ├── (dashboard)/          # Main app pages
│   │   ├── page.tsx          # Dashboard
│   │   ├── orchestration/    # Orchestration console
│   │   ├── properties/       # Property pipeline
│   │   ├── counties/         # County management
│   │   ├── auctions/         # Auction calendar
│   │   ├── batch-jobs/       # Batch job monitor
│   │   ├── data-integrity/   # Data audit tools
│   │   └── settings/         # User & system settings
│   ├── api/                  # API routes
│   └── layout.tsx            # Root layout
├── components/               # React components
│   ├── ui/                   # shadcn/ui primitives
│   ├── layout/               # Layout components
│   ├── dashboard/            # Dashboard widgets
│   ├── properties/           # Property components
│   ├── orchestration/        # Orchestration components
│   └── shared/               # Shared components
├── hooks/                    # Custom React hooks
├── lib/                      # Utilities and configs
│   ├── supabase/             # Supabase client
│   ├── utils/                # Helper functions
│   └── constants/            # App constants
├── stores/                   # Zustand stores
├── types/                    # TypeScript types
└── styles/                   # Global styles
```

---

## 6. Page Specifications

### 6.1 Dashboard (`/`)

#### Purpose
Central hub showing real-time pipeline status, KPIs, alerts, and quick actions.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Tax Deed Flow                    [User] [Settings]  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │Counties │ │Properties│ │Approved │ │Pending  │ │Auctions ││
│ │   12    │ │  7,375   │ │   156   │ │  7,219  │ │ 3 (7d)  ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │    Pipeline Funnel      │ │     Upcoming Auctions       │ │
│ │    [Stacked Bar Chart]  │ │     [Calendar + List]       │ │
│ │                         │ │                             │ │
│ │ Parsed:     7,375 (100%)│ │ Jan 16 - Westmoreland (7d)  │ │
│ │ Enriched:      17 (0.2%)│ │ Mar 11 - Blair (62d)        │ │
│ │ Validated:      0 (0%)  │ │ Sep 08 - Somerset (242d)    │ │
│ │ Approved:       0 (0%)  │ │                             │ │
│ └─────────────────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│ │     Bottlenecks         │ │    Recent Activity          │ │
│ │  [Alert Cards]          │ │    [Activity Feed]          │ │
│ │                         │ │                             │ │
│ │ ! Regrid: 7,358 pending │ │ 10:32 - Session completed   │ │
│ │ ! Validation: 17 ready  │ │ 10:15 - Batch job started   │ │
│ │                         │ │ 09:45 - 50 properties done  │ │
│ └─────────────────────────┘ └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │              County Progress Table                       │ │
│ │ County      │ Total │ Regrid │ Valid │ Approved │ Next  │ │
│ │ Westmoreland│   172 │    0%  │   0%  │     0    │  7d   │ │
│ │ Somerset    │ 2,663 │    0%  │   0%  │     0    │ 242d  │ │
│ │ Blair       │   252 │    7%  │   0%  │     0    │  62d  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Components
1. **KPI Cards** (5 cards in row)
   - Total Counties (researched)
   - Total Properties (active)
   - Approved Properties
   - Pending Processing
   - Upcoming Auctions (7 days)

2. **Pipeline Funnel Chart**
   - Horizontal stacked bar or funnel visualization
   - Stages: Parsed → Enriched → Validated → Approved
   - Click to drill down to property list

3. **Upcoming Auctions Widget**
   - Mini calendar view with auction markers
   - List of next 5 auctions with countdown
   - Color coding: Red (<7d), Yellow (<30d), Green (>30d)

4. **Bottleneck Alerts**
   - Cards for each critical bottleneck
   - Severity indicator (Critical/Warning/Info)
   - Quick action button to address

5. **Activity Feed**
   - Real-time log of system events
   - Session starts/ends
   - Batch job progress
   - Errors and alerts

6. **County Progress Table**
   - Sortable/filterable table
   - Progress bars for each stage
   - Days until next auction column
   - Click row to go to county detail

#### Data Requirements
```typescript
interface DashboardData {
  stats: {
    totalCounties: number;
    totalProperties: number;
    approvedProperties: number;
    pendingProcessing: number;
    upcomingAuctions7d: number;
  };
  pipelineFunnel: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  upcomingAuctions: {
    id: string;
    countyName: string;
    saleDate: Date;
    daysUntil: number;
    propertyCount: number;
  }[];
  bottlenecks: {
    stage: string;
    countyName: string;
    score: number;
    pendingCount: number;
    recommendation: string;
  }[];
  countyProgress: {
    id: string;
    countyName: string;
    stateCode: string;
    totalProperties: number;
    regridComplete: number;
    validated: number;
    approved: number;
    daysUntilAuction: number | null;
  }[];
  recentActivity: {
    id: string;
    action: string;
    details: string;
    timestamp: Date;
  }[];
}
```

#### API Calls
```typescript
// GET /api/dashboard
async function getDashboardData(): Promise<DashboardData> {
  const [stats, funnel, auctions, bottlenecks, counties, activity] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.rpc('get_pipeline_funnel'),
    supabase.from('vw_upcoming_auctions').select('*').limit(5),
    supabase.rpc('detect_bottlenecks'),
    supabase.from('vw_county_pipeline_status').select('*'),
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20),
  ]);
  // Transform and return
}
```

#### Interactions
- KPI cards: Click to navigate to relevant page
- Pipeline chart: Click stage to filter properties
- Auction: Click to view county details
- Bottleneck: Click to start addressing workflow
- County row: Click to view county detail page

#### Real-time Updates
- Subscribe to `pipeline_metrics` for live stats
- Subscribe to `activity_log` for new events
- Subscribe to `batch_jobs` for job progress

---

### 6.2 Orchestration Console (`/orchestration`)

#### Purpose
Control center for managing AI agent sessions, delegating work, and monitoring progress.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Orchestration Console                                        │
│ [Start Session] [Show Work Queue] [Check Bottlenecks]       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Active Session: os-a1b2c3d4                 [End Session]│ │
│ │ Started: 10:15 AM | Duration: 47 min | Status: Active    │ │
│ │ Processed: 150/200 | Failed: 2 | Estimated: 15 min left  │ │
│ │ ████████████████████░░░░░ 75%                            │ │
│ └─────────────────────────────────────────────────────────┘ │
├───────────────────────────┬─────────────────────────────────┤
│ Work Queue                │ Session Plan                    │
│ ┌───────────────────────┐ │ ┌─────────────────────────────┐ │
│ │ Priority │ Agent      │ │ │ Recommended (150 properties)│ │
│ │    1     │ REGRID     │ │ │                             │ │
│ │    4     │ REGRID     │ │ │ 1. Westmoreland - 50 (URG)  │ │
│ │    4     │ REGRID     │ │ │ 2. Somerset - 50            │ │
│ │    5     │ VALIDATOR  │ │ │ 3. Dauphin - 50             │ │
│ └───────────────────────┘ │ │                             │ │
│                           │ │ [Execute Plan]              │ │
│ [Refresh] [Export]        │ └─────────────────────────────┘ │
├───────────────────────────┴─────────────────────────────────┤
│ Agent Assignments                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Agent          │ Task    │ County      │ Status │ Progress│
│ │ REGRID_SCRAPER │ scrape  │ Westmoreland│ Active │ ██░ 60% │
│ │ REGRID_SCRAPER │ scrape  │ Somerset    │ Pending│ ░░░  0% │
│ │ VISUAL_VALID   │ validate│ Blair       │ Complete│███ 100%│
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Session History                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Session    │ Date       │ Duration │ Processed │ Status  │ │
│ │ os-x1y2z3 │ Jan 8 2:30 │ 52 min   │ 175       │ Complete│ │
│ │ os-a1b2c3 │ Jan 8 10:15│ 47 min   │ 150       │ Active  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Components

1. **Session Control Bar**
   - Start Session button (opens dialog)
   - Quick action buttons
   - Session type selector (full_pipeline, single_agent, priority_batch)

2. **Active Session Card**
   - Session ID and metadata
   - Progress bar with percentage
   - Time elapsed and ETA
   - End Session button
   - Pause/Resume controls

3. **Work Queue Panel**
   - Table showing prioritized work
   - Columns: Priority, Agent, Task, County, Pending, Sessions Needed
   - Filter by agent type
   - Sortable columns

4. **Session Plan Panel**
   - AI-recommended work plan
   - Max 150 properties, 3 agents
   - Execute button to start
   - Manual override options

5. **Agent Assignments Table**
   - Active assignments for current session
   - Real-time progress updates
   - Status badges (Pending, Active, Complete, Failed)
   - Click to view assignment details

6. **Session History**
   - Past sessions with stats
   - Expandable rows for details
   - Export session report

#### State Management
```typescript
interface OrchestrationState {
  activeSession: OrchestrationSession | null;
  workQueue: WorkQueueItem[];
  sessionPlan: SessionPlanItem[];
  assignments: AgentAssignment[];
  sessionHistory: OrchestrationSession[];
  isLoading: boolean;
  error: string | null;
}

interface OrchestrationSession {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  sessionType: 'full_pipeline' | 'single_agent' | 'priority_batch';
  status: 'active' | 'paused' | 'completed' | 'failed';
  totalProcessed: number;
  totalFailed: number;
  notes: string;
}
```

#### Dialogs

**Start Session Dialog**
```
┌─────────────────────────────────────────┐
│ Start Orchestration Session              │
├─────────────────────────────────────────┤
│ Session Type:                            │
│ ○ Full Pipeline (all agents)             │
│ ● Priority Batch (urgent work only)      │
│ ○ Single Agent                           │
│                                          │
│ [If Single Agent selected]               │
│ Agent: [REGRID_SCRAPER ▼]                │
│                                          │
│ County Filter: [All Counties ▼]          │
│                                          │
│ Notes:                                   │
│ ┌─────────────────────────────────────┐ │
│ │ Morning session - focus on urgent  │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [Cancel]                  [Start Session]│
└─────────────────────────────────────────┘
```

**End Session Dialog**
```
┌─────────────────────────────────────────┐
│ End Session                              │
├─────────────────────────────────────────┤
│ Session Summary:                         │
│ • Duration: 47 minutes                   │
│ • Processed: 150 items                   │
│ • Failed: 2 items                        │
│                                          │
│ Status:                                  │
│ ● Completed                              │
│ ○ Paused (resume later)                  │
│ ○ Failed                                 │
│                                          │
│ Final Notes:                             │
│ ┌─────────────────────────────────────┐ │
│ │ Completed Westmoreland batch        │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [Cancel]                    [End Session]│
└─────────────────────────────────────────┘
```

---

### 6.3 Properties Pipeline (`/properties`)

#### Purpose
Browse, search, and manage all properties in the pipeline with filtering by stage, county, and status.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Property Pipeline                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Search...                    ] [Filters ▼] [Export]    │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Stage Filter:                                                │
│ [All] [Parsed] [Enriched] [Validated] [Approved] [Rejected] │
├─────────────────────────────────────────────────────────────┤
│ Active Filters: County: Blair ✕ | Status: Approved ✕        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ □ │ Parcel ID       │ Address        │ County │ Stage   │ │
│ │ □ │ 01.01-04..-156  │ 456 Oak St     │ Blair  │ Approved│ │
│ │ □ │ 01.01-04..-157  │ 457 Oak St     │ Blair  │ Pending │ │
│ │ □ │ 01.01-04..-158  │ 458 Oak St     │ Blair  │ Rejected│ │
│ │ ...                                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Showing 1-50 of 7,375 │ [◀ Prev] [Page 1 of 148] [Next ▶]  │
├─────────────────────────────────────────────────────────────┤
│ Bulk Actions: [Select All] [Validate Selected] [Export CSV] │
└─────────────────────────────────────────────────────────────┘
```

#### Table Columns
| Column | Type | Sortable | Description |
|--------|------|----------|-------------|
| Checkbox | Select | No | Bulk selection |
| Parcel ID | Text | Yes | Primary identifier |
| Address | Text | Yes | Property address |
| County | Text | Yes | County name |
| State | Text | Yes | State code |
| Total Due | Currency | Yes | Tax amount owed |
| Sale Type | Badge | Yes | upset/judicial/repository |
| Sale Date | Date | Yes | Auction date |
| Stage | Badge | Yes | Pipeline stage |
| Validation | Badge | Yes | APPROVED/CAUTION/REJECT |
| Has Regrid | Boolean | Yes | Enrichment status |
| Actions | Buttons | No | View/Edit/Notes |

#### Filter Panel
```
┌─────────────────────────────────────────┐
│ Filters                          [Reset]│
├─────────────────────────────────────────┤
│ County:                                  │
│ [Select counties... ▼]                  │
│ ☑ Blair  ☑ Somerset  ☐ Westmoreland     │
│                                          │
│ Stage:                                   │
│ ☑ Parsed  ☑ Enriched  ☐ Validated       │
│                                          │
│ Validation Status:                       │
│ ☑ Approved  ☑ Caution  ☐ Rejected       │
│                                          │
│ Sale Type:                               │
│ ☐ Upset  ☐ Judicial  ☑ Repository       │
│                                          │
│ Sale Date:                               │
│ From: [01/01/2026] To: [12/31/2026]     │
│                                          │
│ Total Due:                               │
│ Min: [$0] Max: [$50,000]                │
│                                          │
│ [Apply Filters]        [Save as Default]│
└─────────────────────────────────────────┘
```

#### Property Detail Page (`/properties/[id]`)
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Properties                                         │
│ Property: 456 Oak St, Altoona, PA 16602                      │
│ Parcel: 01.01-04..-156.00-000                               │
├───────────────────────────┬─────────────────────────────────┤
│ Property Image            │ Key Information                  │
│ ┌───────────────────────┐ │ Owner: John Smith               │
│ │                       │ │ Tax Due: $4,500                 │
│ │   [Regrid Screenshot] │ │ Sale Type: Repository           │
│ │                       │ │ Sale Date: Mar 11, 2026         │
│ │                       │ │ Days Until: 62 days             │
│ └───────────────────────┘ │                                 │
│ [Street View] [Zillow]    │ Validation: ✓ APPROVED (92%)    │
├───────────────────────────┴─────────────────────────────────┤
│ Tabs: [Overview] [Regrid Data] [Validation] [Notes] [History]│
├─────────────────────────────────────────────────────────────┤
│ [Overview Tab Content]                                       │
│                                                              │
│ Land Details              │ Building Details                 │
│ Lot Size: 0.18 acres      │ Building: 1,200 sqft            │
│ Zoning: R-1 Residential   │ Year Built: 1952                │
│ Land Use: Single Family   │ Bedrooms: 3                     │
│                           │ Bathrooms: 1.5                  │
│                                                              │
│ Valuation                 │ Location                        │
│ Assessed: $45,000         │ Lat: 40.5089                    │
│ Market Est: $65,000       │ Lng: -78.3947                   │
│ Tax/Market: 6.9%          │ [View on Map]                   │
├─────────────────────────────────────────────────────────────┤
│ Actions:                                                     │
│ [Add to Watchlist] [Add Note] [Re-validate] [View on Regrid]│
└─────────────────────────────────────────────────────────────┘
```

#### Property Card Component (for grid view)
```
┌─────────────────────────────────────┐
│ [Image Thumbnail]                    │
│ 456 Oak St, Altoona PA              │
│ Parcel: 01.01-04..-156              │
├─────────────────────────────────────┤
│ Tax Due: $4,500                      │
│ Lot: 0.18 ac | Bldg: 1,200 sqft     │
├─────────────────────────────────────┤
│ [✓ Approved]  [Repository]  [62d]   │
├─────────────────────────────────────┤
│ [View] [Add to Watchlist] [Notes]   │
└─────────────────────────────────────┘
```

---

### 6.4 Counties (`/counties`)

#### Purpose
View and manage researched counties, their auction schedules, and property counts.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Counties                                    [Research New]   │
│ [Search...              ] [State: All ▼] [Status: All ▼]    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ County      │ State │ Properties │ Progress │ Next Auction│
│ │ Westmoreland│ PA    │ 172        │ ██░ 0%   │ 7 days ⚠️   │
│ │ Somerset    │ PA    │ 2,663      │ ░░░ 0%   │ 242 days    │
│ │ Blair       │ PA    │ 252        │ ██░ 7%   │ 62 days     │
│ │ Dauphin     │ PA    │ 1,812      │ ░░░ 0%   │ 250 days    │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### County Detail Page (`/counties/[id]`)
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Counties                                           │
│ Blair County, Pennsylvania                    [Refresh Data] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │Properties│ │ Regrid  │ │Validated│ │Approved │ │Next Sale│ │
│ │   252   │ │  7%     │ │   0%    │ │    0    │ │  62d    │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Properties] [Auctions] [Documents] [Notes]│
├─────────────────────────────────────────────────────────────┤
│ [Overview Tab]                                               │
│                                                              │
│ Contact Information         │ Auction Details               │
│ Tax Claim Bureau            │ Next Sale: Mar 11, 2026       │
│ Phone: 814-317-2361         │ Type: Repository              │
│ Email: taxclaim@blairco.org │ Platform: Bid4Assets          │
│ Website: blairco.org        │ Registration: Feb 25, 2026    │
│                             │ Deposit: $10,000              │
│                                                              │
│ Pipeline Progress                                            │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Parsed    ████████████████████████████████████ 252     │   │
│ │ Regrid    ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  17     │   │
│ │ Validated ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0     │   │
│ │ Approved  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0     │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ Quick Actions                                                │
│ [Start Regrid Batch] [View Properties] [Download Docs]      │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.5 Auction Calendar & Monitor (`/auctions`)

#### Purpose
Comprehensive auction management hub with visual calendar, countdown timers, registration tracking, auction rules, alerts, and investor briefings.

#### Sub-pages
- `/auctions` - Calendar view and auction list
- `/auctions/[saleId]` - Auction detail with rules and briefing
- `/auctions/alerts` - Active alerts and notifications
- `/auctions/rules` - Auction rules by county/sale type

#### Main Layout (`/auctions`)
```
┌─────────────────────────────────────────────────────────────┐
│ Auction Calendar                     [Alerts: 3] [Calendar] │
│ [All] [Critical] [This Month] [Next 90 Days]                │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│ │  Active Alerts            │ │ Registration Deadlines    │ │
│ │ ┌───────────────────────┐ │ │ ┌───────────────────────┐ │ │
│ │ │🔴 Blair Auction in 7d!│ │ │ │ Blair: Feb 25 (48d)   │ │ │
│ │ │🟡 WM Registration 3d  │ │ │ │ Somerset: Aug 15 (219d)│ │ │
│ │ └───────────────────────┘ │ │ └───────────────────────┘ │ │
│ └───────────────────────────┘ └───────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│         ◀ January 2026 ▶                                    │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                │
│ │ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │                │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                │
│ │     │     │     │  1  │  2  │  3  │  4  │                │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                │
│ │  5  │  6  │  7  │  8  │  9  │ 10  │ 11  │                │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                │
│ │ 12  │ 13  │ 14  │ 15  │[16] │ 17  │ 18  │                │
│ │     │     │     │     │🔴WM │     │     │                │
│ └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                │
├─────────────────────────────────────────────────────────────┤
│ Upcoming Auctions                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 Westmoreland County, PA          January 16, 2026    │ │
│ │    Repository Sale | 172 properties | Bid4Assets        │ │
│ │    ⏱️ 7 days remaining                                  │ │
│ │    Registration: CLOSED | Rules: ✓ | Briefing: ✓        │ │
│ │    [View Briefing] [View Properties] [Rules]            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🟡 Blair County, PA                  March 11, 2026     │ │
│ │    Repository Sale | 252 properties | Bid4Assets        │ │
│ │    ⏱️ 62 days remaining                                 │ │
│ │    Registration: Feb 25, 2026 (48 days) | Rules: ✓      │ │
│ │    [View Briefing] [View Properties] [Rules]            │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Auction Detail Page (`/auctions/[saleId]`)
```
┌─────────────────────────────────────────────────────────────┐
│ ◀ Back to Calendar                                          │
│ Blair County, PA - Repository Sale                          │
│ March 11, 2026 at 10:00 AM                                  │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │Days Left│ │Properties│ │Approved │ │Deposit  │            │
│ │   62    │ │   252    │ │   45    │ │ $10,000 │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├─────────────────────────────────────────────────────────────┤
│ Key Dates                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Sale Date:      March 11, 2026 10:00 AM (62 days)       │ │
│ │ Registration:   February 25, 2026 (48 days) - OPEN      │ │
│ │ Payment Due:    24 hours after winning bid              │ │
│ │ Redemption:     None (repository sale)                  │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [Investor Briefing] [Auction Rules] [Properties]           │
├─────────────────────────────────────────────────────────────┤
│ Investor Briefing                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ EXECUTIVE SUMMARY                                       │ │
│ │ Repository sale with 252 properties available. Average  │ │
│ │ tax due of $2,450. Registration deadline Feb 25 with    │ │
│ │ $10,000 refundable deposit required.                    │ │
│ │                                                         │ │
│ │ REQUIREMENTS CHECKLIST                                  │ │
│ │ ☐ Complete registration form                            │ │
│ │ ☐ Submit $10,000 deposit (refundable)                   │ │
│ │ ☐ Valid photo ID                                        │ │
│ │ ☐ Prepare payment method (certified check, wire)        │ │
│ │                                                         │ │
│ │ BIDDING RULES                                           │ │
│ │ • Minimum bid: Taxes owed                               │ │
│ │ • Bid increment: $100                                   │ │
│ │ • No buyer's premium                                    │ │
│ │                                                         │ │
│ │ RISKS & NOTES                                           │ │
│ │ • Properties sold AS-IS                                 │ │
│ │ • No title insurance available at sale                  │ │
│ │ • Municipal liens survive                               │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Auction Rules                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Registration                                            │ │
│ │   Required: Yes                                         │ │
│ │   Deadline: 14 days before sale                         │ │
│ │   Form: [Download PDF]                                  │ │
│ │                                                         │ │
│ │ Deposit                                                 │ │
│ │   Amount: $10,000                                       │ │
│ │   Refundable: Yes                                       │ │
│ │   Methods: Certified Check, Wire Transfer               │ │
│ │                                                         │ │
│ │ Payment                                                 │ │
│ │   Deadline: 24 hours after winning                      │ │
│ │   Methods: Certified Check, Wire Transfer               │ │
│ │   Financing: Not allowed                                │ │
│ │                                                         │ │
│ │ Post-Sale                                               │ │
│ │   Deed Recording: Within 30 days                        │ │
│ │   Redemption Period: None                               │ │
│ │                                                         │ │
│ │ Last Verified: January 5, 2026                          │ │
│ │ Source: [Blair County Tax Claim Bureau]                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Alerts Page (`/auctions/alerts`)
```
┌─────────────────────────────────────────────────────────────┐
│ Auction Alerts                          [Mark All Read]     │
│ [All] [Critical] [Warning] [Info]                           │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 CRITICAL | Blair County Auction in 7 days!           │ │
│ │    Repository sale on March 11, 2026                    │ │
│ │    Created: 2 hours ago                                 │ │
│ │    [View Auction] [Acknowledge]                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🟡 WARNING | Westmoreland Registration closes in 3 days │ │
│ │    Register before January 13 for repository sale       │ │
│ │    Created: 1 day ago                                   │ │
│ │    [View Auction] [Acknowledge]                         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🔵 INFO | New auction discovered: Somerset County       │ │
│ │    Upset Sale scheduled for September 8, 2026           │ │
│ │    Created: 3 days ago                                  │ │
│ │    [View Auction] [Acknowledge]                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Auction Colors
- 🔴 Red/Critical: Less than 7 days
- 🟡 Yellow/Warning: 7-30 days
- 🟢 Green: More than 30 days
- 🔵 Blue/Info: General notifications

#### Data Requirements
```typescript
interface AuctionCalendarData {
  upcomingAuctions: AuctionItem[];
  activeAlerts: AuctionAlert[];
  registrationDeadlines: RegistrationDeadline[];
}

interface AuctionItem {
  id: string;
  countyId: string;
  countyName: string;
  stateCode: string;
  saleType: 'upset' | 'judicial' | 'repository' | 'tax_certificate' | 'tax_deed' | 'sheriff_sale';
  saleDate: Date;
  daysUntil: number;
  registrationDeadline: Date | null;
  registrationDaysLeft: number | null;
  platform: string;
  propertyCount: number;
  approvedCount: number;
  depositRequired: number | null;
  hasRules: boolean;
  hasSummary: boolean;
  urgency: 'critical' | 'warning' | 'upcoming' | 'scheduled';
}

interface AuctionAlert {
  id: string;
  countyName: string;
  saleId: string;
  alertType: 'new_auction' | 'deadline_approaching' | 'registration_open' |
             'property_list_available' | 'auction_imminent' | 'registration_deadline';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  daysUntilEvent: number;
  acknowledged: boolean;
  createdAt: Date;
}

interface RegistrationDeadline {
  saleId: string;
  countyName: string;
  saleType: string;
  saleDate: Date;
  registrationDeadline: Date;
  daysLeft: number;
  depositRequired: number;
  registrationUrl: string | null;
  status: 'CLOSED' | 'URGENT' | 'SOON' | 'OPEN';
}

interface AuctionRules {
  id: string;
  countyId: string;
  saleType: string;
  registrationRequired: boolean;
  registrationDeadlineDays: number | null;
  registrationFormUrl: string | null;
  depositAmount: number | null;
  depositRefundable: boolean;
  depositPaymentMethods: string[];
  minimumBidRule: string;
  minimumBidAmount: number | null;
  bidIncrement: number | null;
  buyersPremiumPct: number | null;
  paymentDeadlineHours: number;
  paymentMethods: string[];
  financingAllowed: boolean;
  deedRecordingTimeline: string | null;
  redemptionPeriodDays: number | null;
  possessionTimeline: string | null;
  asIsSale: boolean;
  liensSurvive: string[];
  titleInsuranceAvailable: boolean;
  rulesSourceUrl: string | null;
  lastVerifiedAt: Date;
}

interface AuctionSummary {
  id: string;
  saleId: string;
  summaryType: 'investor_briefing' | 'quick_reference' | 'full_analysis';
  executiveSummary: string;
  keyDates: {
    saleDate: Date;
    registrationDeadline: Date | null;
    paymentDeadline: string;
  };
  requirementsSummary: string;
  biddingSummary: string;
  risksAndNotes: string;
  recommendedActions: string[];
  propertyCount: number;
  approvedCount: number;
  totalTaxDue: number;
  avgMinimumBid: number;
  competitionLevel: 'low' | 'medium' | 'high' | 'unknown';
  generatedAt: Date;
}
```

#### API Calls
```typescript
// GET /api/auctions
async function getAuctions(days: number = 90): Promise<AuctionItem[]> {
  return supabase.rpc('get_upcoming_auctions_detailed', { p_days_ahead: days });
}

// GET /api/auctions/alerts
async function getActiveAlerts(): Promise<AuctionAlert[]> {
  return supabase.from('vw_active_auction_alerts').select('*');
}

// GET /api/auctions/deadlines
async function getRegistrationDeadlines(): Promise<RegistrationDeadline[]> {
  return supabase.rpc('get_registration_deadlines');
}

// GET /api/auctions/[saleId]
async function getAuctionDetail(saleId: string): Promise<AuctionDetail> {
  return supabase.rpc('get_auction_summary', { p_sale_id: saleId });
}

// GET /api/auctions/rules/[countyId]/[saleType]
async function getAuctionRules(countyId: string, saleType: string): Promise<AuctionRules> {
  return supabase.from('auction_rules')
    .select('*')
    .eq('county_id', countyId)
    .eq('sale_type', saleType)
    .single();
}

// POST /api/auctions/alerts/acknowledge
async function acknowledgeAlert(alertId: string): Promise<boolean> {
  return supabase.rpc('acknowledge_auction_alert', { p_alert_id: alertId });
}

// POST /api/auctions/generate-alerts
async function generateAlerts(): Promise<number> {
  return supabase.rpc('generate_auction_alerts');
}
```

#### Components
1. **AuctionCalendar** - Monthly calendar with auction markers
2. **AuctionList** - List view of upcoming auctions
3. **AuctionCard** - Individual auction summary card
4. **AlertBanner** - Critical alert notification banner
5. **AlertList** - List of all alerts with actions
6. **RegistrationDeadlineWidget** - Countdown to registration deadlines
7. **AuctionRulesPanel** - Expandable rules summary
8. **InvestorBriefing** - Full briefing document view
9. **RequirementsChecklist** - Interactive checklist component
10. **CountdownTimer** - Days/hours remaining display

---

### 6.6 Batch Jobs (`/batch-jobs`)

#### Purpose
Monitor and control all batch processing jobs across the system.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Batch Jobs                                     [Create New]  │
│ [All] [Active] [Paused] [Completed] [Failed]                │
├─────────────────────────────────────────────────────────────┤
│ Active Jobs                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Job Type        │ County      │ Progress      │ Actions │ │
│ │ regrid_scraping │ Westmoreland│ ████░░ 60%    │ [⏸][✕]  │ │
│ │                 │             │ 30/50 items   │         │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ visual_valid    │ Blair       │ ██████ 100%   │ [✓]     │ │
│ │                 │             │ 17/17 items   │         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Job History                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Type     │ County │ Items │ Failed │ Duration │ Status  │ │
│ │ regrid   │ Blair  │ 50    │ 2      │ 45 min   │ Complete│ │
│ │ parsing  │ All    │ 5     │ 0      │ 12 min   │ Complete│ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.7 Data Integrity (`/data-integrity`)

#### Purpose
Data quality audit tools, reports, and fix utilities.

#### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Data Integrity                              [Run Full Audit] │
├─────────────────────────────────────────────────────────────┤
│ Last Audit: January 9, 2026 10:30 AM                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │Critical │ │Warnings │ │  Gaps   │ │  Info   │            │
│ │    0    │ │    2    │ │   4     │ │   12    │            │
│ │   ✓     │ │   ⚠️    │ │   ⚠️    │ │   ℹ️    │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├─────────────────────────────────────────────────────────────┤
│ Issues                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Severity │ Category │ Issue              │ Count │ Fix   │ │
│ │ Critical │ Orphans  │ Orphaned records   │   0   │  ✓    │ │
│ │ Warning  │ Flags    │ Regrid flag mismatch│   0   │ [Fix] │ │
│ │ Gap      │ Data     │ Missing Regrid data │ 7,358 │ [View]│ │
│ │ Gap      │ Data     │ Missing validation  │   17  │ [View]│ │
│ │ Gap      │ Data     │ Missing addresses   │ 6,221 │ [View]│ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions                                                │
│ [Fix Flag Mismatches] [Clean Orphans] [Update Status]       │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.8 Settings (`/settings`)

#### Sub-pages
1. `/settings/profile` - User profile and preferences
2. `/settings/notifications` - Notification settings
3. `/settings/integrations` - n8n, API keys
4. `/settings/users` - User management (admin only)
5. `/settings/system` - System configuration (admin only)

#### Settings Profile
```
┌─────────────────────────────────────────────────────────────┐
│ Settings > Profile                                           │
├─────────────────────────────────────────────────────────────┤
│ Profile Information                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Name: [Fabricio Rocha        ]                          │ │
│ │ Email: [fds.rocha@gmail.com  ] (cannot change)          │ │
│ │ Role: Admin                                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Preferences                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Theme: [System ▼] (Light / Dark / System)               │ │
│ │ Default County: [All Counties ▼]                        │ │
│ │ Table Page Size: [50 ▼]                                 │ │
│ │ Date Format: [MM/DD/YYYY ▼]                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Save Changes]                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Component Library

### 7.1 Core UI Components (shadcn/ui)

All components should be installed from shadcn/ui:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add switch
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add command
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add scroll-area
```

### 7.2 Custom Components

#### KPI Card
```typescript
// components/dashboard/kpi-card.tsx
interface KPICardProps {
  title: string;
  value: number | string;
  change?: number; // percentage change
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  href?: string;
  loading?: boolean;
}
```

#### Pipeline Funnel Chart
```typescript
// components/dashboard/pipeline-funnel.tsx
interface PipelineFunnelProps {
  data: {
    stage: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  onStageClick?: (stage: string) => void;
}
```

#### Countdown Timer
```typescript
// components/shared/countdown-timer.tsx
interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  showDays?: boolean;
  showHours?: boolean;
  variant?: 'default' | 'compact' | 'badge';
}
```

#### Status Badge
```typescript
// components/shared/status-badge.tsx
interface StatusBadgeProps {
  status: 'approved' | 'caution' | 'rejected' | 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  size?: 'sm' | 'md' | 'lg';
}
```

#### Property Card
```typescript
// components/properties/property-card.tsx
interface PropertyCardProps {
  property: Property;
  onView?: () => void;
  onAddToWatchlist?: () => void;
  showImage?: boolean;
  compact?: boolean;
}
```

#### Data Table (with TanStack Table)
```typescript
// components/shared/data-table.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchKey?: keyof T;
  filterableColumns?: FilterableColumn[];
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}
```

#### Session Card
```typescript
// components/orchestration/session-card.tsx
interface SessionCardProps {
  session: OrchestrationSession;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}
```

#### Bottleneck Alert
```typescript
// components/dashboard/bottleneck-alert.tsx
interface BottleneckAlertProps {
  bottleneck: {
    stage: string;
    countyName: string;
    score: number;
    pendingCount: number;
    recommendation: string;
  };
  onAction?: () => void;
}
```

#### Activity Feed
```typescript
// components/dashboard/activity-feed.tsx
interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}
```

---

## 8. API Endpoints

### 8.1 Next.js API Routes

#### Dashboard
```typescript
// GET /api/dashboard
// Returns: DashboardData

// GET /api/dashboard/stats
// Returns: DashboardStats

// GET /api/dashboard/activity
// Query: limit, offset
// Returns: Activity[]
```

#### Properties
```typescript
// GET /api/properties
// Query: page, limit, county, stage, validation, search, sort, order
// Returns: { data: Property[], total: number, page: number }

// GET /api/properties/[id]
// Returns: PropertyFull

// PATCH /api/properties/[id]
// Body: Partial<Property>
// Returns: Property

// POST /api/properties/[id]/notes
// Body: { note: string, type: string }
// Returns: PropertyNote

// POST /api/properties/[id]/watchlist
// Body: { maxBid?: number, notes?: string }
// Returns: WatchlistItem
```

#### Counties
```typescript
// GET /api/counties
// Query: page, limit, state, status, search
// Returns: { data: County[], total: number }

// GET /api/counties/[id]
// Returns: CountyFull

// POST /api/counties/refresh
// Body: { countyId: string }
// Returns: { success: boolean }
```

#### Orchestration
```typescript
// GET /api/orchestration/sessions
// Query: status, limit
// Returns: OrchestrationSession[]

// GET /api/orchestration/sessions/active
// Returns: OrchestrationSession | null

// POST /api/orchestration/sessions
// Body: { type: string, notes?: string }
// Returns: OrchestrationSession

// PATCH /api/orchestration/sessions/[id]
// Body: { status: string, notes?: string }
// Returns: OrchestrationSession

// GET /api/orchestration/work-queue
// Returns: WorkQueueItem[]

// GET /api/orchestration/session-plan
// Query: maxProperties, maxAgents
// Returns: SessionPlanItem[]

// GET /api/orchestration/bottlenecks
// Returns: Bottleneck[]

// POST /api/orchestration/assignments
// Body: { sessionId, agentName, taskType, countyId, batchSize }
// Returns: AgentAssignment
```

#### Batch Jobs
```typescript
// GET /api/batch-jobs
// Query: status, type, limit
// Returns: BatchJob[]

// POST /api/batch-jobs
// Body: { type: string, countyId?: string, batchSize: number }
// Returns: BatchJob

// PATCH /api/batch-jobs/[id]
// Body: { status: 'paused' | 'in_progress' }
// Returns: BatchJob

// DELETE /api/batch-jobs/[id]
// Returns: { success: boolean }
```

#### Data Integrity
```typescript
// GET /api/data-integrity/audit
// Returns: AuditResult[]

// POST /api/data-integrity/fix
// Body: { fixType: 'regrid_flags' | 'screenshot_flags' | 'orphans' }
// Returns: { fixed: number }

// GET /api/data-integrity/agent-work-report
// Returns: AgentWorkReport[]
```

#### Auctions
```typescript
// GET /api/auctions
// Query: upcoming, days, county
// Returns: Auction[]

// GET /api/auctions/calendar
// Query: month, year
// Returns: CalendarEvent[]
```

### 8.2 Supabase Edge Functions

For operations that require server-side processing or external API calls:

```typescript
// supabase/functions/trigger-n8n-workflow/index.ts
// POST: Triggers n8n workflow via webhook

// supabase/functions/refresh-county-data/index.ts
// POST: Refreshes county research data

// supabase/functions/send-notification/index.ts
// POST: Sends email/push notification
```

---

## 9. Real-time Features

### 9.1 Supabase Realtime Subscriptions

```typescript
// hooks/use-realtime.ts

// Subscribe to batch job updates
export function useBatchJobUpdates(jobId: string) {
  const [job, setJob] = useState<BatchJob | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`batch_job:${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'batch_jobs',
        filter: `id=eq.${jobId}`,
      }, (payload) => {
        setJob(payload.new as BatchJob);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return job;
}

// Subscribe to session updates
export function useSessionUpdates(sessionId: string) {
  // Similar pattern for orchestration_sessions
}

// Subscribe to activity log
export function useActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel('activity_log')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_log',
      }, (payload) => {
        setActivities((prev) => [payload.new as Activity, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return activities;
}

// Subscribe to notifications
export function useNotifications(userId: string) {
  // Subscribe to notifications table for user
}
```

### 9.2 Real-time Updates Needed

| Table | Events | Use Case |
|-------|--------|----------|
| `batch_jobs` | UPDATE | Progress tracking |
| `orchestration_sessions` | UPDATE | Session monitoring |
| `agent_assignments` | INSERT, UPDATE | Assignment tracking |
| `activity_log` | INSERT | Activity feed |
| `notifications` | INSERT | User notifications |
| `pipeline_metrics` | INSERT | Dashboard stats |

---

## 10. Background Jobs

### 10.1 n8n Workflows

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| TDF - Daily Pipeline Review | 6:00 AM daily | Generate work queue, detect bottlenecks |
| TDF - Data Integrity Check | 12:00 AM daily | Run full audit, update property status |
| TDF - Progress Tracker | Every 15 min | Update pipeline metrics |
| TDF - Auction Reminder | 7 days before | Send reminder notifications |

### 10.2 Supabase Scheduled Functions

```sql
-- Update property auction status daily
SELECT cron.schedule(
  'update-property-status',
  '0 0 * * *', -- midnight daily
  $$SELECT update_property_auction_status()$$
);

-- Record pipeline metrics every 15 minutes
SELECT cron.schedule(
  'record-metrics',
  '*/15 * * * *',
  $$SELECT record_pipeline_metrics()$$
);
```

---

## 11. Integrations

### 11.1 n8n Integration

```typescript
// lib/n8n/client.ts
class N8NClient {
  private baseUrl: string;

  async triggerWorkflow(webhookPath: string, data?: object): Promise<void> {
    const response = await fetch(`${this.baseUrl}/webhook/${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    if (!response.ok) throw new Error('Failed to trigger workflow');
  }

  async getWorkflowStatus(executionId: string): Promise<WorkflowExecution> {
    // Query n8n API for execution status
  }
}

export const n8n = new N8NClient(process.env.N8N_URL!);
```

### 11.2 Supabase Storage

```typescript
// lib/supabase/storage.ts
export async function uploadScreenshot(
  propertyId: string,
  file: Blob
): Promise<string> {
  const fileName = `properties/${propertyId}/screenshot.png`;
  const { data, error } = await supabase.storage
    .from('screenshots')
    .upload(fileName, file, { upsert: true });

  if (error) throw error;
  return supabase.storage.from('screenshots').getPublicUrl(fileName).data.publicUrl;
}

export async function getScreenshotUrl(propertyId: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('screenshots')
    .list(`properties/${propertyId}`);

  if (!data?.length) return null;
  return supabase.storage
    .from('screenshots')
    .getPublicUrl(`properties/${propertyId}/screenshot.png`).data.publicUrl;
}
```

---

## 12. UI/UX Design System

### 12.1 Color Palette

```css
/* tailwind.config.js */
colors: {
  // Primary - Blue
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  // Status Colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Validation Status
  approved: '#22c55e',
  caution: '#f59e0b',
  rejected: '#ef4444',
  pending: '#6b7280',

  // Pipeline Stages
  parsed: '#94a3b8',
  enriched: '#60a5fa',
  validated: '#a78bfa',
  approved: '#22c55e',
}
```

### 12.2 Typography

```css
/* Font Family */
font-family: 'Inter', system-ui, sans-serif;

/* Font Sizes */
text-xs: 0.75rem;    /* 12px - labels, badges */
text-sm: 0.875rem;   /* 14px - body small */
text-base: 1rem;     /* 16px - body */
text-lg: 1.125rem;   /* 18px - body large */
text-xl: 1.25rem;    /* 20px - heading small */
text-2xl: 1.5rem;    /* 24px - heading */
text-3xl: 1.875rem;  /* 30px - heading large */
text-4xl: 2.25rem;   /* 36px - display */
```

### 12.3 Spacing

```css
/* Base unit: 4px */
space-1: 0.25rem;  /* 4px */
space-2: 0.5rem;   /* 8px */
space-3: 0.75rem;  /* 12px */
space-4: 1rem;     /* 16px */
space-5: 1.25rem;  /* 20px */
space-6: 1.5rem;   /* 24px */
space-8: 2rem;     /* 32px */
space-10: 2.5rem;  /* 40px */
space-12: 3rem;    /* 48px */
```

### 12.4 Border Radius

```css
rounded-sm: 0.125rem;  /* 2px */
rounded: 0.25rem;      /* 4px - buttons, inputs */
rounded-md: 0.375rem;  /* 6px - cards */
rounded-lg: 0.5rem;    /* 8px - modals */
rounded-xl: 0.75rem;   /* 12px - large cards */
rounded-full: 9999px;  /* badges, avatars */
```

### 12.5 Shadows

```css
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

### 12.6 Responsive Breakpoints

```css
sm: 640px;   /* Mobile landscape */
md: 768px;   /* Tablet */
lg: 1024px;  /* Desktop */
xl: 1280px;  /* Large desktop */
2xl: 1536px; /* Extra large */
```

### 12.7 Dark Mode

The application should support dark mode using Tailwind's `dark:` variant. Use CSS variables for colors that change between modes:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 47.4% 11.2%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 47.4% 11.2%;
  /* ... etc */
}

.dark {
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  --card: 224 71% 4%;
  --card-foreground: 213 31% 91%;
  /* ... etc */
}
```

---

## 13. State Management

### 13.1 Server State (TanStack Query)

```typescript
// hooks/queries/use-properties.ts
export function useProperties(filters: PropertyFilters) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: () => fetchProperties(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchProperty(id),
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProperty,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['properties']);
      queryClient.setQueryData(['property', variables.id], data);
    },
  });
}
```

### 13.2 Client State (Zustand)

```typescript
// stores/ui-store.ts
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  tablePageSize: number;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setTablePageSize: (size: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'system',
      tablePageSize: 50,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => set({ theme }),
      setTablePageSize: (size) => set({ tablePageSize: size }),
    }),
    { name: 'ui-store' }
  )
);

// stores/filters-store.ts
interface FiltersState {
  propertyFilters: PropertyFilters;
  countyFilters: CountyFilters;
  setPropertyFilters: (filters: Partial<PropertyFilters>) => void;
  setCountyFilters: (filters: Partial<CountyFilters>) => void;
  resetFilters: () => void;
}

export const useFiltersStore = create<FiltersState>()((set) => ({
  propertyFilters: defaultPropertyFilters,
  countyFilters: defaultCountyFilters,
  setPropertyFilters: (filters) =>
    set((state) => ({
      propertyFilters: { ...state.propertyFilters, ...filters },
    })),
  setCountyFilters: (filters) =>
    set((state) => ({
      countyFilters: { ...state.countyFilters, ...filters },
    })),
  resetFilters: () =>
    set({
      propertyFilters: defaultPropertyFilters,
      countyFilters: defaultCountyFilters,
    }),
}));
```

---

## 14. Error Handling

### 14.1 Error Boundary

```typescript
// components/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### 14.2 API Error Handling

```typescript
// lib/api/error.ts
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: unknown): never {
  if (error instanceof APIError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new APIError(error.message, 500);
  }
  throw new APIError('An unexpected error occurred', 500);
}

// Usage in API routes
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return Response.json(data);
  } catch (error) {
    if (error instanceof APIError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 14.3 Toast Notifications

```typescript
// lib/toast.ts
import { toast } from 'sonner';

export function showSuccess(message: string) {
  toast.success(message);
}

export function showError(message: string) {
  toast.error(message);
}

export function showLoading(message: string) {
  return toast.loading(message);
}

export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}
```

---

## 15. Testing Requirements

### 15.1 Unit Tests (Vitest)

```typescript
// __tests__/components/status-badge.test.tsx
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/shared/status-badge';

describe('StatusBadge', () => {
  it('renders approved status correctly', () => {
    render(<StatusBadge status="approved" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toHaveClass('bg-green-100');
  });

  it('renders rejected status correctly', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toHaveClass('bg-red-100');
  });
});
```

### 15.2 Integration Tests

```typescript
// __tests__/api/properties.test.ts
import { GET } from '@/app/api/properties/route';

describe('/api/properties', () => {
  it('returns properties with pagination', async () => {
    const request = new Request('http://localhost/api/properties?page=1&limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(10);
    expect(data.total).toBeGreaterThan(0);
  });
});
```

### 15.3 E2E Tests (Playwright)

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays KPI cards', async ({ page }) => {
    await expect(page.getByText('Total Properties')).toBeVisible();
    await expect(page.getByText('Approved Properties')).toBeVisible();
  });

  test('clicking KPI card navigates to properties', async ({ page }) => {
    await page.getByText('Total Properties').click();
    await expect(page).toHaveURL('/properties');
  });
});
```

---

## 16. Deployment

### 16.1 Environment Variables

```bash
# .env.local (development)
# .env.production (production)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx

# n8n
N8N_URL=https://n8n.lfb-investments.com
N8N_API_KEY=xxxxx

# App
NEXT_PUBLIC_APP_URL=https://taxdeedflow.com
```

### 16.2 Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key",
    "N8N_URL": "@n8n-url"
  }
}
```

### 16.3 Database Migrations

```bash
# Run migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/types/supabase.ts
```

---

## 17. File Structure

```
tax-deed-flow/
├── .env.local
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── next.config.js
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
│
├── public/
│   ├── favicon.ico
│   └── images/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── signup/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx                    # Dashboard
│   │   │   ├── layout.tsx                  # Dashboard layout with sidebar
│   │   │   │
│   │   │   ├── orchestration/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── properties/
│   │   │   │   ├── page.tsx                # Property list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # Property detail
│   │   │   │
│   │   │   ├── counties/
│   │   │   │   ├── page.tsx                # County list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # County detail
│   │   │   │
│   │   │   ├── auctions/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── batch-jobs/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── data-integrity/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.tsx                # Redirect to profile
│   │   │       ├── profile/
│   │   │       │   └── page.tsx
│   │   │       ├── notifications/
│   │   │       │   └── page.tsx
│   │   │       ├── integrations/
│   │   │       │   └── page.tsx
│   │   │       └── users/
│   │   │           └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts
│   │   │   ├── properties/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── counties/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── orchestration/
│   │   │   │   ├── sessions/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── work-queue/
│   │   │   │   │   └── route.ts
│   │   │   │   └── bottlenecks/
│   │   │   │       └── route.ts
│   │   │   ├── batch-jobs/
│   │   │   │   └── route.ts
│   │   │   ├── data-integrity/
│   │   │   │   └── route.ts
│   │   │   └── auctions/
│   │   │       └── route.ts
│   │   │
│   │   ├── globals.css
│   │   └── layout.tsx                      # Root layout
│   │
│   ├── components/
│   │   ├── ui/                             # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── nav-item.tsx
│   │   │   └── user-menu.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── kpi-card.tsx
│   │   │   ├── pipeline-funnel.tsx
│   │   │   ├── upcoming-auctions.tsx
│   │   │   ├── bottleneck-alert.tsx
│   │   │   ├── activity-feed.tsx
│   │   │   └── county-progress-table.tsx
│   │   │
│   │   ├── properties/
│   │   │   ├── property-table.tsx
│   │   │   ├── property-card.tsx
│   │   │   ├── property-detail.tsx
│   │   │   ├── property-filters.tsx
│   │   │   └── property-map.tsx
│   │   │
│   │   ├── orchestration/
│   │   │   ├── session-card.tsx
│   │   │   ├── work-queue-table.tsx
│   │   │   ├── session-plan.tsx
│   │   │   ├── assignment-table.tsx
│   │   │   ├── start-session-dialog.tsx
│   │   │   └── end-session-dialog.tsx
│   │   │
│   │   ├── counties/
│   │   │   ├── county-table.tsx
│   │   │   ├── county-card.tsx
│   │   │   └── county-detail.tsx
│   │   │
│   │   ├── auctions/
│   │   │   ├── auction-calendar.tsx
│   │   │   ├── auction-list.tsx
│   │   │   └── auction-card.tsx
│   │   │
│   │   ├── batch-jobs/
│   │   │   ├── job-table.tsx
│   │   │   ├── job-progress.tsx
│   │   │   └── create-job-dialog.tsx
│   │   │
│   │   ├── data-integrity/
│   │   │   ├── audit-summary.tsx
│   │   │   ├── issue-table.tsx
│   │   │   └── fix-actions.tsx
│   │   │
│   │   └── shared/
│   │       ├── data-table.tsx
│   │       ├── status-badge.tsx
│   │       ├── countdown-timer.tsx
│   │       ├── loading-spinner.tsx
│   │       ├── empty-state.tsx
│   │       ├── error-fallback.tsx
│   │       └── confirm-dialog.tsx
│   │
│   ├── hooks/
│   │   ├── use-supabase.ts
│   │   ├── use-realtime.ts
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   └── queries/
│   │       ├── use-dashboard.ts
│   │       ├── use-properties.ts
│   │       ├── use-counties.ts
│   │       ├── use-orchestration.ts
│   │       ├── use-batch-jobs.ts
│   │       └── use-auctions.ts
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── n8n/
│   │   │   └── client.ts
│   │   ├── utils/
│   │   │   ├── cn.ts                       # className utility
│   │   │   ├── format.ts                   # Date, currency formatting
│   │   │   └── validators.ts               # Zod schemas
│   │   └── constants/
│   │       ├── routes.ts
│   │       ├── status.ts
│   │       └── agents.ts
│   │
│   ├── stores/
│   │   ├── ui-store.ts
│   │   ├── filters-store.ts
│   │   └── auth-store.ts
│   │
│   └── types/
│       ├── supabase.ts                     # Generated types
│       ├── property.ts
│       ├── county.ts
│       ├── orchestration.ts
│       ├── batch-job.ts
│       └── api.ts
│
├── supabase/
│   ├── migrations/
│   │   └── 00001_initial_schema.sql
│   └── functions/
│       ├── trigger-n8n-workflow/
│       │   └── index.ts
│       └── send-notification/
│           └── index.ts
│
├── __tests__/
│   ├── components/
│   ├── api/
│   └── utils/
│
└── e2e/
    ├── dashboard.spec.ts
    ├── properties.spec.ts
    └── auth.spec.ts
```

---

## 18. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Tailwind CSS and shadcn/ui
- [ ] Configure Supabase client
- [ ] Implement authentication flow
- [ ] Create basic layout (header, sidebar)
- [ ] Set up TanStack Query and Zustand

### Phase 2: Core Pages (Week 2)
- [ ] Dashboard with KPIs and charts
- [ ] Properties list with filters and pagination
- [ ] Property detail page
- [ ] Counties list and detail pages

### Phase 3: Orchestration (Week 3)
- [ ] Orchestration console
- [ ] Session management
- [ ] Work queue display
- [ ] Agent assignment tracking
- [ ] Real-time updates

### Phase 4: Supporting Features (Week 4)
- [ ] Auction calendar
- [ ] Batch job management
- [ ] Data integrity tools
- [ ] Settings pages
- [ ] Notifications

### Phase 5: Polish (Week 5)
- [ ] Dark mode
- [ ] Responsive design
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Testing
- [ ] Documentation

---

## 19. Notes for AI Code Generator

1. **Use the exact database schema** - Tables already exist in Supabase
2. **Follow shadcn/ui patterns** - Use their component APIs
3. **Implement real-time updates** - Critical for orchestration and batch jobs
4. **Handle loading and error states** - Every data fetch needs these
5. **Use TypeScript strictly** - Generate proper types from Supabase
6. **Implement proper caching** - Use TanStack Query effectively
7. **Follow accessibility guidelines** - WCAG 2.1 AA compliance
8. **Mobile-first responsive design** - Works on all screen sizes
9. **Dark mode support** - Use CSS variables for theming
10. **Performance optimization** - Use dynamic imports, image optimization

---

## 20. Contact

For questions about this specification:
- **Project Owner**: Fabricio Rocha
- **Email**: fds.rocha@gmail.com
- **n8n Instance**: https://n8n.lfb-investments.com
- **Supabase Project**: oiiwlzobizftprqspbzt

---

*This specification was generated on January 9, 2026 for the Tax Deed Flow application.*
