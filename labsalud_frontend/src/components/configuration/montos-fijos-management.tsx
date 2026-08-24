"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, Settings2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { CATALOG_ENDPOINTS } from "@/config/api"
import { useApi } from "@/hooks/use-api"
import { olvidarPreciosFijos } from "@/hooks/use-precios-fijos"
import { useToast } from "@/hooks/use-toast"
import { formatApiError, getErrorMessage } from "@/lib/api-error"
import type { PricingConfig } from "@/types"
import { PropagarPreciosDialog } from "./components/propagar-precios-dialog"

/**
 * Los montos que valen para todo el sistema, en su propia pestaña.
 *
 * POR QUÉ NO ESTÁN MÁS ARRIBA DE LOS ANÁLISIS
 * ===========================================
 * Estaban ahí porque son "precios" y los análisis también. Pero no son lo
 * mismo: un análisis es una práctica del catálogo y esto es plata que se cobra
 * aparte de las prácticas —el material descartable, la derivación, el mínimo
 * del particular—. Vivían como un formulario colgado arriba de la tabla, y para
 * cambiar un número había que entrar a la pantalla de los análisis, que es una
 * lista larga con su propio buscador.
 *
 * Además es una tabla sola, un singleton: no se busca ni se pagina. Poner cada
 * cosa donde se la va a buscar es lo que hace que la configuración se pueda
 * recorrer sin saber de antemano dónde quedó guardada.
 */

const VACIO = {
  material_descartable_amount: "",
  derivacion_amount: "",
  particular_minimum_amount: "",
  redondeo_maximo: "",
  precios_fijos_habilitados: false,
}

/** Los montos como los deja el backend, con los defaults de cada campo. */
const desdeLaConfig = (data: PricingConfig) => ({
  material_descartable_amount: data.material_descartable_amount || "0.00",
  derivacion_amount: data.derivacion_amount || "0.00",
  particular_minimum_amount: data.particular_minimum_amount || "0.00",
  redondeo_maximo: data.redondeo_maximo || "0.00",
  precios_fijos_habilitados: Boolean(data.precios_fijos_habilitados),
})

export function MontosFijosManagement() {
  const { apiRequest } = useApi()
  const toastActions = useToast()

  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [pricingForm, setPricingForm] = useState(VACIO)
  const [loadingPricing, setLoadingPricing] = useState(false)
  const [savingPricing, setSavingPricing] = useState(false)
  // El material descartable y la derivación quedan CONGELADOS en cada
  // protocolo al crearlo, así que cambiarlos acá no alcanza a los que ya
  // existen. Sin este aviso, los de hoy se quedaban con el monto viejo y nadie
  // se enteraba hasta cuadrar la caja.
  const [propagarMontos, setPropagarMontos] = useState(false)

  const fetchPricingConfig = useCallback(async () => {
    try {
      setLoadingPricing(true)
      const response = await apiRequest(CATALOG_ENDPOINTS.PRICING_CONFIG)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudo cargar la configuración de precios."))
      }
      const data: PricingConfig = await response.json()
      setPricingConfig(data)
      setPricingForm(desdeLaConfig(data))
    } catch (err) {
      toastActions.error("Error", {
        description: getErrorMessage(err, "No se pudieron cargar los montos extra."),
      })
    } finally {
      setLoadingPricing(false)
    }
  }, [apiRequest, toastActions])

  useEffect(() => {
    fetchPricingConfig()
  }, [fetchPricingConfig])

  const handleSavePricing = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      setSavingPricing(true)
      const response = await apiRequest(CATALOG_ENDPOINTS.PRICING_CONFIG, {
        method: "PATCH",
        body: {
          material_descartable_amount: pricingForm.material_descartable_amount || "0.00",
          derivacion_amount: pricingForm.derivacion_amount || "0.00",
          particular_minimum_amount: pricingForm.particular_minimum_amount || "0.00",
          redondeo_maximo: pricingForm.redondeo_maximo || "0.00",
          precios_fijos_habilitados: pricingForm.precios_fijos_habilitados,
        },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(formatApiError(data, "No se pudieron guardar los montos."))
      }
      const data: PricingConfig = await response.json()
      setPricingConfig(data)
      setPricingForm(desdeLaConfig(data))
      // Las pantallas de análisis leen el interruptor de una caché de módulo.
      // Sin esto, prenderlo acá no aparecía hasta recargar la página.
      olvidarPreciosFijos()
      toastActions.success("Éxito", { description: "Montos extra actualizados correctamente." })
      setPropagarMontos(true)
    } catch (err) {
      toastActions.error("Error", {
        description: getErrorMessage(err, "No se pudieron guardar los montos."),
      })
    } finally {
      setSavingPricing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start gap-2">
          <Settings2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#204983]" />
          <div>
            <h4 className="text-sm font-semibold text-gray-800">Montos fijos</h4>
            <p className="text-xs text-gray-500">
              Valen para todo el sistema y se aplican a cada protocolo que entre
              de acá en adelante. El descuento por análisis grande no está acá:
              es de cada obra social y se configura en la suya.
            </p>
          </div>
        </div>
        {loadingPricing && !pricingConfig ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-16 rounded" />
            <Skeleton className="h-16 rounded" />
            <Skeleton className="h-16 rounded" />
            <Skeleton className="h-16 rounded" />
          </div>
        ) : (
          <form onSubmit={handleSavePricing} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label htmlFor="montos-material-descartable" className="text-sm font-medium text-gray-700">
                  Material descartable
                </label>
                <Input
                  id="montos-material-descartable"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingForm.material_descartable_amount}
                  onChange={(event) =>
                    setPricingForm((prev) => ({ ...prev, material_descartable_amount: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="montos-derivacion-amount" className="text-sm font-medium text-gray-700">
                  Derivación
                </label>
                <Input
                  id="montos-derivacion-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingForm.derivacion_amount}
                  onChange={(event) => setPricingForm((prev) => ({ ...prev, derivacion_amount: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="montos-minimo-particular" className="text-sm font-medium text-gray-700">
                  Mínimo particular
                </label>
                <Input
                  id="montos-minimo-particular"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingForm.particular_minimum_amount}
                  onChange={(event) =>
                    setPricingForm((prev) => ({ ...prev, particular_minimum_amount: event.target.value }))
                  }
                />
                <p className="text-xs text-gray-500">
                  Piso del total que paga un paciente particular. En 0 no se aplica.
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="montos-redondeo" className="text-sm font-medium text-gray-700">
                  Tope de redondeo
                </label>
                <Input
                  id="montos-redondeo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricingForm.redondeo_maximo}
                  onChange={(event) =>
                    setPricingForm((prev) => ({ ...prev, redondeo_maximo: event.target.value }))
                  }
                />
                <p className="text-xs text-gray-500">
                  Si el paciente paga de más hasta este monto, se toma como redondeo
                  y el saldo queda en cero. Pasado el tope se avisa que hay que
                  devolver. En 0 no se redondea nunca.
                </p>
              </div>
            </div>

            {/*
              Va aparte de los montos porque no es un monto: es un interruptor
              que cambia CÓMO se cobra. Y va acá y no en la pantalla de
              análisis porque es una decisión del laboratorio entera, no de una
              práctica — desde la ficha de un análisis no se ve que prenderlo
              habilita la función para todas.
            */}
            <div className="flex items-start justify-between gap-4 rounded-md border border-gray-200 bg-gray-50 p-3">
              <div className="space-y-0.5">
                <label
                  htmlFor="montos-precios-fijos"
                  className="text-sm font-medium text-gray-700"
                >
                  Cobrar análisis a precio fijo
                </label>
                <p className="text-xs text-gray-500">
                  Permite que ciertos análisis se cobren a un precio cargado en
                  vez de calcularlos por UB. El precio se pone en cada análisis,
                  y solo cambia lo que paga el paciente: lo que se le presenta a
                  la obra social sigue saliendo del nomenclador. Apagado, todo
                  se cobra por UB aunque tengan precio cargado.
                </p>
              </div>
              <Switch
                id="montos-precios-fijos"
                checked={pricingForm.precios_fijos_habilitados}
                onCheckedChange={(checked) =>
                  setPricingForm((prev) => ({ ...prev, precios_fijos_habilitados: checked }))
                }
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="w-full bg-[#204983] hover:bg-[#1a3d6f] sm:w-auto"
                disabled={savingPricing}
              >
                {savingPricing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
            </div>
          </form>
        )}
      </div>

      <PropagarPreciosDialog
        open={propagarMontos}
        onOpenChange={setPropagarMontos}
        titulo="Protocolos con los montos viejos"
      />
    </div>
  )
}
