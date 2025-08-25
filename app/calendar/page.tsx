'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Home
} from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

// Mock auction data - using current/future dates
// Get current date to generate realistic dates
const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth();

// Helper to create date string
const createDate = (monthOffset: number, day: number) => {
  const date = new Date(currentYear, currentMonth + monthOffset, day);
  return date.toISOString().split('T')[0];
};

// Define auction types
type AuctionType = 'Tax Deed' | 'Tax Lien' | 'Redeemable Deed';

const MOCK_AUCTIONS = [
  {
    id: '1',
    county: 'Miami-Dade',
    state: 'FL',
    auctionDate: createDate(0, 15), // Current month, 15th
    registrationDate: createDate(0, 1),
    depositAmount: 5000,
    totalProperties: 125,
    status: 'upcoming' as const,
    time: '10:00 AM EST',
    location: 'Miami-Dade County Courthouse',
    type: 'Tax Deed' as AuctionType,
    minimumBid: 100,
    documents: [
      { name: 'Auction Rules', url: '#' },
      { name: 'Property List', url: '#' },
      { name: 'Registration Form', url: '#' }
    ]
  },
  {
    id: '2',
    county: 'Broward',
    state: 'FL',
    auctionDate: createDate(0, 20), // Current month, 20th
    registrationDate: createDate(0, 6),
    depositAmount: 2500,
    totalProperties: 89,
    status: 'upcoming' as const,
    time: '9:00 AM EST',
    location: 'Online - Broward County Website',
    type: 'Tax Lien' as AuctionType,
    minimumBid: 100,
    documents: [
      { name: 'Auction Guide', url: '#' },
      { name: 'Property List', url: '#' }
    ]
  },
  {
    id: '3',
    county: 'Palm Beach',
    state: 'FL',
    auctionDate: createDate(1, 1), // Next month, 1st
    registrationDate: createDate(0, 15),
    depositAmount: 10000,
    totalProperties: 200,
    status: 'upcoming' as const,
    time: '11:00 AM EST',
    location: 'Palm Beach County Courthouse',
    type: 'Redeemable Deed' as AuctionType,
    minimumBid: 100,
    documents: [
      { name: 'Bidder Information', url: '#' },
      { name: 'Property List', url: '#' }
    ]
  },
  {
    id: '4',
    county: 'Harris',
    state: 'TX',
    auctionDate: createDate(1, 5), // Next month, 5th
    registrationDate: createDate(0, 20),
    depositAmount: 5000,
    totalProperties: 150,
    status: 'upcoming' as const,
    time: '10:00 AM CST',
    location: 'Harris County Administration Building',
    type: 'Redeemable Deed' as AuctionType,
    minimumBid: 500,
    documents: [
      { name: 'Texas Tax Sale Guide', url: '#' },
      { name: 'Property List', url: '#' }
    ]
  },
  {
    id: '5',
    county: 'Fulton',
    state: 'GA',
    auctionDate: createDate(1, 10), // Next month, 10th
    registrationDate: createDate(0, 25),
    depositAmount: 3000,
    totalProperties: 75,
    status: 'upcoming' as const,
    time: '10:00 AM EST',
    location: 'Fulton County Courthouse Steps',
    type: 'Tax Deed' as AuctionType,
    minimumBid: 200,
    documents: [
      { name: 'Georgia Tax Sale Laws', url: '#' },
      { name: 'Property List', url: '#' }
    ]
  },
  {
    id: '6',
    county: 'Orange',
    state: 'FL',
    auctionDate: createDate(0, 25), // Current month, 25th
    registrationDate: createDate(0, 10),
    depositAmount: 7500,
    totalProperties: 95,
    status: 'upcoming' as const,
    time: '2:00 PM EST',
    location: 'Orange County Convention Center',
    type: 'Tax Lien' as AuctionType,
    minimumBid: 100,
    documents: [
      { name: 'Auction Rules', url: '#' },
      { name: 'Property List', url: '#' }
    ]
  },
  {
    id: '7',
    county: 'Los Angeles',
    state: 'CA',
    auctionDate: createDate(0, 28), // Current month, 28th
    registrationDate: createDate(0, 14),
    depositAmount: 10000,
    totalProperties: 180,
    status: 'upcoming' as const,
    time: '10:00 AM PST',
    location: 'LA County Treasurer Office',
    type: 'Tax Deed' as AuctionType,
    minimumBid: 500,
    documents: [
      { name: 'California Tax Sale Guide', url: '#' },
      { name: 'Property List', url: '#' }
    ]
  }
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper function to get color classes based on auction type
const getAuctionTypeColor = (type: AuctionType) => {
  switch (type) {
    case 'Tax Lien':
      return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'Tax Deed':
      return 'bg-red-500 hover:bg-red-600 text-white';
    case 'Redeemable Deed':
      return 'bg-green-500 hover:bg-green-600 text-white';
    default:
      return 'bg-gray-500 hover:bg-gray-600 text-white';
  }
};

// Helper function to get border color based on auction type
const getAuctionBorderColor = (type: AuctionType) => {
  switch (type) {
    case 'Tax Lien':
      return 'border-blue-500';
    case 'Tax Deed':
      return 'border-red-500';
    case 'Redeemable Deed':
      return 'border-green-500';
    default:
      return 'border-gray-500';
  }
};

export default function AuctionCalendar() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedAuction, setSelectedAuction] = useState<typeof MOCK_AUCTIONS[0] | null>(null);

  // Filter auctions by selected state (not by month for calendar display)
  const filteredAuctions = MOCK_AUCTIONS.filter(auction => {
    const matchesState = selectedState === 'all' || auction.state === selectedState;
    return matchesState;
  });

  // Get unique states for filter
  const states = Array.from(new Set(MOCK_AUCTIONS.map(a => a.state)));

  // Calculate days in month
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();

  // Create calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Get auctions for a specific day
  const getAuctionsForDay = (day: number) => {
    return filteredAuctions.filter(auction => {
      const auctionDate = new Date(auction.auctionDate);
      return auctionDate.getDate() === day && 
             auctionDate.getMonth() === selectedMonth && 
             auctionDate.getFullYear() === selectedYear;
    });
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Auction Calendar</h1>
              <p className="text-muted-foreground">
                View upcoming tax deed and tax lien auctions across multiple states
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {MONTHS[selectedMonth]} {selectedYear}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedState}
                      onChange={(e) => setSelectedState(e.target.value)}
                      className="px-3 py-1 border rounded-md text-sm"
                    >
                      <option value="all">All States</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousMonth}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextMonth}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium p-2 text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    const dayAuctions = day ? getAuctionsForDay(day) : [];
                    const hasAuctions = dayAuctions.length > 0;
                    const isToday = day === new Date().getDate() && 
                                   selectedMonth === new Date().getMonth() &&
                                   selectedYear === new Date().getFullYear();

                    return (
                      <div
                        key={index}
                        className={`
                          min-h-[80px] p-2 border rounded-md
                          ${day ? 'hover:bg-accent cursor-pointer' : ''}
                          ${isToday ? 'bg-primary/10 border-primary' : ''}
                          ${hasAuctions ? 'border-primary/50' : ''}
                        `}
                        onClick={() => {
                          if (dayAuctions.length > 0) {
                            setSelectedAuction(dayAuctions[0]);
                          }
                        }}
                      >
                        {day && (
                          <>
                            <div className="font-medium text-sm mb-1">{day}</div>
                            {dayAuctions.map(auction => (
                              <div key={auction.id} className="mb-1">
                                <div className={`text-xs px-2 py-1 rounded-md flex items-center ${getAuctionTypeColor(auction.type)}`}>
                                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{auction.county}, {auction.state}</span>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-semibold mb-3">Auction Type Legend</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <span className="text-sm">Tax Lien</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-sm">Tax Deed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-sm">Redeemable Deed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Upcoming Auctions List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Auctions</CardTitle>
                <CardDescription>
                  Next 30 days
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_AUCTIONS.slice(0, 5).map(auction => (
                  <div
                    key={auction.id}
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedAuction(auction)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{auction.county}, {auction.state}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(auction.auctionDate)}
                        </p>
                      </div>
                      <Badge className={getAuctionTypeColor(auction.type)}>{auction.type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {auction.totalProperties}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(auction.depositAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Selected Auction Details */}
            {selectedAuction && (
              <Card>
                <CardHeader>
                  <CardTitle>Auction Details</CardTitle>
                  <CardDescription>
                    {selectedAuction.county}, {selectedAuction.state}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date & Time</p>
                    <p className="font-medium">
                      {formatDate(selectedAuction.auctionDate)} at {selectedAuction.time}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Location</p>
                    <p className="font-medium">{selectedAuction.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Properties</p>
                      <p className="font-medium">{selectedAuction.totalProperties}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Deposit</p>
                      <p className="font-medium">{formatCurrency(selectedAuction.depositAmount)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Registration Deadline</p>
                    <p className="font-medium">{formatDate(selectedAuction.registrationDate)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Documents</p>
                    <div className="space-y-2">
                      {selectedAuction.documents.map((doc, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {doc.name}
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full">
                    View Properties
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}