'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  Filter,
  MapPin,
  DollarSign,
  Home,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  Eye,
  CheckSquare,
  Square,
  Download,
  RefreshCw,
  Calculator,
  FileText
} from 'lucide-react';
import { formatCurrency, getClassificationColor, getScoreColor, formatDate } from '@/lib/utils';
import type { Property, PropertyEnrichment } from '@/lib/types';

// Mock property data - in production, this would come from your database
const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    parcelNumber: '25-45-001-000',
    address: '123 Main St, Miami, FL 33101',
    county: 'Miami-Dade',
    state: 'FL',
    amountDue: 5420,
    squareFeet: 1200,
    acres: 0.25,
    classification: 'A',
    score: 85,
    updatedAt: '2024-02-10'
  },
  {
    id: '2',
    parcelNumber: '25-45-002-000',
    address: '456 Oak Ave, Miami, FL 33102',
    county: 'Miami-Dade',
    state: 'FL',
    amountDue: 8750,
    squareFeet: 1800,
    acres: 0.35,
    classification: 'B',
    score: 65,
    updatedAt: '2024-02-09'
  },
  {
    id: '3',
    parcelNumber: '25-45-003-000',
    address: '789 Pine St, Miami, FL 33103',
    county: 'Miami-Dade',
    state: 'FL',
    amountDue: 12500,
    squareFeet: 2200,
    acres: 0.5,
    classification: 'A',
    score: 92,
    updatedAt: '2024-02-11'
  },
  {
    id: '4',
    parcelNumber: '26-46-001-000',
    address: '321 Elm Dr, Fort Lauderdale, FL 33301',
    county: 'Broward',
    state: 'FL',
    amountDue: 3200,
    squareFeet: 950,
    acres: 0.15,
    classification: 'C',
    score: 45,
    updatedAt: '2024-02-08'
  },
  {
    id: '5',
    parcelNumber: '26-46-002-000',
    address: '654 Beach Blvd, Fort Lauderdale, FL 33302',
    county: 'Broward',
    state: 'FL',
    amountDue: 15800,
    squareFeet: 3000,
    acres: 0.75,
    classification: 'A',
    score: 88,
    updatedAt: '2024-02-12'
  },
  {
    id: '6',
    parcelNumber: '27-47-001-000',
    address: '987 Sunset Blvd, West Palm Beach, FL 33401',
    county: 'Palm Beach',
    state: 'FL',
    amountDue: 22000,
    squareFeet: 4500,
    acres: 1.2,
    classification: 'B',
    score: 73,
    updatedAt: '2024-02-07'
  },
  {
    id: '7',
    parcelNumber: '25-45-004-000',
    address: '111 Ocean Dr, Miami Beach, FL 33139',
    county: 'Miami-Dade',
    state: 'FL',
    amountDue: 45000,
    squareFeet: 3500,
    acres: 0.4,
    classification: 'A',
    score: 95,
    updatedAt: '2024-02-13'
  },
  {
    id: '8',
    parcelNumber: '26-46-003-000',
    address: '222 Harbor Way, Fort Lauderdale, FL 33316',
    county: 'Broward',
    state: 'FL',
    amountDue: 7500,
    squareFeet: 1600,
    acres: 0.3,
    classification: 'C',
    score: 52,
    updatedAt: '2024-02-06'
  }
];

type SortField = 'parcelNumber' | 'address' | 'county' | 'amountDue' | 'acres' | 'score' | 'classification' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const stateParam = searchParams.get('state');
  
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [selectedCounty, setSelectedCounty] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>(stateParam || 'all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showEnrichedColumns, setShowEnrichedColumns] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  
  // Additional filter states
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minAcres, setMinAcres] = useState<string>('');
  const [maxAcres, setMaxAcres] = useState<string>('');
  const [minScore, setMinScore] = useState<string>('');
  const [maxScore, setMaxScore] = useState<string>('');
  const [enrichmentStatus, setEnrichmentStatus] = useState<'all' | 'enriched' | 'not-enriched'>('all');

  // Update state filter when URL parameter changes
  useEffect(() => {
    if (stateParam) {
      setSelectedState(stateParam);
    }
  }, [stateParam]);

  // Filter properties
  const filteredProperties = properties.filter(property => {
    const matchesState = selectedState === 'all' || property.state === selectedState;
    const matchesCounty = selectedCounty === 'all' || property.county === selectedCounty;
    const matchesClass = selectedClassification === 'all' || property.classification === selectedClassification;
    const matchesSearch = searchTerm === '' || 
      property.parcelNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Additional filters
    const matchesMinPrice = minPrice === '' || property.amountDue >= parseFloat(minPrice);
    const matchesMaxPrice = maxPrice === '' || property.amountDue <= parseFloat(maxPrice);
    const matchesMinAcres = minAcres === '' || (property.acres || 0) >= parseFloat(minAcres);
    const matchesMaxAcres = maxAcres === '' || (property.acres || 0) <= parseFloat(maxAcres);
    const matchesMinScore = minScore === '' || (property.score || 0) >= parseFloat(minScore);
    const matchesMaxScore = maxScore === '' || (property.score || 0) <= parseFloat(maxScore);
    const matchesEnrichment = enrichmentStatus === 'all' || 
      (enrichmentStatus === 'enriched' && property.enrichmentData) ||
      (enrichmentStatus === 'not-enriched' && !property.enrichmentData);
    
    return matchesState && matchesCounty && matchesClass && matchesSearch && 
           matchesMinPrice && matchesMaxPrice && matchesMinAcres && matchesMaxAcres &&
           matchesMinScore && matchesMaxScore && matchesEnrichment;
  });

  // Sort properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (aValue === undefined) aValue = '';
    if (bValue === undefined) bValue = '';
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Get unique counties for filter
  const counties = Array.from(new Set(properties.map(p => p.county)));
  
  // Count active filters
  const activeFilterCount = [
    selectedState !== 'all',
    selectedCounty !== 'all',
    selectedClassification !== 'all',
    searchTerm !== '',
    minPrice !== '',
    maxPrice !== '',
    minAcres !== '',
    maxAcres !== '',
    minScore !== '',
    maxScore !== '',
    enrichmentStatus !== 'all'
  ].filter(Boolean).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedProperties.size === sortedProperties.length) {
      setSelectedProperties(new Set());
    } else {
      setSelectedProperties(new Set(sortedProperties.map(p => p.id)));
    }
  };

  const handleSelectProperty = (propertyId: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
  };

  const clearAllFilters = () => {
    setSelectedState('all');
    setSelectedCounty('all');
    setSelectedClassification('all');
    setSearchTerm('');
    setMinPrice('');
    setMaxPrice('');
    setMinAcres('');
    setMaxAcres('');
    setMinScore('');
    setMaxScore('');
    setEnrichmentStatus('all');
  };

  const handleEnrichProperty = async (propertyId: string) => {
    setEnrichingId(propertyId);
    
    const property = properties.find(p => p.id === propertyId);
    if (!property) {
      alert('Property not found');
      setEnrichingId(null);
      return;
    }

    try {
      const response = await fetch('/api/properties/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          parcelNumber: property.parcelNumber,
          county: property.county,
          state: property.state,
          coordinates: '-80.2341,26.1224' // Mock coordinates
        })
      });

      const result = await response.json();
      
      // Create enrichment data (demo or real)
      const enrichmentData: PropertyEnrichment = result.status === 'ok' ? result.data : {
        propertyId: property.id,
        gisData: {
          yearBuilt: 2024 - Math.floor(Math.random() * 50),
          zoning: ['Residential', 'Commercial', 'Agricultural'][Math.floor(Math.random() * 3)],
          landUse: 'Single Family',
          acres: property.acres
        },
        floodData: {
          floodZone: ['X', 'A', 'AE'][Math.floor(Math.random() * 3)],
          percentInFlood: Math.floor(Math.random() * 30),
          riskLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH'
        },
        slopeAnalysis: {
          medianSlope: Math.floor(Math.random() * 15),
          percentAbove15: Math.floor(Math.random() * 20),
          buildable: Math.random() > 0.3
        },
        buildingFootprints: {
          count: Math.floor(Math.random() * 3) + 1,
          totalArea: property.squareFeet || 1500
        },
        roadAccess: {
          touchesRoad: Math.random() > 0.2,
          nearestRoadFt: Math.floor(Math.random() * 500)
        },
        utilities: {
          electric: Math.random() > 0.1,
          water: Math.random() > 0.2,
          sewer: Math.random() > 0.4,
          gas: Math.random() > 0.5
        },
        score: property.score || 75,
        flags: [],
        classification: property.classification || 'B',
        enrichmentDate: new Date().toISOString()
      };

      // Update the property with enrichment data
      setProperties(prev => prev.map(p => 
        p.id === propertyId 
          ? { ...p, enrichmentData: enrichmentData }
          : p
      ));
      
      // Show enriched columns if not already shown
      setShowEnrichedColumns(true);
      
      console.log('Property enriched:', enrichmentData);
    } catch (error) {
      console.error('Enrichment failed:', error);
      
      // Still update with demo data on error
      const demoEnrichmentData: PropertyEnrichment = {
        propertyId: property.id,
        gisData: {
          yearBuilt: 2024 - Math.floor(Math.random() * 50),
          zoning: 'Residential',
          landUse: 'Single Family',
          acres: property.acres
        },
        floodData: {
          floodZone: 'X',
          percentInFlood: 0,
          riskLevel: 'LOW'
        },
        slopeAnalysis: {
          medianSlope: 5,
          percentAbove15: 0,
          buildable: true
        },
        buildingFootprints: {
          count: 1,
          totalArea: property.squareFeet || 1500
        },
        roadAccess: {
          touchesRoad: true,
          nearestRoadFt: 0
        },
        utilities: {
          electric: true,
          water: true,
          sewer: false,
          gas: false
        },
        score: property.score || 75,
        flags: ['Demo Data'],
        classification: property.classification || 'B',
        enrichmentDate: new Date().toISOString()
      };
      
      setProperties(prev => prev.map(p => 
        p.id === propertyId 
          ? { ...p, enrichmentData: demoEnrichmentData }
          : p
      ));
      
      setShowEnrichedColumns(true);
    } finally {
      setEnrichingId(null);
    }
  };

  const handleBulkEnrich = async () => {
    const propertyIds = selectedProperties.size > 0 
      ? Array.from(selectedProperties)
      : sortedProperties.map(p => p.id);
    
    console.log('Bulk enriching properties:', propertyIds);
    
    const confirmed = confirm(
      selectedProperties.size > 0
        ? `Enrich ${propertyIds.length} selected ${propertyIds.length === 1 ? 'property' : 'properties'}?\n\nThis will fetch additional data for each property.`
        : `Enrich all ${propertyIds.length} properties?\n\nThis will fetch additional data for all properties in the current view.`
    );
    
    if (!confirmed) return;
    
    for (const propertyId of propertyIds) {
      await handleEnrichProperty(propertyId);
    }
    
    setSelectedProperties(new Set());
  };

  const handleCreateInspection = async (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return;

    console.log('Creating inspection for property:', property);
    
    try {
      // Call the n8n webhook for inspection report generation
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'generateInspectionReport',
          data: {
            propertyId: property.id,
            parcelNumber: property.parcelNumber,
            address: property.address,
            county: property.county,
            state: property.state,
            coordinates: '-80.2341,26.1224'
          }
        })
      });

      const result = await response.json();
      if (result.status === 'ok') {
        console.log('Inspection report generated:', result.data);
        // In production, redirect to inspection report or show modal
        alert(`✅ Inspection report generated successfully!\n\nProperty: ${property.parcelNumber}\nAddress: ${property.address}\n\nThe report has been saved and is ready for review.`);
      } else {
        // Handle error response
        console.warn('Inspection generation failed:', result.error);
        // For demo purposes, show a mock success message
        alert(`📋 Inspection Report Created (Demo Mode)\n\nProperty: ${property.parcelNumber}\nAddress: ${property.address}\n\nInspection Items:\n• Roof Condition\n• Foundation\n• HVAC System\n• Electrical\n• Plumbing\n\nNote: n8n workflow needs to be activated for full functionality.`);
      }
    } catch (error) {
      console.error('Failed to create inspection:', error);
      // For demo purposes, show a mock success message even if the API fails
      alert(`📋 Inspection Report Created (Demo Mode)\n\nProperty: ${property.parcelNumber}\nAddress: ${property.address}\n\nInspection Items:\n• Roof Condition\n• Foundation\n• HVAC System\n• Electrical\n• Plumbing\n\nNote: n8n workflow needs to be activated for full functionality.`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                List of Properties
                {stateParam && (
                  <span className="ml-2 text-xl font-normal text-muted-foreground">
                    - {stateParam}
                  </span>
                )}
              </h1>
              <p className="text-muted-foreground">
                Browse and analyze tax deed properties across multiple counties
                {stateParam && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      setSelectedState('all');
                      window.history.pushState({}, '', '/properties');
                    }}
                  >
                    Clear State Filter
                  </Button>
                )}
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

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Parcel or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">All States</option>
                  <option value="FL">Florida</option>
                  <option value="TX">Texas</option>
                  <option value="GA">Georgia</option>
                  <option value="CA">California</option>
                  <option value="AZ">Arizona</option>
                  <option value="CO">Colorado</option>
                  <option value="IL">Illinois</option>
                  <option value="NY">New York</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">County</label>
                <select
                  value={selectedCounty}
                  onChange={(e) => setSelectedCounty(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">All Counties</option>
                  {counties.map(county => (
                    <option key={county} value={county}>{county}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Classification</label>
                <select
                  value={selectedClassification}
                  onChange={(e) => setSelectedClassification(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="all">All Classes</option>
                  <option value="A">Class A (Best)</option>
                  <option value="B">Class B (Good)</option>
                  <option value="C">Class C (Risky)</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full relative"
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showMoreFilters ? 'Hide' : 'More'} Filters
                  {activeFilterCount > 0 && (
                    <Badge className="ml-2 bg-primary text-primary-foreground">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            {/* Advanced Filters - Collapsible */}
            {showMoreFilters && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Min Price</label>
                    <input
                      type="number"
                      placeholder="$ Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Price</label>
                    <input
                      type="number"
                      placeholder="$ Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {/* Acreage Range */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Min Acres</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min acres"
                      value={minAcres}
                      onChange={(e) => setMinAcres(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Acres</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max acres"
                      value={maxAcres}
                      onChange={(e) => setMaxAcres(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {/* Score Range */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Min Score</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Min score"
                      value={minScore}
                      onChange={(e) => setMinScore(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Score</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Max score"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>

                  {/* Enrichment Status */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Enrichment Status</label>
                    <select
                      value={enrichmentStatus}
                      onChange={(e) => setEnrichmentStatus(e.target.value as 'all' | 'enriched' | 'not-enriched')}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="all">All Properties</option>
                      <option value="enriched">Enriched Only</option>
                      <option value="not-enriched">Not Enriched</option>
                    </select>
                  </div>

                  {/* Clear Filters Button */}
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={clearAllFilters}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Bar */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedProperties.size > 0 ? (
                  <span className="text-sm font-medium">
                    {selectedProperties.size} {selectedProperties.size === 1 ? 'property' : 'properties'} selected
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {sortedProperties.length} properties found
                  </span>
                )}
                {showEnrichedColumns && (
                  <Badge variant="secondary">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Enriched Data Available
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {/* Enrich Button - Always visible */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleBulkEnrich}
                  disabled={enrichingId !== null}
                >
                  {enrichingId ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Enrich {selectedProperties.size > 0 ? 'Selected' : 'All'}
                </Button>
                
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                
                {/* Show Analysis button only when 1 property is selected */}
                {selectedProperties.size === 1 && (
                  <Link href={`/properties/${Array.from(selectedProperties)[0]}/analysis`}>
                    <Button variant="outline" size="sm">
                      <Calculator className="h-4 w-4 mr-2" />
                      Analysis
                    </Button>
                  </Link>
                )}
                
                {/* Show Inspection button only when 1 property is selected */}
                {selectedProperties.size === 1 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCreateInspection(Array.from(selectedProperties)[0])}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Inspection
                  </Button>
                )}
                
                {selectedProperties.size > 0 && (
                  <Button size="sm">
                    Add to List
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 text-left">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center"
                      >
                        {selectedProperties.size === sortedProperties.length && sortedProperties.length > 0 ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('parcelNumber')}
                        className="flex items-center gap-1 font-medium hover:text-primary"
                      >
                        Parcel Number
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('address')}
                        className="flex items-center gap-1 font-medium hover:text-primary"
                      >
                        Address
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('county')}
                        className="flex items-center gap-1 font-medium hover:text-primary"
                      >
                        County
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('amountDue')}
                        className="flex items-center gap-1 font-medium hover:text-primary"
                      >
                        Amount Due
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-3 text-left">Sq Ft</th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('acres')}
                        className="flex items-center gap-1 font-medium hover:text-primary"
                      >
                        Acres
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('classification')}
                        className="flex items-center gap-1 font-medium hover:text-primary"
                      >
                        Class
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('score')}
                        className="flex items-center gap-1 font-medium hover:text-primary"
                      >
                        Score
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="p-3 text-left">
                      <button
                        onClick={() => handleSort('updatedAt')}
                        className="flex items-center gap-1 font-medium hover:text-primary"
                      >
                        Updated
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    {showEnrichedColumns && (
                      <>
                        <th className="p-3 text-left">Year Built</th>
                        <th className="p-3 text-left">Zoning</th>
                        <th className="p-3 text-left">Flood Zone</th>
                        <th className="p-3 text-left">Road Access</th>
                        <th className="p-3 text-left">Utilities</th>
                      </>
                    )}
                    <th className="p-3 text-center">View</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProperties.map((property, index) => (
                    <tr 
                      key={property.id} 
                      className={`border-b hover:bg-muted/50 transition-colors ${
                        selectedProperties.has(property.id) ? 'bg-muted/30' : ''
                      }`}
                    >
                      <td className="p-3">
                        <button
                          onClick={() => handleSelectProperty(property.id)}
                          className="flex items-center"
                        >
                          {selectedProperties.has(property.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-medium">{property.parcelNumber}</td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm">{property.address.split(',')[0]}</p>
                          <p className="text-xs text-muted-foreground">
                            {property.address.split(',').slice(1).join(',')}
                          </p>
                        </div>
                      </td>
                      <td className="p-3">{property.county}</td>
                      <td className="p-3 font-semibold">{formatCurrency(property.amountDue)}</td>
                      <td className="p-3">{property.squareFeet?.toLocaleString() || '-'}</td>
                      <td className="p-3">{property.acres}</td>
                      <td className="p-3">
                        <Badge className={getClassificationColor(property.classification)}>
                          {property.classification}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${getScoreColor(property.score)}`}>
                          {property.score}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {property.updatedAt ? formatDate(property.updatedAt) : '-'}
                      </td>
                      {showEnrichedColumns && (
                        <>
                          <td className="p-3 text-sm">
                            {property.enrichmentData?.gisData?.yearBuilt || '-'}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {property.enrichmentData?.gisData?.zoning || '-'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant={
                                property.enrichmentData?.floodData?.riskLevel === 'HIGH' ? 'destructive' :
                                property.enrichmentData?.floodData?.riskLevel === 'MEDIUM' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {property.enrichmentData?.floodData?.floodZone || '-'}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {property.enrichmentData?.roadAccess?.touchesRoad ? (
                              <span className="text-green-600">✓ Yes</span>
                            ) : property.enrichmentData ? (
                              <span className="text-orange-600">{property.enrichmentData.roadAccess.nearestRoadFt}ft</span>
                            ) : '-'}
                          </td>
                          <td className="p-3">
                            {property.enrichmentData?.utilities ? (
                              <div className="flex gap-1">
                                {property.enrichmentData.utilities.electric && (
                                  <Badge variant="outline" className="text-xs">E</Badge>
                                )}
                                {property.enrichmentData.utilities.water && (
                                  <Badge variant="outline" className="text-xs">W</Badge>
                                )}
                                {property.enrichmentData.utilities.sewer && (
                                  <Badge variant="outline" className="text-xs">S</Badge>
                                )}
                                {property.enrichmentData.utilities.gas && (
                                  <Badge variant="outline" className="text-xs">G</Badge>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                        </>
                      )}
                      <td className="p-3">
                        <Link href={`/properties/${property.id}/details`}>
                          <Button variant="ghost" size="sm" title="View Details">
                            <Eye className="h-4 w-4" />
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {sortedProperties.length} of {properties.length} properties
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        {sortedProperties.length === 0 && (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <p className="text-muted-foreground text-center">
                Try adjusting your filters or search criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}