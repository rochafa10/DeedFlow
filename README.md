# Tax Deed Platform 🏠

A comprehensive web platform for researching, analyzing, and tracking tax deed and tax lien properties across the United States. Built with Next.js, Supabase, and n8n automation.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.0-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Ready-green)

## ⚠️ CRITICAL DEPENDENCY: n8n-MCP Project

> **IMPORTANT FOR AI ASSISTANTS (Cursor, Kilocode, Claude, etc.):**
> 
> This project **REQUIRES** the n8n-MCP project for ALL workflow automation management.
> 
> **n8n-MCP Location**: `../n8n-mcp` (parent directory)
> 
> **NEVER** modify n8n workflows directly. **ALWAYS** use n8n-MCP tools.
> 
> See [`n8n/N8N_MCP_INTEGRATION.md`](n8n/N8N_MCP_INTEGRATION.md) for details.

## 🚀 Overview

The Tax Deed Platform is a powerful tool designed for real estate investors to:
- Track tax deed and tax lien auctions across multiple states
- Analyze property investment potential with advanced financial calculators
- Generate detailed property inspection reports
- Automate property data enrichment from multiple sources
- Calculate ROI for different investment strategies

## ✨ Key Features

### 📊 Property Management
- **Comprehensive Property Database** - Track thousands of properties with detailed information
- **Smart Filtering & Sorting** - Find properties by state, county, classification, score
- **Bulk Import** - Import properties from CSV/Excel files
- **Real-time Enrichment** - Automatic data fetching from county records, Zillow, and more

### 💰 Financial Analysis
- **Multiple Investment Strategies**
  - Fix & Flip Calculator
  - BRRRR Strategy Analysis
  - Wholesale Deal Analyzer
  - Buy & Hold Metrics
- **ROI Calculations** - Detailed profit/loss projections
- **Market Comparisons** - Compare with local market data

### 📅 Auction Calendar
- **Multi-State Coverage** - Track auctions across all 50 states
- **Interactive Calendar View** - Visual auction scheduling
- **Auction Details** - Registration requirements, deposit amounts, property counts
- **Document Management** - Access auction rules and property lists

### 🔍 Property Details
- **Comprehensive Reports** - 360-degree view of each property
- **Risk Assessment** - Flood zones, code violations, environmental issues
- **Neighborhood Analysis** - Walk scores, crime rates, school ratings
- **Ownership Information** - Current owner details and occupancy status
- **Liens & Encumbrances** - Complete lien history and amounts

### 📋 Inspection Reports
- **Automated Generation** - Create detailed inspection reports
- **Categorized Items** - Exterior, foundation, systems, interior
- **Cost Estimates** - Repair cost calculations
- **Condition Scoring** - Good, fair, poor ratings
- **Priority Tracking** - Identify critical repairs

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/ui
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL)
- **Automation**: n8n workflows
- **APIs**: RESTful + Webhooks
- **Real-time**: Supabase Subscriptions

### Infrastructure
- **Hosting**: Vercel (Frontend)
- **Database**: Supabase Cloud
- **Workflows**: n8n (self-hosted or cloud)

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- n8n instance (optional for automation)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/tax-deed-platform.git
cd tax-deed-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
N8N_WEBHOOK_URL=your-n8n-webhook-url
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open the application**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Documentation

- [Setup Guide](docs/SETUP_GUIDE.md) - Complete setup instructions
- [API Documentation](docs/API_DOCUMENTATION.md) - API endpoints and webhooks
- [Features Guide](docs/FEATURES.md) - Detailed feature documentation
- [Architecture](docs/ARCHITECTURE.md) - Technical architecture details
- [User Guide](docs/USER_GUIDE.md) - End-user documentation

## 🗂️ Project Structure

```
tax-deed-platform/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── calendar/          # Calendar page
│   ├── properties/        # Properties pages
│   │   ├── [id]/         # Dynamic property routes
│   │   │   ├── analysis/ # Financial analysis
│   │   │   ├── details/  # Property details
│   │   │   └── inspection/ # Inspection reports
│   │   └── page.tsx      # Properties list
│   └── page.tsx          # Home page
├── components/            # Reusable components
│   └── ui/               # UI components
├── lib/                   # Utility functions
├── public/               # Static assets
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
├── n8n/                  # Workflow configurations
│   └── workflows/        # n8n workflow JSON files
└── docs/                 # Documentation
```

## 🚦 Getting Started

### For Investors
1. Browse properties by state
2. Filter by investment criteria
3. Analyze deals with financial calculators
4. Track upcoming auctions
5. Generate inspection reports

### For Developers
1. Follow the [Setup Guide](docs/SETUP_GUIDE.md)
2. Review the [API Documentation](docs/API_DOCUMENTATION.md)
3. Check [Contributing Guidelines](docs/CONTRIBUTING.md)
4. Run tests with `npm test`

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📊 Database Schema

The platform uses a comprehensive PostgreSQL database with 20+ tables including:
- Properties and valuations
- Auctions and auction properties
- Financial analyses
- Inspection reports
- Risk assessments
- Neighborhood data
- Liens and encumbrances

See [Database Schema](supabase/migrations/001_initial_schema.sql) for details.

## 🔄 n8n Workflows

Automated workflows handle:
- Property data enrichment
- Inspection report generation
- Financial calculations
- Auction scraping
- Bulk imports
- Email notifications

## 🚀 Deployment

### Frontend (Vercel)
```bash
vercel deploy
```

### Database (Supabase)
1. Create project at [supabase.com](https://supabase.com)
2. Run migrations from SQL editor
3. Configure environment variables

### Workflows (n8n)
1. Deploy n8n instance
2. Import workflow configurations
3. Set up credentials
4. Activate webhooks

## 📈 Performance

- **Page Load**: < 2s
- **API Response**: < 500ms
- **Database Queries**: Optimized with indexes
- **Caching**: Built-in Next.js caching
- **CDN**: Static assets via Vercel Edge Network

## 🔒 Security

- Row Level Security (RLS) on sensitive tables
- API rate limiting
- Webhook signature validation
- Environment variable protection
- SQL injection prevention
- XSS protection

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database by [Supabase](https://supabase.com/)
- Automation by [n8n](https://n8n.io/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)

## 📧 Support

For support, email support@taxdeedplatform.com or open an issue on GitHub.

## 🗺️ Roadmap

### Q1 2024
- [x] Core platform development
- [x] Property management features
- [x] Financial calculators
- [ ] User authentication

### Q2 2024
- [ ] Mobile responsive design
- [ ] Advanced mapping features
- [ ] Email notifications
- [ ] Payment processing

### Q3 2024
- [ ] Mobile app (React Native)
- [ ] AI-powered property scoring
- [ ] Automated bidding strategies
- [ ] API for third-party integrations

### Q4 2024
- [ ] Machine learning predictions
- [ ] Advanced analytics dashboard
- [ ] White-label solution
- [ ] Enterprise features

---

**Built with ❤️ for Real Estate Investors**

*Making tax deed investing accessible and profitable for everyone*

---

**Built with ❤️ for Real Estate Investors**

*Making tax deed investing accessible and profitable for everyone*
