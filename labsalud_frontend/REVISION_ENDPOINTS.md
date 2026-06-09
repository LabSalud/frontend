# Revisión de endpoints y payloads — optimización backend

Objetivo: listar lo que **este frontend no consume** (endpoints y campos), para
darlo de baja / recortar en backend y reducir carga.

Método: `src/config/api.ts` + uso real en `src/**` vs `backend/docs/`. Medido por
referencias reales (no por tipos declarados).

> ⚠️ Antes de borrar, confirmar que no lo use **otro consumidor** (cron/jobs, admin
> Django, ARCA, integraciones). Acá solo se evaluó este frontend.

---

## A. Endpoints definidos en el front y NUNCA llamados (0 referencias)

Están en `config/api.ts` pero ningún componente los invoca:

| Key | Ruta | Reemplazado por / motivo |
|---|---|---|
| `APPLY_PREAUTHORIZATION` | `POST /protocols/protocols/apply-preauthorization/` | Preauth se setea al crear/editar. |
| `PROTOCOL_HISTORY` | `GET /protocols/protocols/<id>/history/` | `audit-timeline`. |
| `RESULT_CAMBIOS` | `GET /results/results/<id>/cambios/` | `audit-timeline`. |
| `RESULT_VALIDACIONES` | `GET /results/results/<id>/validaciones/` | `audit-timeline`. |
| `BY_PROTOCOL_WITH_VALUE` | `GET /results/results/by-protocol-with-value/<id>/` | Se usa `by-protocol`. |
| `NBU_EFFECTIVE_UB` | `GET /catalog/nbu/<id>/effective-ub/<id>/` | No referenciado. |
| `INVOICES` | `GET /billing/invoices/` | `protocols-to-bill` / `facturados` / `current-total`. |
| `INVOICE_DETAIL` | `GET /billing/invoices/<id>/` | No se pide la factura suelta. |
| `PRESENTATIONS` | `GET /billing/presentations/` | Solo `presentations/closed/`. |
| `PRESENTATION_PROTOCOLS` | `GET /billing/presentations/<id>/protocols/` | Los protocolos ya vienen en `closed`. |
| `ME_CONTEXT` | `GET /users/me/context/` | Solo `users/me/`. |
| `TOKEN_VERIFY` | `POST /auth/token/verify/` | Solo `token/refresh/`. |
| `PERMISSION_DETAIL` | `GET /ac/permissions/<id>/` | No referenciado. |
| `TEMP_PERMISSION_DETAIL` | `GET /ac/tp/<id>/` | No referenciado. |
| `TEMP_PERMISSION_REVOKE_BY_USER` | `POST /ac/tp/revoke-by-user/` | Se revoca por id de permiso. |
| `UNDO_UNIFICATION` | `POST /patients/patients/unifications/<id>/undo/` | Sin UI de deshacer. |
| `PRINT` | `GET /reports/protocols/<id>/print/` | `PROTOCOL_ENDPOINTS.REPORT`. |
| `SEND_EMAIL` | `POST /reports/protocols/<id>/send-email/` | `REPORT` / `REPORT_BATCH` (action). |
| `SEND_WHATSAPP` | `POST /reports/protocols/<id>/send-whatsapp/` | `REPORT` / `REPORT_BATCH` (action). |
| `SIGNATURE_AUDIT_TIMELINE` | `GET /reports/signatures/<id>/audit-timeline/` | Sin UI de historial de firmas (todavía). |

## B. Endpoints documentados que el front ni siquiera define

Backend los expone, este front no los conoce:

| Ruta | Nota |
|---|---|
| `GET /results/results/by-analysis/<id>/counts/` | El front usa `by-analysis/<id>/` sin counts. |
| `GET /analytics/dashboard/protocols-by-status/` | Definido (`PROTOCOLS_BY_STATUS`) pero 1 sola ref muerta; verificar si se renderiza. |

> Los duplicados de reporting (`/reports/protocols/<id>/print|send-email|send-whatsapp/`)
> conviven con `/protocols/protocols/<id>/report/` + `report-batch/` que son los reales.
> Unificar a una sola familia en backend.

## C. Campos devueltos pero NO usados (recortar serializers)

### `GET /protocols/protocols/` (lista) y `/<id>/` (detalle) — **mayor ganancia**
El bloque ARCA viaja en **cada fila de la lista** y casi nada se usa. Sin uso:
- `arca_billing_status`
- `arca_billed_at`
- `arca_reference`
- `arca_bill_to`
- `arca_receiver_doc_type`
- `arca_receiver_doc_number`
- `arca_receiver_name`
- `arca_receiver_address`
- `arca_cbte_tipo`
- `arca_cae_due_date`

Sí se usan (mantener): `is_arca_billed`, `arca_cae`, `arca_cbte_number`.

> Recomendación: sacar los 10 campos ARCA del serializer de lista/detalle y, si se
> necesitan, exponerlos en un endpoint dedicado `…/arca-detail/`. Esto aligera mucho
> el listado de protocolos (el payload más pesado del sistema).

### `GET /analytics/dashboard/`
- `avg_result_load_time_minutes` → el front solo usa `avg_result_load_time_human`.
- `protocols_daily_last_7[].count` → alias legacy de `protocols`; el front ya migró a
  `protocols / patients_served / analyses_loaded / results_loaded`. Quitar cuando no
  haya clientes viejos.

### `POST /billing/presentations/close-period/` (201)
El front no lee el body (refetchea `closed/`). Sin consumir: `collected_amount`,
`difference_amount`, `balance_state`, `collected_at`,
`expected_by_ooss[].collected_amount/difference_amount`,
`protocols[].paid_amount/difference_amount`.
→ Si nadie más lo lee, devolver respuesta mínima (`id`, `reference`, `status`).

### `GET /billing/invoices/current-total/`
- `expected_total_amount` → quedó sin uso al quitar "Monto esperado" de la presentación
  abierta. Mantener `expected_by_ooss` (se usa para el resumen por OOSS).

---

## D. Resumen de acciones sugeridas (orden de impacto)

1. **Protocolos**: quitar 10 campos ARCA de lista/detalle → endpoint aparte. (alto)
2. **Reporting**: unificar `print/send-email/send-whatsapp` con `report`/`report-batch`. (medio)
3. **Billing**: borrar `invoices` list/detail, `presentations` list, `presentation-protocols`; achicar respuesta de `close-period`. (medio)
4. **Auditoría**: borrar `history` / `cambios` / `validaciones` por recurso (cubiertos por `audit-timeline`). (medio)
5. **Varios**: borrar `apply-preauthorization`, `undo` unificación, `me/context`, `token/verify`, `tp/<id>` y `revoke-by-user`, `by-analysis/counts`, `by-protocol-with-value`, `nbu/effective-ub`. (bajo)
6. **Dashboard**: quitar `avg_result_load_time_minutes` y el alias `count` de la serie diaria. (bajo)
