# Backend — cambios para la UI lista + detalle

Listado de cambios por endpoint para soportar **tabla densa + página por objeto + cross-links**.
Cada ítem trae: estado actual, qué necesita la UI nueva, y **opciones** (con recomendación).

Convención de prioridad: 🔴 crítico (perf/bloqueante) · 🟡 alto · 🟢 nice-to-have.

---

## Decisión transversal: ¿cómo servir "lista liviana" sin romper la UI actual?

El `ProtocolListSerializer` hoy manda ~35 campos por fila. La tabla nueva necesita ~10. Tres formas de resolverlo:

- **Opción 1 — Serializer slim nuevo + flag de vista.** `?view=table` (o header) → `get_serializer_class` devuelve `ProtocolRowSerializer` mínimo; sin flag, el actual. **No rompe nada**, migrás cuando quieras.
- **Opción 2 — Sparse fieldsets.** `?fields=id,patient,status,balance,...` y el serializer recorta. Flexible y reutilizable en todos los listados, pero hay que implementar el mixin de `fields`.
- **Opción 3 — Reemplazar el serializer de lista** por el slim. Lo más simple, pero **rompe la card actual** hasta migrar el front.

**Recomendado:** Opción 2 (sparse fieldsets) si querés algo reusable en todos los listados; Opción 1 si preferís lo más rápido y acotado. Evitar la 3 hasta migrar el front.

---

## A. Listado de protocolos — `GET /protocols/protocols/`

Archivos: `laboratory/protocols/views/protocol.py`, `laboratory/protocols/serializers.py`

### A1 🔴 Performance del cálculo de pago (N×9 → N×1)
`ProtocolListSerializer` llama `get_protocol_payment_info(obj)` en **9 getters distintos** (`balance`, `private_amount_due`, `patient_paid`, `amount_to_return`, `analyses_amount_due`, `coseguro_amount`, `material_descartable_amount`, `derivacion_amount`, `extras_total`) → recalcula 9× por fila, y cada cálculo hace 2 queries (details + unplanned).
- **Opción A (recomendada):** memoizar como ya hace `ProtocolSerializer._get_payment_info` (cachea en `self.context` por pk). Copiar ese método al list serializer y reemplazar los 9 `get_protocol_payment_info(obj)` por `self._get_payment_info(obj)`. Cero cambio de contrato.
- **Opción B:** mover el cálculo a `to_representation` (1 llamada, arma todos los campos de una).
- **Opción C:** `@lru_cache`/cache por request a nivel de `services.get_protocol_payment_info`. Más global pero ojo con datos frescos en flujos de escritura.

### A2 🔴 N+1 de `unplanned_transactions` en la lista
`get_unplanned_transactions` hace `obj.unplanned_transactions.filter(...)` por fila y **no está en el `prefetch_related`** del queryset.
- **Opción A (recomendada):** quitar `unplanned_transactions` del serializer de **lista** (en una tabla no se muestran; van en el detalle).
- **Opción B:** agregar `Prefetch("unplanned_transactions", UnplannedTransaction.objects.filter(is_active=True).order_by("-created_at"))` al queryset y cambiar el getter a `.all()` sobre el prefetch.

### A3 🟡 Orden por columna
Hoy: `ordering_fields = ["id", "created_at"]`.
- **Cambio:** ampliar a `["id","created_at","patient__last_name","patient__first_name","patient__dni","status__name","payment_status__name","billing_status__name"]`. DRF ya entiende `?ordering=campo` / `?ordering=-campo`.

### A4 🟡 Ordenar por saldo (`balance`)
`balance` es calculado → no se puede ordenar por DB.
- **Opción A:** anotar el saldo en el queryset (`annotate(...)`) y agregarlo a `ordering_fields`. Requiere expresar el cálculo en ORM (no trivial por los snapshots).
- **Opción B (recomendada por ahora):** no ofrecer orden por saldo en la tabla; ordenar por fecha/paciente/estado, que cubren el 90%.

### A5 🟡 Serializer slim para la tabla
Campos que la tabla realmente usa: `id`, `patient {id,dni,first_name,last_name,age}`, `status {id,name}`, `balance`, `payment_status`, `billing_status`, `is_printed`, `trajo_orden`, `preauth_status`, `missing_info`, `created_at`, y flags ARCA si se muestran.
- Implementar `ProtocolRowSerializer` y enchufarlo según la **decisión transversal** (Opción 1/2). Sin `unplanned_transactions`, sin breakdown completo de pago, sin auditoría por fila.

### A6 🟢 Quitar auditoría del listado
`ProtocolListSerializer` hereda `AuditMixinSerializer` → agrega `creation`/`last_change` por fila. La tabla no los muestra.
- **Cambio:** que el row serializer NO herede el mixin de auditoría.

---

## B. Detalle de protocolo — `GET /protocols/protocols/{id}/`

`ProtocolSerializer` ya es completo (paciente, doctor, OOSS, details, pago, ARCA, unplanned) y memoiza el pago. **Listo para la página de detalle, sin cambios obligatorios.**

### B1 🟢 Evitar requests extra en el header del detalle (anti-waterfall)
La página querrá mostrar progreso de resultados y/o un resumen de auditoría en la cabecera. Hoy eso son llamadas aparte (`audit-timeline`, `results/by-protocol`).
- **Opción A:** agregar al detalle `results_summary: { loaded, total }` (cantidad de determinaciones cargadas/total) para el badge de progreso sin segundo fetch.
- **Opción B:** dejarlo como llamadas separadas en el detalle (lazy, no bloquean el render principal). Aceptable.

### B2 🟢 Cross-links
El detalle ya trae `patient.id`, `doctor.id`, `insurance.id` → los links a `/pacientes/:id` salen directo. Nada que cambiar.

---

## C. Listado de pacientes — `GET /patients/patients/`

Archivos: `patient_management/views.py`, `patient_management/serializers.py`

### C1 🔴 Búsqueda por DNI
`search_fields = ['first_name','last_name','email','phone_mobile']` **no incluye `dni`**, pero la UI dice "Buscar por DNI o nombre".
- **Verificar** si el front resuelve DNI por otro lado; si no, **agregar `'dni'`** a `search_fields`.

### C2 🟡 Serializer slim para la tabla
`PatientSerializer` hereda auditoría y trae dirección completa, observaciones, etc. La tabla muestra: `dni`, `full_name`/nombre, `age`, `sex`, `phone_mobile`, `email`, `city`.
- Mismo criterio que A5: `PatientRowSerializer` mínimo (decisión transversal Opción 1/2).

### C3 🟢 Orden por columna
`ordering_fields = ['id','first_name','last_name','dni','birth_date']` ya alcanza para la tabla. Sin cambios.

---

## D. Ficha de paciente — `GET /patients/patients/{id}/` + sus protocolos

### D1 🟡 Sección "sus protocolos" (cross-link Paciente → Protocolos)
No hay forma hoy de pedir los protocolos de un paciente.
- **Opción A (recomendada, mínima):** filtro `patient` en `ProtocolFilterSet`:
  `patient = df.BaseInFilter(field_name='patient_id', lookup_expr='in')` → `GET /protocols/protocols/?patient=<id>`. Reutiliza paginación/orden del listado.
- **Opción B:** endpoint dedicado `GET /patients/{id}/protocols/` con un serializer slim propio (útil si querés contadores/agregados específicos de la ficha).

### D2 🟢 Cabecera de la ficha con contadores
Para mostrar "N protocolos · último: fecha" sin pedir la lista entera.
- **Opción A:** agregar al detalle del paciente `protocols_count` y `last_protocol_at` (annotate).
- **Opción B:** que el front lea `count` de `…/protocols/?patient=<id>&limit=1`. Sin backend nuevo.

---

## E. Cola de resultados — `GET /results/results/protocols-with-loaded-results/`

Ya existe y filtra por estado (default `status_id__in=[1,2]`), con select_related.
### E1 🟡 Progreso por protocolo en la tabla
La cola como tabla quiere mostrar "cargados / total".
- **Verificar** si el endpoint ya devuelve esos counts; si no, agregarlos al payload (`loaded_results_count`, `total_analyses_count` — ya existen en `ProtocolSummary` del front, confirmar que el endpoint los manda).

---

## F. Detalle de carga de resultados — `GET /results/results/by-protocol/{id}/`

Existe y devuelve los `Result[]` del protocolo. **Sirve para `/resultados/:id` sin cambios.**
### F1 🟢 Header del detalle sin fetch extra
`by-protocol` devuelve solo results. La página querrá nombre del paciente + estado del protocolo arriba.
- **Opción A:** envolver la respuesta con `{ protocol: {id, patient, status}, results: [...] }`.
- **Opción B:** el front pide el protocolo por separado (`/protocols/protocols/{id}/`) — ya está cacheado por react-query si venís de la lista. Aceptable.

---

## G. Cola y detalle de validación

La validación reusa `protocols-with-loaded-results` (estados 1 y 2) para la cola y `by-protocol/{id}` para el detalle. **Mismos cambios que E y F**, nada adicional.

---

## Resumen accionable (orden sugerido)

| # | Cambio | Prioridad | Rompe contrato |
|---|---|---|---|
| A1 | Memoizar pago en `ProtocolListSerializer` | 🔴 | No |
| A2 | Sacar/prefetch `unplanned_transactions` de la lista | 🔴 | Sí (sacar) |
| C1 | `dni` en search de pacientes | 🔴 | No |
| A3 | Ampliar `ordering_fields` protocolos | 🟡 | No |
| D1 | Filtro `patient` en protocolos | 🟡 | No |
| A5/C2 | Serializers slim de tabla (vía `?view`/`?fields`) | 🟡 | No (si flag) |
| E1 | Counts de progreso en cola de resultados | 🟡 | No |
| A4 | Annotate `balance` para ordenar por saldo | 🟢 | No |
| B1/F1 | Resúmenes embebidos para evitar waterfalls | 🟢 | No |
| D2 | Contadores en ficha de paciente | 🟢 | No |
| A6 | Sacar auditoría del row serializer | 🟢 | No (si flag) |
