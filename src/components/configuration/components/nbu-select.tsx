"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNbuOptions } from "@/hooks/use-nbu-options"

const DEFAULT_NBU_VALUE = "__default_nbu__"

interface NbuSelectProps {
  id?: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  includeDefaultOption?: boolean
}

export function NbuSelect({
  id = "nbu",
  value,
  onValueChange,
  disabled,
  includeDefaultOption = true,
}: NbuSelectProps) {
  const { nbus, isLoading, error } = useNbuOptions()
  const selectedValue = value || (includeDefaultOption ? DEFAULT_NBU_VALUE : undefined)

  return (
    <Select
      value={selectedValue}
      onValueChange={(nextValue) => onValueChange(nextValue === DEFAULT_NBU_VALUE ? "" : nextValue)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={isLoading ? "Cargando nomencladores..." : "Seleccionar nomenclador"} />
      </SelectTrigger>
      <SelectContent>
        {includeDefaultOption && (
          <SelectItem value={DEFAULT_NBU_VALUE}>
            <div className="flex flex-col text-left">
              <span>NBU principal por defecto</span>
              <span className="text-xs text-muted-foreground">Usa el fallback configurado en el backend</span>
            </div>
          </SelectItem>
        )}
        {nbus.map((nbu) => (
          <SelectItem key={nbu.id} value={String(nbu.id)}>
            <div className="flex flex-col text-left">
              <span>
                {nbu.name}
                {nbu.is_default ? " (principal)" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {nbu.parent_nbu_name ? `Padre: ${nbu.parent_nbu_name}` : "Sin padre"}
                {nbu.year ? ` · ${nbu.year}` : ""}
              </span>
            </div>
          </SelectItem>
        ))}
        {error && (
          <SelectItem value="__nbu_error__" disabled>
            No se pudieron cargar los NBU
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
