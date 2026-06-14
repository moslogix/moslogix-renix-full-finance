import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfQuarter,
  endOfQuarter,
} from 'date-fns'
import type { DatePreset, DateRange } from '@/types/finance/finance.types'

/**
 * Returns a configured DateRange object for a given preset
 */
export function getDateRangeForPreset(preset: DatePreset): DateRange {
  const now = new Date()

  switch (preset) {
    case 'today':
      return {
        from: startOfDay(now),
        to: endOfDay(now),
        preset,
      }
    case 'yesterday': {
      const yesterday = subDays(now, 1)
      return {
        from: startOfDay(yesterday),
        to: endOfDay(yesterday),
        preset,
      }
    }
    case 'this_week':
      return {
        from: startOfWeek(now, { weekStartsOn: 6 }), // Sat-Fri typical in Egypt/ME
        to: endOfWeek(now, { weekStartsOn: 6 }),
        preset,
      }
    case 'last_week': {
      const lastWeek = subWeeks(now, 1)
      return {
        from: startOfWeek(lastWeek, { weekStartsOn: 6 }),
        to: endOfWeek(lastWeek, { weekStartsOn: 6 }),
        preset,
      }
    }
    case 'this_month':
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
        preset,
      }
    case 'last_month': {
      const lastMonth = subMonths(now, 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
        preset,
      }
    }
    case 'this_quarter':
      return {
        from: startOfQuarter(now),
        to: endOfQuarter(now),
        preset,
      }
    case 'this_year':
      return {
        from: startOfYear(now),
        to: endOfYear(now),
        preset,
      }
    case 'custom':
    default:
      // Default to this month for custom initial state
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
        preset: 'custom',
      }
  }
}

/**
 * Gets the comparable prior period for a given date range
 * E.g. Today -> Yesterday, This Month -> Last Month
 */
export function getPriorPeriod(range: DateRange): DateRange {
  const diffTime = Math.abs(range.to.getTime() - range.from.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  switch (range.preset) {
    case 'today':
      return getDateRangeForPreset('yesterday')
    case 'this_week':
      return getDateRangeForPreset('last_week')
    case 'this_month':
      return getDateRangeForPreset('last_month')
    case 'this_year': {
      const lastYear = subYears(range.from, 1)
      return {
        from: startOfYear(lastYear),
        to: endOfYear(lastYear),
        preset: 'custom',
      }
    }
    case 'custom':
    default: {
      // For custom/other, subtract the exact number of days
      const priorFrom = subDays(range.from, diffDays)
      const priorTo = endOfDay(subDays(range.from, 1))
      return {
        from: priorFrom,
        to: priorTo,
        preset: 'custom',
      }
    }
  }
}
