import type { ScenarioType, Severity, BoardStatus, Priority } from '@/types'

export const TYPE_LABELS: Record<ScenarioType, string> = {
  positive: 'Positivo',
  negative: 'Negativo',
  security: 'Seguridad',
  error: 'Error',
}

export const TYPE_PLURAL_LABELS: Record<ScenarioType, string> = {
  positive: 'Pruebas positivas',
  negative: 'Pruebas negativas',
  security: 'Pruebas de seguridad',
  error: 'Pruebas de error',
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export function severityLabel(severity: Severity | null): string {
  return severity ? SEVERITY_LABELS[severity] : 'Sin severidad'
}

export function severityClass(severity: Severity | null): string {
  return severity ? `sev-${severity}` : 'sev-none'
}

export const STATUS_LABELS: Record<BoardStatus, string> = {
  todo: 'Por probar',
  doing: 'En curso',
  fail: 'Falla',
  pass: 'Pasa',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export function priorityLabel(priority: Priority | null): string {
  return priority ? PRIORITY_LABELS[priority] : 'Sin prioridad'
}
