import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import Table from '../components/common/Table'
import type { Column } from '../components/common/Table'
import { fetchOtList } from '../api/otApi'
import type { OtSummary } from '../types/ot'
import { formatDate, todayISO } from '../utils/dates'
import { useSessionStore } from '../store/sessionStore'

type FilterMode = 'fecha' | 'rango'
type ViewMode = 'horario' | 'buscar' | 'calendario'
type SessionLike = { idUsuario?: number; nombre?: string } | null | undefined

const ROLE_SUPERVISOR_ID = 9
const ROLE_TECNICO_ID = 8
const GROUP_STYLES = [
  'bg-amber-200 text-amber-900',
  'bg-sky-200 text-sky-900',
  'bg-emerald-200 text-emerald-900',
  'bg-rose-200 text-rose-900',
  'bg-indigo-200 text-indigo-900',
]

const GROUP_ACCENT_STYLES = [
  'border-l-4 border-amber-500',
  'border-l-4 border-sky-500',
  'border-l-4 border-emerald-500',
  'border-l-4 border-rose-500',
  'border-l-4 border-indigo-500',
]

const DAY_CARD_CLASS = 'bg-white border-2 border-slate-900'

const normalizeText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const text = String(value).trim().toLowerCase()
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const readValue = (row: OtSummary, keys: string[]): unknown => {
  const record = row as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

const readString = (row: OtSummary, keys: string[]): string => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

const readNumber = (row: OtSummary, keys: string[]): number | undefined => {
  const value = readValue(row, keys)
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const getOtId = (row: OtSummary): number | undefined => {
  return readNumber(row, ['id', 'Id', 'idOt', 'Id_Ot', 'IdOt', 'idOrden', 'Id_Orden', 'IdOrden', 'idOT', 'IdOT'])
}

const getOtCodigo = (row: OtSummary): string => {
  return readString(row, ['codigo', 'OrdenTrabajo', 'ordenTrabajo', 'orden_trabajo', 'Orden', 'OT', 'ot'])
}

const getOtFecha = (row: OtSummary): string => {
  return readString(row, ['fecha', 'Fecha_Ejecucion', 'FechaEjecucion', 'fechaEjecucion', 'fecha_ejecucion', 'Fecha'])
}

const getOtCliente = (row: OtSummary): string => {
  return readString(row, ['cliente', 'Cliente', 'clienteNombre', 'ClienteNombre'])
}

const getOtTecnico = (row: OtSummary): string => {
  return readString(row, ['tecnico', 'Tecnico', 'nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario'])
}

const getOtRuta = (row: OtSummary): string => {
  return readString(row, ['ruta', 'Ruta', 'rutaNombre', 'RutaNombre'])
}

const getOtUsuarioId = (row: OtSummary): number | undefined => {
  return readNumber(row, ['idUsuario', 'Id_Usuario', 'idTecnico', 'Id_Tecnico', 'tecnicoId', 'IdTecnico', 'usuarioId', 'IdUsuario'])
}

const getOtUsuarioNombre = (row: OtSummary): string => {
  return readString(row, ['nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario', 'tecnico', 'Tecnico'])
}

const getOtEstado = (row: OtSummary): string => {
  const value = readValue(row, ['estado', 'Estado', 'Pendiente', 'pendiente', 'status', 'Status'])
  if (value === undefined || value === null) return ''
  if (typeof value === 'boolean') return value ? 'Pendiente' : 'Finalizada'
  if (typeof value === 'number') return value === 1 ? 'Pendiente' : value === 0 ? 'Finalizada' : String(value)
  return typeof value === 'string' ? value : String(value)
}

const isPendingStatus = (row: OtSummary): boolean => {
  const estado = normalizeText(getOtEstado(row))
  if (!estado) return true
  if (estado.includes('pendiente')) return true
  if (estado.includes('en proceso')) return true
  if (estado.includes('programad')) return true
  if (estado.includes('reprogramad')) return true
  if (estado.includes('asignad')) return true
  if (estado.includes('no realizado')) return true
  if (estado.includes('finaliz')) return false
  if (estado.includes('cancel')) return false
  if (estado.includes('anulad')) return false
  if (estado.includes('cerrad')) return false
  return true
}

const isAssignedToUser = (row: OtSummary, session: SessionLike): boolean => {
  const userId = getOtUsuarioId(row)
  if (userId !== undefined && session?.idUsuario !== undefined) {
    return userId === session.idUsuario
  }
  const otName = normalizeText(getOtUsuarioNombre(row))
  const sessionName = normalizeText(session?.nombre ?? '')
  if (otName && sessionName) {
    return otName === sessionName
  }
  return false
}

const extractTimeLabel = (value: string): string => {
  if (!value) return ''
  const match = value.match(/(\d{2}):(\d{2})/)
  if (!match) return ''
  return `${match[1]}:${match[2]}`
}

const getOtTime = (row: OtSummary): string => {
  const raw = readString(row, [
    'hora',
    'Hora',
    'horaEjecucion',
    'Hora_Ejecucion',
    'hora_ejecucion',
    'fecha',
    'Fecha_Ejecucion',
    'FechaEjecucion',
    'fechaEjecucion',
  ])
  return extractTimeLabel(raw)
}

const pickAccentClass = (label: string): string => {
  const normalized = normalizeText(label)
  if (!normalized) return GROUP_ACCENT_STYLES[0]
  let hash = 0
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 997
  }
  return GROUP_ACCENT_STYLES[Math.abs(hash) % GROUP_ACCENT_STYLES.length]
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

const formatISODate = (date: Date): string => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

const toISODate = (value?: string): string => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatISODate(date)
}

const mondayIndex = (date: Date): number => (date.getDay() + 6) % 7

const startOfWeek = (date: Date): Date => {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() - mondayIndex(base))
  return base
}

const endOfWeek = (date: Date): Date => {
  const base = startOfWeek(date)
  base.setDate(base.getDate() + 6)
  return base
}

const startOfMonth = (date: Date): Date => {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  base.setDate(1)
  return base
}

const endOfMonth = (date: Date): Date => {
  const base = new Date(date)
  base.setHours(0, 0, 0, 0)
  base.setMonth(base.getMonth() + 1, 0)
  return base
}

const getCalendarRange = (anchor: Date): { start: Date; end: Date; gridStart: Date; gridEnd: Date } => {
  const monthStart = startOfMonth(anchor)
  const monthEnd = endOfMonth(anchor)
  return {
    start: monthStart,
    end: monthEnd,
    gridStart: startOfWeek(monthStart),
    gridEnd: endOfWeek(monthEnd),
  }
}

const OtListPage = () => {
  const [mode, setMode] = useState<FilterMode>('fecha')
  const [fecha, setFecha] = useState(todayISO())
  const [inicio, setInicio] = useState(todayISO())
  const [fin, setFin] = useState(todayISO())
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('horario')
  const [calendarAnchor, setCalendarAnchor] = useState<Date>(() => new Date())
  const [isMobile, setIsMobile] = useState(false)
  const [dayModalOpen, setDayModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const navigate = useNavigate()
  const session = useSessionStore((state) => state.session)

  const roleId = session?.idRol
  const roleName = normalizeText(session?.rol ?? '')
  const isSupervisor = roleId === ROLE_SUPERVISOR_ID || roleName === 'supervisor'
  const isTecnico = roleId === ROLE_TECNICO_ID || roleName === 'tecnico'

  useEffect(() => {
    if (!isSupervisor && view === 'calendario') {
      setView('horario')
    }
  }, [isSupervisor, view])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 639px)')
    const handleChange = () => setIsMobile(media.matches)
    handleChange()
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  const todayKey = todayISO()
  const [horarioFecha, setHorarioFecha] = useState(todayKey)
  const horarioLabel = formatDate(horarioFecha)
  const apiRole = session?.rol?.trim() || undefined
  const apiUserId = session?.idUsuario

  const isTodaySelected = mode === 'fecha' && fecha === todayKey
  const queryKey = useMemo(
    () => ['ot-list', mode, fecha, inicio, fin, apiRole ?? '', apiUserId ?? 0],
    [apiRole, apiUserId, mode, fecha, inicio, fin]
  )

  const query = useQuery({
    queryKey,
    queryFn: () =>
      fetchOtList(
        mode === 'fecha'
          ? isTodaySelected
            ? { rol: apiRole, usuario: apiUserId, pendiente: true }
            : { fecha, rol: apiRole, usuario: apiUserId, pendiente: true }
          : {
              inicio,
              fin,
              rol: apiRole,
              usuario: apiUserId,
              pendiente: true,
            }
      ),
    enabled: isTodaySelected,
  })

  const listDataRaw = query.data ?? []
  const listData = useMemo(() => {
    let items = listDataRaw
    if (isSupervisor) {
      items = items.filter(isPendingStatus)
    } else if (isTecnico) {
      items = items.filter((row) => isPendingStatus(row) && isAssignedToUser(row, session))
    } else {
      items = items.filter(isPendingStatus)
    }
    return items
  }, [isSupervisor, isTecnico, listDataRaw, session])

  const missingTecnicoInfo = useMemo(() => {
    if (!isTecnico || listDataRaw.length === 0) return null
    const hasUserId = listDataRaw.some((row) => getOtUsuarioId(row) !== undefined)
    const hasUserName = listDataRaw.some((row) => normalizeText(getOtUsuarioNombre(row)))
    if (!hasUserId && !hasUserName) {
      return 'La respuesta de OT no incluye id o nombre del tecnico para filtrar. Se requiere SP por tecnico.'
    }
    if (!session?.idUsuario && !session?.nombre) {
      return 'Tu sesion no incluye idUsuario o nombre para filtrar.'
    }
    return null
  }, [isTecnico, listDataRaw, session])

  const columns: Column<OtSummary>[] = [
    {
      key: 'codigo',
      header: 'Codigo',
      render: (row) => getOtCodigo(row) || 'Sin codigo',
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (row) => getOtCliente(row) || 'Sin cliente',
    },
    {
      key: 'tecnico',
      header: 'Tecnico',
      render: (row) => getOtTecnico(row) || 'Sin tecnico',
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (row) => formatDate(getOtFecha(row)),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => <span className="badge">{getOtEstado(row) || 'Pendiente'}</span>,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (row) => {
        const id = getOtId(row)
        if (!id) {
          return <span className="text-xs text-slate-400">Sin ID</span>
        }
        return (
          <Button variant="secondary" onClick={() => navigate(`/ot/${id}`)} type="button">
            Ver detalle
          </Button>
        )
      },
    },
  ]

  const errorMessage =
    query.isError && query.error instanceof Error && query.error.message
      ? query.error.message
      : query.isError
        ? 'No se pudieron cargar las OT. Verifica la conexion con el backend.'
        : null

  const horarioQuery = useQuery({
    queryKey: ['ot-horario', horarioFecha, apiRole ?? '', apiUserId ?? 0],
    queryFn: () =>
      fetchOtList(
        horarioFecha === todayKey
          ? { rol: apiRole, usuario: apiUserId, pendiente: true }
          : { fecha: horarioFecha, rol: apiRole, usuario: apiUserId, pendiente: true }
      ),
  })

  const horarioDataRaw = horarioQuery.data ?? []
  const horarioData = useMemo(() => {
    let items = horarioDataRaw
    if (isSupervisor) {
      items = items.filter(isPendingStatus)
    } else if (isTecnico) {
      items = items.filter((row) => isPendingStatus(row) && isAssignedToUser(row, session))
    } else {
      items = items.filter(isPendingStatus)
    }
    return items
  }, [horarioDataRaw, isSupervisor, isTecnico, session])

  const scheduleGroups = useMemo(() => {
    const byHour = new Map<string, OtSummary[]>()
    const withoutTime: OtSummary[] = []
    horarioData.forEach((row) => {
      const time = getOtTime(row)
      if (!time) {
        withoutTime.push(row)
        return
      }
      const hourLabel = `${time.slice(0, 2)}:00`
      const items = byHour.get(hourLabel) ?? []
      items.push(row)
      byHour.set(hourLabel, items)
    })

    const hours = Array.from(byHour.keys()).sort((a, b) => a.localeCompare(b))
    const groups = hours.map((hour) => ({
      hour,
      items: [...(byHour.get(hour) ?? [])].sort((a, b) => getOtTime(a).localeCompare(getOtTime(b))),
    }))

    return { groups, withoutTime }
  }, [horarioData])

  const calendarRange = useMemo(() => getCalendarRange(calendarAnchor), [calendarAnchor])
  const calendarStart = formatISODate(calendarRange.start)
  const calendarEnd = formatISODate(calendarRange.end)

  const calendarQuery = useQuery({
    queryKey: ['ot-calendario', calendarStart, calendarEnd, apiRole ?? '', apiUserId ?? 0, isSupervisor],
    queryFn: () =>
      fetchOtList({
        inicio: calendarStart,
        fin: calendarEnd,
        rol: apiRole,
        usuario: apiUserId,
        pendiente: isSupervisor ? false : true,
      }),
    enabled: view === 'calendario' && Boolean(calendarStart && calendarEnd),
  })

  const calendarDataRaw = calendarQuery.data ?? []
  const calendarData = useMemo(() => {
    if (isSupervisor) return calendarDataRaw
    if (isTecnico) {
      return calendarDataRaw.filter((row) => isAssignedToUser(row, session))
    }
    return calendarDataRaw
  }, [calendarDataRaw, isSupervisor, isTecnico, session])

  const calendarItemsByDate = useMemo(() => {
    const map = new Map<string, OtSummary[]>()
    calendarData.forEach((row) => {
      const dateKey = toISODate(getOtFecha(row))
      if (!dateKey) return
      const items = map.get(dateKey) ?? []
      items.push(row)
      map.set(dateKey, items)
    })
    return map
  }, [calendarData])

  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return []
    return calendarItemsByDate.get(selectedDay) ?? []
  }, [calendarItemsByDate, selectedDay])

  const calendarDays = useMemo(() => {
    const days: Date[] = []
    const cursor = new Date(calendarRange.gridStart)
    while (cursor <= calendarRange.gridEnd) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    return days
  }, [calendarRange])

  const calendarLabel = useMemo(() => {
    return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(calendarAnchor)
  }, [calendarAnchor])

  const handleCalendarShift = (direction: 'prev' | 'next') => {
    setCalendarAnchor((current) => {
      const next = new Date(current)
      next.setMonth(next.getMonth() + (direction === 'next' ? 1 : -1))
      return next
    })
  }

  const handleOpenDetail = (row: OtSummary) => {
    const id = getOtId(row)
    if (!id) return
    navigate(`/ot/${id}`)
  }

  const openDayModal = (dayKey: string) => {
    setSelectedDay(dayKey)
    setDayModalOpen(true)
  }

  const handleSelectView = (next: ViewMode) => {
    setView(next)
    if (next === 'buscar') {
      setIsFilterOpen(true)
    }
  }

  const emptyLabel = isTecnico ? 'No hay OT pendientes asignadas al tecnico.' : 'No hay OT pendientes.'

  return (
    <div className="bento-page">
      <div className="bento-page-head flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Lista de OT pendientes</h2>
          <p className="text-sm text-slate-500">
            {isSupervisor ? 'Viendo todas las OT pendientes.' : isTecnico ? 'Viendo tus OT pendientes.' : 'Viendo OT pendientes.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={view === 'horario' ? 'primary' : 'secondary'} type="button" onClick={() => handleSelectView('horario')}>
          Horario
        </Button>
        <Button variant={view === 'buscar' ? 'primary' : 'secondary'} type="button" onClick={() => handleSelectView('buscar')}>
          Buscar
        </Button>
        {isSupervisor ? (
          <Button
            variant={view === 'calendario' ? 'primary' : 'secondary'}
            type="button"
            onClick={() => handleSelectView('calendario')}
          >
            Calendario
          </Button>
        ) : null}
      </div>

      {view === 'horario' ? (
        <div className="glass-panel p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="section-title">Horario</h3>
              <p className="text-xs text-slate-500">OT pendientes organizadas por hora.</p>
            </div>
            {horarioQuery.isFetching ? <span className="text-xs text-slate-500">Actualizando...</span> : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <Field label="Fecha">
              <input className="input-base" type="date" value={horarioFecha} onChange={(event) => setHorarioFecha(event.target.value)} />
            </Field>
            <div className="flex items-end">
              <Button variant="secondary" type="button" onClick={() => setHorarioFecha(todayKey)}>
                Hoy
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{horarioLabel || 'Hoy'}</span>
            <span className="text-xs text-slate-400">{horarioData.length} OT</span>
          </div>

          {horarioQuery.isError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              No se pudo cargar el horario de hoy. Intenta nuevamente.
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {scheduleGroups.groups.length === 0 && scheduleGroups.withoutTime.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                No hay OT pendientes para hoy.
              </div>
            ) : null}

            {scheduleGroups.groups.map((group, index) => (
              <div
                key={group.hour}
                className={`rounded-2xl border p-3 shadow-sm ${GROUP_STYLES[index % GROUP_STYLES.length]}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{group.hour}</span>
                  <span className="text-xs text-slate-400">{group.items.length} OT</span>
                </div>
                <div className="mt-3 space-y-2">
                  {group.items.map((row) => {
                    const id = getOtId(row)
                    const time = getOtTime(row)
                    const codigo = getOtCodigo(row) || 'OT'
                    const cliente = getOtCliente(row)
                    const ruta = getOtRuta(row)
                    const tecnico = getOtTecnico(row)
                      const grupoLabel = ruta || tecnico || codigo
                      return (
                        <button
                          key={`${group.hour}-${codigo}-${id ?? 'no-id'}`}
                          type="button"
                          onClick={() => handleOpenDetail(row)}
                          disabled={!id}
                          className={`flex w-full flex-col gap-1 rounded-xl border border-white/80 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 ${pickAccentClass(
                            grupoLabel
                          )}`}
                        >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">{codigo}</span>
                          {time ? <span className="text-[11px] text-slate-400">{time}</span> : null}
                        </div>
                        {cliente ? <span className="text-[11px] text-slate-500">{cliente}</span> : null}
                        {ruta ? <span className="text-[11px] text-slate-400">{ruta}</span> : null}
                        {tecnico ? <span className="text-[11px] text-slate-400">{tecnico}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {scheduleGroups.withoutTime.length ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Sin hora asignada</span>
                  <span className="text-xs text-slate-400">{scheduleGroups.withoutTime.length} OT</span>
                </div>
                <div className="mt-3 space-y-2">
                  {scheduleGroups.withoutTime.map((row) => {
                    const id = getOtId(row)
                    const codigo = getOtCodigo(row) || 'OT'
                    const cliente = getOtCliente(row)
                    const ruta = getOtRuta(row)
                    const tecnico = getOtTecnico(row)
                    const grupoLabel = ruta || tecnico || codigo
                    return (
                      <button
                        key={`no-time-${codigo}-${id ?? 'no-id'}`}
                        type="button"
                        onClick={() => handleOpenDetail(row)}
                        disabled={!id}
                        className={`flex w-full flex-col gap-1 rounded-xl border border-white/80 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 ${pickAccentClass(
                          grupoLabel
                        )}`}
                      >
                        <div className="font-semibold text-slate-700">{codigo}</div>
                        {cliente ? <span className="text-[11px] text-slate-500">{cliente}</span> : null}
                        {ruta ? <span className="text-[11px] text-slate-400">{ruta}</span> : null}
                        {tecnico ? <span className="text-[11px] text-slate-400">{tecnico}</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {view === 'buscar' ? (
        <div className="glass-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Resultados</h3>
              <p className="text-xs text-slate-500">Usa el boton Buscar para filtrar las OT.</p>
            </div>
            <Button type="button" onClick={() => setIsFilterOpen(true)}>
              Buscar OT
            </Button>
          </div>
          <div className="mt-4">
            {missingTecnicoInfo ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {missingTecnicoInfo}
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div>
            ) : (
              <Table columns={columns} data={listData} emptyLabel={emptyLabel} />
            )}
          </div>
        </div>
      ) : null}

      {view === 'calendario' ? (
        <div className="glass-panel bg-slate-50/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title">Calendario</h3>
              <p className="text-xs text-slate-500">Todas las OT del mes.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" type="button" onClick={() => handleCalendarShift('prev')}>
                Anterior
              </Button>
              <Button variant="secondary" type="button" onClick={() => setCalendarAnchor(new Date())}>
                Hoy
              </Button>
              <Button variant="secondary" type="button" onClick={() => handleCalendarShift('next')}>
                Siguiente
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">{calendarLabel}</span>
            {calendarQuery.isFetching ? <span className="text-xs text-slate-500">Actualizando...</span> : null}
          </div>

          {calendarQuery.isError ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              No se pudo cargar el calendario. Intenta nuevamente.
            </div>
          ) : null}

          <div className="mt-4">
            <div className="hidden sm:grid sm:grid-cols-7 sm:gap-2 sm:text-xs sm:font-semibold sm:uppercase sm:text-slate-400">
              {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((label) => (
                <div key={label} className="px-2 py-1 text-center">
                  {label}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-7 sm:gap-2">
              {calendarDays.map((day) => {
                const dayKey = formatISODate(day)
                const dayItems = calendarItemsByDate.get(dayKey) ?? []
                const isToday = dayKey === todayISO()
                const isCurrentMonth = day.getMonth() === calendarAnchor.getMonth() && day.getFullYear() === calendarAnchor.getFullYear()
                const weekdayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(day)

                return (
                  <div
                    key={dayKey}
                    onClick={isMobile ? () => openDayModal(dayKey) : undefined}
                    className={`min-h-[160px] rounded-2xl border px-3 py-3 shadow-sm transition sm:min-h-[190px] ${
                      isCurrentMonth ? DAY_CARD_CLASS : 'border-slate-300 bg-white'
                    } ${isMobile ? 'cursor-pointer hover:border-brand-200' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className={`text-xs font-semibold ${isToday ? 'text-brand-600' : 'text-slate-600'}`}>
                          {day.getDate()}
                        </span>
                        <span className="text-[10px] uppercase text-slate-400 sm:hidden">{weekdayLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {dayItems.length ? <span className="text-[10px] text-slate-400">{dayItems.length} OT</span> : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openDayModal(dayKey)
                          }}
                          className="hidden rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-brand-200 hover:text-brand-600 sm:inline-flex"
                        >
                          Info
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-2">
                      {dayItems.slice(0, 4).map((row) => {
                        const codigo = getOtCodigo(row) || 'OT'
                        const cliente = getOtCliente(row)
                        const ruta = getOtRuta(row)
                        const id = getOtId(row)
                        const grupoLabel = ruta || cliente || codigo
                        return (
                          <button
                            key={`${dayKey}-${codigo}-${id ?? 'no-id'}`}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleOpenDetail(row)
                            }}
                            disabled={!id}
                            className={`w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-left text-[11px] text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 ${pickAccentClass(
                              grupoLabel
                            )}`}
                          >
                            <div className="font-semibold text-slate-700">{codigo}</div>
                            {cliente ? <div className="text-[10px] text-slate-500">{cliente}</div> : null}
                            {ruta ? <div className="text-[10px] text-slate-400">{ruta}</div> : null}
                          </button>
                        )
                      })}
                      {dayItems.length > 4 ? (
                        <div className="text-[10px] text-slate-400">+{dayItems.length - 4} mas</div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}

      {dayModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">OT del dia</h3>
                <p className="text-sm text-slate-500">{selectedDay ? formatDate(selectedDay) : ''}</p>
              </div>
              <Button variant="ghost" type="button" onClick={() => setDayModalOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {selectedDayItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No hay OT para este dia.
                </div>
              ) : (
                selectedDayItems.map((row, index) => {
                  const id = getOtId(row)
                  const codigo = getOtCodigo(row) || 'OT'
                  const cliente = getOtCliente(row)
                  const ruta = getOtRuta(row)
                  const tecnico = getOtTecnico(row)
                  const grupoLabel = ruta || tecnico || codigo
                  return (
                    <button
                      key={`modal-${selectedDay}-${codigo}-${id ?? 'no-id'}`}
                      type="button"
                      onClick={() => handleOpenDetail(row)}
                      disabled={!id}
                      className={`flex w-full flex-col gap-1 rounded-2xl border px-4 py-3 text-left text-sm text-slate-800 transition hover:border-brand-200 hover:bg-brand-50 ${
                        GROUP_STYLES[index % GROUP_STYLES.length]
                      } ${pickAccentClass(grupoLabel)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{codigo}</span>
                        {id ? <span className="text-xs text-slate-400">#{id}</span> : null}
                      </div>
                      {cliente ? <span className="text-xs text-slate-500">{cliente}</span> : null}
                      {ruta ? <span className="text-xs text-slate-400">{ruta}</span> : null}
                      {tecnico ? <span className="text-xs text-slate-400">{tecnico}</span> : null}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Buscar OT</h3>
                <p className="text-sm text-slate-500">Selecciona el tipo de busqueda para consultar las OT.</p>
              </div>
              <Button variant="ghost" type="button" onClick={() => setIsFilterOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button variant={mode === 'fecha' ? 'primary' : 'secondary'} type="button" onClick={() => setMode('fecha')}>
                Fecha unica
              </Button>
              <Button variant={mode === 'rango' ? 'primary' : 'secondary'} type="button" onClick={() => setMode('rango')}>
                Rango de fechas
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {mode === 'fecha' ? (
                <Field label="Fecha">
                  <input className="input-base" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
                </Field>
              ) : (
                <>
                  <Field label="Inicio">
                    <input className="input-base" type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} />
                  </Field>
                  <Field label="Fin">
                    <input className="input-base" type="date" value={fin} onChange={(event) => setFin(event.target.value)} />
                  </Field>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => setIsFilterOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  query.refetch()
                  setIsFilterOpen(false)
                }}
              >
                Buscar OT
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default OtListPage
