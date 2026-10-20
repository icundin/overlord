import type { Choices, ItemKey } from '../types'
import { ITEMS } from './line'

// How often Claude Code may re-run the command, in seconds.
export const INTERVALS = [1, 2, 3, 5, 10] as const

// What the pane starts from before anything is saved; nothing reaches the line until the person saves.
export const FIRST_DRAFT: Choices = { items: ['user', 'folder', 'branch', 'ahead', 'dirty', 'model', 'context'], icons: false, interval: 2 }

// Stored choices as this version reads them, or null when they no longer read as choices.
export function readChoices(stored: unknown): Choices | null {
  const kept = stored as Partial<Choices> | undefined
  if (typeof kept !== 'object' || kept === null || !Array.isArray(kept.items)) {
    return null
  }
  const items = new Set(kept.items)

  return {
    items: ITEMS.filter(item => items.has(item.key)).map(item => item.key),
    icons: kept.icons === true,
    interval: INTERVALS.find(seconds => seconds === kept.interval) ?? FIRST_DRAFT.interval,
  }
}

// The items with `key` turned on or off, kept in the line's order so the same set always reads the same.
export function toggled(items: ItemKey[], key: ItemKey): ItemKey[] {
  const next = new Set(items)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }

  return ITEMS.filter(item => next.has(item.key)).map(item => item.key)
}

export function nextInterval(seconds: number): number {
  return INTERVALS[(INTERVALS.findIndex(one => one === seconds) + 1) % INTERVALS.length] ?? FIRST_DRAFT.interval
}
