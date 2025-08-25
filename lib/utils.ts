import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(d);
}

export function calculateROI(profit: number, investment: number): number {
  if (investment === 0) return 0;
  return Math.round((profit / investment) * 10000) / 100;
}

export function getClassificationColor(classification?: 'A' | 'B' | 'C'): string {
  switch (classification) {
    case 'A':
      return 'text-green-600 bg-green-100';
    case 'B':
      return 'text-yellow-600 bg-yellow-100';
    case 'C':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getScoreColor(score?: number): string {
  if (!score) return 'text-gray-600';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}