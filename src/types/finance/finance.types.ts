// ══════════════════════════════════════════════════════════════════
// MOS Logix Finance Module — Type Definitions
// Egyptian Finance Law defaults baked in, all values editable
// ══════════════════════════════════════════════════════════════════

// ─── Auth & Session ──────────────────────────────────────────────
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'cashier'
export const FINANCE_ALLOWED_ROLES: UserRole[] = ['super_admin', 'admin', 'manager']

export interface FinanceSession {
  userId: string
  email: string
  role: UserRole
  storeId: string
  storeName: string
  currency: string
  vatRate: number
  taxMode: 'inclusive' | 'exclusive' | 'dynamic'
}

// ─── Server Action Response ──────────────────────────────────────
export interface ActionResponse<T> {
  data: T | null
  error: string | null
}

// ─── Transaction (READ-ONLY — from POS) ──────────────────────────
export type TransactionType = 'revenue' | 'refund' | 'tax' | 'expense' | 'adjustment'

export interface Transaction {
  id: string
  store_id: string
  branch_id: string | null
  type: TransactionType
  amount: number
  description: string | null
  reference_id: string | null
  reference_type: string | null
  created_at: string
  created_by: string | null
}

// ─── Order (READ-ONLY — from POS) ────────────────────────────────
export interface Order {
  id: string
  store_id: string
  branch_id: string | null
  order_number: string | null
  status: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  customer_id: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name?: string | null
  quantity: number
  unit_price: number
  cost_price?: number | null
  discount_amount?: number
  tax_amount?: number
  total_price: number
}

export interface OrderItemWithCost extends OrderItem {
  cost_price?: number
}

// ─── Payment (READ-ONLY — from POS) ─────────────────────────────
export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'instapay' | 'split'

export interface Payment {
  id: string
  order_id: string
  store_id: string
  method: string
  status: string
  amount: number
  reference: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ─── Shift (READ-ONLY — from POS) ───────────────────────────────
export interface Shift {
  id: string
  store_id: string
  branch_id: string | null
  cashier_id: string
  opening_cash: number
  closing_cash: number | null
  expected_cash: number | null
  status: string
  started_at: string
  ended_at: string | null
  metadata: Record<string, unknown> | null
}

// ─── Expense (OWNED by Finance) ─────────────────────────────────
export interface Expense {
  id: string
  store_id: string
  branch_id: string | null
  category: string
  amount: number
  description: string | null
  receipt_url: string | null
  expense_date?: string
  created_by?: string | null
  recorded_by?: string | null
  created_at: string
  updated_at?: string
  deleted_at?: string | null
}

export interface ExpenseInput {
  branch_id: string
  category: string
  amount: number
  description: string
  receipt_url?: string
  expense_date: string
}

// ─── Egyptian Legal Defaults for Expense Categories ──────────────
// Based on Egyptian Accounting Standards (EAS) & Income Tax Law No. 91/2005
// All categories are editable — these are legally-compliant defaults
export const EGYPT_EXPENSE_CATEGORIES = [
  // Operating Expenses (مصروفات تشغيلية)
  { key: 'rent', label: 'إيجار / Rent', labelEn: 'Rent', taxDeductible: true },
  { key: 'utilities', label: 'مرافق / Utilities', labelEn: 'Utilities', taxDeductible: true },
  { key: 'salaries', label: 'رواتب / Salaries', labelEn: 'Salaries & Wages', taxDeductible: true },
  { key: 'social_insurance', label: 'تأمينات اجتماعية / Social Insurance', labelEn: 'Social Insurance', taxDeductible: true },
  { key: 'supplies', label: 'مستلزمات / Supplies', labelEn: 'Office & Store Supplies', taxDeductible: true },
  { key: 'maintenance', label: 'صيانة / Maintenance', labelEn: 'Maintenance & Repairs', taxDeductible: true },
  { key: 'marketing', label: 'تسويق / Marketing', labelEn: 'Marketing & Advertising', taxDeductible: true },
  { key: 'transport', label: 'نقل / Transport', labelEn: 'Transport & Logistics', taxDeductible: true },
  // Tax & Government Fees (ضرائب ورسوم حكومية)
  { key: 'government_fees', label: 'رسوم حكومية / Gov. Fees', labelEn: 'Government Fees & Licenses', taxDeductible: true },
  { key: 'stamp_duty', label: 'دمغة / Stamp Duty', labelEn: 'Stamp Duty', taxDeductible: true },
  // Depreciation (إهلاك) — Egyptian statutory rates
  { key: 'depreciation_buildings', label: 'إهلاك مباني / Depreciation (Buildings)', labelEn: 'Depreciation - Buildings (5%)', taxDeductible: true },
  { key: 'depreciation_equipment', label: 'إهلاك معدات / Depreciation (Equipment)', labelEn: 'Depreciation - Equipment (25%)', taxDeductible: true },
  { key: 'depreciation_computers', label: 'إهلاك حاسبات / Depreciation (IT)', labelEn: 'Depreciation - Computers (50%)', taxDeductible: true },
  // Financial Expenses (مصاريف مالية)
  { key: 'bank_charges', label: 'مصاريف بنكية / Bank Charges', labelEn: 'Bank Charges & Interest', taxDeductible: true },
  // Non-deductible items (مصروفات غير قابلة للخصم)
  { key: 'fines', label: 'غرامات / Fines', labelEn: 'Fines & Penalties', taxDeductible: false },
  { key: 'donations', label: 'تبرعات / Donations', labelEn: 'Donations (non-approved)', taxDeductible: false },
  // General
  { key: 'other', label: 'أخرى / Other', labelEn: 'Other', taxDeductible: true },
] as const

export type ExpenseCategoryKey = (typeof EGYPT_EXPENSE_CATEGORIES)[number]['key']

// ─── Tax Rules (OWNED by Finance) ───────────────────────────────
// Egyptian VAT Law No. 67/2016, amended by Law No. 157/2025
export interface TaxRule {
  id: string
  store_id: string
  name: string
  tax_class: string
  rate: number
  mode: 'inclusive' | 'exclusive'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaxRuleInput {
  name: string
  tax_class: string
  rate: number
  mode: 'inclusive' | 'exclusive'
  is_active: boolean
}

// Egyptian VAT Rate Defaults (all editable)
export const EGYPT_TAX_DEFAULTS = {
  // Standard VAT rate (القيمة المضافة الأساسية)
  standardRate: 0.14,          // 14% — Law No. 67/2016
  // Reduced rate for capital equipment & certain goods
  reducedRate: 0.05,           // 5% — Schedule tax items
  // Zero-rated (exports, international transport)
  zeroRate: 0.00,              // 0%
  // Registration threshold
  registrationThreshold: 500000, // EGP 500,000 annual
  // Filing frequency
  filingFrequency: 'monthly' as const,
  // E-invoicing mandatory
  eInvoicingRequired: true,
  // Corporate income tax
  corporateIncomeTaxRate: 0.225, // 22.5%
  // Depreciation rates per Egyptian tax law
  depreciationRates: {
    buildings: 0.05,           // 5% straight-line
    intangibles: 0.10,         // 10% straight-line
    computers: 0.50,           // 50% declining balance
    otherAssets: 0.25,         // 25% declining balance
  },
  // Penalty for non-compliance
  maxPenaltyEGP: 50000,       // Up to EGP 50,000 per violation
} as const

// Default tax rule presets based on Egyptian law
export const EGYPT_DEFAULT_TAX_RULES: Omit<TaxRuleInput, 'store_id'>[] = [
  {
    name: 'ضريبة قيمة مضافة أساسية / Standard VAT',
    tax_class: 'standard',
    rate: 0.14,
    mode: 'inclusive',
    is_active: true,
  },
  {
    name: 'ضريبة مخفضة / Reduced Rate',
    tax_class: 'reduced',
    rate: 0.05,
    mode: 'inclusive',
    is_active: true,
  },
  {
    name: 'معفى / Zero-Rated (Exports)',
    tax_class: 'zero',
    rate: 0.00,
    mode: 'exclusive',
    is_active: true,
  },
  {
    name: 'معفى من الضريبة / Exempt',
    tax_class: 'exempt',
    rate: 0.00,
    mode: 'inclusive',
    is_active: true,
  },
]

// ─── Analytics Snapshot (OWNED by Finance) ──────────────────────
export interface DailySnapshot {
  id: string
  store_id: string
  branch_id: string | null
  snapshot_date: string
  total_orders: number
  total_revenue: number
  total_refunds: number
  total_tax: number
  total_expenses: number
  gross_profit: number
  net_profit: number
  new_customers: number
  units_sold: number
  created_at: string
  updated_at: string
}

// ─── KPI Types ──────────────────────────────────────────────────
export interface KpiValue {
  label: string
  value: number
  formattedValue: string
  delta: DeltaResult
  icon: string
  invertDelta?: boolean // true for expenses/refunds where "up" is bad
}

export interface DeltaResult {
  value: number
  pct: number
  direction: 'up' | 'down' | 'flat'
}

// ─── Chart Data ─────────────────────────────────────────────────
export interface RevenueChartPoint {
  date: string
  grossRevenue: number
  netRevenue: number
  refunds: number
}

export interface ProfitChartPoint {
  period: string
  grossProfit: number
  netProfit: number
  expenses: number
}

export interface ExpenseCategorySlice {
  category: string
  total: number
  percentage: number
}

export interface PaymentMethodBar {
  method: string
  total: number
  percentage: number
}

export interface TopProduct {
  productId: string
  productName: string
  unitsSold: number
  revenue: number
  costPrice: number
  profitMargin: number
}

// ─── Report Types ───────────────────────────────────────────────
export interface DailyPnLRow {
  date: string
  grossRevenue: number
  refunds: number
  netRevenue: number
  cogs: number
  grossProfit: number
  expenses: number
  netProfit: number
  marginPct: number
}

export interface ShiftReportRow {
  shiftId: string
  cashierName: string
  branchName: string
  startedAt: string
  endedAt: string | null
  salesCount: number
  grossRevenue: number
  refunds: number
  netRevenue: number
  cashTotal: number
  cardTotal: number
  walletTotal: number
  variance: number
}

export interface CashFlowData {
  revenueFromSales: number
  lessRefunds: number
  netSalesRevenue: number
  operatingExpenses: number
  supplierPayments: number
  totalOutflows: number
  netCashFlow: number
  openingBalance: number
  closingBalance: number
}

// ─── Audit Log (READ-ONLY — shared) ─────────────────────────────
export interface AuditLog {
  id: string
  store_id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export const FINANCE_AUDIT_ACTIONS = [
  'order.created',
  'payment.processed',
  'refund.created',
  'expense.created',
  'expense.updated',
  'expense.deleted',
  'tax_rule.created',
  'tax_rule.updated',
  'price.override',
  'discount.applied',
  'shift.opened',
  'shift.closed',
  'system.error',
] as const

// ─── Date Range ─────────────────────────────────────────────────
export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom'

export interface DateRange {
  from: Date
  to: Date
  preset: DatePreset
}

// ─── Branch ─────────────────────────────────────────────────────
export interface Branch {
  id: string
  name: string
  store_id: string
}

// ─── PDF Export ──────────────────────────────────────────────────
export interface PdfReportData {
  storeName: string
  branchName: string
  reportTitle: string
  dateRange: { from: Date; to: Date }
  generatedAt: Date
  generatedBy: string
  sections: PdfSection[]
}

export interface PdfSection {
  title: string
  type: 'table' | 'summary' | 'chart_placeholder'
  columns?: string[]
  rows?: (string | number)[][]
  totals?: Record<string, number>
}

// ─── Pagination ─────────────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page: number
  pageSize: number
}

// ─── Filter Types ───────────────────────────────────────────────
export interface TransactionFilters {
  dateFrom: string
  dateTo: string
  types?: TransactionType[]
  branchId?: string
  userId?: string
  amountMin?: number
  amountMax?: number
  search?: string
}

export interface ExpenseFilters {
  dateFrom: string
  dateTo: string
  categories?: string[]
  branchId?: string
  amountMin?: number
  amountMax?: number
}

// ─── Report Schedule ────────────────────────────────────────────
export interface ReportSchedule {
  report_type: 'daily_pnl' | 'monthly_summary' | 'tax_report' | 'shift_report'
  frequency: 'daily' | 'weekly' | 'monthly'
  send_time: string
  recipients: string[]
  branch_id: string | 'all'
  format: 'pdf' | 'excel' | 'both'
}
