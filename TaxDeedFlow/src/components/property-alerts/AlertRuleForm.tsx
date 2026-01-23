"use client";

/**
 * Alert Rule Form Component
 *
 * Form for creating and editing property alert rules with investment criteria.
 * Allows users to define criteria for automatic property matching and notifications.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Gauge,
  MapPin,
  Home,
  DollarSign,
  Filter,
  Calendar,
  Save,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import {
  AlertRule,
  CreateAlertRuleInput,
  NotificationFrequency,
} from "@/lib/property-alerts/types";

// ============================================
// Type Definitions
// ============================================

interface AlertRuleFormProps {
  /** Initial values for editing existing rule */
  initialValues?: Partial<AlertRule>;
  /** Callback when form is submitted */
  onSubmit: (values: CreateAlertRuleInput) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Optional additional class names */
  className?: string;
  /** Submit button text */
  submitText?: string;
  /** Whether the form is in loading state */
  isLoading?: boolean;
}

interface County {
  id: string;
  name: string;
  state: string;
}

interface FormValues {
  name: string;
  enabled: boolean;
  scoreThreshold: number | null;
  countyIds: string[];
  propertyTypes: string[];
  maxBid: number | null;
  minAcres: number | null;
  maxAcres: number | null;
  notificationFrequency: NotificationFrequency;
}

// ============================================
// Constants
// ============================================

const DEFAULT_VALUES: FormValues = {
  name: "",
  enabled: true,
  scoreThreshold: 70,
  countyIds: [],
  propertyTypes: [],
  maxBid: null,
  minAcres: null,
  maxAcres: null,
  notificationFrequency: "daily",
};

const PROPERTY_TYPES = [
  { value: "Residential", label: "Residential" },
  { value: "Commercial", label: "Commercial" },
  { value: "Industrial", label: "Industrial" },
  { value: "Agricultural", label: "Agricultural" },
  { value: "Vacant Land", label: "Vacant Land" },
  { value: "Mixed Use", label: "Mixed Use" },
];

// ============================================
// Main Component
// ============================================

export function AlertRuleForm({
  initialValues,
  onSubmit,
  onCancel,
  className,
  submitText = "Save Alert Rule",
  isLoading = false,
}: AlertRuleFormProps) {
  const [values, setValues] = useState<FormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  const [counties, setCounties] = useState<County[]>([]);
  const [loadingCounties, setLoadingCounties] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCounties, setSelectedCounties] = useState<string[]>(
    initialValues?.countyIds || []
  );
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(
    initialValues?.propertyTypes || []
  );

  // Fetch counties for multi-select
  useEffect(() => {
    const fetchCounties = async () => {
      try {
        setLoadingCounties(true);
        const response = await fetch("/api/counties");
        if (!response.ok) throw new Error("Failed to fetch counties");
        const data = await response.json();
        setCounties(data);
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          counties: "Failed to load counties. Please refresh the page.",
        }));
      } finally {
        setLoadingCounties(false);
      }
    };

    fetchCounties();
  }, []);

  const updateValue = useCallback(
    <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      // Clear error for this field when user updates it
      if (errors[key]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const toggleCounty = useCallback((countyId: string) => {
    setSelectedCounties((prev) => {
      if (prev.includes(countyId)) {
        return prev.filter((id) => id !== countyId);
      } else {
        return [...prev, countyId];
      }
    });
  }, []);

  const togglePropertyType = useCallback((propertyType: string) => {
    setSelectedPropertyTypes((prev) => {
      if (prev.includes(propertyType)) {
        return prev.filter((type) => type !== propertyType);
      } else {
        return [...prev, propertyType];
      }
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!values.name.trim()) {
      newErrors.name = "Alert name is required";
    }

    if (values.minAcres !== null && values.maxAcres !== null) {
      if (values.minAcres > values.maxAcres) {
        newErrors.maxAcres = "Max acres must be greater than min acres";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      const submitData: CreateAlertRuleInput = {
        name: values.name.trim(),
        enabled: values.enabled,
        scoreThreshold: values.scoreThreshold ?? undefined,
        countyIds: selectedCounties.length > 0 ? selectedCounties : undefined,
        propertyTypes: selectedPropertyTypes.length > 0 ? selectedPropertyTypes : undefined,
        maxBid: values.maxBid ?? undefined,
        minAcres: values.minAcres ?? undefined,
        maxAcres: values.maxAcres ?? undefined,
        notificationFrequency: values.notificationFrequency,
      };

      try {
        await onSubmit(submitData);
      } catch (error) {
        setErrors({
          submit:
            error instanceof Error
              ? error.message
              : "Failed to save alert rule. Please try again.",
        });
      }
    },
    [values, selectedCounties, selectedPropertyTypes, onSubmit, validateForm]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {initialValues ? "Edit Alert Rule" : "Create Alert Rule"}
        </CardTitle>
        <CardDescription>
          Define criteria to receive notifications when matching properties are
          found
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alert Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
              Alert Details
            </h3>

            <div className="space-y-2">
              <Label htmlFor="name">
                Alert Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="e.g., High ROI Blair County Properties"
                value={values.name}
                onChange={(e) => updateValue("name", e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Alert</Label>
                <p className="text-sm text-slate-500">
                  Receive notifications for this rule
                </p>
              </div>
              <Switch
                id="enabled"
                checked={values.enabled}
                onCheckedChange={(checked) => updateValue("enabled", checked)}
              />
            </div>
          </div>

          {/* Investment Criteria */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
              Investment Criteria
            </h3>

            {/* Score Threshold */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-slate-500" />
                <div className="flex-1 flex justify-between">
                  <Label htmlFor="scoreThreshold">
                    Minimum Investment Score
                  </Label>
                  <span className="text-sm text-slate-500">
                    {values.scoreThreshold ?? "Any"}
                  </span>
                </div>
              </div>
              <Slider
                value={[values.scoreThreshold ?? 0]}
                onValueChange={([val]) =>
                  updateValue("scoreThreshold", val === 0 ? null : val)
                }
                min={0}
                max={100}
                step={5}
              />
              <p className="text-xs text-slate-500">
                Properties with scores below this threshold will be filtered out
              </p>
            </div>

            {/* Max Bid Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <Label htmlFor="maxBid">Maximum Bid Price</Label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  $
                </span>
                <Input
                  id="maxBid"
                  type="number"
                  placeholder="No limit"
                  value={values.maxBid ?? ""}
                  onChange={(e) =>
                    updateValue(
                      "maxBid",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="pl-8"
                  min={0}
                  step={1000}
                />
              </div>
              <p className="text-xs text-slate-500">
                Maximum amount you&apos;re willing to bid (leave empty for no limit)
              </p>
            </div>

            {/* Acreage Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <Label htmlFor="minAcres">Min Acres</Label>
                </div>
                <Input
                  id="minAcres"
                  type="number"
                  placeholder="Any"
                  value={values.minAcres ?? ""}
                  onChange={(e) =>
                    updateValue(
                      "minAcres",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  min={0}
                  step={0.1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAcres">Max Acres</Label>
                <Input
                  id="maxAcres"
                  type="number"
                  placeholder="Any"
                  value={values.maxAcres ?? ""}
                  onChange={(e) =>
                    updateValue(
                      "maxAcres",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  min={0}
                  step={0.1}
                  className={errors.maxAcres ? "border-red-500" : ""}
                />
                {errors.maxAcres && (
                  <p className="text-sm text-red-500">{errors.maxAcres}</p>
                )}
              </div>
            </div>
          </div>

          {/* Location & Property Type */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
              Location & Property Type
            </h3>

            {/* Counties Multi-Select */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-500" />
                <Label>Counties</Label>
              </div>
              {loadingCounties ? (
                <p className="text-sm text-slate-500">Loading counties...</p>
              ) : errors.counties ? (
                <p className="text-sm text-red-500">{errors.counties}</p>
              ) : (
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto bg-white dark:bg-slate-950">
                  {counties.length === 0 ? (
                    <p className="text-sm text-slate-500">No counties available</p>
                  ) : (
                    <div className="space-y-2">
                      {counties.map((county) => (
                        <div
                          key={county.id}
                          className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            id={`county-${county.id}`}
                            checked={selectedCounties.includes(county.id)}
                            onChange={() => toggleCounty(county.id)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <label
                            htmlFor={`county-${county.id}`}
                            className="text-sm flex-1 cursor-pointer"
                          >
                            {county.name}, {county.state}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500">
                {selectedCounties.length === 0
                  ? "All counties (leave empty for no filter)"
                  : `${selectedCounties.length} selected`}
              </p>
            </div>

            {/* Property Types */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-slate-500" />
                <Label>Property Types</Label>
              </div>
              <div className="border rounded-lg p-3 bg-white dark:bg-slate-950">
                <div className="space-y-2">
                  {PROPERTY_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        id={`type-${type.value}`}
                        checked={selectedPropertyTypes.includes(type.value)}
                        onChange={() => togglePropertyType(type.value)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <label
                        htmlFor={`type-${type.value}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {selectedPropertyTypes.length === 0
                  ? "All property types (leave empty for no filter)"
                  : `${selectedPropertyTypes.length} selected`}
              </p>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wide">
              Notification Settings
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <Label htmlFor="notificationFrequency">
                  Notification Frequency
                </Label>
              </div>
              <Select
                value={values.notificationFrequency}
                onValueChange={(val) =>
                  updateValue(
                    "notificationFrequency",
                    val as NotificationFrequency
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">
                    Instant - Notify immediately when properties match
                  </SelectItem>
                  <SelectItem value="daily">
                    Daily - Send a daily digest of new matches
                  </SelectItem>
                  <SelectItem value="weekly">
                    Weekly - Send a weekly summary
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Form Errors */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.submit}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : submitText}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default AlertRuleForm;
