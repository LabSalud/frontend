/**
 * Centralized API Configuration for LabSalud Frontend
 * Based on Django REST Framework backend documentation
 */

// Base configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://192.168.1.88:8001",
  API_VERSION: "v1",
  TIMEOUT: 300000,
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
  PASSWORD_RESET: buildApiUrl("/users/password-reset/"),
} as const

// User management endpoints
export const USER_ENDPOINTS = {
  USERS: buildApiUrl("/users/users/"),
  USER_DETAIL: (id: number) => buildApiUrl(`/users/users/${id}/`),
  USER_AUDIT_TIMELINE: (id: number) => buildApiUrl(`/users/users/${id}/audit-timeline/`),
  ME: buildApiUrl("/users/me/"),
} as const

// Access control endpoints
export const AC_ENDPOINTS = {
  ROLES: buildApiUrl("/ac/roles/"),
  ROLE_DETAIL: (id: number) => buildApiUrl(`/ac/roles/${id}/`),
  ROLE_ASSIGN: buildApiUrl("/ac/roles/assign-roles/"),
  PERMISSIONS: buildApiUrl("/ac/permissions/"),
  TEMP_PERMISSIONS: buildApiUrl("/ac/tp/"),
  TEMP_PERMISSION_REVOKE: (id: number) => buildApiUrl(`/ac/tp/${id}/revoke/`),
} as const

// Patient management endpoints
export const PATIENT_ENDPOINTS = {
  PATIENTS: buildApiUrl("/patients/patients/"),
  PATIENT_DETAIL: (id: number) => buildApiUrl(`/patients/patients/${id}/`),
  PATIENT_AUDIT_TIMELINE: (id: number) => buildApiUrl(`/patients/patients/${id}/audit-timeline/`),
  MERGE_PREVIEW: (sourceId: number, targetId: number) =>
    buildApiUrl(`/patients/patients/${sourceId}/merge-preview/${targetId}/`),
  MERGE: (sourceId: number, targetId: number) =>
    buildApiUrl(`/patients/patients/${sourceId}/merge/${targetId}/`),
} as const

export const MEDICAL_ENDPOINTS = {
  DOCTORS: buildApiUrl("/medicale/doctors/"),
  DOCTOR_DETAIL: (id: number) => buildApiUrl(`/medicale/doctors/${id}/`),
  DOCTOR_AUDIT_TIMELINE: (id: number) => buildApiUrl(`/medicale/doctors/${id}/audit-timeline/`),
  INSURANCES: buildApiUrl("/medicale/insurances/"),
  INSURANCE_DETAIL: (id: number) => buildApiUrl(`/medicale/insurances/${id}/`),
  INSURANCE_AUDIT_TIMELINE: (id: number) => buildApiUrl(`/medicale/insurances/${id}/audit-timeline/`),
} as const

export const CATALOG_ENDPOINTS = {
  ANALYSIS: buildApiUrl("/catalog/analysis/"),
  ANALYSIS_DETAIL: (id: number) => buildApiUrl(`/catalog/analysis/${id}/`),
  ANALYSIS_AUDIT_TIMELINE: (id: number) => buildApiUrl(`/catalog/analysis/${id}/audit-timeline/`),
  ANALYSIS_IMPORT: buildApiUrl("/catalog/analysis/import-catalog/"),
  CLEAR_CATALOG: buildApiUrl("/catalog/analysis/clear-catalog/"),
  DETERMINATIONS: buildApiUrl("/catalog/determination/"),
  DETERMINATION_DETAIL: (id: number) => buildApiUrl(`/catalog/determination/${id}/`),
  DETERMINATION_AUDIT_TIMELINE: (id: number) => buildApiUrl(`/catalog/determination/${id}/audit-timeline/`),
  // NBU (Nomenclador Bioquímico Único)
  NBU: buildApiUrl("/catalog/nbu/"),
  NBU_DETAIL: (id: number) => buildApiUrl(`/catalog/nbu/${id}/`),
  NBU_UB_VALUES: (id: number) => buildApiUrl(`/catalog/nbu/${id}/ub-values/`),
  NBU_UPDATE_UB_VALUE: (id: number) => buildApiUrl(`/catalog/nbu/${id}/update-ub-value/`),
  NBU_DELETE_UB_VALUE: (nbuId: number, analysisCode: number | string) =>
    buildApiUrl(`/catalog/nbu/${nbuId}/ub-value/${analysisCode}/`),
  NBU_IMPORT_UB_VALUES: (id: number) => buildApiUrl(`/catalog/nbu/${id}/import-ub-values/`),
  NBU_CREATE_WITH_IMPORT: buildApiUrl("/catalog/nbu/create-with-import/"),
  PRICING_CONFIG: buildApiUrl("/catalog/pricing-config/"),
} as const

// Protocol management endpoints
export const PROTOCOL_ENDPOINTS = {
  PROTOCOLS: buildApiUrl("/protocols/protocols/"),
  QUOTE: buildApiUrl("/protocols/protocols/quote/"),
  PROTOCOL_DETAIL: (id: number) => buildApiUrl(`/protocols/protocols/${id}/`),
  ARCA_BILLING: (id: number) => buildApiUrl(`/protocols/protocols/${id}/arca-billing/`),
  REPORT: (id: number) => buildApiUrl(`/protocols/protocols/${id}/report/`),
  PROTOCOL_DETAILS: (id: number) => buildApiUrl(`/protocols/protocols/${id}/details/`),
  PROTOCOL_DETAIL_UPDATE: (protocolId: number, detailId: number) =>
    buildApiUrl(`/protocols/protocols/${protocolId}/details/${detailId}/`),
  SEND_METHODS: buildApiUrl("/protocols/send-methods/"),
  REPORT_BATCH: buildApiUrl("/protocols/protocols/report-batch/"),
  REGULARIZE_BALANCE: (id: number) => buildApiUrl(`/protocols/protocols/${id}/regularize-balance/`),
  UNCANCEL: (id: number) => buildApiUrl(`/protocols/protocols/${id}/uncancel/`),
  SET_COSEGURO: (id: number) => buildApiUrl(`/protocols/protocols/${id}/set-coseguro/`),
  UNPLANNED_LIST: (protocolId: number) => buildApiUrl(`/protocols/protocols/${protocolId}/unplanned/`),
  UNPLANNED_ITEM: (protocolId: number, txId: number) =>
    buildApiUrl(`/protocols/protocols/${protocolId}/unplanned/${txId}/`),
  MERGE_REPORT: buildApiUrl("/protocols/protocols/merge-report/"),
  AUDIT_TIMELINE: (id: number) => buildApiUrl(`/protocols/protocols/${id}/audit-timeline/`),
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
  BY_PROTOCOL: (id: number) => buildApiUrl(`/results/results/by-protocol/${id}/`),
  RESULT_DETAIL: (id: number) => buildApiUrl(`/results/results/${id}/`),
  VALIDATE: (id: number) => buildApiUrl(`/results/results/${id}/validate/`),
  PREVIOUS_RESULTS: (patientId: number, determinationId: number) =>
    buildApiUrl(`/results/results/history/?patient_id=${patientId}&determination_id=${determinationId}`),
  // Cola de resultados: protocolos por estado (incluye los que aún no tienen
  // ningún valor) con progreso cargados/validados. Ver spec en doc/.
  QUEUE: buildApiUrl("/results/results/queue/"),
} as const

// Reporting endpoints
export const REPORTING_ENDPOINTS = {
  SIGNATURES: buildApiUrl("/reports/signatures/"),
  SIGNATURE_DETAIL: (id: number) => buildApiUrl(`/reports/signatures/${id}/`),
  SIGNATURE_SET_DEFAULT: (id: number) => buildApiUrl(`/reports/signatures/${id}/set-default/`),
} as const

// Billing endpoints
export const BILLING_ENDPOINTS = {
  CREATE_FOR_PROTOCOL: (protocolId: number) =>
    buildApiUrl(`/billing/invoices/create-for-protocol/${protocolId}/`),
  UNBILL_PROTOCOL: (protocolId: number) =>
    buildApiUrl(`/billing/invoices/unbill/${protocolId}/`),
  PROTOCOLS_TO_BILL: buildApiUrl("/billing/invoices/protocols-to-bill/"),
  FACTURADOS: buildApiUrl("/billing/invoices/facturados/"),
  CURRENT_TOTAL: buildApiUrl("/billing/invoices/current-total/"),
  CLOSED_PRESENTATIONS: buildApiUrl("/billing/presentations/closed/"),
  CLOSE_PRESENTATION: buildApiUrl("/billing/presentations/close-period/"),
  PRESENTATION_DETAIL: (id: number) => buildApiUrl(`/billing/presentations/${id}/`),
  PRESENTATION_PROTOCOLS: (id: number) => buildApiUrl(`/billing/presentations/${id}/protocols/`),
  SET_UB_VALUE_FOR_INSURANCE: (id: number) =>
    buildApiUrl(`/billing/presentations/${id}/set-ub-value-for-insurance/`),
  SET_COLLECTED_FOR_INSURANCE: (id: number) =>
    buildApiUrl(`/billing/presentations/${id}/set-collected-for-insurance/`),
  SET_COLLECTED_TOTAL: (id: number) => buildApiUrl(`/billing/presentations/${id}/set-collected-total/`),
  ANALYTICS_DAILY: buildApiUrl("/billing/analytics/daily/"),
  ANALYTICS_PRESENTATIONS_SUMMARY: buildApiUrl("/billing/analytics/presentations-summary/"),
  ENTITIES: buildApiUrl("/billing/entities/"),
  ENTITY_DETAIL: (id: number) => buildApiUrl(`/billing/entities/${id}/`),
  REMINDER_PHONES: buildApiUrl("/billing/reminders/phones/"),
  REMINDER_PHONE_DETAIL: (id: number) => buildApiUrl(`/billing/reminders/phones/${id}/`),
  REMINDER_CONFIG: buildApiUrl("/billing/reminders/config/"),
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
export interface ApiResponse<T = unknown> {
  data: T
  status: number
  message?: string
}

export interface PaginatedResponse<T = unknown> {
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
  sex?: "M" | "F"
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
