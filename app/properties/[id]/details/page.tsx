'use client';


import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Download,
  Printer,
  FileText,
  Trees,
  Car,
  Bath,
  BedDouble,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Share2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PropertyDetailsPage() {
  const params = useParams();
  const propertyId = params.id as string;
  
  // Mock property data - in production this would come from your database
  const property = {
    // Basic Information
    id: propertyId,
    parcelNumber: '25-45-001-000',
    alternateKey: '2545001000',
    address: '123 Main St',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    county: 'Miami-Dade',
    
    // Tax Sale Information
    certificateNumber: 'TD-2024-001234',
    saleDate: '2024-03-15',
    auctionType: 'Tax Deed',
    minimumBid: 5420,
    depositAmount: 1000,
    estimatedTaxes: 5420,
    additionalFees: 350,
    redemptionDeadline: '2024-06-15',
    
    // Property Characteristics
    propertyType: 'Single Family Residential',
    yearBuilt: 1985,
    livingArea: 1200,
    lotSize: 7500,
    acres: 0.17,
    bedrooms: 3,
    bathrooms: 2,
    garage: 1,
    pool: false,
    stories: 1,
    roofType: 'Shingle',
    roofAge: 8,
    hvacType: 'Central Air',
    hvacAge: 5,
    
    // Valuation
    assessedValue: 180000,
    marketValue: 220000,
    landValue: 65000,
    buildingValue: 115000,
    lastSalePrice: 165000,
    lastSaleDate: '2018-07-22',
    estimatedRentMin: 1800,
    estimatedRentMax: 2200,
    
    // Legal Information
    legalDescription: 'LOT 15 BLOCK 7 OF SUNSHINE ESTATES PLAT BOOK 42 PAGE 18',
    subdivision: 'Sunshine Estates',
    platBook: '42',
    platPage: '18',
    section: '25',
    township: '45S',
    range: '39E',
    
    // Owner Information
    ownerName: 'John & Jane Doe',
    ownerAddress: '456 Oak Ave, Miami, FL 33102',
    ownerOccupied: false,
    tenantOccupied: true,
    vacancyStatus: 'Occupied',
    
    // Liens and Encumbrances
    totalLiens: 8750,
    mortgageBalance: 0,
    liens: [
      { type: 'Property Tax', amount: 5420, year: 2023 },
      { type: 'Property Tax', amount: 2680, year: 2022 },
      { type: 'Water/Sewer', amount: 450, date: '2023-12' },
      { type: 'Code Violation', amount: 200, date: '2023-08' }
    ],
    
    // Neighborhood Data
    medianHomeValue: 285000,
    medianRent: 2100,
    walkScore: 72,
    transitScore: 45,
    crimeIndex: 'Low',
    schoolRating: 7,
    populationDensity: 'Medium',
    
    // Investment Metrics
    capRate: 0.085,
    grossYield: 0.12,
    cashOnCash: 0.15,
    arvEstimate: 265000,
    rehabEstimate: 35000,
    holdingCosts: 8000,
    profitPotential: 42000,
    
    // Risk Factors
    floodZone: 'X',
    hurricaneZone: true,
    environmentalIssues: false,
    codeViolations: 1,
    openPermits: 0,
    
    // Additional Notes
    notes: 'Property shows good potential for fix and flip. Tenant occupied with month-to-month lease. Minor roof repairs needed.',
    
    // Dates
    dateAdded: '2024-02-01',
    lastUpdated: '2024-02-10'
  };

  const getRiskLevel = () => {
    let riskScore = 0;
    if (property.floodZone !== 'X') riskScore += 2;
    if (property.hurricaneZone) riskScore += 1;
    if (property.codeViolations > 0) riskScore += 1;
    if (property.openPermits > 0) riskScore += 1;
    if (property.totalLiens > 10000) riskScore += 2;
    
    if (riskScore <= 2) return { level: 'Low', color: 'text-green-600', icon: CheckCircle };
    if (riskScore <= 4) return { level: 'Medium', color: 'text-yellow-600', icon: AlertCircle };
    return { level: 'High', color: 'text-red-600', icon: XCircle };
  };

  const risk = getRiskLevel();

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/properties">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Properties
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold">Property Details Report</h1>
                <p className="text-muted-foreground">
                  Comprehensive analysis for {property.parcelNumber}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Bid</p>
                  <p className="text-2xl font-bold">{formatCurrency(property.minimumBid)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Market Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(property.marketValue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profit Potential</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(property.profitPotential)}</p>
                </div>
                <Calculator className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Property Type</p>
                  <p className="text-lg font-semibold">{property.propertyType.split(' ')[0]}</p>
                </div>
                <Home className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <p className={`text-lg font-semibold ${risk.color}`}>{risk.level}</p>
                </div>
                <risk.icon className={`h-8 w-8 ${risk.color}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Information */}
            <Card>
              <CardHeader>
                <CardTitle>Property Information</CardTitle>
                <CardDescription>Basic property details and location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Parcel Number</p>
                    <p className="font-medium">{property.parcelNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Alternate Key</p>
                    <p className="font-medium">{property.alternateKey}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{property.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.city}, {property.state} {property.zipCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">County</p>
                    <p className="font-medium">{property.county}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium">{property.propertyType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year Built</p>
                    <p className="font-medium">{property.yearBuilt}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Legal Description</p>
                  <p className="font-medium text-sm">{property.legalDescription}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Section</p>
                    <p className="font-medium">{property.section}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Township</p>
                    <p className="font-medium">{property.township}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Range</p>
                    <p className="font-medium">{property.range}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property Characteristics */}
            <Card>
              <CardHeader>
                <CardTitle>Property Characteristics</CardTitle>
                <CardDescription>Physical features and amenities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Living Area</p>
                      <p className="font-medium">{property.livingArea.toLocaleString()} sq ft</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lot Size</p>
                      <p className="font-medium">{property.lotSize.toLocaleString()} sq ft</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trees className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Acres</p>
                      <p className="font-medium">{property.acres}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-medium">{property.bedrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-medium">{property.bathrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Garage</p>
                      <p className="font-medium">{property.garage} car</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Stories</p>
                    <p className="font-medium">{property.stories}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pool</p>
                    <p className="font-medium">{property.pool ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Roof Type / Age</p>
                    <p className="font-medium">{property.roofType} / {property.roofAge} years</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">HVAC Type / Age</p>
                    <p className="font-medium">{property.hvacType} / {property.hvacAge} years</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Valuation & Financial */}
            <Card>
              <CardHeader>
                <CardTitle>Valuation & Financial Analysis</CardTitle>
                <CardDescription>Property values and investment metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Assessed Value</p>
                    <p className="font-medium text-lg">{formatCurrency(property.assessedValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Market Value</p>
                    <p className="font-medium text-lg">{formatCurrency(property.marketValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Land Value</p>
                    <p className="font-medium">{formatCurrency(property.landValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Building Value</p>
                    <p className="font-medium">{formatCurrency(property.buildingValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sale Price</p>
                    <p className="font-medium">{formatCurrency(property.lastSalePrice)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(property.lastSaleDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Monthly Rent</p>
                    <p className="font-medium">
                      {formatCurrency(property.estimatedRentMin)} - {formatCurrency(property.estimatedRentMax)}
                    </p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <p className="font-medium mb-3">Investment Metrics</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Cap Rate</p>
                      <p className="font-medium">{(property.capRate * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Gross Yield</p>
                      <p className="font-medium">{(property.grossYield * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cash on Cash</p>
                      <p className="font-medium">{(property.cashOnCash * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ARV Estimate</p>
                      <p className="font-medium">{formatCurrency(property.arvEstimate)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Owner Information */}
            <Card>
              <CardHeader>
                <CardTitle>Owner & Occupancy Information</CardTitle>
                <CardDescription>Current ownership and occupancy status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Owner Name</p>
                    <p className="font-medium">{property.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner Address</p>
                    <p className="font-medium">{property.ownerAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner Occupied</p>
                    <p className="font-medium">{property.ownerOccupied ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vacancy Status</p>
                    <Badge variant={property.vacancyStatus === 'Vacant' ? 'destructive' : 'default'}>
                      {property.vacancyStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar Information */}
          <div className="space-y-6">
            {/* Tax Sale Information */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Sale Information</CardTitle>
                <CardDescription>Auction and redemption details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Certificate Number</p>
                  <p className="font-medium">{property.certificateNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sale Date</p>
                  <p className="font-medium">{formatDate(property.saleDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Auction Type</p>
                  <Badge>{property.auctionType}</Badge>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Bid</p>
                  <p className="font-medium text-lg">{formatCurrency(property.minimumBid)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Required Deposit</p>
                  <p className="font-medium">{formatCurrency(property.depositAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Taxes</p>
                  <p className="font-medium">{formatCurrency(property.estimatedTaxes)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Additional Fees</p>
                  <p className="font-medium">{formatCurrency(property.additionalFees)}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Redemption Deadline</p>
                  <p className="font-medium text-red-600">{formatDate(property.redemptionDeadline)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Liens & Encumbrances */}
            <Card>
              <CardHeader>
                <CardTitle>Liens & Encumbrances</CardTitle>
                <CardDescription>Outstanding debts on property</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Total Liens</p>
                  <p className="font-medium text-lg text-red-600">{formatCurrency(property.totalLiens)}</p>
                </div>
                <div className="space-y-2">
                  {property.liens.map((lien, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{lien.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {lien.year || lien.date}
                        </p>
                      </div>
                      <p className="font-medium">{formatCurrency(lien.amount)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Neighborhood Data */}
            <Card>
              <CardHeader>
                <CardTitle>Neighborhood Analysis</CardTitle>
                <CardDescription>Area statistics and ratings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Median Home Value</p>
                  <p className="font-medium">{formatCurrency(property.medianHomeValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Median Rent</p>
                  <p className="font-medium">{formatCurrency(property.medianRent)}/mo</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Walk Score</p>
                    <p className="font-medium">{property.walkScore}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transit Score</p>
                    <p className="font-medium">{property.transitScore}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Crime Index</p>
                    <Badge variant={property.crimeIndex === 'Low' ? 'default' : 'destructive'}>
                      {property.crimeIndex}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">School Rating</p>
                    <p className="font-medium">{property.schoolRating}/10</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>Potential risks and issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Flood Zone</span>
                  <Badge variant={property.floodZone === 'X' ? 'default' : 'destructive'}>
                    Zone {property.floodZone}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hurricane Zone</span>
                  {property.hurricaneZone ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Environmental Issues</span>
                  {property.environmentalIssues ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Code Violations</span>
                  <Badge variant={property.codeViolations > 0 ? 'destructive' : 'default'}>
                    {property.codeViolations}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Open Permits</span>
                  <Badge variant={property.openPermits > 0 ? 'destructive' : 'default'}>
                    {property.openPermits}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/properties/${propertyId}/analysis`} className="block">
                  <Button className="w-full" variant="outline">
                    <Calculator className="h-4 w-4 mr-2" />
                    Financial Analysis
                  </Button>
                </Link>
                <Link href={`/properties/${propertyId}/inspection`} className="block">
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Inspection Report
                  </Button>
                </Link>
                <Button className="w-full" variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  View on Map
                </Button>
                <Button className="w-full" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  County Records
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Notes Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>Important observations and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{property.notes}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Date Added: {formatDate(property.dateAdded)}</span>
              <span>Last Updated: {formatDate(property.lastUpdated)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}