"use client"

import { Building, Edit, Stethoscope } from "lucide-react"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card"
import type { Doctor, Insurance } from "../../../types"

interface DoctorInfoProps {
  doctor: Doctor
  onEdit: () => void
}

interface InsuranceInfoProps {
  insurance: Insurance
  onEdit: () => void
}

export function DoctorInfo({ doctor, onEdit }: DoctorInfoProps) {
  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex flex-col gap-2 text-[#204983] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-base sm:text-lg">Médico</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="w-full border-[#204983] bg-transparent text-xs text-[#204983] hover:bg-[#204983] hover:text-white sm:w-auto sm:text-sm"
          >
            <Edit className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            Editar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-6">
        <div className="border-b pb-3 text-center">
          <h3 className="text-lg font-bold text-gray-900">
            {doctor.first_name} {doctor.last_name}
          </h3>
          <Badge variant="outline" className="mt-2 font-mono">
            Matrícula {doctor.license}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function InsuranceInfo({ insurance, onEdit }: InsuranceInfoProps) {
  const flags = [
    insurance.charges_coseguro ? "Coseguro" : null,
    insurance.charges_material_descartable ? "Material descartable" : null,
    insurance.charges_derivacion ? "Derivación" : null,
    insurance.requires_preauthorization ? "Preautorización" : null,
  ].filter(Boolean)

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex flex-col gap-2 text-[#204983] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-base sm:text-lg">Obra social</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="w-full border-[#204983] bg-transparent text-xs text-[#204983] hover:bg-[#204983] hover:text-white sm:w-auto sm:text-sm"
          >
            <Edit className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
            Editar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-6">
        <div className="border-b pb-3 text-center">
          <h3 className="text-lg font-bold text-gray-900">{insurance.name}</h3>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Badge variant="outline">UB O.S. ${insurance.ub_value}</Badge>
            <Badge variant="outline">UB particular ${insurance.private_ub_value}</Badge>
          </div>
        </div>

        {insurance.description && <p className="text-sm text-gray-600">{insurance.description}</p>}

        <div className="flex flex-wrap gap-2">
          {flags.length > 0 ? (
            flags.map((flag) => (
              <Badge key={flag} className="bg-blue-50 text-[#204983] hover:bg-blue-100">
                {flag}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-gray-500">Sin cobros ni requisitos adicionales configurados.</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
