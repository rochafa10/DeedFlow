// Shared mock data store for demo mode
// This allows data to be modified across components during a session

export interface MockProperty {
  id: string
  parcelId: string
  address: string
  city: string
  county: string
  state: string
  totalDue: number
  status: string
  propertyType: string
  lotSize: string
  saleType: string
  validation: string | null
  saleDate: string
}

// Initial mock data
const INITIAL_PROPERTIES: MockProperty[] = [
  {
    id: "0",
    parcelId: "10-01-001-0000-ABCD-EFGH-IJKL-MNOP",
    address: "12345 North Extremely Long Street Name Boulevard Apartment Complex Unit Building Section A",
    city: "Greensburg Township Municipality",
    county: "Westmoreland",
    state: "PA",
    totalDue: 999999.99,
    status: "validated",
    propertyType: "Commercial Industrial Mixed-Use Development Property",
    lotSize: "125.75 acres",
    saleType: "Tax Deed",
    validation: "caution",
    saleDate: "2026-01-16",
  },
  {
    id: "1",
    parcelId: "10-01-001-0001",
    address: "123 Main St",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    totalDue: 5234.56,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.25 acres",
    saleType: "Tax Deed",
    validation: null,
    saleDate: "2026-01-16",
  },
  {
    id: "2",
    parcelId: "10-01-001-0002",
    address: "456 Oak Ave",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    totalDue: 12450.0,
    status: "enriched",
    propertyType: "Commercial",
    lotSize: "1.5 acres",
    saleType: "Tax Deed",
    validation: null,
    saleDate: "2026-01-16",
  },
  {
    id: "3",
    parcelId: "10-01-002-0001",
    address: "789 Pine Rd",
    city: "Latrobe",
    county: "Westmoreland",
    state: "PA",
    totalDue: 3200.0,
    status: "validated",
    propertyType: "Residential",
    lotSize: "0.5 acres",
    saleType: "Tax Deed",
    validation: "approved",
    saleDate: "2026-01-16",
  },
  {
    id: "4",
    parcelId: "07-02-001-0015",
    address: "321 Elm St",
    city: "Hollidaysburg",
    county: "Blair",
    state: "PA",
    totalDue: 8750.25,
    status: "approved",
    propertyType: "Residential",
    lotSize: "0.33 acres",
    saleType: "Tax Lien",
    validation: "approved",
    saleDate: "2026-03-11",
  },
  {
    id: "5",
    parcelId: "07-02-002-0008",
    address: "555 Maple Dr",
    city: "Altoona",
    county: "Blair",
    state: "PA",
    totalDue: 2100.0,
    status: "parsed",
    propertyType: "Vacant Land",
    lotSize: "2.0 acres",
    saleType: "Tax Deed",
    validation: null,
    saleDate: "2026-03-11",
  },
  {
    id: "6",
    parcelId: "56-03-001-0022",
    address: "888 Cedar Ln",
    city: "Somerset",
    county: "Somerset",
    state: "PA",
    totalDue: 15600.0,
    status: "enriched",
    propertyType: "Industrial",
    lotSize: "5.0 acres",
    saleType: "Tax Deed",
    validation: null,
    saleDate: "2026-09-08",
  },
  {
    id: "7",
    parcelId: "56-03-002-0011",
    address: "999 Birch Way",
    city: "Berlin",
    county: "Somerset",
    state: "PA",
    totalDue: 4500.0,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.75 acres",
    saleType: "Tax Lien",
    validation: null,
    saleDate: "2026-09-08",
  },
  {
    id: "8",
    parcelId: "14-01-003-0005",
    address: "111 Walnut St",
    city: "State College",
    county: "Centre",
    state: "PA",
    totalDue: 22000.0,
    status: "validated",
    propertyType: "Commercial",
    lotSize: "2.5 acres",
    saleType: "Tax Deed",
    validation: "caution",
    saleDate: "2026-05-20",
  },
  {
    id: "9",
    parcelId: "10-01-003-0001",
    address: "200 Cherry St",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    totalDue: 7890.0,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.4 acres",
    saleType: "Tax Deed",
    validation: null,
    saleDate: "2026-01-16",
  },
  {
    id: "10",
    parcelId: "07-02-003-0001",
    address: "444 Spruce Ave",
    city: "Altoona",
    county: "Blair",
    state: "PA",
    totalDue: 3450.0,
    status: "enriched",
    propertyType: "Commercial",
    lotSize: "0.8 acres",
    saleType: "Tax Lien",
    validation: null,
    saleDate: "2026-03-11",
  },
  {
    id: "11",
    parcelId: "56-03-003-0001",
    address: "777 Ash Blvd",
    city: "Somerset",
    county: "Somerset",
    state: "PA",
    totalDue: 9200.0,
    status: "validated",
    propertyType: "Residential",
    lotSize: "0.45 acres",
    saleType: "Tax Deed",
    validation: "approved",
    saleDate: "2026-09-08",
  },
  {
    id: "12",
    parcelId: "14-01-004-0001",
    address: "333 Hickory Ln",
    city: "Bellefonte",
    county: "Centre",
    state: "PA",
    totalDue: 18500.0,
    status: "approved",
    propertyType: "Industrial",
    lotSize: "3.0 acres",
    saleType: "Tax Deed",
    validation: "approved",
    saleDate: "2026-05-20",
  },
  {
    id: "13",
    parcelId: "10-01-004-0001",
    address: "505 Willow Way",
    city: "Latrobe",
    county: "Westmoreland",
    state: "PA",
    totalDue: 4100.0,
    status: "parsed",
    propertyType: "Vacant Land",
    lotSize: "1.2 acres",
    saleType: "Tax Lien",
    validation: null,
    saleDate: "2026-01-10",
  },
  {
    id: "14",
    parcelId: "07-02-004-0001",
    address: "620 Poplar Dr",
    city: "Hollidaysburg",
    county: "Blair",
    state: "PA",
    totalDue: 6780.0,
    status: "enriched",
    propertyType: "Residential",
    lotSize: "0.5 acres",
    saleType: "Tax Deed",
    validation: null,
    saleDate: "2026-01-09",
  },
  {
    id: "15",
    parcelId: "56-03-004-0001",
    address: "888 Juniper Ct",
    city: "Berlin",
    county: "Somerset",
    state: "PA",
    totalDue: 2950.0,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.35 acres",
    saleType: "Tax Lien",
    validation: null,
    saleDate: "2026-09-08",
  },
]

// In-memory store - will reset on page refresh but persists across navigation
let properties: MockProperty[] = [...INITIAL_PROPERTIES]

// Event listeners for data changes
type DataChangeListener = () => void
const listeners: Set<DataChangeListener> = new Set()

export const mockDataStore = {
  // Get all properties
  getProperties(): MockProperty[] {
    return [...properties]
  },

  // Get property by ID
  getProperty(id: string): MockProperty | undefined {
    return properties.find(p => p.id === id)
  },

  // Delete a property
  deleteProperty(id: string): boolean {
    const index = properties.findIndex(p => p.id === id)
    if (index !== -1) {
      properties.splice(index, 1)
      notifyListeners()
      return true
    }
    return false
  },

  // Update a property
  updateProperty(id: string, updates: Partial<MockProperty>): MockProperty | null {
    const index = properties.findIndex(p => p.id === id)
    if (index !== -1) {
      properties[index] = { ...properties[index], ...updates }
      notifyListeners()
      return properties[index]
    }
    return null
  },

  // Get count of properties
  getCount(): number {
    return properties.length
  },

  // Get count by status
  getCountByStatus(): Record<string, number> {
    return properties.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  },

  // Subscribe to data changes
  subscribe(listener: DataChangeListener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  // Reset to initial state (for testing)
  reset(): void {
    properties = [...INITIAL_PROPERTIES]
    notifyListeners()
  },
}

function notifyListeners() {
  listeners.forEach(listener => listener())
}

export default mockDataStore
