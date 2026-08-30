# Graph Report - .  (2026-06-19)

## Corpus Check
- 210 files · ~125,168 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1170 nodes · 3922 edges · 62 communities (58 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.8)
- Token cost: 125,014 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Entity Creation Dialogs & Forms|Entity Creation Dialogs & Forms]]
- [[_COMMUNITY_Analysis Catalog & CRUD Dialogs|Analysis Catalog & CRUD Dialogs]]
- [[_COMMUNITY_History & Deletion Dialogs|History & Deletion Dialogs]]
- [[_COMMUNITY_Caveman Compress Python Tooling|Caveman Compress Python Tooling]]
- [[_COMMUNITY_Shared Types & Error Handling|Shared Types & Error Handling]]
- [[_COMMUNITY_Audit & Result Input UI|Audit & Result Input UI]]
- [[_COMMUNITY_Radix UI Runtime Dependencies|Radix UI Runtime Dependencies]]
- [[_COMMUNITY_shadcnui Component Primitives|shadcn/ui Component Primitives]]
- [[_COMMUNITY_CavemanCavecrew Skill Suite|Caveman/Cavecrew Skill Suite]]
- [[_COMMUNITY_Protocol Action Dialogs|Protocol Action Dialogs]]
- [[_COMMUNITY_Protocol Status & Reporting|Protocol Status & Reporting]]
- [[_COMMUNITY_App TypeScript Config|App TypeScript Config]]
- [[_COMMUNITY_Auth & Session Storage|Auth & Session Storage]]
- [[_COMMUNITY_PermissionRole Tables|Permission/Role Tables]]
- [[_COMMUNITY_Medico & Patient Forms|Medico & Patient Forms]]
- [[_COMMUNITY_Combobox & Command Components|Combobox & Command Components]]
- [[_COMMUNITY_App Routing & Protected Routes|App Routing & Protected Routes]]
- [[_COMMUNITY_Node TypeScript Config|Node TypeScript Config]]
- [[_COMMUNITY_Protocol Intake (Ingreso)|Protocol Intake (Ingreso)]]
- [[_COMMUNITY_Patient Creation & CUIL Validation|Patient Creation & CUIL Validation]]
- [[_COMMUNITY_Layout, Navbar & Notifications|Layout, Navbar & Notifications]]
- [[_COMMUNITY_User Table & Dropdown Menu|User Table & Dropdown Menu]]
- [[_COMMUNITY_Result Validation & Reference Formatting|Result Validation & Reference Formatting]]
- [[_COMMUNITY_shadcn Components Config|shadcn Components Config]]
- [[_COMMUNITY_Management Pages & Permissions|Management Pages & Permissions]]
- [[_COMMUNITY_Home Dashboard & Metrics|Home Dashboard & Metrics]]
- [[_COMMUNITY_Analysis Accordion & Results|Analysis Accordion & Results]]
- [[_COMMUNITY_Protocol Accordion View|Protocol Accordion View]]
- [[_COMMUNITY_Auth Context & Session Lifecycle|Auth Context & Session Lifecycle]]
- [[_COMMUNITY_Report Dialog & Customization|Report Dialog & Customization]]
- [[_COMMUNITY_Protocol Details & Preauthorization|Protocol Details & Preauthorization]]
- [[_COMMUNITY_Dev Tooling Dependencies|Dev Tooling Dependencies]]
- [[_COMMUNITY_Result Formula Calculations|Result Formula Calculations]]
- [[_COMMUNITY_Protocol Form & Status Buttons|Protocol Form & Status Buttons]]
- [[_COMMUNITY_Patient Cards & Grid|Patient Cards & Grid]]
- [[_COMMUNITY_Protocol Header & Payment Status|Protocol Header & Payment Status]]
- [[_COMMUNITY_Page Components & Auth Hook|Page Components & Auth Hook]]
- [[_COMMUNITY_Facturacion (Billing) Page|Facturacion (Billing) Page]]
- [[_COMMUNITY_Package Manifest|Package Manifest]]
- [[_COMMUNITY_Protocol Order Status (Trajo Orden)|Protocol Order Status (Trajo Orden)]]
- [[_COMMUNITY_Date Utilities|Date Utilities]]
- [[_COMMUNITY_Analysis Component Props|Analysis Component Props]]
- [[_COMMUNITY_Validation Hooks|Validation Hooks]]
- [[_COMMUNITY_Endpoint Revision & Deploy Tasks|Endpoint Revision & Deploy Tasks]]
- [[_COMMUNITY_Root TypeScript Config|Root TypeScript Config]]
- [[_COMMUNITY_Admin Icon Branding|Admin Icon Branding]]
- [[_COMMUNITY_Protocol Status Color Helpers|Protocol Status Color Helpers]]
- [[_COMMUNITY_API Error Toast Handling|API Error Toast Handling]]
- [[_COMMUNITY_Loading State Hooks|Loading State Hooks]]
- [[_COMMUNITY_Brand Icon (Healthcare)|Brand Icon (Healthcare)]]
- [[_COMMUNITY_Logo+Icon Branding|Logo+Icon Branding]]
- [[_COMMUNITY_Alert Component|Alert Component]]
- [[_COMMUNITY_Determination & Reference Types|Determination & Reference Types]]
- [[_COMMUNITY_Wordmark Logo Branding|Wordmark Logo Branding]]
- [[_COMMUNITY_Auth Domain Types|Auth Domain Types]]
- [[_COMMUNITY_HTML Entrypoint & Vite README|HTML Entrypoint & Vite README]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Caveman Compress Package|Caveman Compress Package]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 117 edges
2. `useApi()` - 104 edges
3. `Button()` - 80 edges
4. `formatApiError()` - 65 edges
5. `Input()` - 52 edges
6. `useToast()` - 47 edges
7. `DialogContent()` - 39 edges
8. `DialogHeader()` - 39 edges
9. `DialogTitle()` - 39 edges
10. `Dialog()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `UserTableProps` --references--> `User`  [EXTRACTED]
  labsalud_frontend/src/components/admin/components/user-table.tsx → labsalud_frontend/src/types/index.ts
- `extractErrorMessage()` --calls--> `formatApiError()`  [EXTRACTED]
  labsalud_frontend/src/components/admin/role-management.tsx → labsalud_frontend/src/lib/api-error.ts
- `FacturacionPage()` --calls--> `useApi()`  [EXTRACTED]
  labsalud_frontend/src/components/facturacion/facturacion-page.tsx → labsalud_frontend/src/hooks/use-api.tsx
- `AnalysisSelector()` --calls--> `useApi()`  [EXTRACTED]
  labsalud_frontend/src/components/ingreso/components/analysis-selector.tsx → labsalud_frontend/src/hooks/use-api.tsx
- `extractErrorMessage()` --calls--> `formatApiError()`  [EXTRACTED]
  labsalud_frontend/src/components/ingreso/components/create-medico-form.tsx → labsalud_frontend/src/lib/api-error.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Caveman skill suite** — caveman_skill, caveman_commit_skill, caveman_review_skill, caveman_compress_skill, caveman_help_skill, caveman_stats_skill [EXTRACTED 1.00]
- **Cavecrew subagent trio** — cavecrew_investigator, cavecrew_builder, cavecrew_reviewer [EXTRACTED 1.00]
- **Backend endpoint/payload cleanup plan** — revision_endpoints_api_config, revision_endpoints_arca_fields, revision_endpoints_audit_timeline, revision_endpoints_reporting_unify [EXTRACTED 1.00]

## Communities (62 total, 4 thin omitted)

### Community 0 - "Entity Creation Dialogs & Forms"
Cohesion: 0.06
Nodes (103): PermissionManagementProps, UserManagementProps, CreateDeterminationDialogProps, CreateMedicoDialogProps, FormData, ValidationState, CreateObraSocialDialogProps, FormData (+95 more)

### Community 1 - "Analysis Catalog & CRUD Dialogs"
Cohesion: 0.07
Nodes (69): AuditAvatars(), AnalysisAccordionView(), AnalysisCatalog, AnalysisList(), AnalysisListProps, AnalysisSearch(), PaginatedResponse, ClearCatalogDialog() (+61 more)

### Community 2 - "History & Deletion Dialogs"
Cohesion: 0.06
Nodes (48): HistoryList(), ObjectHistoryDialog(), ObjectHistoryDialogProps, AnalysisHistoryDialog(), AnalysisHistoryDialogProps, ClearCatalogDialogProps, ClearCatalogResponse, Analysis (+40 more)

### Community 3 - "Caveman Compress Python Tooling"
Cohesion: 0.08
Nodes (44): Path, Path, Path, Path, benchmark_pair(), count_tokens(), main(), print_table() (+36 more)

### Community 4 - "Shared Types & Error Handling"
Cohesion: 0.04
Nodes (45): ErrorState, AnalysisPanel, ApiResponse, AppConfig, AuditActionType, AuditUser, AvailableAnalysis, BaseEntity (+37 more)

### Community 5 - "Audit & Result Input UI"
Cohesion: 0.09
Nodes (30): AuditAvatarsProps, AuditInfo, formatDateTime(), sizeClasses, textSizeClasses, CATEGORY_META, AnalysisInputProps, inputRefs (+22 more)

### Community 6 - "Radix UI Runtime Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, class-variance-authority, clsx, cmdk, lucide-react, next-themes, @radix-ui/react-accordion, @radix-ui/react-alert-dialog (+23 more)

### Community 7 - "shadcn/ui Component Primitives"
Cohesion: 0.09
Nodes (21): cn(), CardAction(), CardDescription(), CardFooter(), FormField(), FormFieldProps, HoverCardContent(), ScrollArea() (+13 more)

### Community 8 - "Caveman/Cavecrew Skill Suite"
Cohesion: 0.10
Nodes (27): cavecrew-builder subagent, Subagent context compression win, cavecrew-investigator subagent, Locate-fix-verify chaining pattern, cavecrew-reviewer subagent, cavecrew decision guide, caveman auto-clarity rule, caveman-commit auto-clarity rule (+19 more)

### Community 9 - "Protocol Action Dialogs"
Cohesion: 0.12
Nodes (21): HistoryListProps, TimelineResponse, ProtocolActions(), EXCLUDED_REPORT_ANALYSIS_CODES, ReportAction, ReportProtocolDetail, UserDetailData, ArcaBillingDialog() (+13 more)

### Community 10 - "Protocol Status & Reporting"
Cohesion: 0.10
Nodes (22): ProtocolCardProps, PROTOCOL_ENDPOINTS, REPORTING_ENDPOINTS, ALLOWED_PROTOCOL_STATUS_FILTERS, fallbackProtocolStatusStyle, getProtocolStatusStyleByName(), normalizeProtocolStatusName(), PROTOCOL_STATUS_ID_BY_NAME (+14 more)

### Community 11 - "App TypeScript Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, ignoreDeprecations, jsx, lib, module, moduleDetection (+15 more)

### Community 12 - "Auth & Session Storage"
Cohesion: 0.16
Nodes (19): buildCookieAttributes(), clearSession(), clearStoredUser(), clearTokens(), deleteCookie(), getAccessToken(), getCookie(), getRefreshToken() (+11 more)

### Community 13 - "Permission/Role Tables"
Cohesion: 0.22
Nodes (13): extractErrorMessage(), RoleManagementProps, RoleWithDetails, PatientDetailsDialog(), Checkbox(), DialogTrigger(), Separator(), Table() (+5 more)

### Community 14 - "Medico & Patient Forms"
Cohesion: 0.17
Nodes (17): AnalysisSelector(), PaginatedResponse, CreateMedicoForm(), CreateMedicoFormProps, extractErrorMessage(), EditMedicoDialogProps, MedicoComboboxProps, MedicoDetailsDialogProps (+9 more)

### Community 15 - "Combobox & Command Components"
Cohesion: 0.20
Nodes (15): PaginatedResponse, PaginatedResponse, MEDICAL_ENDPOINTS, Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput() (+7 more)

### Community 16 - "App Routing & Protected Routes"
Cohesion: 0.12
Nodes (14): NotFound(), ProtectedRoute(), ProtectedRouteProps, App(), ConfigurationPage, FacturacionPage, IngresoPage, ManagementPage (+6 more)

### Community 17 - "Node TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 18 - "Protocol Intake (Ingreso)"
Cohesion: 0.20
Nodes (15): CreateObraSocialFormProps, ObraSocialComboboxProps, ProtocolSuccessProps, DoctorInfo(), DoctorInfoProps, InsuranceInfo(), InsuranceInfoProps, EditDialogProps (+7 more)

### Community 19 - "Patient Creation & CUIL Validation"
Cohesion: 0.29
Nodes (14): ValidatedField, ValidationResult, CreatePatientForm(), ValidatedField, ValidationResult, PatientSearch(), PATIENT_ENDPOINTS, CreatePatientDialog() (+6 more)

### Community 20 - "Layout, Navbar & Notifications"
Cohesion: 0.16
Nodes (10): Layout(), LayoutProps, Navbar(), NavLinkProps, SessionNotificationToggle(), SessionNotificationToggleProps, UserDropdown(), UserDropdownProps (+2 more)

### Community 21 - "User Table & Dropdown Menu"
Cohesion: 0.14
Nodes (12): UserTable(), UserTableProps, DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuRadioItem(), DropdownMenuSeparator() (+4 more)

### Community 22 - "Result Validation & Reference Formatting"
Cohesion: 0.16
Nodes (12): extractErrorMessage(), GroupedAnalysis, ValidationProtocolCardProps, RESULTS_ENDPOINTS, formatEvaluatedReference(), formatReferenceGroup(), formatReferenceRange(), formatReferenceValues() (+4 more)

### Community 23 - "shadcn Components Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 24 - "Management Pages & Permissions"
Cohesion: 0.23
Nodes (8): PermissionManagement(), PermissionKey, PERMISSIONS, PermissionValue, Tabs(), TabsContent(), TabsList(), TabsTrigger()

### Community 25 - "Home Dashboard & Metrics"
Cohesion: 0.14
Nodes (13): DAILY_METRICS, DailyMetricKey, DashboardResponse, getTrendTone(), Home(), numberOrZero(), parsePercent(), ProtocolsToBillResponse (+5 more)

### Community 26 - "Analysis Accordion & Results"
Cohesion: 0.16
Nodes (15): AnalysisInfo, AvailableAnalysis, extractErrorMessage(), PreviousResultData, ProtocolWithResults, Result, RESULTS_VISIBLE_STATUS_IDS, ResultValue (+7 more)

### Community 27 - "Protocol Accordion View"
Cohesion: 0.16
Nodes (14): extractErrorMessage(), GroupedResults, Patient, PaymentStatus, ProtocolListItem, RESULTS_VISIBLE_STATUS_IDS, ResultValue, Status (+6 more)

### Community 28 - "Auth Context & Session Lifecycle"
Cohesion: 0.15
Nodes (12): AUTH_ENDPOINTS, AuthContext, AuthContextType, AuthProvider(), AuthProviderProps, AuthResponse, TokenRefreshResponse, IdleTimeoutProps (+4 more)

### Community 29 - "Report Dialog & Customization"
Cohesion: 0.16
Nodes (10): ActionButtonProps, EXCLUDED_ANALYSIS_CODES, getActionColor(), getSendMethodAction(), normalizeText(), ReportCustomizationDrawerProps, ReportDialog(), ReportDialogProps (+2 more)

### Community 30 - "Protocol Details & Preauthorization"
Cohesion: 0.23
Nodes (12): ProtocolDetailsSection(), ProtocolDetailsSectionProps, AnalysisDialog(), AnalysisDialogProps, PreauthorizationDialogProps, getPreauthStatusInfo(), PreauthStatus, ProtocolDetail (+4 more)

### Community 31 - "Dev Tooling Dependencies"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, tw-animate-css, @types/node (+7 more)

### Community 32 - "Result Formula Calculations"
Cohesion: 0.17
Nodes (11): applyFormulaCalculations(), buildResultCodeMap(), calculateFormulaValue(), evaluateExpression(), formatFormulaNumber(), FormulaAnalysis, FormulaCalculation, FormulaDetermination (+3 more)

### Community 33 - "Protocol Form & Status Buttons"
Cohesion: 0.14
Nodes (11): AnalysisTable(), CreationPreauthStatus, PREAUTH_OPTIONS, ProtocolForm(), ProtocolFormProps, statusIcons, StatusOption, StatusTone (+3 more)

### Community 34 - "Patient Cards & Grid"
Cohesion: 0.18
Nodes (11): CreatePatientFormProps, MergePatientDialogProps, PatientCard(), PatientDetailsDialogProps, PatientGrid(), PatientGridProps, PatientSearchProps, PatientTableProps (+3 more)

### Community 35 - "Protocol Header & Payment Status"
Cohesion: 0.27
Nodes (11): ProtocolDetailResponse, getStateColor(), ProtocolHeader(), ProtocolHeaderProps, ProtocolSuccess(), getPaymentStatusInfo(), BillingStatus, CreationAudit (+3 more)

### Community 36 - "Page Components & Auth Hook"
Cohesion: 0.20
Nodes (9): ManagementPage(), RoleManagement(), UserManagement(), Login(), ProtocolCard(), RouteChangeListener(), useAuth(), ProfilePage() (+1 more)

### Community 37 - "Facturacion (Billing) Page"
Cohesion: 0.24
Nodes (10): ActiveTab, ClosedPresentation, CurrentTotalResponse, DailyBillingSeries, FacturacionPage(), formatCurrency(), formatExpected(), parseMoney() (+2 more)

### Community 38 - "Package Manifest"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 39 - "Protocol Order Status (Trajo Orden)"
Cohesion: 0.28
Nodes (8): EditFormData, OrderStatusDialogProps, getTrajoOrdenInfo(), isTrajoOrdenCompleta(), normalizeTrajoOrden(), TRAJO_ORDEN, TRAJO_ORDEN_OPTIONS, TrajoOrdenStatus

### Community 40 - "Date Utilities"
Cohesion: 0.29
Nodes (5): IdleWarningModal(), formatDateTime(), formatTime(), isValidDate(), parseDate()

### Community 41 - "Analysis Component Props"
Cohesion: 0.29
Nodes (7): AnalysisSearchProps, AnalysisSelectorProps, AnalysisTableProps, CreateAnalysisCatalogDialogProps, EditAnalysisCatalogDialogProps, Analysis, SelectedAnalysis

### Community 42 - "Validation Hooks"
Cohesion: 0.38
Nodes (6): useMedicoValidation(), usePatientValidation(), useValidation(), validators, ValidationResultType, ValidationState

### Community 43 - "Endpoint Revision & Deploy Tasks"
Cohesion: 0.40
Nodes (6): ARREGLOS PRE DEPLOY task list, src/config/api.ts endpoint definitions, Unused ARCA fields in protocol serializer, audit-timeline endpoint (supersedes history/cambios/validaciones), Revisión de endpoints y payloads, Unify reporting endpoints to report/report-batch

### Community 44 - "Root TypeScript Config"
Cohesion: 0.33
Nodes (5): compilerOptions, paths, files, @/*, references

### Community 45 - "Admin Icon Branding"
Cohesion: 0.47
Nodes (6): Administration Function, Blue Color Palette (#1d9ae5 / #275a8d / #254b72), Gear / Cog Configuration Motif, LabSalud Admin Icon, LabSalud Brand Identity, Stylized Letter M Mark

### Community 46 - "Protocol Status Color Helpers"
Cohesion: 0.40
Nodes (5): getStatusColor(), getStatusColor(), getProtocolStatusBadgeClass(), getProtocolStatusButtonClass(), getProtocolStatusStyle()

### Community 47 - "API Error Toast Handling"
Cohesion: 0.50
Nodes (4): extractResponseError(), classifyApiError(), readApiError(), showApiErrorToast()

### Community 48 - "Loading State Hooks"
Cohesion: 0.50
Nodes (4): LoadingOptions, LoadingState, useCrudLoading(), useLoading()

### Community 49 - "Brand Icon (Healthcare)"
Cohesion: 0.60
Nodes (5): Healthcare Blue Color Palette, LabSalud Brand Icon, Stylized Human Figure Silhouette, LabSalud Health Application, Stethoscope / Medical Motif

### Community 50 - "Logo+Icon Branding"
Cohesion: 0.50
Nodes (5): LabSalud Brand Identity, Healthcare Laboratory Domain, Stylized Medical Icon Mark, LabSalud Logo with Icon, LabSalud Wordmark

### Community 51 - "Alert Component"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 52 - "Determination & Reference Types"
Cohesion: 0.67
Nodes (4): Determination, Determination, ReferenceRange, ReferenceValues

### Community 53 - "Wordmark Logo Branding"
Cohesion: 0.67
Nodes (4): LabSalud Healthcare Brand, LabSalud Wordmark Logo, Navy Blue Brand Color (#22457A), Brand Wordmark Text

### Community 54 - "Auth Domain Types"
Cohesion: 0.50
Nodes (3): User, UserPermission, UserRole

## Knowledge Gaps
- **342 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+337 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `shadcn/ui Component Primitives` to `Entity Creation Dialogs & Forms`, `Analysis Catalog & CRUD Dialogs`, `History & Deletion Dialogs`, `Audit & Result Input UI`, `Protocol Status & Reporting`, `Permission/Role Tables`, `Medico & Patient Forms`, `Combobox & Command Components`, `Alert Component`, `User Table & Dropdown Menu`, `Management Pages & Permissions`, `Protocol Accordion View`, `Protocol Details & Preauthorization`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `useApi()` connect `Analysis Catalog & CRUD Dialogs` to `Entity Creation Dialogs & Forms`, `History & Deletion Dialogs`, `Page Components & Auth Hook`, `Facturacion (Billing) Page`, `Protocol Action Dialogs`, `Protocol Status & Reporting`, `Auth & Session Storage`, `Permission/Role Tables`, `Medico & Patient Forms`, `Combobox & Command Components`, `Loading State Hooks`, `Protocol Intake (Ingreso)`, `Patient Creation & CUIL Validation`, `Result Validation & Reference Formatting`, `Management Pages & Permissions`, `Analysis Accordion & Results`, `Protocol Accordion View`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Button()` connect `Entity Creation Dialogs & Forms` to `Analysis Catalog & CRUD Dialogs`, `History & Deletion Dialogs`, `Audit & Result Input UI`, `shadcn/ui Component Primitives`, `Protocol Action Dialogs`, `Protocol Status & Reporting`, `Auth & Session Storage`, `Permission/Role Tables`, `Medico & Patient Forms`, `Combobox & Command Components`, `Protocol Intake (Ingreso)`, `Patient Creation & CUIL Validation`, `User Table & Dropdown Menu`, `Result Validation & Reference Formatting`, `Analysis Accordion & Results`, `Protocol Accordion View`, `Report Dialog & Customization`, `Protocol Details & Preauthorization`, `Protocol Form & Status Buttons`, `Protocol Header & Payment Status`, `Facturacion (Billing) Page`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `useApi()` (e.g. with `CreatePatientDialog()` and `EditPatientDialog()`) actually correct?**
  _`useApi()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Caveman compress scripts.  This package provides tools to compress natural langu`, `Heuristic denylist for files that must never be shipped to a third-party API.`, `Strip outer ```markdown ... ``` fence when it wraps the entire output.` to the rest of the system?**
  _355 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Entity Creation Dialogs & Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.06050149528410398 - nodes in this community are weakly interconnected._
- **Should `Analysis Catalog & CRUD Dialogs` be split into smaller, more focused modules?**
  _Cohesion score 0.06843718079673136 - nodes in this community are weakly interconnected._