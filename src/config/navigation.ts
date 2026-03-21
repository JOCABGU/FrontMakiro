import { otActionItems, otModuleMenuIds } from './otModule'

export type NavigationItem = {
  label: string
  to: string
  routePatterns: string[]
  requiredMenuIds?: number[]
  requiredAnyMenuIds?: number[]
  requiredMenuNames?: string[]
  requiredAnyMenuNames?: string[]
  adminOnly?: boolean
  showInSidebar?: boolean
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Gestion de Ordenes de Trabajo',
    to: '/ot',
    routePatterns: ['/ot'],
    requiredAnyMenuIds: otModuleMenuIds,
  },
  ...otActionItems.map((action) => ({
    label: action.label,
    to: action.to,
    routePatterns: action.routePatterns,
    requiredMenuIds: [action.requiredMenuId],
    showInSidebar: false,
  })),
  {
    label: 'Cargo Usuario No Realizado',
    to: '/cu-no-realizado',
    routePatterns: ['/cu-no-realizado', '/cu-no-realizado/nuevo', '/cu-no-realizado/:id'],
    requiredMenuIds: [54],
  },
  {
    label: 'Cuadrillas',
    to: '/supervisor/conformacion-cuadrilla',
    routePatterns: [
      '/supervisor/conformacion-cuadrilla',
      '/supervisor/conformacion-cuadrilla/ver',
      '/supervisor/conformacion-cuadrilla/crear',
      '/supervisor/conformacion-cuadrilla/editar',
    ],
    requiredAnyMenuNames: ['tsm_conformacioncuadrillas', 'tsm_listaagenda'],
    requiredAnyMenuIds: [62, 2],
  },
  {
    label: 'Pool de Privilegios',
    to: '/admin/privilegios',
    routePatterns: ['/admin/privilegios'],
    requiredAnyMenuNames: ['tsm_privilegios'],
    requiredAnyMenuIds: [3],
  },
]
