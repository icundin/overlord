import type { ElementTable, RenderChildren } from 'claude-code'

import type { BarSettings, Confirmable, Growth, Panel, Row, Section, Spend, Tally, Usage } from '../../types'
import { DEFAULT_OPEN } from '../defaults'
import { balanced } from '../layout'
import { lighter } from '../themes'

// Everything the band draws, read by the render hook.
export type View = {
  usage: Usage
  width: number
  effort: string | null
  open: Panel | null
  opened: Partial<Record<Section, boolean>>
  confirming: Confirmable | null
  tally: Tally | null
  spend: Spend | null
  limitsAt: number | null
  now: number
  fill: number
  isLight: boolean
  models: string[]
  growth: Growth
  runningAgents: number
  settings: BarSettings
  fieldRevision: number
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
  // Asks first, then runs /compact.
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
  // The band draws on the terminal only.
  ui: ElementTable<'terminal'>
  view: View
  act: Actions
  // Inside the band's border and padding.
  inner: number
  // Inside the open card's border and padding, beside its close button.
  card: number
  // Shade glyphs on the theme's background read as a darker version of their color.
  shadeBehind: 'white' | 'black'
}

// "[x]" and the gap before it.
export const CLOSE_WIDTH = 4

// A row's color in the bar, the legend and the hover cards: the compact buffer in the warning color while
// auto-compact is on, the free space and deferred schemas faint.
export function swatchOf(row: Row, isAutoCompact: boolean): string {
  if (row.kind === 'used') {
    return row.color
  }

  return row.kind === 'buffer' ? (isAutoCompact ? 'warning' : 'inactive') : 'subtle'
}

// A bar's filled cells in `color`, in the bar style: shade glyphs on the theme's background, which the color fills under
// the pointer; or full blocks, which turn lighter (a theme key, with no hex to lighten, dims).
export function filled({ view, shadeBehind }: Pick<Kit, 'view' | 'shadeBehind'>, color: string) {
  const light = lighter(color)

  return view.settings.barStyle === 'solid'
    ? { glyph: '█', style: { color }, hover: light === null ? { dimColor: true } : { color: light } }
    : { glyph: '▓', style: { color, backgroundColor: shadeBehind }, hover: { backgroundColor: color } }
}

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
export function parts({ ui: { Box, Button, Text }, view, act, card }: Kit) {
  // A collapsible section: the title and a short summary, the body below while open. The summary's parts are
  // separated by ` · `, as in the header; a part that lists several things joins them with `, `.
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
              {i === 0 ? '  ' : ' · '}
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

  // A card's closing note, wrapped into even lines.
  const tip = (text: string) => (
    <Box key="tip" flexDirection="column">
      {balanced(text, card).map((line, i) => (
        <Text key={`tip-${i}`} dimColor>
          {line}
        </Text>
      ))}
    </Box>
  )

  return { section, chip, option, headerButton, dot, tip }
}
