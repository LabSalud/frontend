 

# Facturación: conexión real del frontend — pedidos puntuales al backend

El frontend de Facturación ya está conectado a los endpoints reales de
`billing` (ver `backend/docs/API_BILLING.md`). Todo funciona salvo lo que
sigue, que hoy no existe en el backend.

## 1. ✅ RESUELTO — Detalle de la presentación ABIERTA

`current-total` ya devuelve `presentation` (confirmado en vivo el 2026-07-07).
Queda el texto original abajo como referencia histórica.

<details>
<summary>Pedido original (ya implementado)</summary>

Ningún endpoint devuelve `id` / `target_close_date` / `period_start` /
`reference` de la presentación **abierta** de una entidad:

- `GET /billing/invoices/current-total/?entity_id=` no serializa esos campos
  (solo agregados de facturas: `protocols_count`, `total_ub_authorized`,
  `expected_by_ooss`).
- `BillingPresentationViewSet` no tiene `list` ni `retrieve` (solo
  `partial_update` + acciones custom), así que `GET /billing/presentations/{id}/`
  no existe.
- `GET /billing/presentations/closed/` excluye explícitamente la abierta.

Sin este dato, el frontend no puede:

- Mostrar "cierra el DD/MM" o "faltan N días" / "vencida hace N días" de la
  presentación en curso.
- Editar `target_close_date` con `PATCH /billing/presentations/{id}/`, porque
  no tiene el `id`.

**Pedido**: que `current-total` devuelva también el objeto de la presentación
abierta. Como `BillingPresentationSerializer` ya existe y ya serializa
`id`, `reference`, `name`, `period_start`, `period_end`, `target_close_date`,
alcanza con:

```python
open_presentation = get_current_open_presentation(entity)
...
return Response({
    'protocols_count': ...,
    'total_ub_authorized': ...,
    'expected_by_ooss': [...],
    'presentation': BillingPresentationSerializer(open_presentation).data if open_presentation else None,
})
```

(O como alternativa equivalente: agregarlo a `GET /billing/entities/` como
`current_presentation` embebido en cada entidad — lo que sea menos trabajo del
lado del backend, cualquiera de las dos resuelve el problema.)

</details>

## 2. Recordatorios por entidad (hoy son globales)

Hoy `BillingReminderConfig` es un singleton (`GET/PATCH /billing/reminders/config/`
→ `{days_before}`), un solo valor para todas las entidades, y no hay forma de
activar/desactivar el recordatorio por entidad.

**Pedido**: agregar 2 campos directo en `BillingEntity` (mismo patrón que
`reports_breakdown_by_ooss`):

```python
reminder_enabled = models.BooleanField(default=True)
reminder_days_before = models.PositiveIntegerField(default=7)
```

Exponerlos en `BillingEntitySerializer.fields` — no hace falta ningún endpoint
nuevo, ya se editan vía `PATCH /billing/entities/{id}/` como cualquier otro
campo de la entidad. El cron `send_billing_reminders` pasa a leer estos 2
campos por entidad en vez de `BillingReminderConfig.get_solo()`. El
`BillingReminderConfig` global puede quedar como está (deprecado) o
eliminarse — como prefieran; el frontend ya no lo va a usar una vez que esto
exista. Los teléfonos (`ReminderPhoneNumber`) siguen compartidos por todas las
entidades, sin cambios ahí.

## 3. Días de cierre por defecto, por entidad

El cierre sigue siendo 100% manual (sin cantidad fija de presentaciones por
mes). Lo que se pide es solo para **sugerir** la próxima fecha de cierre al
cerrar una presentación, si no se carga una a mano.

**Pedido**: agregar en `BillingEntity`:

```python
default_close_days = models.JSONField(default=list, blank=True)  # ej. [15, 30]
```

Validación mínima: lista de enteros entre 1 y 31. Expuesto también vía
`PATCH /billing/entities/{id}/`. El frontend calcula la sugerencia
client-side (día siguiente de la lista después de hoy/`period_end`), así que
no hace falta lógica extra del lado del backend, solo persistir la lista.

## 4. [Nuevo, 2026-07-07] Facturar un protocolo puntual a OTRA entidad

Cada OOSS tiene su entidad "habitual" (`Insurance.billing_entity`, ya
implementado). Pero la bioquímica a veces necesita facturar UN protocolo
puntual a la otra entidad, sin cambiar la asignación habitual de la OOSS (que
sigue rigiendo para el resto de sus protocolos).

Hoy `POST /billing/invoices/create-for-protocol/{protocol_id}/` no acepta
ningún override: `create_invoice_for_protocol(protocol)` siempre resuelve la
entidad a partir de `protocol.insurance.billing_entity`.

**Pedido**: aceptar un `entity_id` opcional en el body:

```python
def create_for_protocol(self, request, protocol_id=None):
    ...
    entity_override_id = request.data.get('entity_id')
    entity_override = None
    if entity_override_id not in (None, ''):
        try:
            entity_override = BillingEntity.objects.get(pk=int(entity_override_id), is_active=True)
        except (TypeError, ValueError, BillingEntity.DoesNotExist):
            return Response({'detail': 'Entidad de facturación no encontrada.'}, status=status.HTTP_400_BAD_REQUEST)
    invoice = create_invoice_for_protocol(protocol, entity_override=entity_override)
```

Y que `create_invoice_for_protocol` use `entity_override` en vez de
`protocol.insurance.billing_entity` cuando se pasa, para decidir a qué
presentación abierta entra la factura. Sin este cambio, el frontend **no
puede** ofrecer el botón "Facturar a otro lado" de forma segura: si mandara
`entity_id` hoy, el backend lo ignora en silencio y factura igual a la
entidad habitual de la OOSS, sin avisar — el frontend queda sin este botón
mientras tanto (ver nota más abajo).

---

Los puntos 2-4 no bloquean el resto de la conexión real (protocolos a
facturar/facturados, cerrar presentación, cargar valor UB/cobrado, historial,
gráfico, entidades, OOSS→entidad, teléfonos de recordatorio) — todo eso ya
funciona contra los endpoints existentes de `API_BILLING.md`.
