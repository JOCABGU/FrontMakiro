import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../../components/common/Button'
import PrivilegiosTree from '../../components/privilegios/PrivilegiosTree'
import {
  applySupervisorCuadrillasPreset,
  fetchPrivilegiosRolDetalle,
  fetchRolesPrivilegios,
  updatePrivilegiosRolMenu,
} from '../../services/privilegiosApi'
import { getApiErrorMessage } from '../../services/httpClient'
import type { PrivilegiosRolDetalle, Rol } from '../../types/permisos'

type ToastState = {
  kind: 'success' | 'error'
  message: string
}

const getAssignedMenuIds = (detalle: PrivilegiosRolDetalle | null): number[] => {
  if (!detalle) return []
  return detalle.menus.filter((menu) => menu.asignado).map((menu) => menu.idMenu)
}

const PrivilegiosPage = () => {
  const queryClient = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)

  const rolesQuery = useQuery({
    queryKey: ['privilegios', 'roles'],
    queryFn: fetchRolesPrivilegios,
  })

  const roles = rolesQuery.data ?? []

  useEffect(() => {
    if (!roles.length) return
    const roleExists = roles.some((role) => role.idRol === selectedRoleId)
    if (selectedRoleId === null || !roleExists) {
      setSelectedRoleId(roles[0].idRol)
    }
  }, [roles, selectedRoleId])

  const detalleQuery = useQuery({
    queryKey: ['privilegios', 'detalle', selectedRoleId],
    queryFn: () => fetchPrivilegiosRolDetalle(selectedRoleId as number),
    enabled: selectedRoleId !== null,
  })

  useEffect(() => {
    setSelectedMenuIds(getAssignedMenuIds(detalleQuery.data ?? null))
  }, [detalleQuery.data])

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedRoleId === null) {
        throw new Error('Selecciona un rol antes de guardar.')
      }
      return updatePrivilegiosRolMenu(selectedRoleId, selectedMenuIds)
    },
    onSuccess: (updatedDetalle) => {
      queryClient.setQueryData(['privilegios', 'detalle', updatedDetalle.idRol], updatedDetalle)
      setSelectedMenuIds(getAssignedMenuIds(updatedDetalle))
      setToast({ kind: 'success', message: 'Privilegios guardados correctamente.' })
    },
    onError: (error) => {
      setToast({ kind: 'error', message: getApiErrorMessage(error, 'No fue posible guardar los privilegios.') })
    },
  })

  const presetMutation = useMutation({
    mutationFn: async () => {
      if (selectedRoleId === null) {
        throw new Error('Selecciona un rol antes de aplicar el preset.')
      }
      return applySupervisorCuadrillasPreset(selectedRoleId)
    },
    onSuccess: (updatedDetalle) => {
      queryClient.setQueryData(['privilegios', 'detalle', updatedDetalle.idRol], updatedDetalle)
      setSelectedMenuIds(getAssignedMenuIds(updatedDetalle))
      setToast({ kind: 'success', message: 'Preset Supervisor Cuadrillas aplicado.' })
    },
    onError: (error) => {
      setToast({ kind: 'error', message: getApiErrorMessage(error, 'No fue posible aplicar el preset.') })
    },
  })

  const selectedRole: Rol | undefined = useMemo(
    () => roles.find((role) => role.idRol === selectedRoleId),
    [roles, selectedRoleId]
  )

  const detalle = detalleQuery.data ?? null
  const allMenuIds = useMemo(() => detalle?.menus.map((menu) => menu.idMenu) ?? [], [detalle])
  const childrenByParent = useMemo(() => {
    const map = new Map<number, number[]>()
    if (!detalle) return map
    for (const menu of detalle.menus) {
      const siblings = map.get(menu.padre) ?? []
      siblings.push(menu.idMenu)
      map.set(menu.padre, siblings)
    }
    return map
  }, [detalle])
  const isAllSelected = allMenuIds.length > 0 && allMenuIds.every((idMenu) => selectedMenuIds.includes(idMenu))
  const roleLabel = detalle?.rol || selectedRole?.nombre || 'Sin seleccion'

  const handleToggleMenu = (idMenu: number, checked: boolean) => {
    const descendantIds: number[] = []
    const stack = [...(childrenByParent.get(idMenu) ?? [])]
    while (stack.length) {
      const current = stack.pop()
      if (current === undefined) continue
      descendantIds.push(current)
      const children = childrenByParent.get(current) ?? []
      stack.push(...children)
    }

    setSelectedMenuIds((current) => {
      const targetIds = [idMenu, ...descendantIds]
      if (checked) {
        const next = new Set(current)
        targetIds.forEach((id) => next.add(id))
        return Array.from(next)
      }
      const blocked = new Set(targetIds)
      return current.filter((item) => !blocked.has(item))
    })
  }

  const handleSelectAll = () => {
    setSelectedMenuIds(allMenuIds)
  }

  const handleClearAll = () => {
    setSelectedMenuIds([])
  }

  const isBusy = detalleQuery.isFetching || saveMutation.isPending || presetMutation.isPending

  return (
    <div className="bento-page">
      <section className="glass-panel space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="section-title">Pool de Privilegios</h1>
            <p className="text-sm text-slate-500">Rol seleccionado: {roleLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => presetMutation.mutate()}
              disabled={selectedRoleId === null || isBusy}
            >
              {presetMutation.isPending ? 'Aplicando preset...' : 'Preset Supervisor Cuadrillas'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleSelectAll} disabled={!allMenuIds.length || isBusy}>
              Seleccionar todo
            </Button>
            <Button type="button" variant="secondary" onClick={handleClearAll} disabled={!selectedMenuIds.length || isBusy}>
              Limpiar todo
            </Button>
            <Button type="button" onClick={() => saveMutation.mutate()} disabled={selectedRoleId === null || isBusy}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>

        <label className="flex max-w-sm flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-800">Rol</span>
          <select
            className="input-base"
            value={selectedRoleId ?? ''}
            onChange={(event) => setSelectedRoleId(Number(event.target.value))}
            disabled={rolesQuery.isLoading || !roles.length}
          >
            {!roles.length ? <option value="">Sin roles disponibles</option> : null}
            {roles.map((role) => (
              <option key={role.idRol} value={role.idRol}>
                {role.nombre}
              </option>
            ))}
          </select>
        </label>

        {rolesQuery.isLoading ? <div className="text-sm text-slate-500">Cargando roles...</div> : null}
        {rolesQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {getApiErrorMessage(rolesQuery.error, 'No se pudieron cargar los roles.')}
          </div>
        ) : null}

        {detalleQuery.isLoading ? <div className="text-sm text-slate-500">Cargando menus del rol...</div> : null}
        {detalleQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {getApiErrorMessage(detalleQuery.error, 'No se pudieron cargar los menus del rol.')}
          </div>
        ) : null}

        {!detalleQuery.isLoading && !detalleQuery.isError && detalle ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
              Menus marcados: {selectedMenuIds.length} / {allMenuIds.length} {isAllSelected ? '(todos seleccionados)' : ''}
            </div>
            <PrivilegiosTree
              menus={detalle.menus}
              selectedMenuIds={selectedMenuIds}
              disabled={isBusy}
              onToggle={handleToggleMenu}
            />
          </>
        ) : null}
      </section>

      {toast ? (
        <div
          className={`fixed right-4 top-4 z-[70] rounded-xl border px-4 py-3 text-sm shadow-soft ${
            toast.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}

export default PrivilegiosPage
