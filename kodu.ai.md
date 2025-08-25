# Kodu AI Assistant Configuration

## Project Overview
Tax Deed Platform - A comprehensive web application for researching and analyzing tax deed/lien properties across the United States.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, React 19
- **Styling**: Tailwind CSS v4, Shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Automation**: n8n workflows
- **Deployment**: Vercel (frontend), Supabase Cloud (database)

## Project Structure
```
/app                 → Next.js app directory (pages and API routes)
/components/ui       → Reusable UI components
/lib                → Utilities and types
/supabase           → Database migrations
/n8n                → Workflow configurations
/docs               → Documentation
```

## Key Features to Maintain
1. Property Management System (List, Details, Analysis)
2. Financial Calculators (Fix & Flip, BRRRR, Wholesale, Buy & Hold)
3. Auction Calendar
4. Inspection Reports
5. Data Enrichment via n8n webhooks

## Database Schema
Primary tables: properties, property_valuations, auctions, inspections, financial_analyses
See: `/supabase/migrations/001_initial_schema.sql`

## API Endpoints
- `POST /api/webhook` → n8n webhook handler
- `POST /api/properties/enrich` → Property enrichment
- `GET /api/properties/[id]` → Property details
- See: `/docs/API_DOCUMENTATION.md`

## Coding Standards

### TypeScript/React
```typescript
// Component template
interface Props {
  data: Type;
}

export default function Component({ data }: Props) {
  return <div className="tailwind-classes">{/* content */}</div>;
}
```

### API Routes
```typescript
// app/api/[route]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Styling
- Use Tailwind CSS classes only
- Follow existing component patterns in `/components/ui`
- Maintain consistent spacing: p-4, gap-4, mb-8

### State Management
- Use React hooks (useState, useEffect)
- URL state with useSearchParams for filters
- No external state management libraries

## Common Patterns

### Data Fetching
```typescript
// Client component
const [data, setData] = useState<Type | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/endpoint')
    .then(res => res.json())
    .then(setData)
    .finally(() => setLoading(false));
}, []);
```

### Form Handling
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
};
```

### Error Handling
```typescript
try {
  // operation
} catch (error) {
  console.error('Operation failed:', error);
  // Show user-friendly error
}
```

## File Naming Conventions
- Pages: `app/[feature]/page.tsx`
- API: `app/api/[endpoint]/route.ts`
- Components: `components/ComponentName.tsx` (PascalCase)
- Utils: `lib/utilName.ts` (camelCase)
- Types: `lib/types.ts`

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=       # Required
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Required
N8N_WEBHOOK_URL=                # Required for automation
```

## Testing Approach
- Unit tests for utilities
- Component tests with React Testing Library
- API route tests
- Run: `npm test`

## Deployment Checklist
1. Run `npm run build` locally
2. Check TypeScript: `npm run type-check`
3. Run linter: `npm run lint`
4. Test all features
5. Deploy to Vercel

## Important Commands
```bash
npm run dev          # Start development
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking
npm test            # Run tests
```

## Areas for AI Assistance
1. **Bug Fixes**: Check error logs, review related code
2. **New Features**: Follow existing patterns, update types
3. **Refactoring**: Maintain functionality, improve performance
4. **Documentation**: Update when code changes
5. **Testing**: Write tests for new code

## Do NOT Change
- Database schema without migration
- API endpoint URLs (breaks frontend)
- Component library (Shadcn/ui patterns)
- Tailwind configuration
- Environment variable names

## Resources
- Architecture: `/docs/ARCHITECTURE.md`
- Features: `/docs/FEATURES.md`
- API Docs: `/docs/API_DOCUMENTATION.md`
- Setup: `/docs/SETUP_GUIDE.md`

## Current Focus Areas
- Property data enrichment
- Financial analysis accuracy
- Auction calendar functionality
- Performance optimization
- Mobile responsiveness

## Known Issues
- n8n webhooks need manual activation
- Some external APIs require paid keys
- Rate limiting on enrichment endpoints

## Contact
For questions about architecture or business logic, refer to documentation or create an issue.