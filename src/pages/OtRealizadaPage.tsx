import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import Button from '../components/common/Button'
import Field from '../components/common/Field'
import FormCard from '../components/common/FormCard'
import { createOtRealizada } from '../api/otApi'
import { fetchEstados, type CatalogItem } from '../api/catalogApi'

const normalizeKey = (value: string): string => value.replace(/[_\-\s]/g, '').toLowerCase()

const readCatalogValue = (row: CatalogItem, keys: string[]): unknown => {
  const normalizedKeys = keys.map(normalizeKey)
  const rowEntries = Object.entries(row)
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  for (const [entryKey, entryValue] of rowEntries) {
    if (!normalizedKeys.includes(normalizeKey(entryKey))) continue
    if (entryValue !== undefined && entryValue !== null && entryValue !== '') return entryValue
  }
  return undefined
}

const readCatalogString = (row: CatalogItem, keys: string[]): string => {
  const value = readCatalogValue(row, keys)
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : String(value)
}

const mapOptions = (items: CatalogItem[]): Array<{ value: string; label: string }> => {
  return items
    .map((item) => {
      const id = readCatalogValue(item, ['idEstado', 'IdEstado', 'Id_Estado', 'id_estado', 'id', 'Id'])
      if (id === undefined || id === null || id === '') return null
      const label = readCatalogString(item, ['estado', 'Estado', 'nombre', 'Nombre', 'descripcion', 'Descripcion'])
      return { value: String(id), label: label || String(id) }
    })
    .filter((item): item is { value: string; label: string } => Boolean(item))
}

const OtRealizadaPage = () => {
  const [numeroOrden, setNumeroOrden] = useState('')
  const [idEstado, setIdEstado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const estadosQuery = useQuery({
    queryKey: ['catalogos-estados-ot-realizada'],
    queryFn: fetchEstados,
  })

  const estadoOptions = useMemo(() => mapOptions(estadosQuery.data ?? []), [estadosQuery.data])

  const mutation = useMutation({
    mutationFn: createOtRealizada,
    onSuccess: () => {
      setError(null)
      setSuccess('OT actualizada como realizada.')
    },
    onError: () => {
      setSuccess(null)
      setError('No se pudo actualizar la OT como realizada.')
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSuccess(null)
    setError(null)
    const parsedEstado = Number(idEstado)
    if (!numeroOrden.trim() || !Number.isFinite(parsedEstado) || !observacion.trim()) {
      setError('Numero de OT, estado y observacion son requeridos.')
      return
    }
    mutation.mutate({
      numeroOrden: numeroOrden.trim(),
      idEstado: parsedEstado,
      observacion: observacion.trim(),
    })
  }

  return (
    <div className="bento-page">
      <div className="bento-page-head">
        <h2 className="text-2xl font-semibold text-slate-900">Registrar OT realizada</h2>
        <p className="text-sm text-slate-500">Actualiza observacion y estado de la orden.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <FormCard title="Datos de actualizacion" description="Campos requeridos por la API /ot/realizada.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Numero OT">
              <input className="input-base" value={numeroOrden} onChange={(event) => setNumeroOrden(event.target.value)} />
            </Field>
            <Field label="Estado">
              <select
                className="input-base"
                value={idEstado}
                onChange={(event) => setIdEstado(event.target.value)}
                disabled={estadosQuery.isLoading}
              >
                <option value="">{estadosQuery.isLoading ? 'Cargando estados...' : 'Selecciona estado'}</option>
                {estadoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Observacion">
              <textarea
                className="input-base h-24 resize-none"
                value={observacion}
                onChange={(event) => setObservacion(event.target.value)}
              />
            </Field>
          </div>
        </FormCard>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>
        ) : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar OT'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default OtRealizadaPage
