# Tax Deed Platform - Technical Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Design](#database-design)
5. [API Architecture](#api-architecture)
6. [Workflow Automation](#workflow-automation)
7. [Security Architecture](#security-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Performance Optimization](#performance-optimization)
10. [Monitoring & Logging](#monitoring--logging)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Users (Browser)                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  App Router │ React Components │ Tailwind CSS │ TypeScript│   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐   │
│  │  REST API  │  │  Webhooks  │  │  Real-time Subscriptions│   │
│  └────────────┘  └────────────┘  └────────────────────────┘   │
└──────┬──────────────┬─────────────────────┬────────────────────┘
       │              │                      │
       ▼              ▼                      ▼
┌──────────────┐ ┌──────────────┐ ┌────────────────────────────┐
│   Supabase   │ │     n8n      │ │   External APIs            │
│  PostgreSQL  │ │  Workflows   │ │  (County, Zillow, Google)  │
└──────────────┘ └──────────────┘ └────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15 | React framework with App Router |
| Styling | Tailwind CSS v4 | Utility-first CSS framework |
| UI Components | Shadcn/ui | Reusable component library |
| Language | TypeScript | Type-safe JavaScript |
| Database | Supabase/PostgreSQL | Primary data storage |
| Automation | n8n | Workflow automation |
| Hosting | Vercel | Frontend deployment |
| CDN | Vercel Edge Network | Static asset delivery |

---

## Frontend Architecture

### Directory Structure

```
app/
├── (auth)/                 # Authentication routes (future)
├── api/                    # API routes
│   ├── webhook/           # Webhook handlers
│   ├── properties/        # Property endpoints
│   └── financial/         # Financial calculations
├── calendar/              # Auction calendar
├── properties/            # Property management
│   ├── [id]/             # Dynamic property routes
│   │   ├── analysis/     # Financial analysis
│   │   ├── details/      # Property details
│   │   └── inspection/   # Inspection reports
│   └── page.tsx          # Properties list
├── layout.tsx             # Root layout
└── page.tsx              # Dashboard
```

### Component Architecture

#### Component Hierarchy
```
<RootLayout>
  <Header />
  <main>
    <Dashboard>
      <StateSelector />
      <QuickStats />
      <QuickActions />
    </Dashboard>
    OR
    <PropertiesPage>
      <Filters />
      <PropertiesTable>
        <PropertyRow />
      </PropertiesTable>
      <Pagination />
    </PropertiesPage>
  </main>
</RootLayout>
```

#### Component Types

1. **Page Components** (`/app/*/page.tsx`)
   - Server or Client components
   - Data fetching
   - Layout composition

2. **UI Components** (`/components/ui/`)
   - Reusable primitives
   - Styled with Tailwind
   - Accessible by default

3. **Feature Components**
   - Business logic
   - State management
   - API integration

### State Management

#### Client State
```typescript
// Local component state
const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());

// URL state
const searchParams = useSearchParams();
const stateParam = searchParams.get('state');

// Form state
const [formData, setFormData] = useState<PropertyForm>({...});
```

#### Server State
- Supabase real-time subscriptions
- SWR/React Query for caching (future)
- Optimistic updates

### Routing Strategy

#### File-based Routing
```
/properties                 → Properties list
/properties/[id]/details    → Property details
/properties/[id]/analysis   → Financial analysis
/calendar                   → Auction calendar
```

#### Dynamic Routes
```typescript
// app/properties/[id]/details/page.tsx
export default function PropertyDetails({ params }: { params: { id: string } }) {
  // Use params.id to fetch property
}
```

#### API Routes
```typescript
// app/api/webhook/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  // Handle webhook
}
```

---

## Backend Architecture

### Supabase Configuration

#### Database Structure
```sql
-- Core tables
properties          -- Main property data
property_valuations -- Financial metrics
property_owners     -- Ownership information
property_liens      -- Liens and encumbrances
auctions           -- Auction information
inspections        -- Inspection reports
financial_analyses -- Investment calculations
```

#### Row Level Security (RLS)
```sql
-- Example RLS policy
CREATE POLICY "Users can view all properties" 
ON properties FOR SELECT 
USING (true);

CREATE POLICY "Users can update own saved properties" 
ON user_saved_properties FOR UPDATE 
USING (auth.uid() = user_id);
```

#### Database Functions
```sql
-- Calculate property score
CREATE FUNCTION calculate_property_score(property_id UUID)
RETURNS INTEGER AS $$ ... $$;

-- Get total liens
CREATE FUNCTION calculate_total_liens(property_id UUID)
RETURNS DECIMAL AS $$ ... $$;
```

### n8n Workflow Architecture

#### Workflow Types

1. **Webhook-triggered**
   - Property enrichment
   - Inspection generation
   - Financial analysis

2. **Scheduled**
   - Daily auction scraping
   - Data synchronization
   - Report generation

3. **Event-driven**
   - Database changes
   - File uploads
   - Email notifications

#### Workflow Components

```javascript
{
  "nodes": [
    {
      "type": "webhook",
      "name": "Trigger",
      "webhookId": "property-enrichment"
    },
    {
      "type": "http",
      "name": "Fetch County Data",
      "url": "{{county_api}}/property/{{parcelNumber}}"
    },
    {
      "type": "code",
      "name": "Transform Data",
      "code": "// Data transformation logic"
    },
    {
      "type": "supabase",
      "name": "Save to Database",
      "operation": "upsert"
    }
  ]
}
```

---

## Database Design

### Entity Relationship Diagram

```
properties
    │
    ├── property_valuations (1:n)
    ├── property_owners (1:1)
    ├── property_liens (1:n)
    ├── property_legal (1:1)
    ├── risk_assessments (1:n)
    ├── neighborhood_analysis (1:n)
    ├── inspections (1:n)
    │   └── inspection_items (1:n)
    ├── financial_analyses (1:n)
    └── property_photos (1:n)

auctions
    └── auction_properties (n:m) → properties

counties
    ├── properties (1:n)
    └── auctions (1:n)

states
    └── counties (1:n)
```

### Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_properties_county ON properties(county_id);
CREATE INDEX idx_properties_classification ON properties(classification);
CREATE INDEX idx_properties_score ON properties(score);
CREATE INDEX idx_properties_sale_date ON properties(sale_date);

-- Geospatial index
CREATE INDEX idx_properties_location ON properties 
USING GIST (ll_to_earth(latitude, longitude));
```

### Data Types

| Type | PostgreSQL | Purpose |
|------|------------|---------|
| IDs | UUID | Globally unique identifiers |
| Money | DECIMAL(12,2) | Financial amounts |
| Percentages | DECIMAL(5,4) | Rates and percentages |
| Timestamps | TIMESTAMPTZ | Time with timezone |
| Enums | Custom Types | Constrained values |
| JSON | JSONB | Flexible data storage |

---

## API Architecture

### RESTful Endpoints

```
GET    /api/properties           # List properties
GET    /api/properties/:id       # Get property
POST   /api/properties/enrich    # Enrich property
POST   /api/properties/import    # Bulk import

GET    /api/auctions             # List auctions
GET    /api/auctions/:id         # Get auction

POST   /api/financial-analysis   # Calculate financials
POST   /api/inspection-report    # Generate inspection
```

### Webhook Integration

```typescript
// Webhook handler
export async function POST(request: Request) {
  const signature = request.headers.get('x-webhook-signature');
  const body = await request.json();
  
  // Verify signature
  if (!verifyWebhookSignature(signature, body)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Route to n8n
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  return Response.json(await response.json());
}
```

### Real-time Subscriptions

```typescript
// Supabase real-time
const subscription = supabase
  .channel('property-updates')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'properties' },
    (payload) => handlePropertyChange(payload)
  )
  .subscribe();
```

### Error Handling

```typescript
class APIError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
  }
}

// Usage
throw new APIError(
  'PROPERTY_NOT_FOUND',
  404,
  `Property ${id} not found`
);
```

---

## Workflow Automation

### n8n Architecture

```
┌──────────────────────────────────────────┐
│            n8n Instance                   │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │       Workflow Engine               │ │
│  │  ┌──────────┐  ┌──────────────┐   │ │
│  │  │ Triggers │→ │   Nodes      │   │ │
│  │  └──────────┘  └──────────────┘   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │       Credentials Store             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │       Execution History             │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

### Workflow Patterns

1. **Sequential Processing**
```
Webhook → Validate → Process → Store → Respond
```

2. **Parallel Processing**
```
        ┌→ Fetch County Data ──┐
Trigger ├→ Fetch Zillow Data  ├→ Merge → Store
        └→ Fetch Google Data ──┘
```

3. **Conditional Logic**
```
Input → Evaluate → Route A (if condition)
                 → Route B (else)
```

---

## Security Architecture

### Authentication & Authorization

```typescript
// Future implementation with Supabase Auth
const { data: { user } } = await supabase.auth.getUser();

// Role-based access
const hasAccess = await checkUserPermission(user, 'properties:write');
```

### API Security

1. **Rate Limiting**
```typescript
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
```

2. **Input Validation**
```typescript
const schema = z.object({
  parcelNumber: z.string().regex(/^\d{2}-\d{2}-\d{3}-\d{3}$/),
  amount: z.number().positive()
});

const validated = schema.parse(input);
```

3. **CORS Configuration**
```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
};
```

### Data Protection

- SSL/TLS encryption in transit
- Encrypted database at rest
- Sensitive data masking
- PII handling compliance

---

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────┐
│          Vercel (Frontend)              │
│  ┌────────────────────────────────────┐ │
│  │  Next.js App                       │ │
│  │  Edge Functions                    │ │
│  │  Static Assets (CDN)               │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│        Supabase Cloud                   │
│  ┌────────────────────────────────────┐ │
│  │  PostgreSQL Database               │ │
│  │  Real-time Server                  │ │
│  │  Storage Buckets                   │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          n8n Cloud/Self-hosted          │
│  ┌────────────────────────────────────┐ │
│  │  Workflow Engine                   │ │
│  │  Webhook Server                    │ │
│  │  Scheduled Jobs                    │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: vercel/action@v20
```

### Environment Configuration

```bash
# Production
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-key
N8N_WEBHOOK_URL=https://n8n.prod.com/webhook

# Staging
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-key
N8N_WEBHOOK_URL=https://n8n.staging.com/webhook
```

---

## Performance Optimization

### Frontend Optimization

1. **Code Splitting**
```typescript
const PropertyAnalysis = dynamic(
  () => import('./PropertyAnalysis'),
  { loading: () => <Skeleton /> }
);
```

2. **Image Optimization**
```tsx
<Image
  src="/property.jpg"
  alt="Property"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

3. **Bundle Size**
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react']
  }
};
```

### Database Optimization

1. **Query Optimization**
```sql
-- Use indexes
SELECT * FROM properties WHERE county_id = $1 AND score > 70;

-- Limit results
SELECT * FROM properties LIMIT 20 OFFSET 0;

-- Aggregate efficiently
SELECT COUNT(*) FILTER (WHERE score > 70) as high_score FROM properties;
```

2. **Connection Pooling**
```typescript
const supabase = createClient(url, key, {
  db: { poolSize: 10 }
});
```

### Caching Strategy

```typescript
// API Response caching
export const revalidate = 3600; // 1 hour

// Static generation
export async function generateStaticParams() {
  const properties = await getPopularProperties();
  return properties.map(p => ({ id: p.id }));
}
```

---

## Monitoring & Logging

### Application Monitoring

```typescript
// Error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Performance monitoring
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
```

### Logging Strategy

```typescript
// Structured logging
const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  error: (error: Error, meta?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    n8n: await checkN8n(),
    storage: await checkStorage()
  };
  
  const healthy = Object.values(checks).every(c => c);
  
  return Response.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

---

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Database connection pooling
- CDN for static assets
- Load balancer ready

### Vertical Scaling
- Optimize database queries
- Implement caching layers
- Use database indexes
- Query result pagination

### Future Enhancements
- Redis caching layer
- Message queue (RabbitMQ/Kafka)
- Microservices architecture
- GraphQL API layer
- Elasticsearch for search