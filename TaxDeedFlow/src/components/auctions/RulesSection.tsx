"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface RulesSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
  badgeColor?: "green" | "amber" | "red" | "blue" | "slate"
}

/**
 * Expandable accordion section for auction rules
 */
export function RulesSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
  badgeColor = "slate",
}: RulesSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const badgeColors = {
    green: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    slate: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-slate-500 dark:text-slate-400">{icon}</span>
          )}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {title}
          </span>
          {badge && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColors[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  )
}
