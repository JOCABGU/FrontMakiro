export type OtActionItem = {
  key: string
  label: string
  description: string
  buttonLabel: string
  to: string
  routePatterns: string[]
  requiredMenuId: number
}

export const otActionItems: OtActionItem[] = [
  {
    key: 'pendientes',
    label: 'Ordenes pendientes',
    description: 'Consulta el listado diario de OT pendientes y su detalle.',
    buttonLabel: 'Ver pendientes',
    to: '/ot/lista',
    routePatterns: ['/ot/lista', '/ot/:id'],
    requiredMenuId: 1,
  },
  {
    key: 'crear',
    label: 'Crear OT',
    description: 'Registra una nueva orden de trabajo.',
    buttonLabel: 'Nueva OT',
    to: '/ot/crear',
    routePatterns: ['/ot/crear'],
    requiredMenuId: 1,
  },
  {
    key: 'realizada',
    label: 'Registrar OT realizada',
    description: 'Actualiza una OT como realizada con estado y observacion.',
    buttonLabel: 'Registrar OT',
    to: '/ot/realizada',
    routePatterns: ['/ot/realizada'],
    requiredMenuId: 1,
  },
  {
    key: 'modificar',
    label: 'Modificar OT',
    description: 'Edita observacion, estado y numero de la orden.',
    buttonLabel: 'Modificar OT',
    to: '/ot/modificar',
    routePatterns: ['/ot/modificar'],
    requiredMenuId: 1,
  },
  {
    key: 'modificar-fecha',
    label: 'Modificar fecha OT',
    description: 'Reagenda una OT validando ruta y usuario.',
    buttonLabel: 'Modificar fecha',
    to: '/ot/modificar-fecha',
    routePatterns: ['/ot/modificar-fecha'],
    requiredMenuId: 1,
  },
  {
    key: 'anular',
    label: 'Anular OT',
    description: 'Anula ordenes de trabajo segun modo seleccionado.',
    buttonLabel: 'Anular OT',
    to: '/ot/anular',
    routePatterns: ['/ot/anular'],
    requiredMenuId: 1,
  },
]

export const otModuleMenuIds = otActionItems.map((item) => item.requiredMenuId)
