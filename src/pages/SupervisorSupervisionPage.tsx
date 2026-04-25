import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import Modal from '../components/common/Modal'
import Table, { type Column } from '../components/common/Table'
import {
  createSupervision,
  fetchSupervisionDetalle,
  fetchSupervisionTecnicos,
  fetchSupervisionTiposPenalizacion,
  fetchSupervisionTiposSupervision,
  fetchSupervisionTiposTrabajo,
  fetchSupervisiones,
} from '../api/supervisionApi'
import type {
  SupervisionCreatePayload,
  SupervisionRegistro,
} from '../types/supervision'
import { getApiErrorMessage } from '../services/httpClient'

type SupervisionForm = {
  idTecnicoPrincipal: string
  idTecnicoAuxiliar: string
  idTipoSupervision: string
  idTipoTrabajo: string
  idTipoPenalizacion: string
  supervisionPor: string
  tecnologia: string
  codigo: string
  ordenTrabajo: string
  tipoRevision: string
  ubicacion: string
  observacion: string
  descripcionAdicionalObservacion: string
  fotoBoletaSupervision: string
  fotoCanalesPilos: string
  fotoNivelesDocsis: string
  fotoMedicionRuido: string
  fotoBarridoCanales: string
  fotoObservacion1: string
  fotoObservacion2: string
  fotoObservacion3: string
  fotoObservacion4: string
}

type SupervisionFiltro = {
  fechaDesde: string
  fechaHasta: string
}

const emptyForm = (): SupervisionForm => ({
  idTecnicoPrincipal: '',
  idTecnicoAuxiliar: '',
  idTipoSupervision: '',
  idTipoTrabajo: '',
  idTipoPenalizacion: '',
  supervisionPor: '',
  tecnologia: '',
  codigo: '',
  ordenTrabajo: '',
  tipoRevision: '',
  ubicacion: '',
  observacion: '',
  descripcionAdicionalObservacion: '',
  fotoBoletaSupervision: '',
  fotoCanalesPilos: '',
  fotoNivelesDocsis: '',
  fotoMedicionRuido: '',
  fotoBarridoCanales: '',
  fotoObservacion1: '',
  fotoObservacion2: '',
  fotoObservacion3: '',
  fotoObservacion4: '',
})

const emptyFiltro = (): SupervisionFiltro => ({
  fechaDesde: '',
  fechaHasta: '',
})

const requiredFields: Array<keyof SupervisionForm> = [
  'idTecnicoPrincipal',
  'idTecnicoAuxiliar',
  'idTipoSupervision',
  'idTipoTrabajo',
  'idTipoPenalizacion',
  'supervisionPor',
  'tecnologia',
  'codigo',
  'ordenTrabajo',
  'tipoRevision',
  'ubicacion',
]

const photoFields: Array<{ key: keyof SupervisionForm; label: string }> = [
  { key: 'fotoBoletaSupervision', label: 'Foto Boleta Supervision' },
  { key: 'fotoCanalesPilos', label: 'Foto Canales Pilos' },
  { key: 'fotoNivelesDocsis', label: 'Foto Niveles Docsis' },
  { key: 'fotoMedicionRuido', label: 'Foto Medicion Ruido' },
  { key: 'fotoBarridoCanales', label: 'Foto Barrido Canales' },
  { key: 'fotoObservacion1', label: 'Foto Observacion 1' },
  { key: 'fotoObservacion2', label: 'Foto Observacion 2' },
  { key: 'fotoObservacion3', label: 'Foto Observacion 3' },
  { key: 'fotoObservacion4', label: 'Foto Observacion 4' },
]

const normalizeId = (value?: string | number | null): string => String(value ?? '').trim()

const toOptional = (value: string): string | undefined => {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-BO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const resolveImageSrc = (value?: string): string | null => {
  const raw = value?.trim()
  if (!raw) return null
  if (raw.startsWith('data:image')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw
  if (raw.startsWith('C:/') || raw.startsWith('C:\\')) return null
  if (raw.includes('/') || raw.includes('\\')) return null
  return `data:image/jpeg;base64,${raw}`
}

const toDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

const SupervisorSupervisionPage = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SupervisionForm>(emptyForm)
  const [filtroDraft, setFiltroDraft] = useState<SupervisionFiltro>(emptyFiltro)
  const [filtroActivo, setFiltroActivo] = useState<SupervisionFiltro>(emptyFiltro)
  const [registroModalOpen, setRegistroModalOpen] = useState(false)
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [detalleId, setDetalleId] = useState<string>('')
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [successForm, setSuccessForm] = useState<string | null>(null)

  const tecnicosQuery = useQuery({
    queryKey: ['supervision', 'tecnicos'],
    queryFn: () => fetchSupervisionTecnicos({ limit: 1000 }),
    staleTime: 60_000,
  })

  const tiposSupervisionQuery = useQuery({
    queryKey: ['supervision', 'tipos-supervision'],
    queryFn: fetchSupervisionTiposSupervision,
    staleTime: 300_000,
  })

  const tiposTrabajoQuery = useQuery({
    queryKey: ['supervision', 'tipos-trabajo'],
    queryFn: fetchSupervisionTiposTrabajo,
    staleTime: 300_000,
  })

  const tiposPenalizacionQuery = useQuery({
    queryKey: ['supervision', 'tipos-penalizacion'],
    queryFn: fetchSupervisionTiposPenalizacion,
    staleTime: 300_000,
  })

  const listadoQuery = useQuery({
    queryKey: ['supervision', 'listado', filtroActivo],
    queryFn: () =>
      fetchSupervisiones({
        fechaDesde: filtroActivo.fechaDesde || undefined,
        fechaHasta: filtroActivo.fechaHasta || undefined,
        limite: 300,
      }),
  })

  const detalleQuery = useQuery({
    queryKey: ['supervision', 'detalle', detalleId],
    queryFn: () => fetchSupervisionDetalle(detalleId),
    enabled: detalleModalOpen && Boolean(detalleId),
  })

  const createMutation = useMutation({
    mutationFn: (payload: SupervisionCreatePayload) => createSupervision(payload),
    onSuccess: (result) => {
      setErrorForm(null)
      setSuccessForm(`Nota de supervision registrada. ID: ${result.idSupervision}`)
      setRegistroModalOpen(false)
      setForm(emptyForm())
      queryClient.invalidateQueries({ queryKey: ['supervision', 'listado'] })
    },
    onError: (error) => {
      setSuccessForm(null)
      setErrorForm(getApiErrorMessage(error, 'No se pudo registrar la supervision.'))
    },
  })

  const tecnicos = tecnicosQuery.data ?? []
  const listados = listadoQuery.data ?? []

  const tecnicoMap = useMemo(() => {
    const map = new Map<string, (typeof tecnicos)[number]>()
    for (const tecnico of tecnicos) {
      map.set(normalizeId(tecnico.idTecnico), tecnico)
    }
    return map
  }, [tecnicos])

  const tecnicosAuxiliar = useMemo(() => {
    const idPrincipal = normalizeId(form.idTecnicoPrincipal)
    if (!idPrincipal) return tecnicos
    const principal = tecnicoMap.get(idPrincipal)
    if (!principal) return tecnicos

    const grupoRef = (principal.grupo ?? '').trim().toLowerCase()
    const rutaRef = normalizeId(principal.idRuta)

    const filtered = tecnicos.filter((item) => {
      if (normalizeId(item.idTecnico) === idPrincipal) return false
      const sameGrupo = grupoRef && (item.grupo ?? '').trim().toLowerCase() === grupoRef
      const sameRuta = rutaRef && normalizeId(item.idRuta) === rutaRef
      return Boolean(sameGrupo || sameRuta)
    })

    return filtered.length ? filtered : tecnicos.filter((item) => normalizeId(item.idTecnico) !== idPrincipal)
  }, [form.idTecnicoPrincipal, tecnicoMap, tecnicos])

  const columns = useMemo<Column<SupervisionRegistro>[]>(() => {
    return [
      { key: 'fechaRegistro', header: 'Fecha', render: (row) => formatDateTime(row.fechaRegistro) },
      {
        key: 'tecnicoPrincipal',
        header: 'Tecnico Principal',
        render: (row) => row.tecnicoPrincipal || tecnicoMap.get(normalizeId(row.idTecnicoPrincipal))?.tecnico || '-',
      },
      {
        key: 'tecnicoAuxiliar',
        header: 'Tecnico Auxiliar',
        render: (row) => row.tecnicoAuxiliar || tecnicoMap.get(normalizeId(row.idTecnicoAuxiliar))?.tecnico || '-',
      },
      { key: 'tipoSupervision', header: 'Tipo Supervision', render: (row) => row.tipoSupervision || '-' },
      { key: 'tipoTrabajo', header: 'Tipo Trabajo', render: (row) => row.tipoTrabajo || '-' },
      { key: 'codigo', header: 'Codigo', render: (row) => row.codigo || '-' },
      { key: 'ordenTrabajo', header: 'OT', render: (row) => row.ordenTrabajo || '-' },
      {
        key: 'acciones',
        header: 'Acciones',
        render: (row) => (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDetalleId(row.idSupervision)
              setDetalleModalOpen(true)
            }}
          >
            Ver detalle
          </Button>
        ),
      },
    ]
  }, [tecnicoMap])

  useEffect(() => {
    if (!form.idTecnicoAuxiliar) return
    const exists = tecnicosAuxiliar.some((item) => normalizeId(item.idTecnico) === normalizeId(form.idTecnicoAuxiliar))
    if (!exists) {
      setForm((prev) => ({ ...prev, idTecnicoAuxiliar: '' }))
    }
  }, [form.idTecnicoAuxiliar, tecnicosAuxiliar])

  const handlePhotoChange = async (field: keyof SupervisionForm, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await toDataUrl(file)
      setForm((prev) => ({ ...prev, [field]: dataUrl }))
    } catch {
      setErrorForm('No se pudo cargar una imagen seleccionada.')
    }
  }

  const validateForm = (): string | null => {
    for (const field of requiredFields) {
      if (!form[field].trim()) {
        return `El campo ${field} es obligatorio.`
      }
    }
    return null
  }

  const submitForm = () => {
    const validationError = validateForm()
    if (validationError) {
      setSuccessForm(null)
      setErrorForm(validationError)
      return
    }

    const payload: SupervisionCreatePayload = {
      idTecnicoPrincipal: form.idTecnicoPrincipal,
      idTecnicoAuxiliar: form.idTecnicoAuxiliar,
      idTipoSupervision: form.idTipoSupervision,
      idTipoTrabajo: form.idTipoTrabajo,
      idTipoPenalizacion: form.idTipoPenalizacion,
      supervisionPor: form.supervisionPor.trim(),
      tecnologia: form.tecnologia.trim(),
      codigo: form.codigo.trim(),
      ordenTrabajo: form.ordenTrabajo.trim(),
      tipoRevision: form.tipoRevision.trim(),
      ubicacion: form.ubicacion.trim(),
      observacion: toOptional(form.observacion),
      descripcionAdicionalObservacion: toOptional(form.descripcionAdicionalObservacion),
      fotoBoletaSupervision: toOptional(form.fotoBoletaSupervision),
      fotoCanalesPilos: toOptional(form.fotoCanalesPilos),
      fotoNivelesDocsis: toOptional(form.fotoNivelesDocsis),
      fotoMedicionRuido: toOptional(form.fotoMedicionRuido),
      fotoBarridoCanales: toOptional(form.fotoBarridoCanales),
      fotoObservacion1: toOptional(form.fotoObservacion1),
      fotoObservacion2: toOptional(form.fotoObservacion2),
      fotoObservacion3: toOptional(form.fotoObservacion3),
      fotoObservacion4: toOptional(form.fotoObservacion4),
    }

    setErrorForm(null)
    setSuccessForm(null)
    createMutation.mutate(payload)
  }

  const detalle = detalleQuery.data

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Supervision</h2>
        <p className="text-sm text-slate-500">Registro manual de notas de supervision para supervisor.</p>
      </div>

      <FormCard
        title="Filtros"
        description="Filtra notas por rango de fechas."
        actions={
          <>
            <Button type="button" onClick={() => setRegistroModalOpen(true)}>
              Nueva supervision
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setFiltroDraft(emptyFiltro()); setFiltroActivo(emptyFiltro()) }}>
              Limpiar
            </Button>
            <Button type="button" onClick={() => setFiltroActivo(filtroDraft)}>
              Buscar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fecha desde">
            <input
              className="input-base"
              type="date"
              value={filtroDraft.fechaDesde}
              onChange={(event) => setFiltroDraft((prev) => ({ ...prev, fechaDesde: event.target.value }))}
            />
          </Field>
          <Field label="Fecha hasta">
            <input
              className="input-base"
              type="date"
              value={filtroDraft.fechaHasta}
              onChange={(event) => setFiltroDraft((prev) => ({ ...prev, fechaHasta: event.target.value }))}
            />
          </Field>
        </div>
      </FormCard>

      {successForm ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successForm}</div>
      ) : null}

      <FormCard title="Notas registradas" description={`Total: ${listados.length}`}>
        {listadoQuery.isError ? (
          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {getApiErrorMessage(listadoQuery.error, 'No se pudo cargar las notas de supervision.')}
          </div>
        ) : null}
        <Table
          columns={columns}
          data={listados}
          stickyHeader
          desktopMinWidthClass="min-w-[920px]"
          emptyLabel={listadoQuery.isLoading ? 'Cargando notas...' : 'Sin notas de supervision.'}
        />
      </FormCard>

      <Modal
        open={registroModalOpen}
        title="Nueva nota de supervision"
        onClose={() => setRegistroModalOpen(false)}
        maxWidthClass="max-w-5xl"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setRegistroModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={submitForm} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar nota'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Tecnico principal (Obligatorio)">
            <select
              className="input-base"
              value={form.idTecnicoPrincipal}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  idTecnicoPrincipal: event.target.value,
                  idTecnicoAuxiliar:
                    prev.idTecnicoAuxiliar && prev.idTecnicoAuxiliar === event.target.value
                      ? ''
                      : prev.idTecnicoAuxiliar,
                }))
              }
            >
              <option value="">Selecciona tecnico</option>
              {tecnicos.map((item) => (
                <option key={`p-${item.idTecnico}`} value={item.idTecnico}>
                  {item.tecnico}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tecnico auxiliar (Obligatorio)">
            <select
              className="input-base"
              value={form.idTecnicoAuxiliar}
              onChange={(event) => setForm((prev) => ({ ...prev, idTecnicoAuxiliar: event.target.value }))}
            >
              <option value="">Selecciona tecnico</option>
              {tecnicosAuxiliar.map((item) => (
                <option key={`a-${item.idTecnico}`} value={item.idTecnico}>
                  {item.tecnico}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo supervision (Obligatorio)">
            <select
              className="input-base"
              value={form.idTipoSupervision}
              onChange={(event) => setForm((prev) => ({ ...prev, idTipoSupervision: event.target.value }))}
            >
              <option value="">Selecciona tipo</option>
              {(tiposSupervisionQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo trabajo (Obligatorio)">
            <select
              className="input-base"
              value={form.idTipoTrabajo}
              onChange={(event) => setForm((prev) => ({ ...prev, idTipoTrabajo: event.target.value }))}
            >
              <option value="">Selecciona tipo</option>
              {(tiposTrabajoQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo penalizacion (Obligatorio)">
            <select
              className="input-base"
              value={form.idTipoPenalizacion}
              onChange={(event) => setForm((prev) => ({ ...prev, idTipoPenalizacion: event.target.value }))}
            >
              <option value="">Selecciona tipo</option>
              {(tiposPenalizacionQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </Field>
          <Field label="Supervision por (Obligatorio)">
            <input className="input-base" value={form.supervisionPor} onChange={(e) => setForm((p) => ({ ...p, supervisionPor: e.target.value }))} />
          </Field>
          <Field label="Tecnologia (Obligatorio)">
            <input className="input-base" value={form.tecnologia} onChange={(e) => setForm((p) => ({ ...p, tecnologia: e.target.value }))} />
          </Field>
          <Field label="Codigo (Obligatorio)">
            <input className="input-base" value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))} />
          </Field>
          <Field label="Orden de trabajo (Obligatorio)">
            <input className="input-base" value={form.ordenTrabajo} onChange={(e) => setForm((p) => ({ ...p, ordenTrabajo: e.target.value }))} />
          </Field>
          <Field label="Tipo revision (Obligatorio)">
            <input className="input-base" value={form.tipoRevision} onChange={(e) => setForm((p) => ({ ...p, tipoRevision: e.target.value }))} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Ubicacion (Obligatorio)">
              <input className="input-base" value={form.ubicacion} onChange={(e) => setForm((p) => ({ ...p, ubicacion: e.target.value }))} />
            </Field>
          </div>
          <Field label="Observacion">
            <textarea className="input-base min-h-24" value={form.observacion} onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} />
          </Field>
          <Field label="Descripcion adicional observacion">
            <textarea className="input-base min-h-24" value={form.descripcionAdicionalObservacion} onChange={(e) => setForm((p) => ({ ...p, descripcionAdicionalObservacion: e.target.value }))} />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {photoFields.map((photo) => (
            <div key={photo.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <Field label={photo.label}>
                <input className="input-base" type="file" accept="image/*" onChange={(event) => void handlePhotoChange(photo.key, event)} />
              </Field>
              {resolveImageSrc(form[photo.key]) ? (
                <img src={resolveImageSrc(form[photo.key]) ?? ''} alt={photo.label} className="mt-2 h-32 w-full rounded-lg border border-slate-200 object-cover" />
              ) : (
                <p className="mt-2 text-xs text-slate-500">Sin imagen cargada.</p>
              )}
            </div>
          ))}
        </div>

        {errorForm ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorForm}</div>
        ) : null}
      </Modal>

      <Modal
        open={detalleModalOpen}
        title="Detalle de supervision"
        onClose={() => setDetalleModalOpen(false)}
        maxWidthClass="max-w-5xl"
        actions={
          <Button type="button" variant="secondary" onClick={() => setDetalleModalOpen(false)}>
            Cerrar
          </Button>
        }
      >
        {detalleQuery.isLoading ? (
          <p>Cargando detalle...</p>
        ) : detalleQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {getApiErrorMessage(detalleQuery.error, 'No se pudo cargar el detalle de supervision.')}
          </div>
        ) : detalle ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Fecha</p><p>{formatDateTime(detalle.fechaRegistro)}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Supervisor</p><p>{detalle.supervisor || detalle.idSupervisor || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Tecnico principal</p><p>{detalle.tecnicoPrincipal || detalle.idTecnicoPrincipal || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Tecnico auxiliar</p><p>{detalle.tecnicoAuxiliar || detalle.idTecnicoAuxiliar || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Tipo supervision</p><p>{detalle.tipoSupervision || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Tipo trabajo</p><p>{detalle.tipoTrabajo || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Tipo penalizacion</p><p>{detalle.tipoPenalizacion || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Supervision por</p><p>{detalle.supervisionPor || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Tecnologia</p><p>{detalle.tecnologia || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Codigo</p><p>{detalle.codigo || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Orden de trabajo</p><p>{detalle.ordenTrabajo || '-'}</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Tipo revision</p><p>{detalle.tipoRevision || '-'}</p></div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Ubicacion</p><p>{detalle.ubicacion || '-'}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Observacion</p><p>{detalle.observacion || '-'}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs text-slate-500">Descripcion adicional</p><p>{detalle.descripcionAdicionalObservacion || '-'}</p></div>

            <div className="grid gap-3 md:grid-cols-3">
              {photoFields.map((photo) => {
                const src = resolveImageSrc(detalle[photo.key])
                return (
                  <div key={photo.key} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs text-slate-500">{photo.label}</p>
                    {src ? (
                      <img src={src} alt={photo.label} className="h-28 w-full rounded-lg border border-slate-200 object-cover" />
                    ) : (
                      <p className="text-xs text-slate-500">Sin imagen.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default SupervisorSupervisionPage


