"use client"

import type { ReactNode } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"

/**
 * Una lista que se reordena arrastrando.
 *
 * POR QUÉ CON LIBRERÍA Y NO CON EL DRAG NATIVO DEL NAVEGADOR
 * ==========================================================
 * El arrastre nativo de HTML no funciona con el dedo: en una tablet no pasa
 * nada. El sistema se usa en el mostrador, así que eso lo descarta solo.
 *
 * Con `@dnd-kit` funciona con mouse, con el dedo y con el teclado (Tab hasta
 * la manija, espacio, flechas). Lo del teclado no es un extra: quien carga
 * protocolos todo el día no suelta el teclado para agarrar el mouse.
 *
 * EL ARRASTRE ES SOLO POR LA MANIJA
 * =================================
 * Si toda la fila fuera arrastrable, tocar un botón de adentro —quitar,
 * autorizar— empezaría a arrastrar en vez de apretar. Con la manija aparte,
 * cada gesto hace una sola cosa.
 */

type Props<T> = {
  items: T[]
  /** Id estable de cada fila. Si cambia entre renders, el arrastre se corta. */
  getId: (item: T) => number | string
  onReorder: (items: T[]) => void
  children: (item: T, manija: ReactNode) => ReactNode
  disabled?: boolean
  /**
   * Qué elemento envuelve cada fila. `tr` para las tablas: un `div` adentro de
   * un `tbody` es HTML inválido y el navegador lo saca de la tabla, así que la
   * fila se dibuja fuera de lugar.
   */
  as?: "div" | "tr"
}

export function ListaOrdenable<T>({
  items,
  getId,
  onReorder,
  children,
  disabled = false,
  as = "div",
}: Props<T>) {
  const sensores = useSensors(
    // Un umbral de 6px: sin esto, un clic con el pulso tembloroso cuenta como
    // arrastre y la fila se mueve sola cuando alguien quiso apretar.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // En el dedo el umbral es tiempo, no distancia: al scrollear la lista, el
    // dedo pasa por encima de las filas y no tiene que arrastrar ninguna.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const ids = items.map(getId)

  const alSoltar = (evento: DragEndEvent) => {
    const { active, over } = evento
    if (!over || active.id === over.id) return

    const desde = ids.indexOf(active.id as number | string)
    const hasta = ids.indexOf(over.id as number | string)
    if (desde < 0 || hasta < 0) return

    onReorder(arrayMove(items, desde, hasta))
  }

  if (disabled) {
    return <>{items.map((item) => children(item, null))}</>
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={alSoltar}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <FilaOrdenable key={getId(item)} id={getId(item)} as={as}>
            {(manija) => children(item, manija)}
          </FilaOrdenable>
        ))}
      </SortableContext>
    </DndContext>
  )
}

function FilaOrdenable({
  id,
  children,
  as = "div",
}: {
  id: number | string
  children: (manija: ReactNode) => ReactNode
  as?: "div" | "tr"
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const manija = (
    <button
      type="button"
      className="cursor-grab touch-none rounded p-1 text-gray-400 transition hover:bg-gray-100
                 hover:text-gray-600 active:cursor-grabbing"
      aria-label="Arrastrar para reordenar"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  )

  const Envoltorio = as as "div"

  return (
    <Envoltorio
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        // Mientras se arrastra queda por encima: si no, pasa por debajo de las
        // filas siguientes y no se ve dónde va a caer.
        zIndex: isDragging ? 20 : undefined,
        position: isDragging ? "relative" : undefined,
        opacity: isDragging ? 0.9 : undefined,
      }}
    >
      {children(manija)}
    </Envoltorio>
  )
}
