import { IfNode } from '../if_else'
import { ConditionNode } from './condition'

import type { SandstoneCore } from '#core'

export class OrNode extends ConditionNode {
  variable

  constructor(sandstoneCore: SandstoneCore, public conditions: ConditionNode[]) {
    super(sandstoneCore)

    const { Variable, _ } = sandstoneCore.pack

    this.variable = Variable(undefined, 'condition')

    const currentNode = this.sandstoneCore.getCurrentMCFunctionOrThrow()

    currentNode.resource.push(() => {
      this.variable.reset()

      for (const condition of conditions) {
        // eslint-disable-next-line no-new
        new IfNode(sandstoneCore, condition, () => this.variable.add(1), false)
      }
    })
  }

  getValue = (negated?: boolean | undefined) => this.variable.matches('1..')._toMinecraftCondition().getValue(negated)
}
