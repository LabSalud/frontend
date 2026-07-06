# Prompt para el backend — Rediseño de Facturación (2026-07)

Este documento es para pasarle directo al backend. Describe el nuevo modelo de
facturación acordado con la bioquímica y lo que hace falta implementar para
que el frontend (ya prototipado con datos mock en
`labsalud_frontend/src/components/facturacion/`) deje de simular y pase a
pegarle a endpoints reales.

Referencia de lo que existe hoy: `docs/API_BILLING.md`, `docs/SISTEMA_NBU_Y_PRICING.md`.
Este documento **reemplaza y extiende** partes de `API_BILLING.md` — donde
haya conflicto, gana lo de acá.

## 1. Por qué el cambio (contexto de negocio)

El laboratorio factura 100% con papeles físicos. Según la obra social (OOSS)
piden orden médica, preautorización y/o resumen de resultados. La bioquímica
junta esos papeles y, cuando **están completos**, marca el protocolo como
"facturado" — eso deja constancia de que entró en una presentación. **El
sistema no deja marcar como facturado si falta algún papel requerido** (ver
2.5 y 3.3) — no es solo informativo, bloquea la acción.

El laboratorio presenta a través de **2 entidades de facturación**: el
**Centro de Bioquímicos** y **la Clínica**. Cada obra social va, en un
momento dado, a **una sola entidad** (pero puede cambiar de una presentación
a otra, ej. si empieza a pagar mejor por la otra vía). Cada entidad maneja su
**propio ciclo de presentaciones**, con sus propias fechas de cierre (no
coinciden entre entidades, y tampoco son fechas fijas mes a mes).

Dentro de una presentación (que es de UNA entidad) hay protocolos de
**varias obras sociales a la vez**. Cada OOSS publica su propio valor UB
(tarde, después del cierre) y paga por separado — por eso la presentación
tiene un **desglose por OOSS** adentro: cada una con sus protocolos, su
propio valor UB una vez que se conoce, y su propio monto esperado.

**El valor UB de cada OOSS y lo cobrado (por OOSS o total) solo se cargan
una vez que la presentación está `cerrada`** — mientras está `abierta` no
tiene sentido todavía (la OOSS ni presentó el papeleo). Es editable, no de
carga única: la bioquímica puede corregir el valor UB o el monto cobrado
las veces que haga falta, en cualquier momento después del cierre.

Al cobrar: la Clínica manda un informe discriminado por OOSS (se puede cargar
el cobro por OOSS individual); el Centro deposita un monto único sin
desglose (se carga como total de la presentación completa). En ambos casos
se compara contra lo esperado para detectar sub/sobre-cobro, con un motivo
de diferencia opcional.

Como las fechas de cierre no son fijas, al cerrar una presentación se le
puede pedir al usuario la fecha del **próximo** cierre (de esa misma
entidad) — pero **no es obligatoria**: si todavía no se sabe, queda
"pendiente" y se carga después, editable en cualquier momento. El sistema
**nunca cierra una presentación solo porque se llegó a la fecha** — el
cierre siempre es una acción manual. Lo único que pasa al llegar (y pasar)
la fecha es un aviso: por WhatsApp, a la lista de números configurados,
avisando cuántos días faltan (antes de la fecha) o que ya está vencida y
hay que cerrarla (una vez por día, después de la fecha, hasta que se cierre).

## 2. Modelo de datos

### 2.1 `BillingEntity` (nuevo)

Reemplaza el concepto implícito de "una sola presentación global" por una
lista **configurable** (no hardcodear a 2, aunque hoy sean 2: Centro y
Clínica).

```
BillingEntity
  id: int
  name: str                        # "Centro de Bioquímicos", "La Clínica"
  reports_breakdown_by_ooss: bool  # true = informa cobro discriminado por OOSS (Clínica)
                                    # false = deposita monto único sin desglose (Centro)
  is_active: bool
```

Endpoints CRUD (mismo permiso que el resto de billing:
`billing.administrar_facturacion`):

- `GET /billing/entities/` → `{ results: [BillingEntity] }`
- `POST /billing/entities/` → crea
- `PATCH /billing/entities/{id}/` → edita (incluyendo `reports_breakdown_by_ooss`)
- No hace falta DELETE; alcanza con `is_active=false`.

### 2.2 `Insurance` (extender el modelo existente)

Agregar:

```
Insurance.billing_entity: FK a BillingEntity, nullable
```

Editable desde el endpoint existente de edición de obra social
(`PATCH /medicale/insurances/{id}/`), agregando `billing_entity_id` al body
aceptado y a la respuesta. Nullable porque puede haber OOSS sin asignar
todavía (o particulares, que no facturan).

**Importante:** este campo es la única fuente de verdad de "a qué entidad va
esta OOSS *ahora*". Si cambia, afecta solo a partir de ese momento (no hay
que migrar presentaciones viejas).

### 2.3 `Presentation` (extender el modelo existente)

Hoy es global. Pasa a ser **por entidad**. Agregar:

```
Presentation.entity: FK a BillingEntity, NOT NULL
Presentation.target_close_date: date, nullable   # fecha de cierre objetivo (la definida por el usuario al cerrar la anterior)
Presentation.collected_amount: decimal, nullable  # SOLO para entidades con reports_breakdown_by_ooss=false (depósito único)
Presentation.collected_at: datetime, nullable
Presentation.difference_reason: str, nullable, blank  # motivo opcional de la diferencia esperado/cobrado
Presentation.reminder_sent_at: datetime, nullable  # para no duplicar el WhatsApp de recordatorio
```

**Regla de negocio clave:** por cada `entity`, solo puede existir **una**
`Presentation` con `status="abierta"` a la vez. Al facturar un protocolo, se
resuelve la entidad vía `protocol.insurance.billing_entity` y se busca/crea
la presentación abierta de esa entidad (igual que hoy, pero scopeado por
entidad en vez de global).

**Migración de datos:** las presentaciones existentes no tienen entidad.
Definir con la bioquímica a qué `BillingEntity` asignar el historial actual
(probablemente todas a una sola por default, o pedirle que lo revise
manualmente presentación por presentación si son pocas).

### 2.4 Desglose por OOSS dentro de una presentación

Hoy el desglose (`expected_by_ooss`) se calcula al vuelo agregando
`Invoice` por `insurance`. Esto sigue funcionando igual — no hace falta una
tabla nueva, solo agregar por OOSS los `Invoice` activos de esa
`Presentation`. Lo que cambia es que ahora, además de `expected_amount`
(ya existe), cada fila del desglose necesita poder cargar:

```
collected_amount: decimal, nullable   # SOLO si entity.reports_breakdown_by_ooss=true
```

Esto puede vivir como campo agregado/derivado (ej. sumando un nuevo campo
`amount_collected` en `Invoice`, repartido proporcionalmente o cargado
directo) — la decisión de implementación queda a criterio del backend;
lo que necesita el frontend es que `expected_by_ooss[].collected_amount`
aparezca en las respuestas una vez cargado.

### 2.5 Checklist de papeles — BLOQUEA marcar como facturado

Ya existen y alcanzan (no hace falta ningún campo nuevo):

- `Protocol.trajo_orden`: `"no_trajo" | "incompleta" | "completa"`
- `Protocol.preauth_status`: `"not_required" | "no_trajo" | "incompleta" | "completa"`
- `Insurance.requires_preauthorization`: bool (si es `false`, la
  preautorización no aplica al checklist)
- `Protocol.is_printed`: bool (proxy de "resumen de resultados generado")

**Regla de negocio (corregida respecto a una versión anterior de este
documento): el checklist SÍ bloquea.** `POST
/billing/invoices/create-for-protocol/{protocol_id}/` debe validar, antes
de crear la factura:

1. `trajo_orden == "completa"`
2. `preauth_status == "completa"` **O** `insurance.requires_preauthorization == false`
3. `is_printed == true`

Si falta alguno: **400**, `{"detail": "Faltan papeles para facturar este protocolo (orden/preautorización/resumen)."}`
— idealmente detallando cuál específicamente falta, para que el frontend
lo muestre.

Además, `GET /billing/invoices/protocols-to-bill/` (ver 3.2) debe incluir
estos 4 campos en cada protocolo de la respuesta — hoy no los expone —
para que el frontend arme el checklist visual y deshabilite el botón antes
de intentar la request.

### 2.6 `ReminderPhoneNumber` (nuevo)

```
ReminderPhoneNumber
  id: int
  label: str          # "Bioquímica", "Secretaría", etc.
  phone: str          # formato E.164 o como lo use el envío de WhatsApp existente
  is_active: bool
```

### 2.7 Configuración global de recordatorio (nuevo)

Un solo valor, compartido por todas las entidades:

```
reminder_days_before: int   # default sugerido: 7
```

Puede ser una tabla de 1 fila, un modelo tipo "singleton config", o lo que
ya use el proyecto para configuración global (revisar si existe algo así
para no duplicar patrones).

## 3. Endpoints

### 3.1 Entidades (nuevo, ver 2.1)

Ya descripto arriba.

### 3.2 Protocolos a facturar — EXTENDER

`GET /billing/invoices/protocols-to-bill/?entity_id={id}`

Cambios respecto al endpoint actual:
- **Nuevo query param `entity_id`** (requerido): solo protocolos cuya
  `insurance.billing_entity_id == entity_id`.
- Agregar a cada item de `results[]`: `trajo_orden`, `preauth_status`,
  `insurance.requires_preauthorization`, `is_printed` (ver 2.5).

### 3.3 Marcar protocolo como facturado — MISMO CONTRATO, VALIDACIÓN NUEVA

`POST /billing/invoices/create-for-protocol/{protocol_id}/`

Comportamiento nuevo (mismo request/response que hoy):
- **Valida el checklist de papeles primero** (ver 2.5). Si falta algo: 400.
- Resuelve `entity = protocol.insurance.billing_entity`.
- Si `entity` es `null`: **400**, `{"detail": "La obra social de este protocolo no tiene entidad de facturación asignada. Configurala en Obras Sociales."}`.
- Busca la `Presentation` con `status="abierta"` de esa `entity`. Si no
  existe, la crea (`target_close_date=null` — queda "pendiente", ver 3.6/3.7).

### 3.4 Facturados / total actual — EXTENDER con `entity_id`

`GET /billing/invoices/facturados/?entity_id={id}&current=true|false`
`GET /billing/invoices/current-total/?entity_id={id}`

Mismo shape de respuesta que hoy, agregando el filtro `entity_id`
(requerido).

### 3.5 Setear valor UB de una OOSS — SIN CAMBIOS DE CONTRATO, restricción de flujo

`POST /billing/presentations/{id}/set-ub-value-for-insurance/` sigue igual
(ya está scopeado por `presentation_id`, y la presentación ahora pertenece a
una entidad — no cambia el contrato).

**Restricción nueva:** el frontend solo muestra esta acción para
presentaciones con `status != "abierta"` (no tiene sentido cargar el valor
UB antes de presentar el papeleo). El backend puede permitirlo en
cualquier estado — no hace falta agregar una validación dura — pero si se
quiere reforzar, devolver 400 si `status="abierta"` con
`{"detail": "La presentación todavía está abierta; cerrala antes de cargar el valor UB."}`.
Es editable **las veces que haga falta**, no de carga única (cada llamada
pisa el valor anterior, igual que hoy).

### 3.6 Cerrar presentación — CAMBIA EL CONTRATO (fecha ahora opcional)

`POST /billing/presentations/close-period/`

**Nuevo body:**
```
{
    "entity_id": int,               // NUEVO, requerido
    "next_close_date": str | null,  // NUEVO, OPCIONAL — puede omitirse o venir null
    "name": str,                    // opcional (igual que hoy)
    "date_to": str,                 // opcional (igual que hoy)
    "notes": str                    // opcional (igual que hoy)
}
```

**Comportamiento nuevo:**
1. Cierra la presentación `abierta` de `entity_id` (misma regla de
   elegibilidad que hoy: debe tener al menos una factura activa).
2. Crea automáticamente la próxima `Presentation` de esa misma entidad, en
   estado `abierta`, con `target_close_date = next_close_date` (puede ser
   `null` — queda "pendiente"; se carga después con 3.7, no es obligatorio
   en el momento del cierre).
3. Resetea `reminder_sent_at` (para que el recordatorio se pueda disparar
   de nuevo en el próximo ciclo).
4. **El cierre es siempre una acción manual** disparada por este endpoint;
   el sistema nunca cierra una presentación automáticamente por haber
   llegado (o pasado) la `target_close_date` — ver 3.11.

### 3.7 Setear/editar fecha de cierre objetivo — vía principal para cargarla o cambiarla

`PATCH /billing/presentations/{id}/`

Body: `{ "target_close_date": "YYYY-MM-DD" }`. Solo permitido si
`status="abierta"`. Esta es la forma normal de definir la fecha cuando
quedó "pendiente" al cerrar (3.6), y también de **corregirla en cualquier
momento** si la OOSS avisa que se corrió (el frontend expone esto como un
lápiz editable junto a la fecha, siempre visible, no solo al crear la
presentación).

### 3.8 Cargar cobro — NUEVO (dos variantes)

Igual que el valor UB (3.5): el frontend solo lo muestra para
presentaciones `!= "abierta"`, y es **editable las veces que haga falta**
(no de carga única) — cada llamada pisa el valor y el motivo anteriores.

**Por OOSS individual** (entidades con `reports_breakdown_by_ooss=true`,
ej. la Clínica):

`POST /billing/presentations/{id}/set-collected-for-insurance/`
```
{ "insurance_id": int, "collected_amount": "12345.67", "difference_reason": str (opcional) }
```
Guarda el cobro de esa OOSS dentro de esa presentación. Response: el
desglose actualizado de esa fila (`expected_amount`, `collected_amount`,
`difference_amount`).

**Total de la presentación** (entidades con `reports_breakdown_by_ooss=false`,
ej. el Centro — depósito único sin desglose):

`POST /billing/presentations/{id}/set-collected-total/`
```
{ "collected_amount": "12345.67", "difference_reason": str (opcional) }
```
Setea `Presentation.collected_amount`, `collected_at=now()`, y cambia
`status` a `"cobrada"`. Calcula la diferencia contra la suma de
`expected_amount` de todo el desglose por OOSS.

### 3.9 Historial — EXTENDER con `entity_id`

`GET /billing/presentations/closed/?entity_id={id}`

Mismo shape que hoy (`docs/API_BILLING.md`), agregando:
- Filtro `entity_id` (requerido).
- En cada presentación: `collected_amount`, `collected_at`,
  `difference_amount`, `balance_state`, `difference_reason`,
  `target_close_date`, y en cada fila de `expected_by_ooss[]`:
  `collected_amount`, `difference_amount`.

### 3.10 Recordatorios — NUEVO

```
GET    /billing/reminders/phones/                # lista
POST   /billing/reminders/phones/                 # { label, phone }
PATCH  /billing/reminders/phones/{id}/            # { label?, phone?, is_active? }
DELETE /billing/reminders/phones/{id}/

GET    /billing/reminders/config/                 # { days_before: int }
PATCH  /billing/reminders/config/                 # { days_before: int }
```

Mismo permiso `billing.administrar_facturacion`.

### 3.11 Tarea programada de recordatorio — NUEVO (infra backend)

**El sistema nunca cierra una presentación sola.** Esta tarea solo avisa;
cerrar sigue siendo 100% manual (3.6).

Job diario (cron / celery beat, lo que ya use el proyecto para tareas
programadas), por cada `Presentation` con `status="abierta"` y
`target_close_date` no nulo:

`days_remaining = (target_close_date - hoy).days`

**Caso A — todavía no llegó la fecha** (`days_remaining >= 0`):
- Si `days_remaining <= reminder_days_before` y `reminder_sent_at` es
  `null` (avisar una sola vez al entrar en la ventana, no todos los días):
  - Mandar WhatsApp a todos los `ReminderPhoneNumber` con `is_active=true`,
    reusando la infraestructura de envío de WhatsApp que ya existe para
    los reportes (`send-whatsapp` de protocolos).
  - Mensaje sugerido: *"📋 Recordatorio Labsalud: faltan {days_remaining}
    días para el cierre de la presentación de {entity.name}
    ({presentation.period_start} al {presentation.target_close_date})."*
  - Setear `reminder_sent_at = now()`.

**Caso B — la fecha ya pasó y sigue `abierta`** (`days_remaining < 0`):
- **Mandar el aviso todos los días** (a diferencia del caso A, acá SÍ se
  repite diariamente — no hay `reminder_sent_at` que lo frene, es
  intencional: se quiere insistir hasta que se cierre).
  - Mensaje sugerido: *"⚠️ Labsalud: la presentación de {entity.name}
    ({presentation.period_start} al {presentation.target_close_date}) está
    vencida hace {abs(days_remaining)} día(s). Recordá cerrarla."*

Al cerrar una presentación y crear la siguiente (3.6), la siguiente arranca
con `reminder_sent_at=null` y su propio `target_close_date` (o `null` si
quedó pendiente, en cuyo caso esta tarea no tiene fecha para calcular nada
hasta que se cargue con 3.7).

### 3.12 Pestaña "Gráficos" — NUEVO (requerido para v1, no opcional)

Nueva pestaña del frontend: gráfico de lo ganado **por presentación** en el
tiempo (para la entidad seleccionada). Al elegir una presentación del
gráfico, se ve el desglose por OOSS (igual que en Historial, solo lectura
acá) y, **aparte**, cuánto se cobró a **particulares** en ese mismo
período — el particular no se factura a ninguna entidad (Centro/Clínica);
ocasionalmente se factura a ARCA si el paciente pide comprobante (flujo ya
existente en el detalle del protocolo, `arca-billing`, no cambia).

`GET /billing/analytics/presentations-summary/?entity_id={id}&limit={n}`

```
{
    "results": [
        {
            "id": int,
            "label": str,
            "period_start": str,
            "period_end": str,
            "expected_amount": str,
            "collected_amount": str | null,
            "difference_amount": str | null,
            "balance_state": "equilibrada" | "sobrecobro" | "subcobro" | null,
            "particular_amount": str,   // NUEVO: cobrado a particulares en [period_start, period_end], sin relación con esta entidad
            "expected_by_ooss": [       // NUEVO: para el detalle al elegir la presentación
                {
                    "insurance_id": int,
                    "insurance_name": str,
                    "protocol_count": int,
                    "total_ub": str,
                    "expected_amount": str | null,
                    "collected_amount": str | null
                }
            ]
        }
    ]
}
```

`particular_amount` se calcula igual que el `particular` de
`/billing/analytics/daily/` (`Protocol.value_paid` de protocolos no
cancelados + `UnplannedTransaction kind=payment`), pero sumado sobre todo
el rango `[period_start, period_end]` de la presentación en vez de un solo
día.

El endpoint de serie diaria particular-vs-OOSS (`/billing/analytics/daily/`)
sigue funcionando igual, sin cambios.

## 4. Resumen de permisos

Todo lo nuevo usa el mismo permiso que ya protege `billing`:
`billing.administrar_facturacion`. Si se quiere restringir la
configuración de entidades/recordatorios a un rol más alto, avisar — hoy no
hay ese matiz.

## 5. Checklist para el backend

- [ ] Modelo `BillingEntity` + CRUD
- [ ] `Insurance.billing_entity` (FK nullable) + exponerlo en el
      endpoint de edición de obra social existente
- [ ] `Presentation.entity` (FK, backfill de datos existentes a coordinar)
- [ ] `Presentation.target_close_date` (nullable, editable en cualquier
      momento), `collected_amount`, `collected_at`, `difference_reason`,
      `reminder_sent_at`
- [ ] Campo de cobro por OOSS dentro del desglose (`collected_amount` en
      `expected_by_ooss[]`, ver 2.4)
- [ ] **`create-for-protocol`: validar checklist de papeles y devolver 400
      si falta alguno** (trajo_orden / preauth si aplica / is_printed — ver
      2.5 y 3.3, bloquea de verdad, no es solo informativo)
- [ ] `protocols-to-bill` y `facturados`/`current-total`: agregar filtro
      `entity_id` + exponer `trajo_orden`/`preauth_status`/
      `requires_preauthorization`/`is_printed`
- [ ] `close-period`: nuevo contrato con `entity_id` + `next_close_date`
      **OPCIONAL** (puede quedar `null`/pendiente; crea la próxima
      presentación automáticamente igual)
- [ ] `PATCH /billing/presentations/{id}/` para `target_close_date` — vía
      principal para cargarla la primera vez o corregirla después, no solo
      al cerrar
- [ ] `set-ub-value-for-insurance`, `set-collected-for-insurance` y
      `set-collected-total`: **editables en cualquier momento post-cierre**
      (no de carga única); frontend los restringe a presentaciones
      `!= "abierta"`
- [ ] `closed/`: filtro `entity_id` + campos de cobro/diferencia
- [ ] `ReminderPhoneNumber` + CRUD + config de `days_before`
- [ ] Job programado: aviso pre-cierre (una vez, ventana de
      `days_before`) **+ aviso diario post-vencimiento** hasta que se
      cierre — nunca auto-cierra (ver 3.11)
- [ ] `analytics/presentations-summary` (ya no opcional): agregar
      `particular_amount` y `expected_by_ooss[]` por presentación, para la
      pestaña "Gráficos" (ver 3.12)

## 6. Referencia: prototipo de frontend ya construido

`labsalud_frontend/src/components/facturacion/` tiene el prototipo
funcional con datos mock (`mock-data.ts` + `use-facturacion-mock.ts`)
que ya modela exactamente estas formas de datos. Cuando estos endpoints
existan, se reemplaza el hook mock por uno que hace fetch real — las
interfaces TypeScript de `mock-data.ts` son el contrato esperado.
