# Endpoint: cola de resultados — `GET /results/results/queue/`

## Por qué uno nuevo
`protocols-with-loaded-results` filtra a los protocolos que **ya tienen al menos un valor cargado** (`exclude(value="")`). Eso **deja afuera los protocolos en Pend. carga sin ningún valor todavía** — justo los que más hay que cargar. La cola necesita **todos** los protocolos de los estados elegidos, con el progreso (0/N incluido).

## Contrato

### Request
`GET /results/results/queue/`
- `status` (CSV) — estados a incluir. Default `1,2` (Pend. carga + Pend. validación).
- `search` — id | paciente (nombre/apellido/dni).
- `ordering` — `id | -id | created_at | -created_at | status__name | patient__last_name` (default `-created_at`).
- `limit` / `offset` — paginación (InfiniteScrollPagination).

### Response (paginada)
~~~json
{
  "next": "…",
  "results": [
    {
      "id": 4827,
      "patient": { "id": 8, "dni": "27481305", "first_name": "María", "last_name": "Fernández", "is_anonymous": false },
      "insurance": { "id": 3, "name": "APROSS" },
      "status": { "id": 1, "name": "Pendiente de carga" },
      "loaded_results_count": 0,
      "total_analyses_count": 6,
      "validated_results_count": 0,
      "created_at": "2026-06-20T08:12:00Z"
    }
  ]
}
~~~
El front (ResultsQueueTable) usa: `id`, `patient`, `insurance.name`, `status`, y los 3 contadores para la barra de progreso.

## Implementación sugerida (acción en `ResultViewSet`)

~~~python
@action(detail=False, methods=["get"], url_path="queue")
def queue(self, request):
    from django.db.models import Count, IntegerField, OuterRef, Q, Subquery
    from django.db.models.functions import Coalesce
    from laboratory.protocols.models import Protocol, ProtocolDetail

    total_sq = (ProtocolDetail.objects
        .filter(protocol=OuterRef("pk"), is_active=True)
        .values("protocol").annotate(c=Count("id")).values("c"))
    loaded_sq = (Result.objects
        .filter(protocol_detail__protocol=OuterRef("pk"), is_active=True)
        .exclude(value__isnull=True).exclude(value="")
        .values("protocol_detail__protocol").annotate(c=Count("id")).values("c"))
    validated_sq = (Result.objects
        .filter(protocol_detail__protocol=OuterRef("pk"), is_active=True, is_valid=True)
        .values("protocol_detail__protocol").annotate(c=Count("id")).values("c"))

    qs = (Protocol.objects.filter(is_active=True)
        .select_related("patient", "insurance", "status")
        .annotate(
            total_analyses_count=Coalesce(Subquery(total_sq, output_field=IntegerField()), 0),
            loaded_results_count=Coalesce(Subquery(loaded_sq, output_field=IntegerField()), 0),
            validated_results_count=Coalesce(Subquery(validated_sq, output_field=IntegerField()), 0),
        ))

    def csv_ints(raw):
        return [int(x) for x in (raw or "").split(",") if x.strip().isdigit()]
    status_in = csv_ints(request.query_params.get("status")) or [1, 2]
    qs = qs.filter(status_id__in=status_in)

    search = (request.query_params.get("search") or "").strip()
    if search:
        q = (Q(patient__first_name__icontains=search)
             | Q(patient__last_name__icontains=search)
             | Q(patient__dni__icontains=search))
        if search.isdigit():
            q |= Q(id=int(search))
        qs = qs.filter(q)

    ordering = request.query_params.get("ordering") or "-created_at"
    allowed = {"id", "-id", "created_at", "-created_at",
               "status__name", "-status__name",
               "patient__last_name", "-patient__last_name"}
    qs = qs.order_by(ordering if ordering in allowed else "-created_at")

    page = self.paginate_queryset(qs)
    return self.get_paginated_response(ResultsQueueSerializer(page, many=True).data)
~~~

### Serializer slim (recomendado, evita el peso de `ProtocolListSerializer`)
~~~python
class ResultsQueueSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()
    insurance = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    # vienen del annotate del queryset:
    loaded_results_count = serializers.IntegerField(read_only=True)
    total_analyses_count = serializers.IntegerField(read_only=True)
    validated_results_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Protocol
        fields = ["id", "patient", "insurance", "status",
                  "loaded_results_count", "total_analyses_count",
                  "validated_results_count", "created_at"]

    def get_patient(self, o):
        p = o.patient
        return p and {"id": p.id, "dni": p.dni, "first_name": p.first_name,
                      "last_name": p.last_name, "is_anonymous": p.is_anonymous}
    def get_insurance(self, o):
        i = o.insurance
        return i and {"id": i.id, "name": i.name}
    def get_status(self, o):
        s = o.status
        return s and {"id": s.id, "name": s.name}
~~~

**Clave vs. el endpoint actual:** no se filtra por "tiene resultados cargados" — se filtra sólo por estado, así aparecen también los protocolos nuevos (progreso `0/N`). El serializer slim trae sólo lo que la tabla usa (nada de breakdown de pago/auditoría/unplanned).
