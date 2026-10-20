import type { ElementTable, RenderChildren } from 'claude-code'

import type { Choices, Group, ItemKey, Pending, Section, Window } from '../../types'
import { isWindow } from '../choices'
import { ITEMS, pieces, shortPath } from '../line'
import { SAMPLE } from '../sample'

// Everything the pane draws, read by the render hook.
export type View = {
  draft: Choices
  home: string | null
  pending: Pending | null
  isInstalled: boolean
  // The pane holds choices not saved yet.
  isUnsaved: boolean
  settingsPath: string
  opened: Partial<Record<Section, boolean>>
  width: number
}

// What the pane's controls do; the render hook binds each to the engine.
export type Actions = {
  toggleItem: (key: ItemKey) => unknown
  // A plan window: off, on, on with its reset countdown.
  cycleWindow: (window: Window) => unknown
  toggleIcons: () => unknown
  nextInterval: () => unknown
  toggleSection: (key: Section) => unknown
  // A first press shows the change and arms it, a second writes it.
  save: () => unknown
  remove: () => unknown
  close: () => unknown
}

const GROUPS: { key: Group; title: string }[] = [
  { key: 'system', title: 'System' },
  { key: 'git', title: 'Git' },
  { key: 'agent', title: 'Agent' },
]

const LABEL_WIDTH = Math.max('refresh'.length, ...ITEMS.map(item => item.label.length))

// A pictograph takes two cells, everything else one.
const cells = (char: string) => (/\p{Extended_Pictographic}/u.test(char) ? 2 : 1)

const width = (text: string) => [...text].reduce((sum, char) => sum + cells(char), 0)

// The line's pieces in rows of up to `room` cells, two spaces apart as in the line, a row breaking only between two.
export function wrap(parts: string[], room: number): string[] {
  const rows: string[] = []
  for (const part of parts) {
    const last = rows.at(-1)
    if (last !== undefined && width(last) + 2 + width(part) <= room) {
      rows[rows.length - 1] = `${last}  ${part}`
    } else {
      rows.push(part)
    }
  }

  return rows
}

const windowValue = (choices: Choices, window: Window) =>
  !choices.items.includes(window) ? 'off' : choices.resets.includes(window) ? 'with reset' : 'on'

// Two cards in context-bar's style: the settings, in collapsible sections of label and value rows with the actions
// below, and the preview, drawn from examples so every item chosen shows.
export function pane(ui: ElementTable<'terminal'>, view: View, act: Actions) {
  const { Box, Button, Text } = ui
  const { draft, pending } = view
  const inner = view.width - 4

  // A collapsible section: the title, the body below while open.
  const section = (key: Section, title: string, body: RenderChildren[]) => {
    const isOpen = view.opened[key] ?? true

    return (
      <Box key={`section-${key}`} flexDirection="column">
        <Button key={`section-${key}`} plain label={title} onPress={() => act.toggleSection(key)}>
          <Text color="inactive">
            {isOpen ? '⌄' : '›'} {title}
          </Text>
        </Button>
        {isOpen && (
          <Box key={`body-${key}`} flexDirection="column" paddingLeft={2}>
            {body}
          </Box>
        )}
      </Box>
    )
  }
  // A setting's row: its label, and its value, which moves on when clicked.
  const row = (key: string, label: string, value: string, onPress: () => unknown) => (
    <Box key={`row-${key}`} columnGap={4}>
      <Text>{label.padEnd(LABEL_WIDTH)}</Text>
      <Button key={key} plain label={value} onPress={onPress}>
        <Text color="inactive">{value}</Text>
      </Button>
    </Box>
  )
  // An action button: a grey chip, or a red one while it waits for its second press.
  const chip = (key: string, label: string, onPress: () => unknown, isArmed = false) => (
    <Button key={key} plain label={label} onPress={onPress}>
      <Text color={isArmed ? 'inverseText' : 'inactive'} backgroundColor={isArmed ? 'error' : 'subtle'}>
        {` ${label} `}
      </Text>
    </Button>
  )

  // A card: its title, a dot beside it while `isMarked`, then the body.
  const card = (key: string, title: string, isMarked: boolean, body: RenderChildren[]) => (
    <Box key={key} flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1} rowGap={1}>
      <Text key="title">
        <Text color="claude">◆</Text> <Text bold>{title}</Text>
        {isMarked && <Text color="warning"> •</Text>}
      </Text>
      {body}
    </Box>
  )
  const rows = wrap(pieces(draft, SAMPLE), inner)
  // What the armed action will do, said once in words.
  const warning =
    pending?.action === 'save'
      ? `Press again to set this as your status line in ${shortPath(view.settingsPath, view.home)}.`
      : pending?.action === 'remove'
        ? 'Press again to put back the status line you had before.'
        : null

  return (
    <Box flexDirection="column">
      {card('settings', 'Settings', view.isUnsaved, [
        <Text key="help" dimColor>
          Click a value to change it; save applies it to every session.
        </Text>,
        <Box key="sections" flexDirection="column" rowGap={1}>
          {GROUPS.map(group =>
            section(
              group.key,
              group.title,
              ITEMS.filter(item => item.group === group.key).map(item => {
                const key = item.key

                return isWindow(key)
                  ? row(`item-${key}`, item.label, `${windowValue(draft, key)} ›`, () => act.cycleWindow(key))
                  : row(`item-${key}`, item.label, draft.items.includes(key) ? 'on' : 'off', () => act.toggleItem(key))
              }),
            ),
          )}
          {section('appearance', 'Appearance', [
            row('icons', 'icons', draft.icons ? 'on ›' : 'off ›', () => act.toggleIcons()),
            row('interval', 'refresh', `every ${draft.interval}s ›`, () => act.nextInterval()),
          ])}
        </Box>,
        <Box key="actions" flexDirection="column">
          {warning !== null && <Text dimColor>{warning}</Text>}
          <Box key="buttons" columnGap={2}>
            {chip('save', pending?.action === 'save' ? 'confirm save' : 'save', () => act.save(), pending?.action === 'save')}
            {view.isInstalled &&
              chip('remove', pending?.action === 'remove' ? 'confirm remove' : 'remove', () => act.remove(), pending?.action === 'remove')}
            {chip('close', 'close', () => act.close())}
          </Box>
        </Box>,
      ])}
      {card('preview', 'Preview', false, [
        <Box key="line" flexDirection="column">
          {rows.length === 0 ? (
            <Text dimColor>nothing to show here yet</Text>
          ) : (
            rows.map((text, i) => <Text key={`row-${i}`}>{text}</Text>)
          )}
        </Box>,
      ])}
    </Box>
  )
}
