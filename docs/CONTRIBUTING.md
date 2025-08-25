# Contributing to Tax Deed Platform

Thank you for your interest in contributing to the Tax Deed Platform! This guide will help you get started with contributing to the project.

## Table of Contents
1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Development Workflow](#development-workflow)
5. [Code Style Guide](#code-style-guide)
6. [Testing Guidelines](#testing-guidelines)
7. [Commit Guidelines](#commit-guidelines)
8. [Pull Request Process](#pull-request-process)
9. [Project Structure](#project-structure)
10. [Common Tasks](#common-tasks)

---

## Code of Conduct

### Our Pledge
We are committed to making participation in this project a harassment-free experience for everyone, regardless of level of experience, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

### Expected Behavior
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Accept feedback gracefully
- Prioritize the community's best interests

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Public or private harassment
- Publishing private information without consent

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Git
- Code editor (VS Code recommended)
- Supabase account (free tier is fine)
- Basic knowledge of:
  - React/Next.js
  - TypeScript
  - Tailwind CSS
  - PostgreSQL

### First Steps

1. **Fork the Repository**
   ```bash
   # Go to GitHub and fork the repository
   # Then clone your fork
   git clone https://github.com/YOUR_USERNAME/tax-deed-platform.git
   cd tax-deed-platform
   ```

2. **Set Up Remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/tax-deed-platform.git
   git fetch upstream
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Setup

### Environment Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   # Supabase (required)
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   
   # n8n (optional for development)
   N8N_WEBHOOK_URL=http://localhost:5678/webhook
   WEBHOOK_SECRET=dev-secret
   
   # External APIs (optional)
   GOOGLE_MAPS_API_KEY=your-key
   ```

3. **Database Setup**
   - Create a Supabase project
   - Run migrations from `/supabase/migrations/001_initial_schema.sql`
   - Seed with sample data (optional)

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:3000

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "mtxr.sqltools",
    "mtxr.sqltools-driver-pg",
    "github.copilot"
  ]
}
```

---

## Development Workflow

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/add-map-view`)
- `fix/` - Bug fixes (e.g., `fix/property-sorting`)
- `refactor/` - Code refactoring (e.g., `refactor/api-routes`)
- `docs/` - Documentation (e.g., `docs/update-readme`)
- `test/` - Testing (e.g., `test/add-property-tests`)
- `chore/` - Maintenance (e.g., `chore/update-dependencies`)

### Development Process

1. **Sync with Upstream**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature
   ```

3. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

4. **Test Locally**
   ```bash
   npm run test
   npm run lint
   npm run type-check
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

6. **Push to Fork**
   ```bash
   git push origin feature/your-feature
   ```

7. **Create Pull Request**
   - Go to GitHub
   - Create PR from your fork to main repo
   - Fill out PR template

---

## Code Style Guide

### TypeScript

```typescript
// Use explicit types
interface PropertyData {
  id: string;
  parcelNumber: string;
  address: string;
}

// Use async/await over promises
async function fetchProperty(id: string): Promise<PropertyData> {
  const response = await fetch(`/api/properties/${id}`);
  return response.json();
}

// Use const for immutable values
const MAX_RESULTS = 100;

// Use descriptive variable names
const propertyScore = calculateInvestmentScore(property);
```

### React/Next.js

```tsx
// Use functional components
export default function PropertyCard({ property }: { property: Property }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{property.address}</CardTitle>
      </CardHeader>
    </Card>
  );
}

// Use hooks appropriately
function usePropertyData(id: string) {
  const [data, setData] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchProperty(id).then(setData).finally(() => setLoading(false));
  }, [id]);
  
  return { data, loading };
}

// Organize imports
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import type { Property } from '@/lib/types';
```

### Tailwind CSS

```tsx
// Use Tailwind classes consistently
<div className="flex items-center justify-between p-4 border rounded-lg">
  <h2 className="text-xl font-semibold">Title</h2>
  <Button variant="outline" size="sm">
    Action
  </Button>
</div>

// Group related classes
<div className={cn(
  "rounded-lg border p-4",
  "hover:bg-accent hover:border-primary",
  "transition-all duration-200"
)}>
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `PropertyCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- Pages: `lowercase.tsx` (e.g., `page.tsx`, `layout.tsx`)
- API Routes: `route.ts`
- Types: `PascalCase.ts` (e.g., `Property.ts`)

---

## Testing Guidelines

### Unit Tests

```typescript
// __tests__/utils/formatCurrency.test.ts
import { formatCurrency } from '@/lib/utils';

describe('formatCurrency', () => {
  it('formats positive numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
  });
  
  it('formats negative numbers correctly', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });
  
  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });
});
```

### Component Tests

```tsx
// __tests__/components/PropertyCard.test.tsx
import { render, screen } from '@testing-library/react';
import PropertyCard from '@/components/PropertyCard';

describe('PropertyCard', () => {
  const mockProperty = {
    id: '1',
    address: '123 Main St',
    parcelNumber: '123-456',
    amountDue: 5000
  };
  
  it('renders property information', () => {
    render(<PropertyCard property={mockProperty} />);
    
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('123-456')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// __tests__/api/properties.test.ts
import { GET } from '@/app/api/properties/route';

describe('Properties API', () => {
  it('returns properties list', async () => {
    const response = await GET(new Request('http://localhost/api/properties'));
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- PropertyCard.test.tsx
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples

```bash
# Feature
git commit -m "feat(properties): add bulk export functionality"

# Bug fix
git commit -m "fix(calendar): correct date filtering in auction view"

# Documentation
git commit -m "docs(api): update webhook documentation"

# Refactor
git commit -m "refactor(utils): simplify formatCurrency function"

# With body
git commit -m "feat(analysis): add BRRRR calculator

- Add new calculator component
- Include refinance calculations
- Update financial analysis page
- Add tests for calculations"
```

---

## Pull Request Process

### Before Creating a PR

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

3. **Update documentation** if needed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No console.logs left
- [ ] No commented-out code

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

### Review Process

1. **Automated Checks**
   - CI/CD runs tests
   - Linting passes
   - Build succeeds

2. **Code Review**
   - At least one approval required
   - Address feedback promptly
   - Discuss design decisions

3. **Merge**
   - Squash and merge for features
   - Rebase for small fixes
   - Delete branch after merge

---

## Project Structure

### Key Directories

```
tax-deed-platform/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (auth)/            # Auth routes (future)
│   └── properties/        # Property pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── features/         # Feature components
├── lib/                   # Utilities
│   ├── utils.ts          # Helper functions
│   ├── types.ts          # TypeScript types
│   └── supabase.ts       # Database client
├── public/               # Static assets
├── styles/               # Global styles
├── __tests__/            # Test files
├── supabase/             # Database files
│   └── migrations/       # SQL migrations
└── n8n/                  # Workflow files
```

### Adding New Features

1. **Page Route**
   ```bash
   app/feature-name/page.tsx
   ```

2. **API Route**
   ```bash
   app/api/feature-name/route.ts
   ```

3. **Component**
   ```bash
   components/features/FeatureName.tsx
   ```

4. **Database Table**
   ```bash
   supabase/migrations/002_feature_name.sql
   ```

---

## Common Tasks

### Adding a New Page

1. Create page file:
   ```tsx
   // app/new-feature/page.tsx
   export default function NewFeaturePage() {
     return (
       <div className="container mx-auto px-4 py-8">
         <h1>New Feature</h1>
       </div>
     );
   }
   ```

2. Add navigation link:
   ```tsx
   // Update navigation component
   <Link href="/new-feature">New Feature</Link>
   ```

### Adding an API Endpoint

```typescript
// app/api/new-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Handle GET request
  return NextResponse.json({ data: 'response' });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Handle POST request
  return NextResponse.json({ success: true });
}
```

### Adding a Database Table

1. Create migration:
   ```sql
   -- supabase/migrations/002_new_table.sql
   CREATE TABLE new_feature (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. Run migration in Supabase SQL editor

### Adding a UI Component

```tsx
// components/ui/new-component.tsx
import { cn } from '@/lib/utils';

interface NewComponentProps {
  className?: string;
  children: React.ReactNode;
}

export function NewComponent({ className, children }: NewComponentProps) {
  return (
    <div className={cn("default-styles", className)}>
      {children}
    </div>
  );
}
```

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all packages
npm update

# Major version updates
npm install package-name@latest
```

---

## Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

**Type Errors**
```bash
# Regenerate types
npm run type-check
```

**Dependency Issues**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Database Connection**
- Check Supabase URL and keys
- Verify network connection
- Check RLS policies

### Getting Help

- Open an issue on GitHub
- Join our Discord (coming soon)
- Check existing issues and PRs
- Review documentation

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

### Learning
- [React Patterns](https://reactpatterns.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook)
- [Next.js Learn](https://nextjs.org/learn)

### Tools
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Supabase Studio](https://app.supabase.com)
- [n8n Editor](https://n8n.io)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Tax Deed Platform! 🎉**

Your contributions help make this platform better for real estate investors everywhere.