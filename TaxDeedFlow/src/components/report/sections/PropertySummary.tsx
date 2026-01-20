"use client";

import * as React from "react";
import {
  MapPin,
  Home,
  Ruler,
  Calendar,
  Building2,
  User,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid, InlineMetric } from "../shared/MetricDisplay";
import { GradeBadge } from "../shared/GradeDisplay";
import { RiskIndicator } from "../shared/RiskIndicator";
import { DataUnavailable, PartialDataWarning } from "../shared/ErrorState";
import type { PropertyReportData, Grade, RiskLevel } from "@/types/report";
import { formatValue } from "@/types/report";

/**
 * Property details for the summary section
 */
export interface PropertyDetails {
  /** Property address */
  address: string;
  /** City */
  city: string | null;
  /** State code */
  state: string;
  /** ZIP code */
  zip: string | null;
  /** County name */
  county: string;
  /** Parcel ID */
  parcelId: string;
  /** Property type (e.g., Single Family, Vacant Land) */
  propertyType: string | null;
  /** Property class */
  propertyClass: string | null;
  /** Zoning code */
  zoning: string | null;
  /** Lot size in square feet */
  lotSizeSqft: number | null;
  /** Lot size in acres */
  lotSizeAcres: number | null;
  /** Building square footage */
  buildingSqft: number | null;
  /** Year built */
  yearBuilt: number | null;
  /** Number of bedrooms */
  bedrooms: number | null;
  /** Number of bathrooms */
  bathrooms: number | null;
  /** Owner name */
  ownerName: string | null;
  /** Assessed value */
  assessedValue: number | null;
  /** Market value estimate */
  marketValue: number | null;
  /** Last sale date */
  lastSaleDate: Date | null;
  /** Last sale price */
  lastSalePrice: number | null;
  /** Screenshot URL */
  screenshotUrl: string | null;
  /** Regrid URL */
  regridUrl: string | null;
  /** Zillow URL */
  zillowUrl: string | null;
}

/**
 * Props for the PropertySummary component
 */
export interface PropertySummaryProps {
  /** Property details */
  property: PropertyDetails;
  /** Overall grade (optional, for quick reference) */
  grade?: Grade;
  /** Risk level (optional, for quick reference) */
  riskLevel?: RiskLevel;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Data quality score (0-100) */
  dataQuality?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PropertySummary - Section 1: Property overview and key details
 *
 * Features:
 * - Property address and location
 * - Property characteristics (lot size, building size, year built)
 * - Owner information
 * - Valuation summary
 * - External links (Regrid, Zillow)
 * - Property screenshot
 * - Data quality indicator
 *
 * @example
 * ```tsx
 * <PropertySummary
 *   property={{
 *     address: "123 Main St",
 *     city: "Altoona",
 *     state: "PA",
 *     zip: "16602",
 *     county: "Blair",
 *     parcelId: "01.01-04..-156.00-000",
 *     propertyType: "Single Family",
 *     lotSizeSqft: 8500,
 *     buildingSqft: 1800,
 *     yearBuilt: 1955,
 *     assessedValue: 85000,
 *     marketValue: 125000,
 *   }}
 *   grade="B+"
 *   riskLevel="medium"
 * />
 * ```
 */
export function PropertySummary({
  property,
  grade,
  riskLevel,
  defaultCollapsed = false,
  dataQuality,
  className,
}: PropertySummaryProps) {
  // Calculate how many key fields are missing
  const missingFields: string[] = [];
  if (!property.propertyType) missingFields.push("property type");
  if (!property.lotSizeSqft && !property.lotSizeAcres) missingFields.push("lot size");
  if (!property.assessedValue && !property.marketValue) missingFields.push("valuation");

  const hasPartialData = missingFields.length > 0 && missingFields.length < 3;
  const hasMissingData = missingFields.length >= 3;

  // Format full address
  const fullAddress = [
    property.address,
    property.city && property.state
      ? `${property.city}, ${property.state}`
      : property.city || property.state,
    property.zip,
  ]
    .filter(Boolean)
    .join(" ");

  // Calculate property age
  const propertyAge = property.yearBuilt
    ? new Date().getFullYear() - property.yearBuilt
    : null;

  return (
    <ReportSection
      id="property-summary"
      title="Property Summary"
      icon={<Home className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={
        grade && riskLevel ? (
          <div className="flex items-center gap-3">
            <GradeBadge grade={grade} />
            <RiskIndicator level={riskLevel} size="sm" />
          </div>
        ) : undefined
      }
    >
      {hasMissingData ? (
        <DataUnavailable
          title="Limited Property Data"
          description="Core property information is unavailable. This may affect analysis accuracy."
          missingFields={missingFields}
        />
      ) : (
        <>
          {hasPartialData && (
            <PartialDataWarning
              missingFields={missingFields}
              impact="Some metrics may be estimated or unavailable."
              className="mb-4"
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: Property image and links */}
            <div className="lg:col-span-1">
              {/* Property Screenshot */}
              {property.screenshotUrl ? (
                <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 mb-4">
                  <img
                    src={property.screenshotUrl}
                    alt={`Aerial view of ${property.address}`}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="rounded-lg bg-slate-100 dark:bg-slate-700 h-48 flex items-center justify-center mb-4">
                  <div className="text-center text-slate-400 dark:text-slate-500">
                    <Building2 className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">No image available</p>
                  </div>
                </div>
              )}

              {/* External Links */}
              <div className="space-y-2">
                {property.regridUrl && (
                  <a
                    href={property.regridUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on Regrid
                  </a>
                )}
                {property.zillowUrl && (
                  <a
                    href={property.zillowUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on Zillow
                  </a>
                )}
              </div>

              {/* Data Quality Indicator */}
              {dataQuality !== undefined && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      Data Quality
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        dataQuality >= 80
                          ? "text-green-600 dark:text-green-400"
                          : dataQuality >= 60
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {dataQuality}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        dataQuality >= 80
                          ? "bg-green-500"
                          : dataQuality >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      )}
                      style={{ width: `${dataQuality}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right columns: Property details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Address and Location */}
              <ReportSubsection title="Location" icon={<MapPin className="h-4 w-4" />}>
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {property.address || "Address Unavailable"}
                    </p>
                    {(property.city || property.state || property.zip) && (
                      <p className="text-slate-600 dark:text-slate-400">
                        {[property.city, property.state].filter(Boolean).join(", ")}
                        {property.zip && ` ${property.zip}`}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">County</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {property.county}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Parcel ID</span>
                      <p className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                        {property.parcelId}
                      </p>
                    </div>
                  </div>
                </div>
              </ReportSubsection>

              {/* Property Characteristics */}
              <ReportSubsection
                title="Property Characteristics"
                icon={<Ruler className="h-4 w-4" />}
              >
                <MetricGrid columns={3}>
                  <MetricDisplay
                    label="Property Type"
                    value={property.propertyType}
                    icon={<Building2 className="h-4 w-4" />}
                  />
                  <MetricDisplay
                    label="Lot Size"
                    value={
                      property.lotSizeAcres
                        ? `${property.lotSizeAcres.toFixed(2)} acres`
                        : property.lotSizeSqft
                        ? `${property.lotSizeSqft.toLocaleString()} sqft`
                        : null
                    }
                    icon={<Ruler className="h-4 w-4" />}
                  />
                  <MetricDisplay
                    label="Building Size"
                    value={
                      property.buildingSqft
                        ? `${property.buildingSqft.toLocaleString()} sqft`
                        : null
                    }
                    icon={<Home className="h-4 w-4" />}
                  />
                  <MetricDisplay
                    label="Year Built"
                    value={property.yearBuilt}
                    secondaryValue={propertyAge ? `${propertyAge} years old` : undefined}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  <MetricDisplay
                    label="Bedrooms"
                    value={property.bedrooms}
                  />
                  <MetricDisplay
                    label="Bathrooms"
                    value={property.bathrooms}
                  />
                  <MetricDisplay
                    label="Zoning"
                    value={property.zoning}
                  />
                  <MetricDisplay
                    label="Property Class"
                    value={property.propertyClass}
                  />
                </MetricGrid>
              </ReportSubsection>

              {/* Ownership and Valuation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Owner Info */}
                <ReportSubsection
                  title="Ownership"
                  icon={<User className="h-4 w-4" />}
                >
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Owner Name
                      </span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {property.ownerName || "Not available"}
                      </p>
                    </div>
                    {(property.lastSaleDate || property.lastSalePrice) && (
                      <div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Last Sale
                        </span>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {property.lastSalePrice
                            ? formatValue(property.lastSalePrice, "currency")
                            : "N/A"}
                          {property.lastSaleDate && (
                            <span className="text-slate-500 dark:text-slate-400 ml-2">
                              ({formatValue(property.lastSaleDate, "date")})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </ReportSubsection>

                {/* Valuation */}
                <ReportSubsection
                  title="Valuation"
                  icon={<FileText className="h-4 w-4" />}
                >
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Assessed Value
                      </span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {property.assessedValue
                          ? formatValue(property.assessedValue, "currency")
                          : "Not available"}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Estimated Market Value
                      </span>
                      <p className="text-lg font-semibold text-primary">
                        {property.marketValue
                          ? formatValue(property.marketValue, "currency")
                          : "Not available"}
                      </p>
                    </div>
                  </div>
                </ReportSubsection>
              </div>
            </div>
          </div>
        </>
      )}
    </ReportSection>
  );
}

export default PropertySummary;
