type FormulaDetermination = {
  id: number
  code?: string
  name: string
  formula?: string
}

type FormulaAnalysis = {
  code: number
}

export type FormulaResult = {
  id: number
  determination: FormulaDetermination
  analysis: FormulaAnalysis
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

const inferredCodeForIndex = (analysisCode: number, index: number): string =>
  `${analysisCode}_${String(index + 1).padStart(3, "0")}`

const buildResultCodeMap = (results: FormulaResult[]): Map<number, string> => {
  const byAnalysis = new Map<number, FormulaResult[]>()

  results.forEach((result) => {
    const list = byAnalysis.get(result.analysis.code) || []
    list.push(result)
    byAnalysis.set(result.analysis.code, list)
  })

  const resultCodes = new Map<number, string>()
  byAnalysis.forEach((analysisResults, analysisCode) => {
    analysisResults.forEach((result, index) => {
      resultCodes.set(result.id, result.determination.code || inferredCodeForIndex(analysisCode, index))
    })
  })

  return resultCodes
}

const resolveRelativeCode = (code: string, currentAnalysisCode: number): string => {
  const relativeMatch = code.match(/^cod_(\d+)$/i)
  if (!relativeMatch) return code
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
  let expression = normalizeExpression(formula)

  expression = expression.replace(/\[([^\]]+)\]/g, (_match, rawCode: string) => {
    const code = resolveRelativeCode(rawCode.trim(), result.analysis.code)
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
