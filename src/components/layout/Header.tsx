import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Button from '../common/Button'
import Modal from '../common/Modal'
import Field from '../common/Field'
import { cerrarJornada, fetchCierreJornadaEstado } from '../../api/inicioJornadaApi'
import { getApiErrorMessage } from '../../services/httpClient'
import type { CierreJornadaPayload } from '../../types/inicioJornada'

interface HeaderProps {
  onMenuClick?: () => void
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate()
  const { usuario, roleName, roleId, administrador, logout } = useAuth()
  const [openCierreModal, setOpenCierreModal] = useState(false)
  const [codigoCliente, setCodigoCliente] = useState('')
  const [danoMaterial, setDanoMaterial] = useState<'SI' | 'NO'>('NO')
  const [observacionMaterial, setObservacionMaterial] = useState('')
  const [danoPersona, setDanoPersona] = useState<'SI' | 'NO'>('NO')
  const [observacionPersona, setObservacionPersona] = useState('')
  const [novedadesTrabajo, setNovedadesTrabajo] = useState<'SI' | 'NO'>('NO')
  const [observacionNovedades, setObservacionNovedades] = useState('')
  const [ubicacionGeoRef, setUbicacionGeoRef] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [cierreError, setCierreError] = useState<string | null>(null)
  const roleLabel = roleName ? `Rol: ${roleName}` : roleId > 0 ? `Rol ID: ${roleId}` : 'Rol sin asignar'
  const isTecnico = roleId === 8 || roleName.trim().toLowerCase() === 'tecnico'

  const cierreEstadoQuery = useQuery({
    queryKey: ['tecnico-inicio-jornada', 'cierre-estado-header'],
    queryFn: fetchCierreJornadaEstado,
    enabled: isTecnico,
    refetchInterval: 60_000,
  })
  const cierreDeshabilitado = Boolean(cierreEstadoQuery.data?.cerradoHoy) || !Boolean(cierreEstadoQuery.data?.tieneInicioHoy)
  const cierreLabel = cierreEstadoQuery.data?.cerradoHoy
    ? 'Jornada cerrada'
    : cierreEstadoQuery.data?.tieneInicioHoy
      ? 'Cerrar jornada'
      : 'Sin inicio hoy'

  const cerrarJornadaMutation = useMutation({
    mutationFn: (payload: CierreJornadaPayload) => cerrarJornada(payload),
    onSuccess: () => {
      setCierreError(null)
      setOpenCierreModal(false)
      setCodigoCliente('')
      setDanoMaterial('NO')
      setObservacionMaterial('')
      setDanoPersona('NO')
      setObservacionPersona('')
      setNovedadesTrabajo('NO')
      setObservacionNovedades('')
      setUbicacionGeoRef('')
      setGeoLoading(false)
      cierreEstadoQuery.refetch()
    },
    onError: (err) => {
      setCierreError(getApiErrorMessage(err, 'No se pudo cerrar jornada.'))
    },
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const getUbicacionActual = async (): Promise<string> => {
    if (!navigator.geolocation) {
      throw new Error('El navegador no soporta geolocalizacion.')
    }
    return new Promise<string>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6)
          const lon = position.coords.longitude.toFixed(6)
          const accuracy = Math.round(position.coords.accuracy)
          const timestamp = new Date(position.timestamp).toISOString()
          resolve(`lat:${lat}, lon:${lon}, acc:${accuracy}m, ts:${timestamp}`)
        },
        (error) => {
          reject(new Error(error.message || 'No se pudo obtener la ubicacion actual.'))
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      )
    })
  }

  const handleCapturarUbicacion = async () => {
    setCierreError(null)
    setGeoLoading(true)
    try {
      const geo = await getUbicacionActual()
      setUbicacionGeoRef(geo)
    } catch (err) {
      setCierreError(getApiErrorMessage(err, 'No se pudo obtener la ubicacion.'))
    } finally {
      setGeoLoading(false)
    }
  }

  const handleCerrarJornada = async () => {
    if (!codigoCliente.trim()) {
      setCierreError('Codigo cliente es obligatorio.')
      return
    }
    if (danoMaterial === 'SI' && !observacionMaterial.trim()) {
      setCierreError('Debes registrar observacion de daño material.')
      return
    }
    if (danoPersona === 'SI' && !observacionPersona.trim()) {
      setCierreError('Debes registrar observacion de daño/accidente persona.')
      return
    }
    if (novedadesTrabajo === 'SI' && !observacionNovedades.trim()) {
      setCierreError('Debes registrar observacion de novedades.')
      return
    }
    setCierreError(null)
    setGeoLoading(true)
    try {
      const geoEnTiempoReal = await getUbicacionActual()
      setUbicacionGeoRef(geoEnTiempoReal)
      cerrarJornadaMutation.mutate({
        codigoCliente: codigoCliente.trim(),
        danoMaterial,
        observacionMaterial: observacionMaterial.trim() || undefined,
        danoPersona,
        observacionPersona: observacionPersona.trim() || undefined,
        novedadesTrabajo,
        observacionNovedades: observacionNovedades.trim() || undefined,
        ubicacionGeoRef: geoEnTiempoReal,
      })
    } catch (err) {
      setCierreError(getApiErrorMessage(err, 'Debes habilitar ubicacion para cerrar jornada.'))
    } finally {
      setGeoLoading(false)
    }
  }

  return (
    <>
      <header className="bento-tile mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white p-2 text-slate-600 shadow-sm transition hover:border-brand-300 hover:text-brand-600 lg:hidden"
          >
            <span className="sr-only">Abrir menu</span>
            <span className="flex flex-col gap-1">
              <span className="h-0.5 w-5 rounded bg-current" />
              <span className="h-0.5 w-5 rounded bg-current" />
              <span className="h-0.5 w-5 rounded bg-current" />
            </span>
          </button>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Panel OT</h2>
            <p className="text-sm text-slate-600">Bienvenido, {usuario?.nombre ?? 'Operador'}.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isTecnico ? (
            <Button
              variant={cierreDeshabilitado ? 'secondary' : 'primary'}
              type="button"
              onClick={() => setOpenCierreModal(true)}
              disabled={cierreDeshabilitado}
              title={cierreDeshabilitado ? 'Debes registrar inicio de jornada y tener jornada abierta.' : 'Cerrar jornada'}
            >
              {cierreLabel}
            </Button>
          ) : null}
          <span className="badge">{roleLabel}</span>
          {isTecnico && (cierreEstadoQuery.data?.noMarcoCount ?? 0) > 0 ? (
            <span className="badge border-rose-200 text-rose-700">No marco cierre: {cierreEstadoQuery.data?.noMarcoCount}</span>
          ) : null}
          {administrador ? <span className="badge border-emerald-200 text-emerald-700">Administrador</span> : null}
          <Button variant="secondary" onClick={handleLogout} type="button">
            Cerrar sesion
          </Button>
        </div>
      </header>

      <Modal
        open={openCierreModal}
        onClose={() => setOpenCierreModal(false)}
        title="Cierre de Jornada - Trabajo en Alturas"
        maxWidthClass="max-w-3xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenCierreModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCerrarJornada} disabled={cerrarJornadaMutation.isPending}>
              {cerrarJornadaMutation.isPending || geoLoading ? 'Guardando...' : 'Guardar cierre'}
            </Button>
          </>
        }
      >
        {cierreError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{cierreError}</div> : null}
        {!cierreEstadoQuery.data?.tieneInicioHoy ? (
          <p className="text-sm text-slate-600">No tienes un inicio de jornada registrado hoy.</p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Codigo ultimo cliente">
            <input className="input-base" value={codigoCliente} onChange={(event) => setCodigoCliente(event.target.value)} />
          </Field>
          <Field label="Ubicacion georeferencia">
            <div className="grid gap-2">
              <input className="input-base" value={ubicacionGeoRef} readOnly />
              <Button type="button" variant="secondary" onClick={handleCapturarUbicacion} disabled={geoLoading || cerrarJornadaMutation.isPending}>
                {geoLoading ? 'Obteniendo ubicacion...' : 'Usar ubicacion actual'}
              </Button>
            </div>
          </Field>
          <Field label="¿EXISTIÓ DAÑO MATERIAL?">
            <select className="input-base" value={danoMaterial} onChange={(event) => setDanoMaterial(event.target.value as 'SI' | 'NO')}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Observacion Material">
            <input className="input-base" value={observacionMaterial} onChange={(event) => setObservacionMaterial(event.target.value)} disabled={danoMaterial !== 'SI'} />
          </Field>
          <Field label="¿EXISTIÓ DAÑO O ACCIDENTE PERSONA?">
            <select className="input-base" value={danoPersona} onChange={(event) => setDanoPersona(event.target.value as 'SI' | 'NO')}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Observacion Persona">
            <input className="input-base" value={observacionPersona} onChange={(event) => setObservacionPersona(event.target.value)} disabled={danoPersona !== 'SI'} />
          </Field>
          <Field label="¿NOVEDADES O INFORMACIÓN RELEVANTE?">
            <select className="input-base" value={novedadesTrabajo} onChange={(event) => setNovedadesTrabajo(event.target.value as 'SI' | 'NO')}>
              <option value="SI">SI</option>
              <option value="NO">NO</option>
            </select>
          </Field>
          <Field label="Observacion Trabajo">
            <input
              className="input-base"
              value={observacionNovedades}
              onChange={(event) => setObservacionNovedades(event.target.value)}
              disabled={novedadesTrabajo !== 'SI'}
            />
          </Field>
        </div>
      </Modal>
    </>
  )
}

export default Header
