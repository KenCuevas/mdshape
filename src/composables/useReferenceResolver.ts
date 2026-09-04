import { useRouter } from 'vue-router'
import { useCatalog } from './useCatalog'

/**
 * Maps an identifier found in markdown (`PUB-S03`, `SEC-01`) to an in-app
 * href, so the renderer can turn it into a link. Unknown ids stay as text.
 */
export function useReferenceResolver(): (id: string) => string | null {
  const router = useRouter()
  const { getScenario, getFinding } = useCatalog()
  return (id: string) => {
    if (getScenario(id)) return router.resolve({ name: 'board', query: { s: id } }).href
    if (getFinding(id)) return router.resolve({ name: 'finding', params: { id } }).href
    return null
  }
}
