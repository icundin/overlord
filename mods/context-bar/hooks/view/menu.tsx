import { EFFORT_LEVELS, modelAlias } from '../format'
import { parts } from './kit'
import type { Kit } from './kit'

// The choices `/model` or `/effort` takes, the current one marked; a click runs the command.
export function menuCard(kit: Kit, command: 'model' | 'effort') {
  const { Box, Text } = kit.ui
  const { option } = parts(kit)
  const current = kit.view.usage
  const list = command === 'model' ? kit.view.models : EFFORT_LEVELS
  const selected = command === 'model' ? modelAlias(current.model, current.window) : kit.view.effort

  return (
    <Box key="menu" flexWrap="wrap" columnGap={2}>
      <Text key="title" dimColor>
        {command}
      </Text>
      {list.map(one => option(`${command}-${one}`, one, one === selected, () => kit.act.choose(command, one)))}
    </Box>
  )
}
