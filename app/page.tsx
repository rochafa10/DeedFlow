'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  TrendingUp,
  Search,
  ChevronRight,
  Building2,
  Calculator,
  User,
  LogOut
} from 'lucide-react';

// US States with tax deed/lien auctions
const TAX_DEED_STATES = [
  // Tax Deed States (property ownership transfers)
  { code: 'AL', name: 'Alabama', type: 'Tax Deed', active: true },
  { code: 'AK', name: 'Alaska', type: 'Tax Deed', active: false },
  { code: 'AR', name: 'Arkansas', type: 'Tax Deed', active: true },
  { code: 'CA', name: 'California', type: 'Tax Deed', active: true },
  { code: 'CT', name: 'Connecticut', type: 'Tax Deed', active: false },
  { code: 'DE', name: 'Delaware', type: 'Tax Deed', active: false },
  { code: 'FL', name: 'Florida', type: 'Tax Deed', active: true },
  { code: 'GA', name: 'Georgia', type: 'Tax Deed', active: true },
  { code: 'HI', name: 'Hawaii', type: 'Tax Deed', active: false },
  { code: 'ID', name: 'Idaho', type: 'Tax Deed', active: false },
  { code: 'IN', name: 'Indiana', type: 'Tax Deed', active: true },
  { code: 'KS', name: 'Kansas', type: 'Tax Deed', active: false },
  { code: 'KY', name: 'Kentucky', type: 'Tax Deed', active: true },
  { code: 'LA', name: 'Louisiana', type: 'Tax Deed', active: true },
  { code: 'ME', name: 'Maine', type: 'Tax Deed', active: false },
  { code: 'MA', name: 'Massachusetts', type: 'Tax Deed', active: false },
  { code: 'MI', name: 'Michigan', type: 'Tax Deed', active: true },
  { code: 'MN', name: 'Minnesota', type: 'Tax Deed', active: false },
  { code: 'MS', name: 'Mississippi', type: 'Tax Deed', active: true },
  { code: 'MO', name: 'Missouri', type: 'Tax Deed', active: true },
  { code: 'MT', name: 'Montana', type: 'Tax Deed', active: false },
  { code: 'NE', name: 'Nebraska', type: 'Tax Deed', active: false },
  { code: 'NV', name: 'Nevada', type: 'Tax Deed', active: true },
  { code: 'NH', name: 'New Hampshire', type: 'Tax Deed', active: false },
  { code: 'NM', name: 'New Mexico', type: 'Tax Deed', active: false },
  { code: 'NY', name: 'New York', type: 'Tax Deed', active: true },
  { code: 'NC', name: 'North Carolina', type: 'Tax Deed', active: true },
  { code: 'ND', name: 'North Dakota', type: 'Tax Deed', active: false },
  { code: 'OH', name: 'Ohio', type: 'Tax Deed', active: true },
  { code: 'OK', name: 'Oklahoma', type: 'Tax Deed', active: true },
  { code: 'OR', name: 'Oregon', type: 'Tax Deed', active: false },
  { code: 'PA', name: 'Pennsylvania', type: 'Tax Deed', active: true },
  { code: 'RI', name: 'Rhode Island', type: 'Tax Deed', active: false },
  { code: 'SC', name: 'South Carolina', type: 'Tax Deed', active: true },
  { code: 'SD', name: 'South Dakota', type: 'Tax Deed', active: false },
  { code: 'TN', name: 'Tennessee', type: 'Tax Deed', active: true },
  { code: 'TX', name: 'Texas', type: 'Tax Deed', active: true },
  { code: 'UT', name: 'Utah', type: 'Tax Deed', active: false },
  { code: 'VA', name: 'Virginia', type: 'Tax Deed', active: true },
  { code: 'WA', name: 'Washington', type: 'Tax Deed', active: false },
  { code: 'WV', name: 'West Virginia', type: 'Tax Deed', active: true },
  { code: 'WI', name: 'Wisconsin', type: 'Tax Deed', active: true },
  { code: 'WY', name: 'Wyoming', type: 'Tax Deed', active: false },
  
  // Tax Lien States (certificates, not immediate ownership)
  { code: 'AZ', name: 'Arizona', type: 'Tax Lien', active: true },
  { code: 'CO', name: 'Colorado', type: 'Tax Lien', active: true },
  { code: 'IL', name: 'Illinois', type: 'Tax Lien', active: true },
  { code: 'IA', name: 'Iowa', type: 'Tax Lien', active: true },
  { code: 'MD', name: 'Maryland', type: 'Tax Lien', active: true },
  { code: 'NJ', name: 'New Jersey', type: 'Tax Lien', active: true },
  { code: 'VT', name: 'Vermont', type: 'Tax Lien', active: false },
  { code: 'DC', name: 'Washington D.C.', type: 'Tax Lien', active: true },
];

export default function Dashboard() {
  const [selectedState, setSelectedState] = useState<string>('');
  const { user, signOut } = useAuth();

  const stats = {
    totalAuctions: 42,
    upcomingAuctions: 8,
    analyzedProperties: 256,
    savedLists: 12
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Tax Deed Platform</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/properties">
                <Button variant="ghost">List of Properties</Button>
              </Link>
              <Link href="/calendar">
                <Button variant="ghost">Calendar</Button>
              </Link>
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{user.email}</span>
                  </div>
                  <Button variant="outline" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link href="/auth">
                  <Button>Sign In</Button>
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Message for Authenticated Users */}
        {user && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <User className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">Welcome back, {user.email?.split('@')[0]}!</h2>
                  <p className="text-sm text-muted-foreground">
                    Ready to discover your next investment opportunity?
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Auctions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAuctions}</div>
              <p className="text-xs text-muted-foreground">Across all states</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingAuctions}</div>
              <p className="text-xs text-muted-foreground">Next 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties Analyzed</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.analyzedProperties}</div>
              <p className="text-xs text-muted-foreground">With enrichment data</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved Lists</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.savedLists}</div>
              <p className="text-xs text-muted-foreground">Bidding lists</p>
            </CardContent>
          </Card>
        </div>

        {/* State Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select a State to Get Started</CardTitle>
            <CardDescription>
              Choose a state to view upcoming tax deed and tax lien auctions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 max-h-[500px] overflow-y-auto p-2">
              {TAX_DEED_STATES.sort((a, b) => a.name.localeCompare(b.name)).map((state) => (
                <button
                  key={state.code}
                  onClick={() => state.active && setSelectedState(state.code)}
                  disabled={!state.active}
                  className={`p-2 border rounded-md transition-all text-center ${
                    state.active 
                      ? 'hover:bg-accent cursor-pointer hover:border-primary' 
                      : 'opacity-40 cursor-not-allowed'
                  } ${
                    selectedState === state.code 
                      ? 'border-primary bg-accent ring-1 ring-primary' 
                      : 'border-border'
                  }`}
                  title={`${state.name} - ${state.type}`}
                >
                  <div className="text-lg font-semibold">{state.code}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {state.type === 'Tax Deed' ? 'Deed' : 'Lien'}
                  </div>
                  {!state.active && (
                    <div className="text-xs text-muted-foreground">···</div>
                  )}
                </button>
              ))}
            </div>

            {selectedState && (
              <div className="mt-6 flex justify-between">
                <Link href={`/calendar?state=${selectedState}`}>
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                </Link>
                <Link href={`/properties?state=${selectedState}`}>
                  <Button>
                    View {selectedState} Properties
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/properties/search">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Search className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Search Properties</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Search and filter properties across multiple counties
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/properties">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Property Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Analyze properties with financial calculator
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/calendar">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Auction Calendar</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View upcoming auctions and important dates
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </main>
    </div>
  );
}