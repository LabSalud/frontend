// ============================================================================
// TIPOS CENTRALIZADOS - SISTEMA DE LABORATORIO
// ============================================================================

// Tipos base del sistema
export interface BaseEntity {
  id: number
  created_at: string
  updated_at: string
  created_by: UserReference
  updated_by: UserReference[]
}

// Referencia de usuario para auditoría
export interface UserReference {
  id: number
  username: string
  photo: string
}

// ============================================================================
// AUDITORÍA COMÚN
// ============================================================================

export interface AuditUser {
  id: number
  username: string
  photo: string
}

export interface CreationAudit {
  version: number
  action: string
  user: AuditUser
  date: string
}

export interface LastChangeAudit {
  version: number
  action: string
  user: AuditUser
  date: string
  changes: string[]
}

export interface HistoryEntry {
  created_at: any
  version: number
  action: string // "creacion", "actualizacion", "eliminacion"
  user: AuditUser
  date: string // UTC string
  changes: string[]
}

// ============================================================================
// USUARIOS Y AUTENTICACIÓN
// ============================================================================

export interface Permission {
  id: number
  codename: string
  name: string
  temporary?: boolean
  expires_at?: string | null
}

export interface ActiveTempPermission {
  permission: string
  name: string
  expires_at: string
  reason: string
}

export interface AuditEntry {
  version: number
  action: string
  user: AuditUser
  date: string
  model: {
    app: string
    model: string
    display: string
  }
  object: string
  changes: string[]
}

export interface Role {
  id: number
  name: string
  permission_details?: Permission[]
  permissions?: number[]
}

export interface Group {
  id: number
  name: string
}

export interface User {
  id: number
  username: string
  email?: string
  first_name: string
  last_name: string
  photo?: string
  roles?: Role[] | undefined
  groups?: Group[]
  permissions: Permission[]
  temporary_permissions?: number
  is_active?: boolean
  is_staff?: boolean
  is_superuser?: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

export interface TempPermission {
  id: number
  user_details: {
    id: number
    username: string
    email: string
    photo: string
  }
  permission_details: {
    id: number
    codename: string
    name: string
  }
  expires_at: string
  reason: string
  granted_by_details: {
    id: number
    username: string
    photo: string
  }
  granted_at: string
  is_expired: boolean
  time_remaining: string
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

// ============================================================================
// PACIENTES
// ============================================================================

export interface Patient {
  id: number
  first_name: string
  last_name: string
  dni: string
  full_name: string
  birth_date: string
  age: number
  gender: "M" | "F" | "O" | "N"
  phone_mobile: string
  alt_phone: string
  email: string
  country: string
  province: string
  city: string
  address: string
  is_active: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

export interface PatientFormData {
  first_name: string
  last_name: string
  dni: string
  birth_date: string
  gender: string
  phone_mobile: string
  alt_phone: string
  email: string
  country: string
  province: string
  city: string
  address: string
}

// ============================================================================
// ENTIDADES MÉDICAS
// ============================================================================

export interface Doctor {
  id: number
  first_name: string
  last_name: string
  license: string
  is_active: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

// Alias for backward compatibility
export type Medico = Doctor

export interface Insurance {
  id: number
  name: string
  description: string
  ub_value: string
  private_ub_value: number
  is_active: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

// Alias for backward compatibility
export type ObraSocial = Insurance

// ============================================================================
// CATÁLOGO DE ANÁLISIS
// ============================================================================

export interface Analysis {
  created_at: string
  created_by: null
  id: number
  code: number
  name: string
  bio_unit: string
  is_urgent: boolean
  is_active: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

// Legacy alias - panels are now just analysis
export type AnalysisPanel = Analysis

export interface Determination {
  id: number
  code: string
  analysis: number
  name: string
  measure_unit: string
  formula: string
  is_active: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

// ============================================================================
// PROTOCOLOS
// ============================================================================

export interface SendMethod {
  id: number
  name: string
  description: string
  is_active: boolean
}

export interface PaymentStatus {
  id: number
  name: string
}

export interface BillingStatus {
  id: number
  name: string
}

export interface ProtocolStatus {
  id: number
  name: string
}

export interface ProtocolDetail {
  id: number
  analysis: number
  is_authorized: boolean
  code: number
  name: string
  ub: string
  is_urgent: boolean
  is_active: boolean
}

export interface ProtocolDetailInput {
  analysis: number
  is_authorized: boolean
}

export interface Protocol {
  id: number
  patient: {
    id: number
    dni: string
    first_name: string
    last_name: string
  }
  doctor: {
    id: number
    first_name: string
    last_name: string
    license: string
  }
  insurance: {
    id: number
    name: string
  }
  affiliate_number: string
  status: ProtocolStatus
  send_method: {
    id: number
    name: string
  }
  insurance_ub_value?: string
  private_ub_value?: string
  // Payment fields (new API format)
  amount_due?: string
  amount_pending?: string
  patient_paid?: string
  amount_to_return?: string
  // Returned by protocol create response
  value_paid?: string
  payment_status: PaymentStatus
  billing_status?: BillingStatus
  is_printed: boolean
  is_active: boolean
  details: ProtocolDetail[]
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

export interface ProtocolListItem {
  id: number
  patient: {
    id: number
    first_name: string
    last_name: string
  }
  status: ProtocolStatus
  balance: string
  payment_status: PaymentStatus
  billing_status?: BillingStatus
  is_printed: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
}

export interface CreateProtocolInput {
  patient: number
  doctor: number
  insurance: number
  affiliate_number?: string
  send_method: number
  value_paid: string
  details: ProtocolDetailInput[]
}

export interface ProtocolSummary {
  id: number
  patient_first_name: string
  patient_last_name: string
  patient_dni: string
  ooss: string
  created_at: string
  state: "pending_entry" | "entry_complete" | "pending_validation" | "review" | "completed" | "cancelled"
  loaded_results_count: number
  total_analyses_count: number
}

// ============================================================================
// RESULTADOS
// ============================================================================

export interface ResultDetermination {
  id: number
  name: string
  measure_unit: string
  formula: string
}

export interface ResultAnalysis {
  id: number
  name: string
  code: number
  is_urgent: boolean
  ub: string
}

export interface Result {
  id: number
  determination: ResultDetermination
  value: string
  is_valid: boolean
  notes: string
  is_wrong: boolean
  is_active: boolean
  analysis: ResultAnalysis
  validated_by?: {
    id: number
    username: string
    first_name: string
    last_name: string
  } | null
}

// Response from GET /results/results/by-analysis/{id}/
export interface ResultsByAnalysisItem {
  id: number // protocol id
  patient: {
    id: number
    first_name: string
    last_name: string
  }
  status: {
    id: number
    name: string
  }
  results: Result[]
}

// Response from GET /results/results/available-analysis/
export interface AvailableAnalysis {
  id: number
  code: number
  name: string
  bio_unit: string
  is_urgent: boolean
  is_active: boolean
}

export interface PreviousResult {
  result_id: number
  protocol_id: number
  value: string
  created_at: string
  created_by: {
    username: string
    photo: string | null
  }
  date?: string
}

export interface ProtocolWithLoadedResults {
  id: number
  patient: {
    id: number
    dni: string
    first_name: string
    last_name: string
  }
  status: {
    id: number
    name: string
  }
}

// ============================================================================
// FACTURACION
// ============================================================================

export interface Invoice {
  id: number
  protocol_id: number
  insurance_name: string
  ub_value_at_billing: string
  total_ub_billed: string
  total_amount: string
  invoice_number: string | null
  is_paid: boolean
  paid_date: string | null
  notes: string
  is_active: boolean
  created_at: string
}

export interface ProtocolToBill {
  protocol_id: number
  status: string
  patient: {
    id: number
    first_name: string
    last_name: string
  }
  insurance: {
    id: number
    name: string
    ub_value_current: string
  }
  total_ub_authorized: string
  estimated_amount: string
}

export interface BillingSummary {
  adeudado_total: number
  dinero_facturado_ooss: number
  dinero_facturado_particular: number
  ooss_top_facturacion: Array<{
    insurance_name: string
    total: number
  }>
  protocolos_por_facturar: number
}

export interface ProtocolBillingStatus {
  protocol_id: number
  is_billed: boolean
  billed_at: string | null
  status: string
  insurance: string
  patient: string
}

// ============================================================================
// API Y RESPUESTAS
// ============================================================================

export interface PaginatedResponse<T> {
  next: string | null
  results: T[]
}

export interface ApiResponse<T = any> {
  data?: T
  message?: string
  errors?: FormErrors
  detail?: string
}

export interface FormErrors {
  [key: string]: string
}

// ============================================================================
// FORMULARIOS Y VALIDACIONES
// ============================================================================

export interface ValidationResultType {
  isValid: boolean
  message: string
}

export type ValidationState<T> = {
  [K in keyof T]: ValidationResultType
}

// ============================================================================
// COMPONENTES UI
// ============================================================================

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface LoadingState {
  isLoading: boolean
  error?: string
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface AppConfig {
  API_BASE_URL: string
  TOAST_DURATION: number
  IDLE_TIMEOUT: number
  WARNING_TIMEOUT: number
}

// ============================================================================
// ANÁLISIS SELECCIONADO CON AUTORIZACIÓN (para UI del ingreso)
// ============================================================================

export interface SelectedAnalysis extends Analysis {
  is_authorized: boolean
}
