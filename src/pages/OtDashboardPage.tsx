import { useMemo, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import FormCard from '../components/common/FormCard'
import { useAuth } from '../context/AuthContext'
import { otActionItems, type OtActionItem } from '../config/otModule'

type ActionMeta = {
  accentClass: string
  softClass: string
  icon: string
}

const actionMetaByKey: Record<string, ActionMeta> = {
  pendientes: {
    accentClass: 'text-amber-700',
    softClass: 'bg-amber-100 ring-amber-200',
    icon: 'OT',
  },
  crear: {
    accentClass: 'text-emerald-700',
    softClass: 'bg-emerald-100 ring-emerald-200',
    icon: '+',
  },
  realizada: {
    accentClass: 'text-sky-700',
    softClass: 'bg-sky-100 ring-sky-200',
    icon: 'OK',
  },
  modificar: {
    accentClass: 'text-violet-700',
    softClass: 'bg-violet-100 ring-violet-200',
    icon: 'ED',
  },
  'modificar-fecha': {
    accentClass: 'text-indigo-700',
    softClass: 'bg-indigo-100 ring-indigo-200',
    icon: 'FE',
  },
  anular: {
    accentClass: 'text-rose-700',
    softClass: 'bg-rose-100 ring-rose-200',
    icon: 'AN',
  },
}

const getCardAnimationStyle = (index: number): CSSProperties => ({
  animation: 'bento-rise 0.38s cubic-bezier(0.2, 0.7, 0.2, 1) both',
  animationDelay: `${index * 70}ms`,
})

const ActionCard = ({ item, onOpen, index }: { item: OtActionItem; onOpen: () => void; index: number }) => {
  const meta = actionMetaByKey[item.key] ?? {
    accentClass: 'text-brand-700',
    softClass: 'bg-brand-100 ring-brand-200',
    icon: 'OT',
  }

  return (
    <article
      className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl"
      style={getCardAnimationStyle(index)}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-brand-200/50 to-transparent blur-xl transition duration-300 group-hover:from-brand-200/70" />

      <div className="relative flex items-start justify-between gap-3">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-extrabold ring-1 ${meta.softClass} ${meta.accentClass}`}>
          {meta.icon}
        </div>
        <span className="badge">Menu {item.requiredMenuId}</span>
      </div>

      <div className="relative mt-5">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900">{item.label}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
      </div>

      <div className="relative mt-6">
        <Button type="button" onClick={onOpen} className="w-full justify-center sm:w-auto">
          {item.buttonLabel}
        </Button>
      </div>
    </article>
  )
}

const OtDashboardPage = () => {
  const navigate = useNavigate()
  const { administrador, menuIds } = useAuth()
  const hasOtFullAccess = administrador || menuIds.includes(2)

  const availableActions = useMemo(() => {
    if (hasOtFullAccess) return otActionItems
    return otActionItems.filter((item) => menuIds.includes(item.requiredMenuId))
  }, [hasOtFullAccess, menuIds])

  return (
    <div className="bento-page">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_#dbeafe_0%,_#ffffff_55%)] p-6 shadow-soft sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-brand-200/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-sky-200/60 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Modulo OT</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Gestion de Ordenes de Trabajo</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              Centro operativo para crear, actualizar y controlar OT con acceso segun tus permisos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Habilitadas</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{availableActions.length}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total modulo</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{otActionItems.length}</p>
            </div>
          </div>
        </div>
      </section>

      {availableActions.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Flujos disponibles</h3>
            <span className="badge">
              {availableActions.length} de {otActionItems.length}
            </span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {availableActions.map((item, index) => (
              <ActionCard key={item.key} item={item} index={index} onOpen={() => navigate(item.to)} />
            ))}
          </div>
        </section>
      ) : null}

      {availableActions.length === 0 ? (
        <FormCard title="Sin permisos OT" description="No tienes opciones habilitadas en este modulo.">
          <p className="text-sm text-slate-600">
            Solicita a un administrador los menus OT requeridos para operar.
          </p>
        </FormCard>
      ) : null}
    </div>
  )
}

export default OtDashboardPage
