import { CUADRILLAS_PRINCIPAL, CUADRILLAS_PRINCIPAL_PAGES } from './CuadrillasPrincipal'
import { OT_PRINCIPAL, OT_PRINCIPAL_PAGES } from './OtPrincipal'
import { PRIVILEGIOS_PRINCIPAL, PRIVILEGIOS_PRINCIPAL_PAGES } from './PrivilegiosPrincipal'
import { PRUEBA_PRINCIPAL, PRUEBA_PRINCIPAL_PAGES } from './PruebaPrincipal'

export type PrincipalGroup = {
  key: string
  pages: string[]
}

export const principalGroups: PrincipalGroup[] = [
  { key: OT_PRINCIPAL, pages: OT_PRINCIPAL_PAGES },
  { key: CUADRILLAS_PRINCIPAL, pages: CUADRILLAS_PRINCIPAL_PAGES },
  { key: PRIVILEGIOS_PRINCIPAL, pages: PRIVILEGIOS_PRINCIPAL_PAGES },
  { key: PRUEBA_PRINCIPAL, pages: PRUEBA_PRINCIPAL_PAGES },
]

export const principalGroupByKey: Record<string, string[]> = principalGroups.reduce<Record<string, string[]>>((acc, item) => {
  acc[item.key.toLowerCase()] = item.pages
  return acc
}, {})

export const principalGroupKeys: string[] = principalGroups.map((group) => group.key)

export const expandPrincipalPageNames = (rawNames: string[]): string[] => {
  const out = new Set<string>()
  for (const rawName of rawNames) {
    const value = rawName.trim()
    if (!value) continue
    out.add(value)
    const mapped = principalGroupByKey[value.toLowerCase()]
    if (!mapped?.length) continue
    for (const pageName of mapped) {
      out.add(pageName)
    }
  }
  return Array.from(out)
}

export const inferPrincipalKeys = (rawNames: string[]): string[] => {
  const normalizedRaw = new Set(rawNames.map((item) => item.trim().toLowerCase()).filter(Boolean))
  const out = new Set<string>()

  for (const group of principalGroups) {
    const keyNormalized = group.key.toLowerCase()
    if (normalizedRaw.has(keyNormalized)) {
      out.add(group.key)
      continue
    }
    const hasAnyChild = group.pages.some((page) => normalizedRaw.has(page.toLowerCase()))
    if (hasAnyChild) {
      out.add(group.key)
    }
  }

  return Array.from(out)
}
