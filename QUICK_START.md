# 🚀 Quick Start Guide - Tax Deed Platform

## ⚡ **Get Running in 5 Minutes**

### **1. Environment Setup**
```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Start Development Server**
```bash
npm run dev
```

### **4. Open Browser**
Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🔧 **Required Setup Steps**

### **Step 1: Create Supabase Project**
1. Go to [https://supabase.com](https://supabase.com)
2. Create new project
3. Copy your project URL and anon key
4. Update `.env.local`

### **Step 2: Run Database Migrations**
1. Open Supabase SQL Editor
2. Copy content from `supabase/migrations/001_initial_schema.sql`
3. Run the migration
4. Verify tables are created

### **Step 3: Test Authentication**
1. Navigate to `/auth` page
2. Try creating an account
3. Verify sign in/out works
4. Check user state in header

---

## 🎯 **What's Working Now**

### ✅ **Frontend Features**
- Homepage with state selection
- Properties listing with filters
- Calendar view
- Authentication system
- Responsive design

### ✅ **Backend Ready**
- API routes configured
- Database service layer
- Supabase integration
- n8n webhook setup

### ✅ **Database Schema**
- 20+ tables designed
- Proper relationships
- Indexing strategy
- Data validation

---

## 🚧 **What Needs Setup**

### **Database Connection**
- Supabase project creation
- Migration execution
- Environment variables

### **n8n Workflows** (Optional)
- Deploy n8n instance
- Import workflow JSON
- Configure webhook URLs

### **External APIs** (Optional)
- Zillow API key
- Google Maps API key
- County data access

---

## 🐛 **Common Issues & Fixes**

### **Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev

# Check TypeScript errors
npm run type-check
```

### **Database Connection Issues**
```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Check Supabase project status
# Ensure project is active and not paused
```

### **Authentication Issues**
```bash
# Check browser console for errors
# Verify Supabase auth settings
# Ensure email confirmation is configured
```

---

## 📱 **Testing the Platform**

### **1. Basic Navigation**
- Homepage loads with state selection
- Properties page shows mock data
- Calendar displays upcoming auctions
- Auth pages work correctly

### **2. User Flow**
- Create account → Sign in → View dashboard
- Browse properties → Apply filters → View details
- Check calendar → Select auctions → View information

### **3. Responsive Design**
- Test on mobile devices
- Check different screen sizes
- Verify touch interactions

---

## 🔄 **Next Steps After Setup**

### **Immediate (Today)**
- [ ] Verify all pages load
- [ ] Test authentication flow
- [ ] Check database connectivity
- [ ] Review console for errors

### **This Week**
- [ ] Add real property data
- [ ] Implement database queries
- [ ] Test property enrichment
- [ ] Verify auction calendar

### **Next Week**
- [ ] User dashboard features
- [ ] Advanced search
- [ ] Mobile optimization
- [ ] Performance testing

---

## 📚 **Need Help?**

### **Documentation**
- [Full Setup Guide](docs/SETUP_GUIDE.md)
- [API Documentation](docs/API_DOCUMENTATION.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Improvement Plan](IMPROVEMENT_PLAN.md)

### **Common Commands**
```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript checking

# Database
npm run db:seed      # Seed sample data (when implemented)
npm run db:migrate   # Run migrations (when implemented)
```

---

## 🎉 **You're Ready!**

The Tax Deed Platform is now running with:
- ✅ Modern Next.js 15 frontend
- ✅ Supabase backend ready
- ✅ Authentication system
- ✅ Comprehensive database schema
- ✅ n8n automation framework

**Start exploring and building your real estate investment platform!**

---

*For detailed setup instructions, see [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md)*
