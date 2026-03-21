import { useMemo } from 'react'
import type { MenuPermiso } from '../../types/permisos'

interface PrivilegiosTreeProps {
  menus: MenuPermiso[]
  selectedMenuIds: number[]
  pageAssignments: Record<number, string[]>
  disabled?: boolean
  onToggle: (idMenu: number, checked: boolean) => void
  onAssignPage: (menu: MenuPermiso) => void
}

const sortMenus = (a: MenuPermiso, b: MenuPermiso): number => {
  if (a.nivel !== b.nivel) return a.nivel - b.nivel
  return a.nombre.localeCompare(b.nombre)
}

const formatAssignedPageLabel = (path: string): string => path.replace(/^src\/pages\//, '')

const PrivilegiosTree = ({
  menus,
  selectedMenuIds,
  pageAssignments,
  disabled = false,
  onToggle,
  onAssignPage,
}: PrivilegiosTreeProps) => {
  const selectedSet = useMemo(() => new Set(selectedMenuIds), [selectedMenuIds])

  const menuById = useMemo(() => {
    return new Map(menus.map((menu) => [menu.idMenu, menu]))
  }, [menus])

  const childrenByParent = useMemo(() => {
    const map = new Map<number, MenuPermiso[]>()

    menus.forEach((menu) => {
      const hasValidParent = menuById.has(menu.padre) && menu.padre !== menu.idMenu
      const parentId = hasValidParent ? menu.padre : 0
      const siblings = map.get(parentId) ?? []
      siblings.push(menu)
      map.set(parentId, siblings)
    })

    map.forEach((value) => value.sort(sortMenus))
    return map
  }, [menuById, menus])

  const renderBranch = (parentId: number, depth: number, ancestry: Set<number>) => {
    const children = childrenByParent.get(parentId) ?? []

    return children.map((menu) => {
      const isChecked = selectedSet.has(menu.idMenu)
      const hasCycle = ancestry.has(menu.idMenu)
      const nextAncestry = new Set(ancestry)
      nextAncestry.add(menu.idMenu)
      const assignedPages = pageAssignments[menu.idMenu] ?? []

      return (
        <div key={menu.idMenu} className="space-y-2">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
              isChecked ? 'border-brand-300 bg-brand-50/60 shadow-sm' : 'border-slate-200/80 bg-white/85'
            } ${disabled ? 'opacity-70' : ''}`}
            style={{ marginLeft: depth * 16 }}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={isChecked}
              disabled={disabled}
              onChange={(event) => onToggle(menu.idMenu, event.target.checked)}
            />
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="truncate text-sm text-slate-700">{menu.nombreMostrar ?? menu.nombre}</span>
              <div className="flex items-center gap-2">
                {assignedPages.length > 0 ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                    {assignedPages.length === 1
                      ? formatAssignedPageLabel(assignedPages[0])
                      : `${assignedPages.length} paginas asignadas`}
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    Pagina pendiente
                  </span>
                )}
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-60"
                  disabled={disabled}
                  onClick={() => onAssignPage(menu)}
                >
                  Asignar pagina
                </button>
              </div>
            </div>
          </div>
          {!hasCycle ? renderBranch(menu.idMenu, depth + 1, nextAncestry) : null}
        </div>
      )
    })
  }

  if (!menus.length) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 text-sm text-slate-500">
        No hay menus para mostrar.
      </div>
    )
  }

  return <div className="space-y-2">{renderBranch(0, 0, new Set<number>())}</div>
}

export default PrivilegiosTree
