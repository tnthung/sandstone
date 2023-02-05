import { CommandNode } from '@core/nodes'

import { CommandArguments } from '../helpers'

export class SetIdleTimeoutCommandNode extends CommandNode {
  command = 'setidletimeout' as const
}

export class SetIdleTimeoutCommand extends CommandArguments {
  public NodeType = SetIdleTimeoutCommandNode

  setidletimeout = (minutes: number) => this.finalCommand([minutes])
}
