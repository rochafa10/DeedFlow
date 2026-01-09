# Tax Deed Flow

A comprehensive web application for managing tax deed auction investments. Automates research, analysis, and bidding for tax lien and tax deed properties across multiple U.S. counties.

## Overview

Tax Deed Flow is a multi-agent system that coordinates AI agents to handle:
- County research and document discovery
- Property list parsing and data extraction
- Property enrichment via Regrid API
- Visual validation of properties
- Auction monitoring and bidding strategy
- Pipeline orchestration and batch processing

## Technology Stack

### Frontend
- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (Radix-based components)
- **TanStack Query** (Server state)
- **Zustand** (Client state)
- **Recharts** (Visualizations)

### Backend
- **Supabase** (PostgreSQL, Auth, Storage, Realtime)
- **Edge Functions** (Deno)

### External Services
- **n8n** (Workflow automation)
- **Perplexity API** (AI research)
- **Google Custom Search** (Document finding)
- **Regrid API** (Property data)

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Supabase account with configured project
- Environment variables set up

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd TaxDeedFlow
   ```

2. Run the setup script:
   ```bash
   ./init.sh
   ```

   Or manually:
   ```bash
   pnpm install
   cp .env.example .env.local
   # Edit .env.local with your credentials
   pnpm dev
   ```

3. Open http://localhost:3000

### Environment Variables

Create a `.env.local` file with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# n8n
N8N_URL=https://n8n.lfb-investments.com
N8N_API_KEY=your-n8n-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Application Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, Signup pages
│   ├── (dashboard)/        # Main application pages
│   │   ├── page.tsx        # Dashboard
│   │   ├── orchestration/  # Agent orchestration
│   │   ├── properties/     # Property pipeline
│   │   ├── counties/       # County management
│   │   ├── auctions/       # Auction calendar
│   │   ├── batch-jobs/     # Batch processing
│   │   ├── data-integrity/ # Audit tools
│   │   └── settings/       # User settings
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # Header, sidebar
│   ├── dashboard/          # Dashboard widgets
│   ├── properties/         # Property components
│   ├── orchestration/      # Session management
│   └── shared/             # Reusable components
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities
│   ├── supabase/           # Supabase client
│   └── utils/              # Helper functions
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```

## Features

### Dashboard
- KPI cards showing pipeline status
- Pipeline funnel visualization
- Upcoming auctions with countdown
- Bottleneck alerts
- Activity feed
- County progress table

### Properties Pipeline
- Browse all properties with filtering
- Stage-based filtering (Parsed → Enriched → Validated → Approved)
- Property detail with Regrid data
- Visual validation results
- Notes and watchlist functionality

### Orchestration Console
- Start/end orchestration sessions
- View prioritized work queue
- AI-recommended session plans
- Track agent assignments
- Real-time progress updates

### Auction Calendar
- Visual calendar with auction dates
- Registration deadline tracking
- Auction rules by county
- Investor briefings
- Alert management

### Batch Jobs
- Create and monitor batch jobs
- Progress tracking
- Pause/resume functionality
- Error logging

### Data Integrity
- Run full system audits
- View data quality issues
- Apply automatic fixes
- Track orphaned records

## User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access, user management, system config |
| **Analyst** | View all, edit properties, run agents |
| **Viewer** | Read-only access to dashboards and reports |

## Database Schema

The application uses 17+ tables in Supabase including:
- `counties` - Master county list
- `properties` - Extracted property data
- `regrid_data` - Property enrichment
- `property_visual_validation` - Validation results
- `upcoming_sales` - Auction dates
- `documents` - PDFs and property lists
- `orchestration_sessions` - Session tracking
- `agent_assignments` - Work delegation
- `batch_jobs` - Batch processing
- `pipeline_metrics` - Performance tracking

## Development

### Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test

# Generate Supabase types
supabase gen types typescript --local > src/types/supabase.ts
```

### Testing

- **Unit tests**: Vitest
- **E2E tests**: Playwright

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e
```

## Deployment

The application is designed for deployment on Vercel:

1. Connect repository to Vercel
2. Set environment variables
3. Deploy

See `vercel.json` for configuration.

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests
4. Submit pull request

## License

Proprietary - LFB Investments

## Contact

- **Owner**: Fabricio Rocha
- **Email**: fds.rocha@gmail.com
