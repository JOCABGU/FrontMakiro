import { otActionItems, otModuleMenuIds } from './otModule'

const OT_FULL_ACCESS_MENU_ID = 2
const otModuleAccessMenuIds = Array.from(new Set([...otModuleMenuIds, OT_FULL_ACCESS_MENU_ID]))

export type NavigationItem = {
  label: string
  to: string
  routePatterns: string[]
  requiredMenuIds?: number[]
  requiredAnyMenuIds?: number[]
  requiredMenuNames?: string[]
  requiredAnyMenuNames?: string[]
  requiredPageNames?: string[]
  requiredAnyPageNames?: string[]
  adminOnly?: boolean
  showInSidebar?: boolean
  sidebarLabelFromMenu?: boolean
}

export const navigationItems: NavigationItem[] = [
  {
    label: 'Gestion de Ordenes de Trabajo',
    to: '/ot',
    routePatterns: ['/ot'],
    requiredAnyPageNames: ['OTPrincipal'],
    requiredAnyMenuIds: otModuleAccessMenuIds,
    sidebarLabelFromMenu: true,
  },
  ...otActionItems.map((action) => ({
    label: action.label,
    to: action.to,
    routePatterns: action.routePatterns,
    requiredAnyPageNames: action.requiredAnyPageNames,
    requiredAnyMenuIds: [action.requiredMenuId, OT_FULL_ACCESS_MENU_ID],
    showInSidebar: false,
  })),
  {
    label: 'Cuadrillas',
    to: '/supervisor/conformacion-cuadrilla',
    routePatterns: [
      '/supervisor/conformacion-cuadrilla',
      '/supervisor/conformacion-cuadrilla/ver',
      '/supervisor/conformacion-cuadrilla/crear',
      '/supervisor/conformacion-cuadrilla/editar',
    ],
    requiredAnyPageNames: ['CuadrillasPrincipal'],
    requiredAnyMenuNames: ['tsm_conformacioncuadrillas'],
    requiredAnyMenuIds: [1, 62],
    sidebarLabelFromMenu: true,
  },
  {
    label: 'Pool de Privilegios',
    to: '/admin/privilegios',
    routePatterns: ['/admin/privilegios'],
    requiredAnyPageNames: ['PrivilegiosPrincipal'],
    requiredAnyMenuNames: ['tsm_privilegios'],
    requiredAnyMenuIds: [3],
    sidebarLabelFromMenu: true,
  },
  {
    label: 'Prueba',
    to: '/prueba',
    routePatterns: ['/prueba'],
    requiredAnyPageNames: ['PruebaPrincipal'],
    sidebarLabelFromMenu: true,
  },
]
