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
  id: number | null
  username: string
  photo: string | null
}

export interface CreationAudit {
  version: number
  action: string
  user: AuditUser | null
  date: string
  changes?: string[]
  message?: string
}

export interface LastChangeAudit {
  version: number
  action: string
  user: AuditUser | null
  date: string
  changes: string[]
  message?: string
}

export type AuditCategory =
  | "protocol"
  | "result"
  | "validation"
  | "payment"
  | "state"
  | "doctor"
  | "insurance"
  | "analysis"
  | "user"
  | "patient"
  | "system"

export type AuditActionType = "create" | "update" | "delete" | "business" | "auth" | "system"

export interface HistoryEntry {
  event_id?: string
  version: number
  action: string // "creacion", "actualizacion", "eliminacion", "negocio", "autenticacion", "sistema"
  action_name?: string
  category?: AuditCategory | string
  state_from?: string | null
  state_to?: string | null
  related_protocol_id?: number | null
  user: AuditUser | null
  model?: {
    app: string
    model: string
    display: string
  } | null
  object_id?: string
  object_repr?: string
  changed_fields?: Record<string, { old: unknown; new: unknown }>
  changes: string[]
  before_state?: Record<string, unknown>
  after_state?: Record<string, unknown>
  message?: string
  request?: {
    id: string
    path: string
    method: string
    ip: string
  }
  metadata?: Record<string, unknown>
  created_at?: string
  date: string // UTC string
}

export interface ProtocolAuditTimelineResponse {
  protocol_id: number
  count: number
  events: HistoryEntry[]
}

export interface ProtocolAuditTimelineFilters {
  category?: AuditCategory | string
  actor?: number
  action_name?: string
  from?: string
  to?: string
  limit?: number
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
  id?: number
  event_id?: string
  version: number
  action: string
  action_name?: string
  category?: AuditCategory | string
  state_from?: string | null
  state_to?: string | null
  related_protocol_id?: number | null
  user: AuditUser | null
  date: string
  created_at?: string
  model: {
    app: string
    model: string
    display: string
  } | null
  object_id?: string
  object?: string
  object_repr?: string
  message?: string
  request?: {
    id: string
    path: string
    method: string
    ip: string
  }
  metadata?: Record<string, unknown>
  before_state?: Record<string, unknown>
  after_state?: Record<string, unknown>
  changed_fields?: Record<string, { old: unknown; new: unknown }>
  changes: string[]
}

export interface Role {
  id: number
  name: string
  permission_details?: Permission[]
  permissions?: number[]
  creation?: HistoryEntry
  last_change?: HistoryEntry
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
  cuil: string
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
  is_anonymous?: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

export interface PatientMergePreview {
  source_patient_id: number
  target_patient_id: number
  conflicts: Array<{ field: string; source_value: unknown; target_value: unknown }>
  auto_filled: Array<{ field: string; value: unknown }>
  protocols_to_move: number[]
}

export interface PatientMergeResult {
  detail: string
  unification_id: number
  moved_protocols: number[]
  patient: Patient
}

export interface PatientFormData {
  first_name: string
  last_name: string
  cuil: string
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

export interface Nbu {
  id: number
  name: string
}

export interface Insurance {
  id: number
  name: string
  description: string
  ub_value: string
  private_ub_value: number
  is_active: boolean
  charges_coseguro?: boolean
  charges_material_descartable?: boolean
  charges_derivacion?: boolean
  requires_preauthorization?: boolean
  nbu?: Nbu | number | null
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
  bio_unit_values?: BioUnitValue[]
  is_urgent: boolean
  is_active: boolean
  requires_derivacion?: boolean
  creation?: CreationAudit
  last_change?: LastChangeAudit
  history?: HistoryEntry[]
  total_changes?: number
}

// Legacy alias - panels are now just analysis
export type AnalysisPanel = Analysis

export interface BioUnitValue {
  year: number
  value: string
}

export type ReferenceValueGroup = "hombre_mayor" | "mujer_mayor" | "nino" | "nina"

export interface ReferenceValueBounds {
  min?: string
  max?: string
}

export type ReferenceValues = Partial<Record<ReferenceValueGroup | string, ReferenceValueBounds>>

export interface ReferenceRange {
  id?: number
  group: ReferenceValueGroup | string
  sex: "male" | "female" | string
  age_group: "adult" | "child" | string
  min_value: string
  max_value: string
}

export type ReferenceRangeEvaluationStatus =
  | "not_evaluated"
  | "no_applicable_reference"
  | "no_reference"
  | "in_range"
  | "out_of_range"
  | "uncheckable"

export interface ReferenceRangeEvaluation {
  status: ReferenceRangeEvaluationStatus
  is_out_of_reference_range: boolean
  value: string
  patient?: {
    gender: "M" | "F" | string
    age: number
    sex: "male" | "female" | string
    age_group: "adult" | "child" | string
  }
  reference?: ReferenceRange | null
}

export interface Determination {
  id: number
  code: string
  analysis: number
  name: string
  measure_unit: string
  formula: string
  reference_values?: ReferenceValues
  reference_ranges?: ReferenceRange[]
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
  is_sent?: boolean
  is_valid?: boolean
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
    cuil: string
    first_name: string
    last_name: string
    email?: string
    phone_mobile?: string
    alt_phone?: string
    is_anonymous?: boolean
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
    charges_coseguro?: boolean
    charges_material_descartable?: boolean
    charges_derivacion?: boolean
    requires_preauthorization?: boolean
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
  // Pricing breakdown (new fields - May 2026)
  analyses_amount_due?: string
  coseguro_amount?: string
  material_descartable_amount?: string
  derivacion_amount?: string
  extras_total?: string
  private_amount_due?: string
  nbu?: Nbu | null
  // Returned by protocol create response
  value_paid?: string
  payment_status: PaymentStatus
  billing_status?: BillingStatus
  is_arca_billed?: boolean
  arca_billing_status?: "pendiente" | "emitida" | "error" | "anulada" | string
  arca_billed_at?: string | null
  arca_reference?: string
  arca_bill_to?: "patient" | "third_party"
  arca_receiver_doc_type?: string
  arca_receiver_doc_number?: string
  arca_receiver_name?: string
  arca_receiver_address?: string
  arca_cbte_tipo?: number | null
  arca_cbte_number?: number | null
  arca_cae?: string
  arca_cae_due_date?: string
  arca_invoice_pdf_url?: string | null
  is_printed: boolean
  trajo_orden: boolean
  is_in_patient?: boolean
  is_active: boolean
  created_at?: string
  completed_at?: string | null
  previous_status?: ProtocolStatus | null
  // Información faltante (estado intermedio antes de "Completado")
  missing_info_notes?: string | null
  missing_info_at?: string | null
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
    cuil: string
    first_name: string
    last_name: string
    is_anonymous?: boolean
  }
  status: ProtocolStatus
  balance: string
  private_amount_due?: string
  patient_paid?: string
  amount_to_return?: string
  // Pricing breakdown (new fields)
  analyses_amount_due?: string
  coseguro_amount?: string
  material_descartable_amount?: string
  derivacion_amount?: string
  extras_total?: string
  payment_status: PaymentStatus
  billing_status?: BillingStatus
  is_printed: boolean
  trajo_orden: boolean
  is_in_patient?: boolean
  missing_info_notes?: string | null
  created_at?: string
  is_arca_billed?: boolean
  arca_billing_status?: "pendiente" | "emitida" | "error" | "anulada" | string
  arca_billed_at?: string | null
  arca_reference?: string
  arca_bill_to?: "patient" | "third_party"
  arca_receiver_doc_type?: string
  arca_receiver_doc_number?: string
  arca_receiver_name?: string
  arca_receiver_address?: string
  arca_cbte_tipo?: number | null
  arca_cbte_number?: number | null
  arca_cae?: string
  arca_cae_due_date?: string
  creation?: CreationAudit
  last_change?: LastChangeAudit
}

export interface CreateProtocolInput {
  patient: number
  doctor: number
  insurance?: number
  affiliate_number?: string
  send_method: number
  value_paid: string
  trajo_orden?: boolean
  is_in_patient?: boolean
  details: ProtocolDetailInput[]
}

export interface PreauthorizationPayload {
  protocol_ids: number[]
  authorized_analysis_ids: number[]
  reference?: string
  brought?: boolean
  notes?: string
}

export interface PreauthorizationResponse {
  detail: string
  preauthorization_id: number
  brought: boolean
  protocols: number[]
  authorized_analysis_ids: number[]
}

export interface MergeReportPayload {
  protocol_ids: number[]
  action: "download" | "email" | "whatsapp"
  type: "full" | "summary"
  protocol_date?: string
  protocol_time?: string
  signed?: boolean
  email?: string
  phone_number?: string
}

export interface ProtocolSummary {
  id: number
  patient_first_name: string
  patient_last_name: string
  patient_cuil: string
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
  code?: string
  name: string
  measure_unit: string
  formula: string
  reference_values?: ReferenceValues
  reference_ranges?: ReferenceRange[]
}

export interface ResultAnalysis {
  id: number
  name: string
  code: number
  is_urgent: boolean
  ub: string
  bio_unit_values?: BioUnitValue[]
}

export interface Result {
  id: number
  determination: ResultDetermination
  value: string
  is_valid: boolean
  notes: string
  is_wrong: boolean
  is_out_of_reference_range?: boolean
  reference_range_evaluation?: ReferenceRangeEvaluation | null
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

// Response from GET /results/results/available-analyses/
export interface AvailableAnalysis {
  id: number
  code: number
  name: string
  bio_unit: string
  bio_unit_values?: BioUnitValue[]
  is_urgent: boolean
  is_active: boolean
}

// PreviousResult matches the Result structure returned by GET /results/results/history/
export type PreviousResult = Result

export interface ResultValidacion {
  id: number
  tipo: "tecnica" | "bioquimica"
  estado: "pendiente" | "aprobada" | "rechazada"
  validado_por: {
    id: number
    username: string
    first_name: string
    last_name: string
  } | null
  validado_at: string | null
  result_notes: string
  created_at: string
}

export interface ResultCambio {
  id: number
  valor_anterior: string
  valor_nuevo: string
  motivo: string
  modificado_por: {
    id: number
    username: string
    first_name: string
    last_name: string
  } | null
  created_at: string
}

export interface ProtocolWithLoadedResults {
  id: number
  patient: {
    id: number
    cuil: string
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
  presentation_id?: number | null
  insurance_name: string
  ub_value_at_billing: string
  total_ub_billed: string
  total_amount: string
  amount_paid?: string
  difference_amount?: string
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
  billing_status?: string
  patient: {
    id: number
    first_name: string
    last_name: string
  } | null
  insurance: {
    id: number
    name: string
    ub_value_at_protocol_creation?: string
  } | null
  total_ub_authorized: string
  estimated_amount?: string
  expected_amount?: string
}

export interface BillingSummary {
  adeudado_total: number | string
  dinero_facturado_ooss: number | string
  dinero_cobrado_ooss?: number | string
  dinero_facturado_particular: number | string
  facturado_por_particular?: number | string
  ooss_top_facturacion: Array<{
    insurance_id?: number
    insurance_name: string
    total?: number | string
    total_facturado?: number | string
  }>
  protocolos_por_facturar: number
}

export interface BillingPresentation {
  id: number
  reference: string
  name: string
  period_start: string
  period_end: string
  invoice_count: number
  expected_amount: string
  expected_by_ooss?: Array<{
    insurance_id: number
    insurance_name: string
    protocol_count: number
    expected_amount: string
    collected_amount?: string
    difference_amount?: string
  }>
  protocols?: Array<{
    protocol_id: number
    invoice_id: number
    invoice_number: string
    insurance?: { id: number; name: string } | null
    patient?: { id: number; first_name: string; last_name: string } | null
    expected_amount: string
    paid_amount?: string
    difference_amount?: string
  }>
  collected_amount?: string
  difference_amount?: string
  balance_state?: "equilibrada" | "sobrecobro" | "subcobro"
  status: "cerrada" | "cobrada"
  collected_at?: string | null
  notes: string
  is_active: boolean
  created_by_id: number | null
  created_at: string
}

export interface BillingPresentationSummaryResponse {
  count: number
  results: BillingPresentation[]
  chart: Array<{
    id: number
    reference: string
    period_start: string
    period_end: string
    expected_amount: string
    collected_amount: string
    difference_amount: string
    balance_state: "equilibrada" | "sobrecobro" | "subcobro"
  }>
}

export interface BillingPresentationDetailResponse {
  count: number
  presentation: BillingPresentation & {
    expected_by_ooss?: Array<{
      insurance_id: number
      insurance_name: string
      expected_amount: string
      collected_amount: string
      difference_amount: string
    }>
    protocols?: Array<{
      protocol_id: number
      patient_name?: string
      insurance_name?: string
      expected_amount?: string
      paid_amount?: string
    }>
  }
  results: Array<{
    id: number
    protocol_id: number
    presentation_id?: number | null
    insurance_name: string
    invoice_number: string | null
    total_amount: string
    amount_paid: string
    is_paid: boolean
    paid_date: string | null
    notes: string
    created_at: string
  }>
}

export interface ProtocolBillingStatus {
  protocol_id: number
  is_billed: boolean
  billed_at: string | null
  status: string
  billing_status?: string
  insurance: {
    id: number
    name: string
  }
  patient: {
    id: number
    first_name: string
    last_name: string
  }
}

export interface BillingOossControlItem {
  invoice_id: number
  protocol_id: number
  date: string
  insurance: {
    id: number
    name: string
  }
  patient: {
    id: number
    first_name: string
    last_name: string
  } | null
  total_facturado: string
  total_cobrado: string
  diferencia: string
  is_paid: boolean
  paid_date: string | null
}

export interface BillingOossControlResponse {
  count: number
  total_facturado_ooss: string
  total_cobrado_ooss: string
  diferencia_total_ooss: string
  facturado_por_particular: string
  results: BillingOossControlItem[]
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
