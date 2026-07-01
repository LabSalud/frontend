# Plan: rediseño de UI — Lista + Página de detalle

> Estado: **plan aprobado para evaluación**, sin código aún.
> Decisiones del usuario: **escritorio primero** (tabla densa, menos cards), **los 4 cross-links**, modales **caso por caso**, y **modularizar** los archivos que se toquen.

## 1. Objetivo

Pasar del patrón actual **lista de tarjetas grandes + modales/acordeones** a **lista compacta (tabla densa) + una página dedicada por objeto**, con **links reales entre objetos**. Menos cards (se perciben "engorrosas"), URLs compartibles, back button, y acciones más rápidas con menos requests.

## 2. Estado actual (frontend)

| Sección | Ruta | Detalle hoy | Tamaño |
|---|---|---|---|
| Protocolos | `/protocolos` | `protocol-card.tsx` + 11 diálogos | **1316** líneas la card |
| Pacientes | `/pacientes` | `patient-card.tsx` + 6 diálogos | **611** |
| Resultados | `/resultados` | 2 acordeones | **~1188** c/u |
| Validación | `/validacion` | `validation-protocol-card.tsx` | **685** |

Una sola ruta por sección, react-query + scroll infinito, detalle embebido en cards gigantes y modales.

## 3. Arquitectura de rutas (nueva)

```
/protocolos                 → tabla
/protocolos/:id             → detalle del protocolo
/pacientes                  → tabla
/pacientes/:id              → ficha + sus protocolos
/resultados                 → cola de carga (tabla)
/resultados/:protocolId     → carga de resultados de ese protocolo
/validacion                 → cola de pendientes (tabla)
/validacion/:protocolId     → validación de ese protocolo
```

Cambiar el patrón `<Route index>` por rutas anidadas con `<Outlet>` bajo `Layout`. Cada detalle se lazy-loadea (code-split).

## 4. Cross-links (los 4)

| Desde | Hacia | Ubicación |
|---|---|---|
| Protocolo | Paciente | header del detalle → `/pacientes/:id` |
| Protocolo | Resultados / Validación | botones de acción → `/resultados/:id`, `/validacion/:id` |
| Paciente | sus Protocolos | sección en la ficha → `/protocolos/:id` |
| Resultado / Validación | Protocolo | breadcrumb "Ver protocolo" → `/protocolos/:id` |

---

## 5. CAMBIOS DE BACKEND (lo crítico para que cada página muestre bien y las acciones sean rápidas)

### 5.1 Performance del listado de protocolos — ALTA prioridad
`ProtocolListSerializer` se llama "liviano" pero **no lo es** (`laboratory/protocols/serializers.py:118`):

- **`get_protocol_payment_info(obj)` se invoca ~8 veces por fila** (balance, private_amount_due, patient_paid, amount_to_return, analyses_amount_due, coseguro, material_descartable, derivacion, extras) y **no está memoizado** (`services.py:418`, sin `lru_cache`). → recomputa todo el pago 8× por protocolo, ×N filas.
  - **Fix:** memoizar el resultado por instancia/request (cachear en `obj._payment_info` o `functools.lru_cache` con clave por pk+version). Un solo cálculo por fila.
- **`get_unplanned_transactions` consulta `obj.unplanned_transactions` por fila** y **no está en el `prefetch_related`** del queryset (`views/protocol.py:116`). → N+1.
  - **Fix:** agregar el `Prefetch("unplanned_transactions", ...)` al queryset, o **quitar `unplanned_transactions` del serializer de LISTA** (no se muestra en una tabla densa; va en el detalle).
- **`get_missing_info` y `get_preauth_status`** llaman servicios por fila (pueden tocar DB).
  - **Fix:** dejar solo lo que la tabla realmente muestra; mover el resto al detalle.
- **`AuditMixinSerializer`** agrega `creation`/`last_change` por fila → peso extra inútil en tabla.
  - **Fix:** versión de lista sin auditoría.

**Resultado esperado:** un `ProtocolRowSerializer` mínimo (id, patient {id,dni,nombre}, status, balance, payment_status, billing_status, is_printed, trajo_orden, preauth_status, created_at, flags arca). El resto del payload pesado solo en `retrieve`.

### 5.2 Ordenamiento por columna (tabla de escritorio)
Hoy `ordering_fields = ["id", "created_at"]` (`views/protocol.py:104`). Para tabla ordenable:
- Ampliar a `patient__last_name`, `patient__dni`, `status__name`, `payment_status__name`, `created_at`.
- `balance` es **calculado** → para ordenar por saldo hay que **anotarlo en el queryset** (`annotate`) o aceptar que esa columna no ordena por DB.

### 5.3 Cross-link Paciente → sus protocolos
`ProtocolFilterSet` **no tiene filtro por paciente** (`views/protocol.py:46`).
- **Fix mínimo:** agregar `patient = df.BaseInFilter(field_name='patient_id', lookup_expr='in')`. Habilita `GET /protocols/protocols/?patient=<id>` para la ficha del paciente. Evita endpoint nuevo.
- Opcional: endpoint dedicado `/patients/:id/protocols/` con serializer slim si se quiere paginar/agregar contadores aparte.

### 5.4 Completitud del detalle (evitar waterfalls = "sin quilombo")
`retrieve` ya devuelve `ProtocolSerializer` completo con `select_related`/`prefetch` (`views/protocol.py:107`). Verificar que la página de detalle se arme con **1 sola request** (protocolo + paciente + doctor + obra social + details + unplanned + breakdown de pago). Hoy está casi todo; confirmar que no falte nada que obligue a un segundo fetch.

### 5.5 Ficha del paciente
- Agregar al detalle del paciente (o a un endpoint summary) **contador de protocolos** y **último protocolo**, para la cabecera de la ficha sin pedir la lista completa.
- **Verificar DNI en búsqueda:** `PatientViewSet.search_fields = ['first_name','last_name','email','phone_mobile']` (`patient_management/views.py:35`) **no incluye `dni`**, pero la UI dice "Buscar por DNI o nombre". Confirmar dónde se resuelve la búsqueda por DNI (¿filterset?) y, si falta, agregarlo.

### 5.6 Resultados / Validación
- Las colas ya salen de `PROTOCOL_ENDPOINTS.PROTOCOLS` con `exclude_status`, y el detalle por protocolo usa `results/by-protocol/{id}` (`laboratory/results/views.py:204`) → **ya existe**, no requiere backend nuevo para el detalle.
- Para la **cola como tabla**, reusar el `ProtocolRowSerializer` slim (5.1) filtrando por estado.

### 5.7 Resumen de tareas backend
1. Memoizar `get_protocol_payment_info` (perf). **[crítico]**
2. Prefetch o quitar `unplanned_transactions`/audit/missing_info/preauth del serializer de lista. **[crítico]**
3. Nuevo `ProtocolRowSerializer` mínimo para `list`. **[alto]**
4. Ampliar `ordering_fields` + annotate `balance`. **[alto]**
5. Filtro `patient` en `ProtocolFilterSet`. **[alto]**
6. Contadores en ficha de paciente. **[medio]**
7. Verificar/añadir DNI en búsqueda de pacientes. **[verificar]**

---

## 6. Modularización (al tocar cada archivo)

Regla: ningún archivo nuevo > ~300 líneas; un componente = una responsabilidad.

### Frontend
- **`protocol-card.tsx` (1316)** → se elimina como "card". Reemplazo:
  - `ProtocolRow.tsx` (~80) — fila de tabla.
  - `protocolos/:id` compuesto por piezas que **ya existen**: `protocol-header`, `protocol-details-section`, `protocol-actions`. Extraer sub-bloques (pago, ARCA, análisis) a componentes propios.
- **Acordeones de resultados (~1188 c/u)** → partir en: `ResultsQueueTable` (lista), `ResultsLoadPage` (`/resultados/:id`), y `analysis-input` (ya existe) como unidad de carga.
- **`validation-protocol-card.tsx` (685)** → `ValidationRow` + `ValidationDetailPage` reusando secciones.
- **`create-patient-dialog.tsx` (745)** / **`edit-patient-dialog.tsx` (571)** → extraer el form a `PatientForm` compartido (crear/editar usan el mismo).
- **`report-dialog.tsx` (936)** → evaluar pasarlo a sub-ruta/panel y partir en sub-componentes (firma, opciones de envío, preview).
- **Infra nueva compartida:** `DataTable` denso reusable (sticky header, sort, fila clickeable, menú de acciones), `useListState` (filtros + scroll restoration), layout de detalle (breadcrumb + header + secciones + barra de acciones).

### Backend
- `ProtocolListSerializer` con 13 `SerializerMethodField` de pago → colapsar a **un** método que lee el `payment_info` memoizado.
- Separar `ProtocolRowSerializer` (lista) de `ProtocolSerializer` (detalle) para que cada uno tenga una responsabilidad clara.

---

## 7. Fases (incrementales, reversibles)

- **Fase 0 — Infra:** `DataTable`, `useListState` + scroll restoration, layout de detalle. Backend: memoización de pago + `ProtocolRowSerializer` + ordering + filtro `patient`.
- **Fase 1 — Protocolos** (piloto, el más complejo): tabla + `/protocolos/:id`. Decidir aquí modal-vs-página caso por caso.
- **Fase 2 — Pacientes:** tabla + ficha con "sus protocolos".
- **Fase 3 — Resultados** y **Fase 4 — Validación:** colas + páginas de carga/validación.

## 8. Rendimiento esperado

- Lista: de cards de 600–1300 líneas por ítem → filas livianas + serializer de lista realmente liviano. Gran mejora en scroll, memoria y tiempo de respuesta del endpoint.
- Carga inicial: lógica de detalle/reportes fuera del bundle de la lista (lazy por ruta).
- Navegación lista↔detalle: instantánea desde cache de react-query.
- Riesgo a manejar: restauración de scroll/filtros al volver (Fase 0).
