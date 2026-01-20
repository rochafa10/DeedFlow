"use client"

import { HelpCircle } from "lucide-react"

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void
  saleType: string
}

/**
 * Suggested questions to help users get started
 */
export function SuggestedQuestions({ onSelect, saleType }: SuggestedQuestionsProps) {
  const questions = [
    "What deposit is required to bid?",
    "What are the registration requirements?",
    "How soon do I need to pay after winning?",
    "What payment methods are accepted?",
    "Is there a buyer's premium?",
    `What makes a ${saleType.toLowerCase()} sale different from other sales?`,
    "What liens survive this type of sale?",
    "Can I get financing for my purchase?",
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <HelpCircle className="h-4 w-4" />
        <span>Suggested questions:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.slice(0, 6).map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-left"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  )
}
