// ══════════════════════════════════════════════════════════════════
// MOS Logix Finance — Currency & Number Formatters
// Egyptian locale defaults, all configurable
// ══════════════════════════════════════════════════════════════════

/**
 * Format a number as Egyptian Pound (EGP) currency.
 * Uses Arabic-style number formatting with 2 decimal places.
 */
export function fmtCurrency(amount: number, currency: string = 'EGP'): string {
  const formatted = new Intl.NumberFormat('en-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} ${currency}`
}

/**
 * Format a number as a compact currency (e.g., 12.5K EGP)
 */
export function fmtCurrencyCompact(amount: number, currency: string = 'EGP'): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M ${currency}`
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K ${currency}`
  }
  return fmtCurrency(amount, currency)
}

/**
 * Format a number as percentage
 */
export function fmtPct(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format a number with thousands separators
 */
export function fmtNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format a date as DD/MM/YYYY (Egyptian standard)
 */
export function fmtDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Format a date as DD/MM/YYYY HH:MM
 */
export function fmtDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${fmtDate(d)} ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`
}

/**
 * Format a date as a relative string (e.g., "2 hours ago")
 */
export function fmtRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return fmtDate(d)
}

/**
 * Format a month name (e.g., "January 2026")
 */
export function fmtMonth(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Color class for positive/negative amounts
 */
export function amountColorClass(amount: number, invert: boolean = false): string {
  if (amount === 0) return 'text-gray-400'
  const isPositive = invert ? amount < 0 : amount > 0
  return isPositive ? 'text-emerald-400' : 'text-red-400'
}

/**
 * Delta arrow + color based on direction
 */
export function deltaDisplay(
  pct: number,
  direction: 'up' | 'down' | 'flat',
  invertColor: boolean = false
): { arrow: string; colorClass: string; text: string } {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const isGood = invertColor
    ? direction === 'down'
    : direction === 'up'

  const colorClass =
    direction === 'flat'
      ? 'text-gray-400'
      : isGood
        ? 'text-emerald-400'
        : 'text-red-400'

  return {
    arrow,
    colorClass,
    text: `${arrow} ${Math.abs(pct).toFixed(1)}%`,
  }
}
