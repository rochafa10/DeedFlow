'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Download,
  Calendar,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  FileText,
  Home,
  Wrench,
  Droplets,
  Zap,
  Wind,
  Shield
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

// Mock inspection data
const INSPECTION_ITEMS = [
  { category: 'Exterior', icon: Home, items: [
    { name: 'Roof Condition', status: 'good', notes: 'Shingles in good condition, 5-7 years remaining' },
    { name: 'Siding/Exterior Walls', status: 'fair', notes: 'Minor repairs needed, some paint peeling' },
    { name: 'Windows', status: 'good', notes: 'All windows functional, double-pane' },
    { name: 'Doors', status: 'good', notes: 'All doors operational' },
    { name: 'Driveway/Walkways', status: 'fair', notes: 'Minor cracks in driveway' }
  ]},
  { category: 'Foundation', icon: Shield, items: [
    { name: 'Foundation Walls', status: 'good', notes: 'No visible cracks or settlement' },
    { name: 'Basement/Crawlspace', status: 'good', notes: 'Dry, no water damage' },
    { name: 'Grading', status: 'fair', notes: 'Slight slope toward house on north side' }
  ]},
  { category: 'Systems', icon: Wrench, items: [
    { name: 'HVAC', status: 'good', notes: 'AC unit 3 years old, heating functional' },
    { name: 'Electrical', status: 'fair', notes: 'Panel updated 2015, some outlets need GFCI' },
    { name: 'Plumbing', status: 'poor', notes: 'Galvanized pipes, recommend replacement' },
    { name: 'Water Heater', status: 'good', notes: '2 year old tankless system' }
  ]},
  { category: 'Interior', icon: Home, items: [
    { name: 'Flooring', status: 'good', notes: 'Hardwood in good condition, carpet needs cleaning' },
    { name: 'Walls/Ceilings', status: 'fair', notes: 'Some patching needed, no structural issues' },
    { name: 'Kitchen', status: 'good', notes: 'Updated appliances, functional' },
    { name: 'Bathrooms', status: 'fair', notes: 'Guest bath needs updating' }
  ]}
];

export default function InspectionReportPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const [activeCategory, setActiveCategory] = useState('Exterior');
  
  // Mock property data
  const property = {
    id: propertyId,
    parcelNumber: '25-45-001-000',
    address: '123 Main St, Miami, FL 33101',
    county: 'Miami-Dade',
    state: 'FL'
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'good': return 'text-green-600 bg-green-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'good': return CheckCircle;
      case 'fair': return AlertCircle;
      case 'poor': return XCircle;
      default: return AlertCircle;
    }
  };

  // Calculate overall condition
  const allItems = INSPECTION_ITEMS.flatMap(cat => cat.items);
  const goodCount = allItems.filter(item => item.status === 'good').length;
  const fairCount = allItems.filter(item => item.status === 'fair').length;
  const poorCount = allItems.filter(item => item.status === 'poor').length;

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
                <h1 className="text-3xl font-bold">Property Inspection Report</h1>
                <p className="text-muted-foreground">
                  {property.parcelNumber} • Generated {formatDate(new Date())}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Add Photos
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Property Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Property Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{property.address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Parcel Number</p>
                <p className="font-medium">{property.parcelNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.county}, {property.state}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Condition Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Overall Condition Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{goodCount}</p>
                <p className="text-sm text-green-700">Good Condition</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{fairCount}</p>
                <p className="text-sm text-yellow-700">Fair Condition</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{poorCount}</p>
                <p className="text-sm text-red-700">Poor Condition</p>
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Estimated Repair Costs</p>
              <p className="text-2xl font-bold">$15,000 - $25,000</p>
              <p className="text-sm text-muted-foreground mt-1">
                Based on identified issues and local contractor rates
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Inspection Items */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Category Navigation */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {INSPECTION_ITEMS.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.category}
                      onClick={() => setActiveCategory(category.category)}
                      className={`w-full text-left p-3 rounded-lg mb-2 transition-colors flex items-center gap-2 ${
                        activeCategory === category.category
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{category.category}</span>
                      <span className="ml-auto text-xs">
                        {category.items.length} items
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Inspection Details */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{activeCategory} Inspection</CardTitle>
                <CardDescription>
                  Detailed findings for {activeCategory.toLowerCase()} components
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {INSPECTION_ITEMS
                    .find(cat => cat.category === activeCategory)
                    ?.items.map((item, index) => {
                      const StatusIcon = getStatusIcon(item.status);
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <StatusIcon className={`h-5 w-5 ${
                                item.status === 'good' ? 'text-green-600' :
                                item.status === 'fair' ? 'text-yellow-600' : 'text-red-600'
                              }`} />
                              <h4 className="font-medium">{item.name}</h4>
                            </div>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground ml-7">
                            {item.notes}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Items */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recommended Action Items</CardTitle>
            <CardDescription>
              Priority repairs and improvements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <Badge variant="destructive">High</Badge>
                <div>
                  <p className="font-medium">Replace galvanized plumbing</p>
                  <p className="text-sm text-muted-foreground">
                    Estimated cost: $8,000-12,000 • Timeline: Immediate
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <Badge variant="secondary">Medium</Badge>
                <div>
                  <p className="font-medium">Install GFCI outlets in kitchen and bathrooms</p>
                  <p className="text-sm text-muted-foreground">
                    Estimated cost: $500-800 • Timeline: Within 30 days
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <Badge variant="secondary">Medium</Badge>
                <div>
                  <p className="font-medium">Repair driveway cracks and improve grading</p>
                  <p className="text-sm text-muted-foreground">
                    Estimated cost: $2,000-3,000 • Timeline: Within 60 days
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Badge variant="outline">Low</Badge>
                <div>
                  <p className="font-medium">Update guest bathroom fixtures</p>
                  <p className="text-sm text-muted-foreground">
                    Estimated cost: $1,500-2,500 • Timeline: Optional improvement
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}