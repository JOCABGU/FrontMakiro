import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import {
  asignarCentralSupervisor,
  asignarCentralTecnico,
  cambiarColaboradorBackupCentral,
  crearCentralGrupo,
  eliminarCentralGrupo,
  fetchCentralGrupos,
  fetchCentralSupervisores,
  fetchCentralTecnicos,
  marcarSupervisorAusenteCentral,
  quitarCentralTecnico,
  restaurarSupervisorCentral,
} from '../api/centralGruposApi'
import { useAuth } from '../context/AuthContext'
import { fetchSucursales } from '../services/authApi'
import { getApiErrorMessage } from '../services/httpClient'

const CentralGruposPage = () => {
  const queryClient = useQueryClient()
  const { roleName, usuario } = useAuth()

  const [nombreGrupo, setNombreGrupo] = useState('')
  const [idGrupoSupervisor, setIdGrupoSupervisor] = useState('')
  const [idSupervisor, setIdSupervisor] = useState('')
  const [idGrupoTecnico, setIdGrupoTecnico] = useState('')
  const [idTecnico, setIdTecnico] = useState('')

  const [openCrearModal, setOpenCrearModal] = useState(false)
  const [openSupervisorModal, setOpenSupervisorModal] = useState(false)
  const [openTecnicoModal, setOpenTecnicoModal] = useState(false)
  const [openBackupModal, setOpenBackupModal] = useState(false)
  const [openEditarModal, setOpenEditarModal] = useState(false)
  const [idGrupoEditando, setIdGrupoEditando] = useState('')
  const [idGrupoBackup, setIdGrupoBackup] = useState('')
  const [idTecnicoBackup, setIdTecnicoBackup] = useState('')
  const [backupMode, setBackupMode] = useState<'ausente' | 'cambiar'>('ausente')

  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [idGrupoEliminando, setIdGrupoEliminando] = useState<string | null>(null)
  const [quitandoTecnicoKey, setQuitandoTecnicoKey] = useState<string | null>(null)

  const isCentral = roleName.trim().toLowerCase() === 'central'

  const sucursalesQuery = useQuery({
    queryKey: ['auth-sucursales-central-grupos'],
    queryFn: fetchSucursales,
    enabled: isCentral,
    staleTime: 5 * 60 * 1000,
  })

  const loginSucursal = useMemo(() => {
    const idSucursal = usuario?.idSucursal
    const sucursales = sucursalesQuery.data?.data ?? []
    if (!idSucursal || sucursales.length === 0) return undefined
    const found = sucursales.find((item) => Number(item.idSucursal) === Number(idSucursal))
    const sucursal = found?.sucursal?.trim()
    return sucursal || undefined
  }, [sucursalesQuery.data, usuario?.idSucursal])

  const gruposQuery = useQuery({
    queryKey: ['central-grupos', 'listado', loginSucursal || 'auto'],
    queryFn: () => fetchCentralGrupos(loginSucursal),
    enabled: isCentral,
  })

  const supervisoresQuery = useQuery({
    queryKey: ['central-grupos', 'supervisores', loginSucursal || 'auto'],
    queryFn: () => fetchCentralSupervisores(loginSucursal),
    enabled: isCentral,
  })

  const tecnicosQuery = useQuery({
    queryKey: ['central-grupos', 'tecnicos', loginSucursal || 'auto'],
    queryFn: () => fetchCentralTecnicos(loginSucursal),
    enabled: isCentral,
  })

  const createMutation = useMutation({
    mutationFn: () => crearCentralGrupo({ nombre: nombreGrupo, sucursal: loginSucursal }),
    onSuccess: () => {
      setNombreGrupo('')
      setOpenCrearModal(false)
      setError(null)
      setFeedback('Grupo creado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo crear el grupo.'))
    },
  })

  const asignarSupervisorMutation = useMutation({
    mutationFn: () =>
      asignarCentralSupervisor({
        idGrupo: Number(idGrupoSupervisor),
        idUsuarioSupervisor: Number(idSupervisor),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setOpenSupervisorModal(false)
      setIdGrupoSupervisor('')
      setIdSupervisor('')
      setError(null)
      setFeedback('Supervisor asignado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo asignar supervisor.'))
    },
  })

  const asignarTecnicoMutation = useMutation({
    mutationFn: () =>
      asignarCentralTecnico({
        idGrupo: Number(idGrupoTecnico),
        idUsuarioTecnico: Number(idTecnico),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setOpenTecnicoModal(false)
      setIdGrupoTecnico('')
      setIdTecnico('')
      setError(null)
      setFeedback('Tecnico asignado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo asignar tecnico.'))
    },
  })

  const eliminarGrupoMutation = useMutation({
    mutationFn: (grupoId: string) =>
      eliminarCentralGrupo({
        idGrupo: Number(grupoId),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setError(null)
      setFeedback('Grupo eliminado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo eliminar el grupo.'))
    },
    onSettled: () => {
      setIdGrupoEliminando(null)
    },
  })

  const marcarAusenteMutation = useMutation({
    mutationFn: () =>
      marcarSupervisorAusenteCentral({
        idGrupo: Number(idGrupoBackup),
        idUsuarioTecnico: Number(idTecnicoBackup),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setOpenBackupModal(false)
      setIdGrupoBackup('')
      setIdTecnicoBackup('')
      setError(null)
      setFeedback('Supervisor marcado como ausente y colaborador temporal asignado.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo marcar supervisor ausente.'))
    },
  })

  const cambiarColaboradorMutation = useMutation({
    mutationFn: () =>
      cambiarColaboradorBackupCentral({
        idGrupo: Number(idGrupoBackup),
        idUsuarioTecnico: Number(idTecnicoBackup),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setOpenBackupModal(false)
      setIdGrupoBackup('')
      setIdTecnicoBackup('')
      setError(null)
      setFeedback('Colaborador temporal actualizado.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo cambiar colaborador temporal.'))
    },
  })

  const restaurarSupervisorMutation = useMutation({
    mutationFn: (grupoId: string) =>
      restaurarSupervisorCentral({
        idGrupo: Number(grupoId),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setError(null)
      setFeedback('Supervisor restaurado correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo restaurar supervisor.'))
    },
  })

  const quitarTecnicoMutation = useMutation({
    mutationFn: ({ idGrupo, idUsuarioTecnico }: { idGrupo: string; idUsuarioTecnico: string }) =>
      quitarCentralTecnico({
        idGrupo: Number(idGrupo),
        idUsuarioTecnico: Number(idUsuarioTecnico),
        sucursal: loginSucursal,
      }),
    onSuccess: () => {
      setError(null)
      setFeedback('Tecnico quitado del grupo correctamente.')
      queryClient.invalidateQueries({ queryKey: ['central-grupos', 'listado'] })
    },
    onError: (err) => {
      setFeedback(null)
      setError(getApiErrorMessage(err, 'No se pudo quitar tecnico del grupo.'))
    },
    onSettled: () => {
      setQuitandoTecnicoKey(null)
    },
  })

  const grupos = gruposQuery.data ?? []
  const supervisores = supervisoresQuery.data ?? []
  const tecnicos = tecnicosQuery.data ?? []

  const tecnicoAsignadoEnGrupo = useMemo(() => {
    const map = new Map<string, { idGrupo: string; nombreGrupo: string }>()
    for (const grupo of grupos) {
      for (const tecnico of grupo.tecnicos) {
        const tecnicoId = tecnico.idUsuarioTecnico?.trim()
        if (!tecnicoId) continue
        if (!map.has(tecnicoId)) {
          map.set(tecnicoId, { idGrupo: grupo.idGrupo, nombreGrupo: grupo.nombre })
        }
      }
    }
    return map
  }, [grupos])

  const totalTecnicosAsignados = useMemo(
    () => grupos.reduce((acc, grupo) => acc + (grupo.tecnicos?.length ?? 0), 0),
    [grupos]
  )

  const grupoBackupSeleccionado = useMemo(() => grupos.find((g) => g.idGrupo === idGrupoBackup), [grupos, idGrupoBackup])
  const grupoEditando = useMemo(() => grupos.find((g) => g.idGrupo === idGrupoEditando), [grupos, idGrupoEditando])

  const handleCrearGrupo = () => {
    if (!nombreGrupo.trim()) {
      setFeedback(null)
      setError('Nombre de grupo es requerido.')
      return
    }
    createMutation.mutate()
  }

  const handleAsignarSupervisor = () => {
    if (!idGrupoSupervisor || !idSupervisor) {
      setFeedback(null)
      setError('Selecciona grupo y supervisor.')
      return
    }
    asignarSupervisorMutation.mutate()
  }

  const handleAsignarTecnico = () => {
    if (!idGrupoTecnico || !idTecnico) {
      setFeedback(null)
      setError('Selecciona grupo y tecnico.')
      return
    }
    const asignado = tecnicoAsignadoEnGrupo.get(idTecnico)
    if (asignado && asignado.idGrupo !== idGrupoTecnico) {
      setFeedback(null)
      setError(`No se puede, este tecnico esta en otro grupo: ${asignado.nombreGrupo}.`)
      return
    }
    if (asignado && asignado.idGrupo === idGrupoTecnico) {
      setFeedback(null)
      setError('Ese tecnico ya pertenece al grupo seleccionado.')
      return
    }
    asignarTecnicoMutation.mutate()
  }

  const handleEliminarGrupo = (idGrupo: string, nombreGrupo: string) => {
    const ok = window.confirm(`Se marcara como eliminado el grupo "${nombreGrupo}". Deseas continuar?`)
    if (!ok) return
    setIdGrupoEliminando(idGrupo)
    eliminarGrupoMutation.mutate(idGrupo)
  }

  const handleAbrirSupervisorAusente = (idGrupo: string) => {
    setBackupMode('ausente')
    setIdGrupoBackup(idGrupo)
    setIdTecnicoBackup('')
    setOpenBackupModal(true)
  }

  const handleAbrirCambiarColaborador = (idGrupo: string) => {
    setBackupMode('cambiar')
    setIdGrupoBackup(idGrupo)
    setIdTecnicoBackup('')
    setOpenBackupModal(true)
  }

  const handleBackupSubmit = () => {
    if (!idGrupoBackup || !idTecnicoBackup) {
      setFeedback(null)
      setError('Selecciona grupo y tecnico temporal.')
      return
    }
    if (backupMode === 'ausente') {
      marcarAusenteMutation.mutate()
      return
    }
    cambiarColaboradorMutation.mutate()
  }

  const handleRestaurarSupervisor = (idGrupo: string, nombreGrupo: string) => {
    const ok = window.confirm(`Se restaurara el supervisor oficial del grupo "${nombreGrupo}". Deseas continuar?`)
    if (!ok) return
    restaurarSupervisorMutation.mutate(idGrupo)
  }

  const handleQuitarTecnico = (idGrupo: string, idUsuarioTecnico: string, tecnicoNombre: string) => {
    const ok = window.confirm(`Se quitara al tecnico "${tecnicoNombre}" del grupo. Deseas continuar?`)
    if (!ok) return
    setQuitandoTecnicoKey(`${idGrupo}-${idUsuarioTecnico}`)
    quitarTecnicoMutation.mutate({ idGrupo, idUsuarioTecnico })
  }

  const abrirAsignarTecnicoGrupo = (idGrupo: string) => {
    setIdGrupoTecnico(idGrupo)
    setOpenTecnicoModal(true)
  }

  const abrirCambiarSupervisorGrupo = (idGrupo: string) => {
    setIdGrupoSupervisor(idGrupo)
    setOpenSupervisorModal(true)
  }

  const abrirEditarGrupo = (idGrupo: string) => {
    setIdGrupoEditando(idGrupo)
    setOpenEditarModal(true)
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Central - Grupos</h2>
        <p className="text-sm text-slate-500">
          Sucursal activa del login: {loginSucursal ?? 'Cargando...'}.
        </p>
      </div>

      {!isCentral ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Esta pantalla es solo para usuarios con rol Central.
        </div>
      ) : null}

      <FormCard
        title="Acciones"
        description="Usa los botones para abrir cada flujo en modal."
        actions={
          <Button type="button" variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['central-grupos'] })}>
            Recargar
          </Button>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setOpenCrearModal(true)} disabled={!isCentral}>
            Crear grupo
          </Button>
          <Button type="button" onClick={() => setOpenSupervisorModal(true)} disabled={!isCentral}>
            Asignar supervisor
          </Button>
          <Button type="button" onClick={() => setOpenTecnicoModal(true)} disabled={!isCentral}>
            Asignar tecnico
          </Button>
        </div>
      </FormCard>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {feedback ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div> : null}

      <FormCard title="Lista de grupos y tecnicos" description={`Grupos: ${grupos.length} | Tecnicos asignados: ${totalTecnicosAsignados}`}>
        {gruposQuery.isLoading ? <p className="text-sm text-slate-500">Cargando grupos...</p> : null}

        {!gruposQuery.isLoading && grupos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin grupos creados.</p>
        ) : null}

        {!gruposQuery.isLoading && grupos.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {grupos.map((grupo) => (
              <article key={grupo.idGrupo} className="rounded-[2rem] border border-slate-200 bg-white p-6 text-slate-900 shadow-soft">
                <div className="space-y-5">
                  <div>
                    <h4 className="text-3xl font-extrabold tracking-wide text-slate-900">{grupo.nombre.toUpperCase()}</h4>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Grupo #{grupo.idGrupo}</p>
                  </div>

                  <div>
                    <p className="text-2xl font-semibold uppercase text-slate-900">{(grupo.supervisor ?? 'Sin supervisor asignado').toUpperCase()}</p>
                    <p className="mt-1 text-sm text-slate-500">Supervisor</p>
                    {grupo.supervisorAusente ? (
                      <p className="mt-2 text-sm font-semibold text-amber-700">
                        Supervisor ausente. Colaborador temporal: {grupo.tecnicoTemporalBackup ?? 'sin definir'}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    {grupo.tecnicos.length === 0 ? (
                      <p className="text-sm text-slate-500">- Sin integrantes</p>
                    ) : (
                      <ul className="space-y-2">
                        {grupo.tecnicos.map((tecnico) => (
                          <li key={`${grupo.idGrupo}-${tecnico.idUsuarioTecnico}`} className="flex items-center justify-between gap-3 text-xl text-slate-800">
                            <span>- {tecnico.tecnico}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              className="!rounded-xl !border !border-rose-200 !px-3 !py-1.5 !text-xs !font-semibold !text-rose-700 hover:!border-rose-300"
                              onClick={() => handleQuitarTecnico(grupo.idGrupo, tecnico.idUsuarioTecnico, tecnico.tecnico)}
                              disabled={quitarTecnicoMutation.isPending}
                            >
                              {quitandoTecnicoKey === `${grupo.idGrupo}-${tecnico.idUsuarioTecnico}` && quitarTecnicoMutation.isPending
                                ? 'Quitando...'
                                : 'Quitar'}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                    {!grupo.supervisorAusente ? (
                      <Button type="button" variant="primary" className="w-full sm:col-span-2" onClick={() => abrirEditarGrupo(grupo.idGrupo)}>
                        editar
                      </Button>
                    ) : null}
                    {grupo.supervisorAusente ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleRestaurarSupervisor(grupo.idGrupo, grupo.nombre)}
                        disabled={restaurarSupervisorMutation.isPending}
                      >
                        restaurar
                      </Button>
                    ) : null}
                    {grupo.supervisorAusente ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => handleAbrirCambiarColaborador(grupo.idGrupo)}
                        disabled={grupo.tecnicos.length === 0}
                      >
                        cambiar colaborador
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:col-span-2"
                      onClick={() => handleEliminarGrupo(grupo.idGrupo, grupo.nombre)}
                      disabled={eliminarGrupoMutation.isPending}
                    >
                      {idGrupoEliminando === grupo.idGrupo && eliminarGrupoMutation.isPending ? 'Eliminando...' : 'eliminar grupo'}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </FormCard>

      <Modal
        open={openCrearModal}
        onClose={() => setOpenCrearModal(false)}
        title="Crear grupo"
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenCrearModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCrearGrupo} disabled={createMutation.isPending || !isCentral}>
              {createMutation.isPending ? 'Creando...' : 'Crear grupo'}
            </Button>
          </>
        }
      >
        <Field label="Nombre grupo">
          <input
            className="input-base"
            value={nombreGrupo}
            onChange={(event) => setNombreGrupo(event.target.value)}
            placeholder="Ej: Equipo Norte"
          />
        </Field>
      </Modal>

      <Modal
        open={openSupervisorModal}
        onClose={() => setOpenSupervisorModal(false)}
        title="Asignar supervisor"
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenSupervisorModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAsignarSupervisor} disabled={asignarSupervisorMutation.isPending || !isCentral}>
              {asignarSupervisorMutation.isPending ? 'Asignando...' : 'Asignar supervisor'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Grupo">
            <select className="input-base" value={idGrupoSupervisor} onChange={(event) => setIdGrupoSupervisor(event.target.value)}>
              <option value="">Selecciona grupo</option>
              {grupos.map((grupo) => (
                <option key={`supervisor-grupo-${grupo.idGrupo}`} value={grupo.idGrupo}>
                  {grupo.nombre} ({grupo.idGrupo})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Supervisor">
            <select className="input-base" value={idSupervisor} onChange={(event) => setIdSupervisor(event.target.value)}>
              <option value="">Selecciona supervisor</option>
              {supervisores.map((sup) => (
                <option key={`supervisor-${sup.idUsuarioSupervisor}`} value={sup.idUsuarioSupervisor}>
                  {sup.supervisorACargo} ({sup.idUsuarioSupervisor})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={openEditarModal}
        onClose={() => setOpenEditarModal(false)}
        title={`Editar grupo ${grupoEditando?.nombre ?? ''}`.trim()}
        maxWidthClass="max-w-xl"
      >
        <div className="grid gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              if (!idGrupoEditando) return
              setOpenEditarModal(false)
              abrirAsignarTecnicoGrupo(idGrupoEditando)
            }}
          >
            agregar tecnico
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!idGrupoEditando) return
              setOpenEditarModal(false)
              abrirCambiarSupervisorGrupo(idGrupoEditando)
            }}
          >
            cambiar supervisor
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!idGrupoEditando) return
              setOpenEditarModal(false)
              handleAbrirSupervisorAusente(idGrupoEditando)
            }}
            disabled={(grupoEditando?.tecnicos.length ?? 0) === 0}
          >
            supervisor ausente
          </Button>
        </div>
      </Modal>

      <Modal
        open={openBackupModal}
        onClose={() => setOpenBackupModal(false)}
        title={backupMode === 'ausente' ? 'Supervisor ausente' : 'Cambiar colaborador temporal'}
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenBackupModal(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleBackupSubmit}
              disabled={marcarAusenteMutation.isPending || cambiarColaboradorMutation.isPending || !isCentral}
            >
              {marcarAusenteMutation.isPending || cambiarColaboradorMutation.isPending
                ? 'Guardando...'
                : backupMode === 'ausente'
                  ? 'Guardar ausente'
                  : 'Guardar colaborador'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Grupo">
            <select className="input-base" value={idGrupoBackup} onChange={(event) => setIdGrupoBackup(event.target.value)}>
              <option value="">Selecciona grupo</option>
              {grupos.map((grupo) => (
                <option key={`backup-grupo-${grupo.idGrupo}`} value={grupo.idGrupo}>
                  {grupo.nombre} ({grupo.idGrupo})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tecnico temporal" hint="Solo se muestran tecnicos asignados al grupo seleccionado.">
            <select className="input-base" value={idTecnicoBackup} onChange={(event) => setIdTecnicoBackup(event.target.value)}>
              <option value="">Selecciona tecnico</option>
              {(grupoBackupSeleccionado?.tecnicos ?? []).map((tec) => (
                <option key={`backup-tecnico-${tec.idUsuarioTecnico}`} value={tec.idUsuarioTecnico}>
                  {tec.tecnico} ({tec.idUsuarioTecnico})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <Modal
        open={openTecnicoModal}
        onClose={() => setOpenTecnicoModal(false)}
        title="Asignar tecnico"
        maxWidthClass="max-w-2xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpenTecnicoModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAsignarTecnico} disabled={asignarTecnicoMutation.isPending || !isCentral}>
              {asignarTecnicoMutation.isPending ? 'Asignando...' : 'Asignar tecnico'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Grupo">
            <select className="input-base" value={idGrupoTecnico} onChange={(event) => setIdGrupoTecnico(event.target.value)}>
              <option value="">Selecciona grupo</option>
              {grupos.map((grupo) => (
                <option key={`tecnico-grupo-${grupo.idGrupo}`} value={grupo.idGrupo}>
                  {grupo.nombre} ({grupo.idGrupo})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tecnico" hint="Un tecnico solo puede pertenecer a un grupo activo.">
            <select className="input-base" value={idTecnico} onChange={(event) => setIdTecnico(event.target.value)}>
              <option value="">Selecciona tecnico</option>
              {tecnicos.map((tec) => {
                const grupoActual = tecnicoAsignadoEnGrupo.get(tec.idTecnico)
                const disabled = Boolean(grupoActual && grupoActual.idGrupo !== idGrupoTecnico)
                return (
                  <option key={`tecnico-${tec.idTecnico}`} value={tec.idTecnico} disabled={disabled}>
                    {tec.tecnico} ({tec.idTecnico}){grupoActual ? ` - ya asignado a ${grupoActual.nombreGrupo}` : ''}
                  </option>
                )
              })}
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}

export default CentralGruposPage
