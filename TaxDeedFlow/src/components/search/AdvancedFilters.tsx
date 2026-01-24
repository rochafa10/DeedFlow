"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FilterCriteria, RiskLevel } from "@/types/search"
import { Filter, X } from "lucide-react"

interface AdvancedFiltersProps {
  filters: FilterCriteria
  onFiltersChange: (filters: FilterCriteria) => void
  counties?: string[]
}

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high"]

const DEFAULT_COUNTIES = [
  "Blair",
  "Centre",
  "Bedford",
  "Cambria",
  "Clearfield",
  "Huntingdon",
  "Somerset",
]

export function AdvancedFilters({
  filters,
  onFiltersChange,
  counties = DEFAULT_COUNTIES,
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterCriteria>(filters)
  const [showCountyDropdown, setShowCountyDropdown] = useState(false)

  // Sync local filters with prop changes
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleScoreMinChange = (value: number[]) => {
    setLocalFilters((prev) => ({
      ...prev,
      scoreMin: value[0],
    }))
  }

  const handleScoreMaxChange = (value: number[]) => {
    setLocalFilters((prev) => ({
      ...prev,
      scoreMax: value[0],
    }))
  }

  const handleCountyToggle = (county: string) => {
    const currentCounties = localFilters.counties || []
    const updatedCounties = currentCounties.includes(county)
      ? currentCounties.filter((c) => c !== county)
      : [...currentCounties, county]

    setLocalFilters((prev) => ({
      ...prev,
      counties: updatedCounties,
    }))
  }

  const handleRiskFactorChange = (
    factor: "flood" | "fire" | "earthquake",
    level: RiskLevel | null
  ) => {
    setLocalFilters((prev) => ({
      ...prev,
      riskFactors: {
        ...prev.riskFactors,
        [factor]: level,
      },
    }))
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
  }

  const handleReset = () => {
    const resetFilters: FilterCriteria = {
      scoreMin: 0,
      scoreMax: 125,
      counties: [],
      riskFactors: {
        flood: null,
        fire: null,
        earthquake: null,
      },
    }
    setLocalFilters(resetFilters)
    onFiltersChange(resetFilters)
  }

  const selectedCountiesCount = (localFilters.counties || []).length
  const hasActiveFilters =
    (localFilters.scoreMin && localFilters.scoreMin > 0) ||
    (localFilters.scoreMax && localFilters.scoreMax < 125) ||
    selectedCountiesCount > 0 ||
    localFilters.riskFactors?.flood ||
    localFilters.riskFactors?.fire ||
    localFilters.riskFactors?.earthquake

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-5 w-5" />
          Advanced Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Range Section */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Investment Score Range</Label>
            <p className="text-xs text-slate-500 mt-1">
              Filter properties by investment score (0-125)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="score-min" className="text-xs">
                Minimum Score
              </Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="score-min"
                  value={[localFilters.scoreMin || 0]}
                  onValueChange={handleScoreMinChange}
                  min={0}
                  max={125}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-10 text-right">
                  {localFilters.scoreMin || 0}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="score-max" className="text-xs">
                Maximum Score
              </Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="score-max"
                  value={[localFilters.scoreMax || 125]}
                  onValueChange={handleScoreMaxChange}
                  min={0}
                  max={125}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-10 text-right">
                  {localFilters.scoreMax || 125}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* County Multi-Select Section */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Counties</Label>
            <p className="text-xs text-slate-500 mt-1">
              Select one or more counties to filter
            </p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCountyDropdown(!showCountyDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
            >
              <span className="text-slate-700">
                {selectedCountiesCount === 0
                  ? "Select counties..."
                  : `${selectedCountiesCount} ${
                      selectedCountiesCount === 1 ? "county" : "counties"
                    } selected`}
              </span>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showCountyDropdown ? "transform rotate-180" : ""
                }`}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCountyDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {counties.map((county) => {
                  const isSelected = (localFilters.counties || []).includes(
                    county
                  )
                  return (
                    <label
                      key={county}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleCountyToggle(county)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                      <span className="text-sm">{county}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {selectedCountiesCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {(localFilters.counties || []).map((county) => (
                <span
                  key={county}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md"
                >
                  {county}
                  <button
                    type="button"
                    onClick={() => handleCountyToggle(county)}
                    className="hover:text-slate-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Risk Factor Checkboxes Section */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Risk Factors</Label>
            <p className="text-xs text-slate-500 mt-1">
              Filter by specific risk levels (leave unchecked for all)
            </p>
          </div>

          <div className="space-y-3">
            {/* Flood Risk */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">
                Flood Risk
              </Label>
              <div className="flex gap-3">
                {RISK_LEVELS.map((level) => {
                  const isChecked = localFilters.riskFactors?.flood === level
                  return (
                    <label
                      key={`flood-${level}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          handleRiskFactorChange(
                            "flood",
                            isChecked ? null : level
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                      <span className="text-sm capitalize">{level}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Fire Risk */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">
                Fire Risk
              </Label>
              <div className="flex gap-3">
                {RISK_LEVELS.map((level) => {
                  const isChecked = localFilters.riskFactors?.fire === level
                  return (
                    <label
                      key={`fire-${level}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          handleRiskFactorChange("fire", isChecked ? null : level)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                      <span className="text-sm capitalize">{level}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Earthquake Risk */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-700">
                Earthquake Risk
              </Label>
              <div className="flex gap-3">
                {RISK_LEVELS.map((level) => {
                  const isChecked =
                    localFilters.riskFactors?.earthquake === level
                  return (
                    <label
                      key={`earthquake-${level}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          handleRiskFactorChange(
                            "earthquake",
                            isChecked ? null : level
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      />
                      <span className="text-sm capitalize">{level}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1"
            disabled={!hasActiveFilters}
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
