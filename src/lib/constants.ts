/** Application-wide constants */

export const APP_NAME = "Himalayan Traders";
export const APP_NAME_SHORT = "HT";
export const APP_TAGLINE = "Wholesale Management System";
export const CURRENCY = "NPR";
export const TIMEZONE = "Asia/Kathmandu";

/** Invoice prefixes */
export const INVOICE_PREFIXES = {
  SALE:             "SINV",
  PURCHASE:         "PINV",
  SALE_RETURN:      "SRTN",
  PURCHASE_RETURN:  "PRTN",
  PAYMENT_RECEIVED: "RCPT",
  PAYMENT_MADE:     "PMT",
} as const;

/** User roles */
export const ROLES = {
  OWNER:      "OWNER",
  MANAGER:    "MANAGER",
  SALES:      "SALES",
  INVENTORY:  "INVENTORY",
} as const;
export type Role = typeof ROLES[keyof typeof ROLES];

/** Transaction statuses */
export const STATUS = {
  DRAFT:     "DRAFT",
  POSTED:    "POSTED",
  CANCELLED: "CANCELLED",
  PARTIAL:   "PARTIAL",
  PAID:      "PAID",
} as const;
export type Status = typeof STATUS[keyof typeof STATUS];

/** Stock movement types */
export const MOVEMENT_TYPES = {
  PURCHASE:         "PURCHASE",
  SALE:             "SALE",
  PURCHASE_RETURN:  "PURCHASE_RETURN",
  SALE_RETURN:      "SALE_RETURN",
  ADJUSTMENT_IN:    "ADJUSTMENT_IN",
  ADJUSTMENT_OUT:   "ADJUSTMENT_OUT",
  OPENING:          "OPENING",
} as const;

/** Payment methods */
export const PAYMENT_METHODS = [
  { value: "CASH",     label: "Cash" },
  { value: "BANK",     label: "Bank Transfer" },
  { value: "CHEQUE",   label: "Cheque" },
  { value: "ESEWA",    label: "eSewa" },
  { value: "KHALTI",   label: "Khalti" },
  { value: "OTHER",    label: "Other" },
] as const;

/** Default pagination page size */
export const PAGE_SIZE = 20;

/** Low stock threshold (can be overridden per product) */
export const DEFAULT_REORDER_THRESHOLD = 10;

/** Max discount % a Sales Staff can apply */
export const SALES_STAFF_MAX_DISCOUNT = 0; // 0% — requires manager
