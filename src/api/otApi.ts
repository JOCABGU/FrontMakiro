import api from './http'
import { normalizeArrayResponse } from './apiResponse'
import type {
  OtCreatePayload,
  OtCreateResult,
  OtCreateResponseEnvelope,
  OtDetail,
  OtFechaPayload,
  OtListParams,
  OtMaterial,
  OtRealizadaPayload,
  OtSummary,
  OtUpdatePayload,
} from '../types/ot'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null

const pickValue = (record: UnknownRecord, keys: string[]): unknown => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== undefined && record[key] !== null) {
      return record[key]
    }
  }
  return undefined
}

const readString = (record: UnknownRecord, keys: string[]): string => {
  const value = pickValue(record, keys)
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

const readNumber = (record: UnknownRecord, keys: string[]): number | undefined => {
  const value = pickValue(record, keys)
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const readBoolean = (record: UnknownRecord, keys: string[]): boolean | undefined => {
  const value = pickValue(record, keys)
  if (value === undefined || value === null) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'si', 's'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false
  }
  return undefined
}

const unwrapData = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return payload.data
  }
  return payload
}

const mapOtSummary = (row: UnknownRecord): OtSummary => {
  const id = readNumber(row, ['id', 'Id', 'idVenta', 'Id_Venta', 'idOT', 'IdOT']) ?? 0
  const codigo = readString(row, ['codigo', 'Codigo', 'ordenTrabajo', 'OrdenTrabajo', 'numeroOrden', 'NumeroOrden'])
  const fecha = readString(row, ['fecha', 'Fecha', 'fechaEjecucion', 'Fecha_Ejecucion', 'FechaEjecucion'])
  const cliente = readString(row, ['cliente', 'Cliente', 'nombreCliente', 'NombreCliente'])
  const tecnico = readString(row, ['tecnico', 'Tecnico', 'nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario'])
  const estado = readString(row, ['estado', 'Estado', 'estadoOt', 'Estado_OT'])
  const direccion = readString(row, ['direccion', 'Direccion', 'domicilio'])
  const ruta = readString(row, ['ruta', 'Ruta', 'grupo', 'Grupo'])
  const idUsuario = readNumber(row, ['idUsuario', 'Id_Usuario', 'idTecnico', 'Id_Tecnico', 'idVendedor', 'Id_Vendedor'])
  const nombreUsuario = readString(row, ['nombreUsuario', 'NombreUsuario', 'usuario', 'Usuario'])
  const pendiente = readBoolean(row, ['pendiente', 'Pendiente', 'otRealizada', 'OTRealizada'])

  return {
    ...row,
    id,
    codigo,
    fecha,
    cliente,
    tecnico,
    estado,
    direccion: direccion || undefined,
    ruta: ruta || undefined,
    idUsuario,
    nombreUsuario: nombreUsuario || undefined,
    ordenTrabajo: codigo || undefined,
    pendiente,
  }
}

const mapOtHeader = (row: UnknownRecord): OtDetail['header'] => {
  const mapped = mapOtSummary(row)
  return {
    id: mapped.id,
    codigo: mapped.codigo || String(mapped.id ?? ''),
    fecha: mapped.fecha,
    cliente: mapped.cliente,
    direccion: mapped.direccion ?? '',
    tecnico: mapped.tecnico,
    estado: mapped.estado,
    observaciones: readString(row, ['observacion', 'Observacion', 'observaciones', 'Observaciones']) || undefined,
  }
}

const mapMaterial = (row: UnknownRecord): OtMaterial => {
  return {
    ...row,
    id: readNumber(row, ['id', 'Id', 'idDetalle', 'IdDetalle']) ?? 0,
    codigo: readString(row, ['codigo', 'Codigo', 'codigoMaterial', 'CodigoMaterial']),
    descripcion: readString(row, ['descripcion', 'Descripcion', 'material', 'Material']),
    cantidad: readNumber(row, ['cantidad', 'Cantidad', 'cant', 'Cant']) ?? 0,
    unidad: readString(row, ['unidad', 'Unidad', 'uMedida', 'UMedida']),
  }
}

const sanitizeParams = (params?: OtListParams): Record<string, string | number | boolean> | undefined => {
  if (!params) return undefined
  const nextEntries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  if (nextEntries.length === 0) return undefined
  return Object.fromEntries(nextEntries) as Record<string, string | number | boolean>
}

export const fetchOtList = async (params?: OtListParams): Promise<OtSummary[]> => {
  const { data } = await api.get('/ot', {
    params: sanitizeParams(params),
  })
  const rows = normalizeArrayResponse<UnknownRecord>(data)
  return rows.map(mapOtSummary)
}

export const fetchOtDetail = async (id: number): Promise<OtDetail> => {
  const { data } = await api.get(`/ot/${id}`)
  const raw = unwrapData(data)
  if (!isRecord(raw)) {
    throw new Error('Respuesta de detalle OT sin formato esperado.')
  }
  return { header: mapOtHeader(raw) }
}

export type OtMaterialTipo = 'instalados' | 'retirados' | 'excedentes' | 'cargo-usuario'

export const fetchOtMateriales = async (id: number, tipo: OtMaterialTipo): Promise<OtMaterial[]> => {
  const { data } = await api.get(`/ot/${id}/${tipo}`)
  const rows = normalizeArrayResponse<UnknownRecord>(data)
  return rows.map(mapMaterial)
}

export const createOtRealizada = async (payload: OtRealizadaPayload): Promise<void> => {
  await api.post('/ot/realizada', payload)
}

export const updateOtDatos = async (id: number, payload: OtUpdatePayload): Promise<void> => {
  await api.put(`/ot/${id}/datos`, payload)
}

export const updateOtFecha = async (id: number, payload: OtFechaPayload): Promise<void> => {
  await api.put(`/ot/${id}/fecha`, payload)
}

export const deleteOt = async (
  id: number,
  modo: 'con_cu' | 'solo_cu',
  idUsuario?: number
): Promise<void> => {
  const params: Record<string, string | number> = { modo }
  if (idUsuario !== undefined && idUsuario !== null) {
    params.usuario = idUsuario
  }
  await api.delete(`/ot/${id}`, { params })
}

const readEnvelopeNumber = (
  record: UnknownRecord,
  directKeys: string[],
  nestedKeys: string[]
): number | null => {
  const directValue = pickValue(record, directKeys)
  if (typeof directValue === 'number' && Number.isFinite(directValue)) return directValue
  if (typeof directValue === 'string') {
    const parsed = Number(directValue)
    if (Number.isFinite(parsed)) return parsed
  }

  const nestedCandidate = pickValue(record, ['data'])
  if (isRecord(nestedCandidate)) {
    const nestedValue = pickValue(nestedCandidate, nestedKeys)
    if (typeof nestedValue === 'number' && Number.isFinite(nestedValue)) return nestedValue
    if (typeof nestedValue === 'string') {
      const parsed = Number(nestedValue)
      if (Number.isFinite(parsed)) return parsed
    }
  }

  return null
}

export const createOt = async (payload: OtCreatePayload): Promise<OtCreateResult> => {
  const normalizedPayload: OtCreatePayload = {
    ...payload,
    tieneObservacion: payload.tieneObservacion ?? false,
  }
  const { data } = await api.post<OtCreateResponseEnvelope | UnknownRecord>('/ot', normalizedPayload)
  const payloadRecord = isRecord(data) ? data : {}

  const idVenta = readEnvelopeNumber(
    payloadRecord,
    ['idVenta', 'Id_Venta'],
    ['idVenta', 'Id_Venta']
  )
  const ordenTrabajo = readEnvelopeNumber(
    payloadRecord,
    ['ordenTrabajo', 'OrdenTrabajo'],
    ['ordenTrabajo', 'OrdenTrabajo']
  )

  return {
    idVenta,
    ordenTrabajo,
  }
}
