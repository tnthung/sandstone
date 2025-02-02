import { FunctionCommandNode } from '#commands'
import { MCFunctionClass } from '#core'

import { GenericSandstoneVisitor } from './visitor'

import type { MCFunctionNode } from '#core'

/**
 * Initialize the objectives of the pack.
 */
export class InlineFunctionCallVisitor extends GenericSandstoneVisitor {
  deletedMCFunction: [deleted: MCFunctionClass, new: MCFunctionClass] | null = null

  visitFunctionCommandNode = (node: FunctionCommandNode) => {
    const mcFunction = node.args[0]
    if (!this.deletedMCFunction) {
      return node
    }

    const [deleted, newOne] = this.deletedMCFunction
    if (node.args[0] instanceof MCFunctionClass && node.args[0] === deleted) {
      node.args[0] = newOne
    }

    return node
  }

  visitMCFunctionNode = (functionNode: MCFunctionNode) => {
    if (functionNode.body.length > 1) {
      return functionNode
    }

    const node = functionNode.body[0]

    if (
      node instanceof FunctionCommandNode
      && node.args[0] instanceof MCFunctionClass
      && node.args[0]['creator'] === 'sandstone'
    ) {
      /*
       * The current function has the following body:
       * /function FOO
       * where `FOO` has been created by Sandstone.
       *
       * Now, we can delete the Sandstone-created function
       */
      const sandstoneCreatedFunction = node.args[0]
      this.core.resourceNodes.delete(sandstoneCreatedFunction['node'])

      this.deletedMCFunction = [sandstoneCreatedFunction, functionNode.resource]

      // Copy the body of the Sandstone function to the current one
      functionNode.body = sandstoneCreatedFunction['node'].body
    }

    this.genericVisit(functionNode)

    this.deletedMCFunction = null
    return functionNode
  }
}
