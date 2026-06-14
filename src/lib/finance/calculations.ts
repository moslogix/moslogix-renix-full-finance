// ══════════════════════════════════════════════════════════════════
// MOS Logix Finance — Pure Financial Calculations Library
// All formulas are pure functions. No side effects. No DB calls.
// Egyptian tax law defaults baked in, all values overridable.
// ══════════════════════════════════════════════════════════════════

import type {
  Transaction,
  OrderItemWithCost,
  Expense,
  DeltaResult,
} from '@/types/finance/finance.types'

const round2 = (n: number): number => Math.round(n * 100) / 100

// ─── Revenue ────────────────────────────────────────────────────

export function calcGrossRevenue(transactions: Transaction[]): number {
  return round2(
    transactions
      .filter((t) => t.type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0)
  )
}

export function calcTotalRefunds(transactions: Transaction[]): number {
  return round2(
    transactions
      .filter((t) => t.type === 'refund')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  )
}

export function calcNetRevenue(gross: number, refunds: number): number {
  return round2(gross - refunds)
}

export function calcTaxCollected(transactions: Transaction[]): number {
  return round2(
    transactions
      .filter((t) => t.type === 'tax')
      .reduce((sum, t) => sum + t.amount, 0)
  )
}

// ─── Costs ──────────────────────────────────────────────────────

export function calcCOGS(orderItems: OrderItemWithCost[]): number {
  return round2(
    orderItems.reduce((sum, item) => sum + ((item.cost_price ?? 0) * item.quantity), 0)
  )
}

export function calcTotalExpenses(expenses: Expense[]): number {
  return round2(
    expenses
      .filter((e) => !e.deleted_at)
      .reduce((sum, e) => sum + e.amount, 0)
  )
}

// ─── Profit ─────────────────────────────────────────────────────

export function calcGrossProfit(netRevenue: number, cogs: number): number {
  return round2(netRevenue - cogs)
}

export function calcNetProfit(grossProfit: number, expenses: number): number {
  return round2(grossProfit - expenses)
}

export function calcProfitMarginPct(netProfit: number, netRevenue: number): number {
  if (netRevenue === 0) return 0
  return round2((netProfit / netRevenue) * 100)
}

// ─── Cash Flow ──────────────────────────────────────────────────

export function calcCashFlow(netRevenue: number, expenses: number, refunds: number): number {
  return round2(netRevenue - expenses - refunds)
}

// ─── Period Comparison ──────────────────────────────────────────

export function calcDelta(current: number, prior: number): DeltaResult {
  const value = round2(current - prior)
  if (prior === 0) {
    return {
      value,
      pct: current > 0 ? 100 : current < 0 ? -100 : 0,
      direction: current > prior ? 'up' : current < prior ? 'down' : 'flat',
    }
  }
  const pct = round2(((current - prior) / Math.abs(prior)) * 100)
  return {
    value,
    pct,
    direction: value > 0 ? 'up' : value < 0 ? 'down' : 'flat',
  }
}

// ─── Tax Calculations (Egyptian VAT Law No. 67/2016) ────────────
// Default rate: 14% — configurable per store via tax_rules table

/**
 * Calculate tax amount on a net (exclusive) price.
 * E.g., item costs 100 EGP exclusive → tax = 100 * 0.14 = 14 EGP
 */
export function calcTaxExclusive(amount: number, rate: number = 0.14): number {
  return round2(amount * rate)
}

/**
 * Calculate the total inclusive price from a net amount.
 * E.g., item costs 100 EGP net → inclusive = 100 * (1 + 0.14) = 114 EGP
 */
export function calcTaxInclusive(amount: number, rate: number = 0.14): number {
  return round2(amount * (1 + rate))
}

/**
 * Extract the tax portion from a tax-inclusive price.
 * E.g., item sells for 114 EGP inclusive → tax = 114 - (114 / 1.14) = 14 EGP
 */
export function extractTaxFromInclusive(totalInclusive: number, rate: number = 0.14): number {
  return round2(totalInclusive - totalInclusive / (1 + rate))
}

/**
 * Extract the net (pre-tax) amount from a tax-inclusive price.
 * E.g., item sells for 114 EGP inclusive → net = 114 / 1.14 = 100 EGP
 */
export function extractNetFromInclusive(totalInclusive: number, rate: number = 0.14): number {
  return round2(totalInclusive / (1 + rate))
}

// ─── Egyptian Depreciation Calculations ─────────────────────────
// Per Income Tax Law No. 91/2005

/**
 * Straight-line depreciation (used for buildings 5%, intangibles 10%)
 */
export function calcStraightLineDepreciation(
  originalCost: number,
  annualRate: number,
  years: number = 1
): number {
  return round2(originalCost * annualRate * years)
}

/**
 * Declining-balance depreciation (used for computers 50%, other assets 25%)
 */
export function calcDecliningBalanceDepreciation(
  bookValue: number,
  annualRate: number
): number {
  return round2(bookValue * annualRate)
}

// ─── Formatting (convenience wrappers) ──────────────────────────

export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  return `${amount.toLocaleString('en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

export function formatPct(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}
