import type { BarSettings, Section } from '../types'

// Whether a section starts open: each card's main section, and every settings group.
export const DEFAULT_OPEN: Record<Section, boolean> = {
  categories: true,
  mcp: false,
  memory: false,
  skills: false,
  general: true,
  warnings: true,
  appearance: true,
  limits: true,
  session: false,
  agents: false,
  agentsMore: false,
  tokens: false,
}

export const DEFAULT_SETTINGS: BarSettings = {
  showOnStart: true,
  contextWarnPercent: 80,
  limitWarnPercent: 90,
  costWarnUsd: 50,
  barStyle: 'shaded',
  displayMode: 'auto',
  categoryTheme: 'default',
  customColors: {},
}
