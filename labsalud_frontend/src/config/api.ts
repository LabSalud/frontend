/**
 * Centralized API Configuration for LabSalud Frontend
 * Based on Django REST Framework backend documentation
 */

// Base configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://192.168.1.88:8001",
  API_VERSION: "v1",
  TIMEOUT: 30000,
} as const

export const UI_CONFIG = {
  TOAST_DURATION: 4000,
} as const

export const TOAST_DURATION = UI_CONFIG.TOAST_DURATION

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, "")
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}

// Authentication endpoints
export const AUTH_ENDPOINTS = {
  TOKEN: buildApiUrl("/auth/token/"),
  TOKEN_REFRESH: buildApiUrl("/auth/token/refresh/"),
  TOKEN_VERIFY: buildApiUrl("/auth/token/verify/"),
  PASSWORD_RESET: buildApiUrl("/users/password-reset/"),
} as const

// User management endpoints
export const USER_ENDPOINTS = {
  USERS: buildApiUrl("/users/users/"),
  USER_DETAIL: (id: number) => buildApiUrl(`/users/users/${id}/`),
  ME: buildApiUrl("/users/me/"),
  PASSWORD_RESET: buildApiUrl("/users/password-reset/"),
} as const

// Access control endpoints
export const AC_ENDPOINTS = {
  ROLES: buildApiUrl("/ac/roles/"),
  ROLE_DETAIL: (id: number) => buildApiUrl(`/ac/roles/${id}/`),
  ROLE_ASSIGN: buildApiUrl("/ac/roles/assign-roles/"),
  PERMISSIONS: buildApiUrl("/ac/permissions/"),
  PERMISSION_DETAIL: (id: number) => buildApiUrl(`/ac/permissions/${id}/`),
  TEMP_PERMISSIONS: buildApiUrl("/ac/tp/"),
  TEMP_PERMISSION_DETAIL: (id: number) => buildApiUrl(`/ac/tp/${id}/`),
  TEMP_PERMISSION_REVOKE: (id: number) => buildApiUrl(`/ac/tp/${id}/revoke/`),
  TEMP_PERMISSION_REVOKE_BY_USER: buildApiUrl("/ac/tp/revoke-by-user/"),
} as const

// Patient management endpoints
export const PATIENT_ENDPOINTS = {
  PATIENTS: buildApiUrl("/patients/patients/"),
  PATIENT_DETAIL: (id: number) => buildApiUrl(`/patients/patients/${id}/`),
} as const

export const MEDICAL_ENDPOINTS = {
  DOCTORS: buildApiUrl("/medicale/doctors/"),
  DOCTOR_DETAIL: (id: number) => buildApiUrl(`/medicale/doctors/${id}/`),
  INSURANCES: buildApiUrl("/medicale/insurances/"),
  INSURANCE_DETAIL: (id: number) => buildApiUrl(`/medicale/insurances/${id}/`),
} as const

export const CATALOG_ENDPOINTS = {
  ANALYSIS: buildApiUrl("/catalog/analysis/"),
  ANALYSIS_DETAIL: (id: number) => buildApiUrl(`/catalog/analysis/${id}/`),
  ANALYSIS_IMPORT: buildApiUrl("/catalog/analysis/import-catalog/"),
  DETERMINATIONS: buildApiUrl("/catalog/determination/"),
  DETERMINATION_DETAIL: (id: number) => buildApiUrl(`/catalog/determination/${id}/`),
} as const

// Protocol management endpoints
export const PROTOCOL_ENDPOINTS = {
  PROTOCOLS: buildApiUrl("/protocols/protocols/"),
  PROTOCOL_DETAIL: (id: number) => buildApiUrl(`/protocols/protocols/${id}/`),
  PROTOCOL_DETAILS: (id: number) => buildApiUrl(`/protocols/protocols/${id}/details/`),
  PROTOCOL_DETAIL_UPDATE: (protocolId: number, detailId: number) =>
    buildApiUrl(`/protocols/protocols/${protocolId}/details/${detailId}/`),
  SEND_METHODS: buildApiUrl("/protocols/send-methods/"),
  REPORT_BATCH: buildApiUrl("/protocols/protocols/report-batch/"),
  REGULARIZE_BALANCE: (id: number) => buildApiUrl(`/protocols/protocols/${id}/regularize-balance/`),
} as const

// Audit system endpoints
export const AUDIT_ENDPOINTS = {
  AUDIT: buildApiUrl("/audit/complete/"),
} as const

// Analytics endpoints
export const ANALYTICS_ENDPOINTS = {
  DASHBOARD: buildApiUrl("/analytics/dashboard/"),
  PROTOCOLS_BY_STATUS: buildApiUrl("/analytics/dashboard/protocols-by-status/"),
} as const

// Results endpoints
export const RESULTS_ENDPOINTS = {
  AVAILABLE_ANALYSIS: buildApiUrl("/results/results/available-analyses/"),
  BY_ANALYSIS: (id: number) => buildApiUrl(`/results/results/by-analysis/${id}/`),
  BY_PROTOCOL: (id: number) => buildApiUrl(`/results/results/by-protocol/${id}/`),
  RESULT_DETAIL: (id: number) => buildApiUrl(`/results/results/${id}/`),
  VALIDATE: (id: number) => buildApiUrl(`/results/results/${id}/validate/`),
  PREVIOUS_RESULTS: (patientId: number, determinationId: number) =>
    buildApiUrl(`/results/results/history/?patient_id=${patientId}&determination_id=${determinationId}`),
  PROTOCOLS_WITH_LOADED_RESULTS: buildApiUrl("/results/results/protocols-with-loaded-results/"),
  BY_PROTOCOL_WITH_VALUE: (protocolId: number) => buildApiUrl(`/results/results/by-protocol-with-value/${protocolId}/`),
} as const

// Reporting endpoints
export const REPORTING_ENDPOINTS = {
  PRINT: (id: number, type: "full" | "summary") => buildApiUrl(`/reports/protocols/${id}/print/?type=${type}`),
  SEND_EMAIL: (id: number, type: "full" | "summary") =>
    buildApiUrl(`/reports/protocols/${id}/send-email/?type=${type}`),
  SEND_WHATSAPP: (id: number, type: "full" | "summary") =>
    buildApiUrl(`/reports/protocols/${id}/send-whatsapp/?type=${type}`),
} as const

// Billing endpoints
export const BILLING_ENDPOINTS = {
  INVOICES: buildApiUrl("/billing/invoices/"),
  INVOICE_DETAIL: (id: number) => buildApiUrl(`/billing/invoices/${id}/`),
  CREATE_FOR_PROTOCOL: (protocolId: number) =>
    buildApiUrl(`/billing/invoices/create-for-protocol/${protocolId}/`),
  BY_INSURANCE: (insuranceId: number) =>
    buildApiUrl(`/billing/invoices/by-insurance/${insuranceId}/`),
  PROTOCOLS_TO_BILL: buildApiUrl("/billing/invoices/protocols-to-bill/"),
  SUMMARY: buildApiUrl("/billing/invoices/summary/"),
  PROTOCOLS_STATUS: buildApiUrl("/billing/invoices/protocols-status/"),
} as const

// Core endpoints
export const CORE_ENDPOINTS = {
  API_ROOT: `${API_CONFIG.BASE_URL}/`,
  HEALTH: `${API_CONFIG.BASE_URL}/health/`,
} as const

// HTTP Methods
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const

// Common headers
export const getAuthHeaders = (token?: string) => ({
  "Content-Type": "application/json",
  ...(token && { Authorization: `Bearer ${token}` }),
})

export const getMultipartHeaders = (token?: string) => ({
  ...(token && { Authorization: `Bearer ${token}` }),
})

// API Response types
export interface ApiResponse<T = any> {
  data: T
  status: number
  message?: string
}

export interface PaginatedResponse<T = any> {
  next: string | null
  results: T[]
}

// Error types
export interface ApiError {
  message: string
  status: number
  details?: Record<string, string[]>
}

// Common query parameters
export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface SearchParams extends PaginationParams {
  search?: string
}

// Patient specific filters
export interface PatientFilters extends SearchParams {
  dni?: string
  gender?: "M" | "F"
  city?: string
  province?: string
  country?: string
}

// Protocol specific filters
export interface ProtocolFilters extends SearchParams {
  status?: string
  is_paid?: boolean
  patient?: number
  doctor?: number
  insurance?: number
}

// Export all endpoints in a single object for easy access
export const API_ENDPOINTS = {
  AUTH: AUTH_ENDPOINTS,
  USERS: USER_ENDPOINTS,
  AC: AC_ENDPOINTS,
  PATIENTS: PATIENT_ENDPOINTS,
  MEDICAL: MEDICAL_ENDPOINTS,
  CATALOG: CATALOG_ENDPOINTS,
  PROTOCOL: PROTOCOL_ENDPOINTS,
  AUDIT: AUDIT_ENDPOINTS,
  ANALYTICS: ANALYTICS_ENDPOINTS,
  RESULTS: RESULTS_ENDPOINTS,
  REPORTING: REPORTING_ENDPOINTS,
  BILLING: BILLING_ENDPOINTS,
  CORE: CORE_ENDPOINTS,
} as const

export default API_ENDPOINTS
