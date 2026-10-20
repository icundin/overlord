import type { Choices, ItemKey, Window } from '../types'
import { ITEMS } from './line'

// How often Claude Code may re-run the command, in seconds.
export const INTERVALS = [1, 2, 3, 5, 10] as const

// What the pane starts from before anything is saved; nothing reaches the line until the person saves.
export const FIRST_DRAFT: Choices = {
  items: ['user', 'folder', 'branch', 'ahead', 'dirty', 'model', 'context'],
  resets: [],
  icons: false,
  interval: 2,
}

export const WINDOWS: Window[] = ['session', 'weekly', 'spend']

export const isWindow = (key: ItemKey): key is Window => WINDOWS.some(one => one === key)

// Stored choices as this version reads them, or null when they no longer read as choices.
export function readChoices(stored: unknown): Choices | null {
  const kept = stored as Partial<Choices> | undefined
  if (typeof kept !== 'object' || kept === null || !Array.isArray(kept.items)) {
    return null
  }
  const items = new Set(kept.items)
  const resets = new Set(Array.isArray(kept.resets) ? kept.resets : [])

  return {
    items: ITEMS.filter(item => items.has(item.key)).map(item => item.key),
    resets: WINDOWS.filter(window => resets.has(window) && items.has(window)),
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

// A plan window moved on: off, then on, then on with how long until it resets, then off again.
export function cycledWindow(choices: Choices, window: Window): Choices {
  const isOn = choices.items.includes(window)
  const hasReset = choices.resets.includes(window)

  return {
    ...choices,
    items: isOn && !hasReset ? choices.items : toggled(choices.items, window),
    resets: isOn && !hasReset ? WINDOWS.filter(one => one === window || choices.resets.includes(one)) : choices.resets.filter(one => one !== window),
  }
}

export function nextInterval(seconds: number): number {
  return INTERVALS[(INTERVALS.findIndex(one => one === seconds) + 1) % INTERVALS.length] ?? FIRST_DRAFT.interval
}
