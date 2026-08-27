/**
 * Fórmulas de determinaciones calculadas.
 *
 * EL CÓDIGO VIENE DE LA BASE, NO DE LA POSICIÓN
 * =============================================
 * Una fórmula referencia a sus componentes por código: `([660475_003] * 10) /
 * [660475_001]`. Ese código lo genera el backend al crear la determinación y no
 * cambia nunca — ni al arrastrarla a otro lugar, ni al dar de baja a una
 * hermana.
 *
 * Hasta ahora el endpoint de resultados no mandaba `determination.code`, así
 * que acá se deducía de la POSICIÓN en la lista. Mientras nadie tocara el
 * análisis coincidía; apenas se reordenaba o se daba de baja una determinación,
 * las de abajo se corrían un lugar y pasaban a responder por el código de la
 * vecina. La fórmula seguía calculando —sin error, sin aviso— con el valor
 * equivocado.
 *
 * `inferredCodeForIndex` quedó SOLO como red para un backend viejo (las PC de
 * contingencia corren el suyo y pueden estar atrasadas). Si el código viene,
 * manda el código.
 */

type FormulaDetermination = {
  id: number
  code?: string
  name: string
  formula?: string
}

type FormulaAnalysis = {
  code: string
}

export type FormulaResult = {
  id: number
  determination: FormulaDetermination
  analysis: FormulaAnalysis
  /** Con esto encendido la fórmula no vuelve a pisar el valor. */
  carga_manual?: boolean
}

export type FormulaValue = {
  value: string
  notes: string
}

export type FormulaCalculation = {
  value: string
  missingCodes: string[]
}

const toFormulaNumber = (value?: string): number | null => {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim().replace(",", ".")
  if (!normalized) return null
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

const formatFormulaNumber = (value: number): string => {
  if (!Number.isFinite(value)) return ""
  return value.toFixed(4)
}

const normalizeExpression = (formula: string): string => {
  const expression = formula.includes("=") ? formula.slice(formula.indexOf("=") + 1) : formula

  return expression
    .replace(/[×·]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/,/g, ".")
    .replace(/\^/g, "**")
}

const inferredCodeForIndex = (analysisCode: string, index: number): string =>
  `${analysisCode}_${String(index + 1).padStart(3, "0")}`

const buildResultCodeMap = (results: FormulaResult[]): Map<number, string> => {
  const byAnalysis = new Map<string, FormulaResult[]>()

  results.forEach((result) => {
    const list = byAnalysis.get(result.analysis.code) || []
    list.push(result)
    byAnalysis.set(result.analysis.code, list)
  })

  const resultCodes = new Map<number, string>()
  byAnalysis.forEach((analysisResults, analysisCode) => {
    analysisResults.forEach((result, index) => {
      // El código real primero. La posición solo si no vino ninguno.
      resultCodes.set(result.id, result.determination.code || inferredCodeForIndex(analysisCode, index))
    })
  })

  return resultCodes
}

/**
 * Los códigos del análisis indexados por su número: `1 → "660475_001"`.
 *
 * Es lo que hace que `[cod_1]` encuentre a su determinación sin depender de
 * cómo esté escrito el código. Los 1519 que ya están cargados usan tres
 * dígitos, pero las que se crearon desde la app quedaron con dos
 * (`660475_07`), y rellenar a mano hasta tres no las encontraba nunca.
 */
const buildCodesByNumber = (
  results: FormulaResult[],
  analysisCode: string,
): Map<number, string> => {
  const porNumero = new Map<number, string>()

  results.forEach((result) => {
    if (result.analysis.code !== analysisCode) return
    const code = result.determination.code
    if (!code) return
    const sufijo = code.split("_").pop()
    if (!sufijo || !/^\d+$/.test(sufijo)) return
    porNumero.set(Number(sufijo), code)
  })

  return porNumero
}

const resolveRelativeCode = (
  code: string,
  currentAnalysisCode: string,
  codesByNumber: Map<number, string>,
): string => {
  const relativeMatch = code.match(/^cod_(\d+)$/i)
  if (!relativeMatch) return code

  const real = codesByNumber.get(Number(relativeMatch[1]))
  if (real) return real

  // Sin código real a la vista (backend viejo): se arma como se armaba antes.
  return `${currentAnalysisCode}_${relativeMatch[1].padStart(3, "0")}`
}

const evaluateExpression = (expression: string): number | null => {
  if (!/^[\d+\-*/().\s*]+$/.test(expression)) return null

  try {
    const result = Function(`"use strict"; return (${expression})`)()
    return typeof result === "number" && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

export const calculateFormulaValue = (
  result: FormulaResult,
  allResults: FormulaResult[],
  values: Record<number, FormulaValue>,
): FormulaCalculation | null => {
  const formula = result.determination.formula?.trim()
  if (!formula) return null

  const codeByResult = buildResultCodeMap(allResults)
  const resultIdByCode = new Map<string, number>()
  codeByResult.forEach((code, resultId) => {
    resultIdByCode.set(code, resultId)
  })

  const missingCodes: string[] = []
  const codesByNumber = buildCodesByNumber(allResults, result.analysis.code)
  let expression = normalizeExpression(formula)

  expression = expression.replace(/\[([^\]]+)\]/g, (_match, rawCode: string) => {
    const code = resolveRelativeCode(rawCode.trim(), result.analysis.code, codesByNumber)
    const dependencyId = resultIdByCode.get(code)
    const dependencyValue = dependencyId ? toFormulaNumber(values[dependencyId]?.value) : null

    if (dependencyValue === null) {
      missingCodes.push(code)
      return "NaN"
    }

    return String(dependencyValue)
  })

  if (missingCodes.length > 0) {
    return { value: "", missingCodes }
  }

  const calculated = evaluateExpression(expression)
  if (calculated === null) return null

  return { value: formatFormulaNumber(calculated), missingCodes: [] }
}

export const applyFormulaCalculations = <T extends FormulaResult>(
  results: T[],
  values: Record<number, FormulaValue>,
): Record<number, FormulaValue> => {
  let nextValues = values

  for (let pass = 0; pass < results.length; pass += 1) {
    let changed = false

    results.forEach((result) => {
      // Puesta a mano: el valor es de quien lo escribió, no del cálculo. Sigue
      // sirviendo como componente de OTRAS fórmulas —está en `nextValues`—,
      // que es lo que se quiere cuando una fórmula quedó mal y el resto no.
      if (result.carga_manual) return

      const calculation = calculateFormulaValue(result, results, nextValues)
      if (!calculation || calculation.missingCodes.length > 0) return

      const current = nextValues[result.id] || { value: "", notes: "" }
      if (current.value === calculation.value) return

      nextValues = {
        ...nextValues,
        [result.id]: {
          ...current,
          value: calculation.value,
        },
      }
      changed = true
    })

    if (!changed) break
  }

  return nextValues
}


export type FormulaGuardable = FormulaResult & {
  /** Lo que hay guardado en el servidor. */
  value?: string
  is_valid?: boolean
  is_wrong?: boolean
}

/**
 * Cuáles de las fórmulas ya calculadas hay que mandar al servidor.
 *
 * QUÉ RESUELVE
 * ============
 * Una determinación con fórmula muestra su valor apenas están los
 * componentes, pero ese valor vivía solo en la pantalla: alguien tenía que ir
 * a la fila y apretar Enter. Son dos o tres por hemograma, todas con el número
 * ya a la vista, y si nadie las apretaba el resultado quedaba sin cargar de
 * verdad — no se podía validar ni salía en el informe.
 *
 * QUÉ NO SE MANDA
 * ===============
 * - Lo que está en carga a mano: la fórmula quedó de lado a propósito.
 * - Lo ya validado: se invalida primero y recién ahí se toca.
 * - Lo que todavía no calculó nada.
 * - Con `soloVacias`, lo que ya tiene un valor guardado. Es el modo de cuando
 *   se abre el protocolo: completa lo que falta y no pisa lo que alguien
 *   decidió.
 */
export function formulasParaGuardar<T extends FormulaGuardable>(
  resultados: T[],
  valores: Record<number, FormulaValue>,
  { soloVacias = false }: { soloVacias?: boolean } = {},
): T[] {
  return resultados.filter((resultado) => {
    if (!resultado.determination.formula?.trim()) return false
    if (resultado.carga_manual) return false
    if (resultado.is_valid && !resultado.is_wrong) return false

    const calculado = valores[resultado.id]?.value ?? ""
    if (!calculado) return false

    const guardado = resultado.value ?? ""
    if (soloVacias && guardado !== "") return false
    return calculado !== guardado
  })
}
