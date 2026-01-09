"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  ExternalLink,
  Building2,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Users,
  Gavel,
  CreditCard,
  Timer,
  ClipboardList,
  Info,
  Download,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"

// Mock auction data - should match the data in auctions/page.tsx
const MOCK_AUCTIONS = [
  {
    id: "1",
    county: "Westmoreland",
    state: "PA",
    date: "2026-01-16",
    type: "Tax Deed",
    platform: "In-Person",
    location: "Courthouse",
    propertyCount: 172,
    registrationDeadline: "2026-01-10",
    depositRequired: "$5,000",
    status: "upcoming",
  },
  {
    id: "2",
    county: "Blair",
    state: "PA",
    date: "2026-03-11",
    type: "Tax Deed",
    platform: "Bid4Assets",
    location: "Online",
    propertyCount: 252,
    registrationDeadline: "2026-03-04",
    depositRequired: "$2,500",
    status: "upcoming",
  },
  {
    id: "3",
    county: "Philadelphia",
    state: "PA",
    date: "2026-04-15",
    type: "Tax Lien",
    platform: "Bid4Assets",
    location: "Online",
    propertyCount: 4521,
    registrationDeadline: "2026-04-08",
    depositRequired: "$10,000",
    status: "upcoming",
  },
  {
    id: "4",
    county: "Cambria",
    state: "PA",
    date: "2026-05-20",
    type: "Tax Deed",
    platform: "In-Person",
    location: "Courthouse",
    propertyCount: 845,
    registrationDeadline: "2026-05-13",
    depositRequired: "$3,000",
    status: "upcoming",
  },
  {
    id: "5",
    county: "Somerset",
    state: "PA",
    date: "2026-09-08",
    type: "Tax Deed",
    platform: "GovEase",
    location: "Online",
    propertyCount: 2663,
    registrationDeadline: "2026-09-01",
    depositRequired: "$5,000",
    status: "upcoming",
  },
]

// Extended auction details for detail page
const AUCTION_DETAILS: Record<string, {
  auctionTime: string;
  auctionAddress: string;
  contactPhone: string;
  contactEmail: string;
  websiteUrl: string;
  bidderRequirements: string[];
  paymentMethods: string[];
  paymentDeadline: string;
  biddingProcess: string[];
  redemptionPeriod: string;
  investorBriefing: {
    overview: string;
    opportunities: string[];
    risks: string[];
    recommendation: string;
  };
  documents: { name: string; type: string; date: string }[];
}> = {
  "1": {
    auctionTime: "10:00 AM EST",
    auctionAddress: "Westmoreland County Courthouse, 2 N Main St, Greensburg, PA 15601",
    contactPhone: "(724) 830-3150",
    contactEmail: "taxclaim@co.westmoreland.pa.us",
    websiteUrl: "https://www.co.westmoreland.pa.us",
    bidderRequirements: [
      "Valid government-issued photo ID",
      "Pre-registration required by deadline",
      "Refundable deposit of $5,000",
      "Must be 18 years or older",
      "No outstanding taxes owed to county",
    ],
    paymentMethods: ["Certified Check", "Money Order", "Cash (up to $10,000)"],
    paymentDeadline: "Within 30 days of sale",
    biddingProcess: [
      "Properties auctioned in order listed",
      "Opening bid is total amount due",
      "Bidding in $100 increments",
      "Highest bidder wins property",
      "Immediate deposit required upon winning",
    ],
    redemptionPeriod: "None - Tax Deed sale",
    investorBriefing: {
      overview: "Westmoreland County offers a strong tax deed sale with 172 properties across diverse property types. The county has a history of clear title transfers and efficient closing processes.",
      opportunities: [
        "Strong residential market in suburban areas",
        "Several commercial properties available",
        "Average acquisition cost 40-60% below market value",
        "Growing population in the region",
      ],
      risks: [
        "Some properties may have environmental concerns",
        "Rural properties may have limited access",
        "Competition from experienced investors expected",
        "Title insurance may be required for resale",
      ],
      recommendation: "Recommended for intermediate to advanced investors. Focus on residential properties in developed areas for best ROI potential.",
    },
    documents: [
      { name: "Property List 2026", type: "PDF", date: "2026-01-02" },
      { name: "Bidder Registration Form", type: "PDF", date: "2025-12-15" },
      { name: "Sale Terms & Conditions", type: "PDF", date: "2025-12-15" },
      { name: "Payment Instructions", type: "PDF", date: "2025-12-15" },
    ],
  },
  "2": {
    auctionTime: "9:00 AM EST",
    auctionAddress: "Online via Bid4Assets",
    contactPhone: "(814) 693-3085",
    contactEmail: "taxsale@blairco.org",
    websiteUrl: "https://www.blairco.org",
    bidderRequirements: [
      "Bid4Assets account required",
      "Pre-registration on platform",
      "Refundable deposit of $2,500",
      "Valid credit card on file",
    ],
    paymentMethods: ["ACH Transfer", "Wire Transfer", "Credit Card (3% fee)"],
    paymentDeadline: "Within 10 business days",
    biddingProcess: [
      "Online auction over 3 days",
      "Extended bidding if bid in last 5 minutes",
      "Proxy bidding available",
      "Winner notified by email",
    ],
    redemptionPeriod: "None - Tax Deed sale",
    investorBriefing: {
      overview: "Blair County's Bid4Assets auction provides convenient online access to 252 properties. The online format allows for careful due diligence before bidding.",
      opportunities: [
        "Online format allows remote participation",
        "Proxy bidding enables strategic purchasing",
        "Mix of urban and rural properties",
        "Lower deposit requirement than in-person sales",
      ],
      risks: [
        "Online competition can drive up prices",
        "Cannot inspect properties in real-time",
        "Payment deadline is strict",
      ],
      recommendation: "Good opportunity for both new and experienced investors. Online format is user-friendly.",
    },
    documents: [
      { name: "Property List 2026", type: "PDF", date: "2026-01-05" },
      { name: "Bid4Assets Guide", type: "PDF", date: "2025-11-01" },
    ],
  },
  "3": {
    auctionTime: "10:00 AM EST",
    auctionAddress: "Online via Bid4Assets",
    contactPhone: "(215) 686-6442",
    contactEmail: "revenue@phila.gov",
    websiteUrl: "https://www.phila.gov/revenue",
    bidderRequirements: [
      "Bid4Assets account required",
      "Philadelphia business license (if applicable)",
      "Deposit of $10,000",
      "Background check clearance",
    ],
    paymentMethods: ["ACH Transfer", "Wire Transfer"],
    paymentDeadline: "Within 10 business days",
    biddingProcess: [
      "Tax Lien certificate sale",
      "Bidding on interest rate (starts at 18%)",
      "Lowest interest rate wins",
      "Lien holder has foreclosure rights",
    ],
    redemptionPeriod: "1 year from lien sale date",
    investorBriefing: {
      overview: "Philadelphia's tax lien sale is the largest in Pennsylvania with 4,521 properties. This is a TAX LIEN sale, not a tax deed sale - investors purchase the lien, not the property directly.",
      opportunities: [
        "High volume of liens available",
        "Guaranteed interest return if redeemed",
        "Potential to acquire property through foreclosure",
        "Urban properties with development potential",
      ],
      risks: [
        "Not immediate property ownership",
        "Property may be redeemed",
        "Foreclosure process required for title",
        "Higher deposit requirement",
        "Complex urban property issues",
      ],
      recommendation: "Advanced investors only. Requires understanding of tax lien vs tax deed differences. Significant capital required.",
    },
    documents: [
      { name: "Tax Lien Sale Notice", type: "PDF", date: "2026-02-01" },
      { name: "Property List 2026", type: "PDF", date: "2026-03-01" },
    ],
  },
  "4": {
    auctionTime: "10:00 AM EST",
    auctionAddress: "Cambria County Courthouse, 200 S Center St, Ebensburg, PA 15931",
    contactPhone: "(814) 472-1490",
    contactEmail: "taxclaim@co.cambria.pa.us",
    websiteUrl: "https://www.cambriaco.com",
    bidderRequirements: [
      "Valid government-issued photo ID",
      "Pre-registration required",
      "Refundable deposit of $3,000",
      "Must attend in person or send authorized representative",
    ],
    paymentMethods: ["Certified Check", "Money Order", "Cash"],
    paymentDeadline: "Within 30 days of sale",
    biddingProcess: [
      "Traditional courthouse auction",
      "Properties sold as-is",
      "Starting bid is total taxes due",
      "Cash or certified funds for deposit",
    ],
    redemptionPeriod: "None - Tax Deed sale",
    investorBriefing: {
      overview: "Cambria County offers 845 properties in a traditional courthouse setting. The county is known for affordable properties with good investment potential.",
      opportunities: [
        "Lower property values mean lower entry costs",
        "Less competition than urban areas",
        "Recreational and hunting land available",
        "Growing tourism industry in area",
      ],
      risks: [
        "Economic challenges in some areas",
        "Some properties in declining neighborhoods",
        "Distance from major metro areas",
      ],
      recommendation: "Good for investors seeking affordable entry points. Best suited for buy-and-hold or rental strategies.",
    },
    documents: [
      { name: "Property List 2026", type: "PDF", date: "2026-04-01" },
      { name: "Bidder Registration", type: "PDF", date: "2026-03-15" },
    ],
  },
  "5": {
    auctionTime: "9:00 AM EST",
    auctionAddress: "Online via GovEase",
    contactPhone: "(814) 445-1473",
    contactEmail: "taxsale@co.somerset.pa.us",
    websiteUrl: "https://www.co.somerset.pa.us",
    bidderRequirements: [
      "GovEase account required",
      "Valid ID uploaded to platform",
      "Deposit of $5,000",
      "Agree to terms and conditions",
    ],
    paymentMethods: ["ACH Transfer", "Wire Transfer", "Credit Card (2.5% fee)"],
    paymentDeadline: "Within 14 days",
    biddingProcess: [
      "Online auction platform",
      "Bid extensions in final minutes",
      "Real-time bidding updates",
      "Automatic bid notifications",
    ],
    redemptionPeriod: "None - Tax Deed sale",
    investorBriefing: {
      overview: "Somerset County's large sale of 2,663 properties offers significant opportunities. The GovEase platform is user-friendly and the county provides excellent support.",
      opportunities: [
        "Largest selection of properties",
        "Mix of residential, commercial, and land",
        "Seven Springs resort area properties",
        "Affordable rural acreage",
      ],
      risks: [
        "Volume can make due diligence challenging",
        "Remote properties may have access issues",
        "Some properties landlocked",
      ],
      recommendation: "Excellent opportunity for investors willing to do thorough research. Volume allows for selective purchasing.",
    },
    documents: [
      { name: "Property List 2026", type: "PDF", date: "2026-07-15" },
      { name: "GovEase Registration Guide", type: "PDF", date: "2026-06-01" },
      { name: "Sale Terms", type: "PDF", date: "2026-06-01" },
    ],
  },
}

export default function AuctionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<"briefing" | "rules" | "documents">("briefing")

  const saleId = params.saleId as string
  const auction = MOCK_AUCTIONS.find((a) => a.id === saleId)
  const details = AUCTION_DETAILS[saleId]

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Handle auction not found
  if (!auction || !details) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/auctions")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Auctions
          </button>
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-slate-900 mb-2">
              Auction Not Found
            </h1>
            <p className="text-slate-600">
              The auction you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Calculate days until auction
  const getDaysUntil = (dateStr: string) => {
    const today = new Date("2026-01-09")
    const auctionDate = new Date(dateStr)
    const diff = Math.ceil((auctionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const daysUntilAuction = getDaysUntil(auction.date)
  const daysUntilRegistration = getDaysUntil(auction.registrationDeadline)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/auctions")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </button>

        {/* Header Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {auction.county} County, {auction.state}
                </h1>
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  auction.type === "Tax Deed"
                    ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
                )}>
                  {auction.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(auction.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{details.auctionTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-slate-600">
                <MapPin className="h-4 w-4" />
                <span>{details.auctionAddress}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={details.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Official Website
              </a>
              <button
                onClick={() => router.push(`/counties/${auction.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                View County
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Timer className="h-4 w-4" />
              Days Until Auction
            </div>
            <div className={cn(
              "text-2xl font-bold",
              daysUntilAuction <= 7
                ? "text-red-600"
                : daysUntilAuction <= 30
                ? "text-amber-600"
                : "text-slate-900"
            )}>
              {daysUntilAuction}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Building2 className="h-4 w-4" />
              Properties
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {auction.propertyCount.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Deposit Required
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {auction.depositRequired}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Gavel className="h-4 w-4" />
              Platform
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {auction.platform}
            </div>
          </div>
        </div>

        {/* Key Dates Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Key Dates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                daysUntilRegistration <= 3 ? "bg-red-100" : "bg-amber-100"
              )}>
                <Users className={cn(
                  "h-5 w-5",
                  daysUntilRegistration <= 3 ? "text-red-600" : "text-amber-600"
                )} />
              </div>
              <div>
                <div className="font-medium text-slate-900">Registration Deadline</div>
                <div className="text-slate-600">
                  {new Date(auction.registrationDeadline).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className={cn(
                  "text-sm font-medium",
                  daysUntilRegistration <= 3 ? "text-red-600" : "text-amber-600"
                )}>
                  {daysUntilRegistration} days remaining
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Gavel className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">Auction Date</div>
                <div className="text-slate-600">
                  {new Date(auction.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="text-sm text-slate-500">
                  {details.auctionTime}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-slate-900">Payment Deadline</div>
                <div className="text-slate-600">{details.paymentDeadline}</div>
                <div className="text-sm text-slate-500">
                  Methods: {details.paymentMethods.join(", ")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="flex">
              <button
                onClick={() => setActiveTab("briefing")}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === "briefing"
                    ? "text-primary border-b-2 border-primary bg-white"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Info className="h-4 w-4" />
                Investor Briefing
              </button>
              <button
                onClick={() => setActiveTab("rules")}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === "rules"
                    ? "text-primary border-b-2 border-primary bg-white"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                Auction Rules
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === "documents"
                    ? "text-primary border-b-2 border-primary bg-white"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <FileText className="h-4 w-4" />
                Documents
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Investor Briefing Tab */}
            {activeTab === "briefing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Overview</h3>
                  <p className="text-slate-600">{details.investorBriefing.overview}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Opportunities
                    </h3>
                    <ul className="space-y-2">
                      {details.investorBriefing.opportunities.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-green-700">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Risks
                    </h3>
                    <ul className="space-y-2">
                      {details.investorBriefing.risks.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-amber-700">
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Recommendation
                  </h3>
                  <p className="text-blue-700">{details.investorBriefing.recommendation}</p>
                </div>
              </div>
            )}

            {/* Auction Rules Tab */}
            {activeTab === "rules" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-slate-600" />
                      Bidder Requirements
                    </h3>
                    <ul className="space-y-2">
                      {details.bidderRequirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-slate-600" />
                      Bidding Process
                    </h3>
                    <ol className="space-y-2">
                      {details.biddingProcess.map((step, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600">
                          <span className="bg-slate-200 text-slate-700 text-xs font-medium px-2 py-0.5 rounded flex-shrink-0">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Payment Methods</h4>
                      <ul className="space-y-1">
                        {details.paymentMethods.map((method, index) => (
                          <li key={index} className="text-slate-600 text-sm">
                            {method}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Payment Deadline</h4>
                      <p className="text-slate-600 text-sm">{details.paymentDeadline}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Redemption Period</h4>
                      <p className="text-slate-600 text-sm">{details.redemptionPeriod}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="font-semibold text-slate-900 mb-2">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">Phone</div>
                      <div className="font-medium text-slate-900">{details.contactPhone}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Email</div>
                      <a href={`mailto:${details.contactEmail}`} className="font-medium text-primary hover:underline">
                        {details.contactEmail}
                      </a>
                    </div>
                    <div>
                      <div className="text-slate-500">Website</div>
                      <a href={details.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                        Visit Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div>
                <div className="space-y-3">
                  {details.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded">
                          <FileText className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{doc.name}</div>
                          <div className="text-sm text-slate-500">
                            {doc.type} • Added {new Date(doc.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-blue-50 rounded-lg transition-colors">
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>

                {details.documents.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No documents available for this auction yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
