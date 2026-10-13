import type { ElementTable, RenderChildren } from 'claude-code'

import type { BarSettings, Growth, Panel, Section, Tally, Usage } from '../../types'
import { DEFAULT_OPEN } from '../defaults'

// Everything the band draws, read by the render hook.
export type View = {
  usage: Usage
  width: number
  effort: string | null
  open: Panel | null
  opened: Partial<Record<Section, boolean>>
  isConfirmingClear: boolean
  tally: Tally | null
  now: number
  fill: number
  isLight: boolean
  models: string[]
  growth: Growth
  runningAgents: number
  settings: BarSettings
  fieldRevision: number
  isConfirmingReset: boolean
  // Each category's color in the default theme, by name: what a custom color falls back to.
  defaultColors: Record<string, string>
}

// What the band's buttons do; the render hook binds each to the engine.
export type Actions = {
  toggle: (which: Panel) => unknown
  toggleSection: (key: Section) => unknown
  close: () => unknown
  choose: (command: 'model' | 'effort', option: string) => unknown
  showContext: () => unknown
  compact: () => unknown
  newSession: () => unknown
  changeSetting: (change: Partial<BarSettings>) => unknown
  // A notification for a settings field: the value it saved, or what it takes when the text does not parse.
  notify: (message: string) => unknown
  // After Enter in a settings field.
  submitted: () => unknown
  // Asks first, then puts every setting back to its default.
  resetSettings: () => unknown
}

// What every card draws with: the surface's elements, the band's state and actions, and the cells it has.
export type Kit = {
  // The band is raised on the terminal and desktop surfaces only, both of which have an Input.
  ui: ElementTable<'terminal' | 'desktop'>
  view: View
  act: Actions
  // Inside the band's border and padding.
  inner: number
  // Shade glyphs on the theme's background read as a darker version of their color.
  shadeBehind: 'white' | 'black'
}

// "[x]" and the gap before it.
export const CLOSE_WIDTH = 4

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size))
  }

  return out
}

export function cycle<T extends string>(options: readonly T[], value: T): T {
  return options[(options.indexOf(value) + 1) % options.length] ?? value
}

// The pieces the cards share. A Button inverts under the pointer, so every label is grey: inverted, it is a grey
// background, not a white one.
export function parts({ ui: { Box, Button, Text }, view, act }: Kit) {
  // A collapsible section: the title and a short summary, the body below while open.
  const section = (key: Section, title: string, summary: string[], body: () => RenderChildren) => {
    const isOpen = view.opened[key] ?? DEFAULT_OPEN[key]

    return (
      <Box key={`section-${key}`} flexDirection="column">
        <Button key={`section-${key}`} plain label={title} onPress={() => act.toggleSection(key)}>
          <Text color="inactive">
            {isOpen ? '⌄' : '›'} {title}
          </Text>
          {summary.map((part, i) => (
            <Text key={`summary-${i}`} color="inactive" bold={i === 0}>
              {'  '}
              {part}
            </Text>
          ))}
        </Button>
        {isOpen && (
          <Box key={`body-${key}`} flexDirection="column" paddingLeft={2}>
            {body()}
          </Box>
        )}
      </Box>
    )
  }

  // An action button: a grey chip, or a red one for an action that needs confirming.
  const chip = (key: string, label: string, onPress: () => unknown, isDanger = false) => (
    <Button key={key} plain label={label} onPress={onPress}>
      <Text color={isDanger ? 'inverseText' : 'inactive'} backgroundColor={isDanger ? 'error' : 'subtle'}>
        {` ${label} `}
      </Text>
    </Button>
  )

  // One of a row of choices: the selected one in the accent color, the others grey.
  const option = (key: string, label: string, isSelected: boolean, onPress: () => unknown) => (
    <Button key={key} plain label={label} onPress={onPress}>
      <Text bold={isSelected} color={isSelected ? 'inverseText' : 'inactive'} backgroundColor={isSelected ? 'permission' : 'subtle'}>
        {` ${label} `}
      </Text>
    </Button>
  )

  // A header label; the open card's is bold.
  const headerButton = (key: string, label: string, isActive: boolean, onPress: () => unknown) => (
    <Button key={key} plain label={label} onPress={onPress}>
      <Text color="inactive" bold={isActive}>
        {label}
      </Text>
    </Button>
  )

  const dot = (key: string) => (
    <Text key={key} dimColor>
      ·
    </Text>
  )

  return { section, chip, option, headerButton, dot }
}
