import { makeCallable, makeClassCallable } from '#utils'

import { ContainerNode } from '../../nodes'
import {
  CallableResourceClass,
} from '../resource'
import { TagClass } from './tag'

import type { TimeArgument } from '#arguments/basics'
import type { ScheduleType } from '#commands'
import type { FinalCommandOutput } from '#commands/helpers'
import type {
  ContainerCommandNode, Node, ResourceClassArguments, ResourceNode, SandstoneCore,
} from '#core'
import type { MakeInstanceCallable } from '#utils'

const tags: Record<string, TagClass<'functions'>> = {}

/**
 * A node representing a Minecraft function.
 */
export class MCFunctionNode extends ContainerNode implements ResourceNode {
  contextStack: (ContainerNode | ContainerCommandNode)[]

  constructor(sandstoneCore: SandstoneCore, public resource: MCFunctionClass) {
    super(sandstoneCore)
    this.contextStack = [this]
  }

  /**
   * The currently active context.
   *
   * For example, the current context is the function body if the function is not in a loop.
   * If the function is in a loop, the current context is the loop body.
   */
  get currentContext() {
    return this.contextStack[this.contextStack.length - 1]
  }

  /**
   * Sequentially add node(s) to the end of the body of the function.
   *
   * @param node The node(s) to add.
   */
  appendNode = (node: Node | Node[]) => {
    if (Array.isArray(node)) {
      for (const _node of node) {
        this.currentContext.append(_node)
      }
    } else {
      this.currentContext.append(node)
    }
  }

  /**
   * Sequentially add node(s) to the beginning of the body of the function.
   *
   * @param node The node(s) to add.
   */
  prependNode = (node: Node | Node[]) => {
    if (Array.isArray(node)) {
      for (const _node of node) {
        this.currentContext.prepend(_node)
      }
    } else {
      this.currentContext.prepend(node)
    }
  }

  /**
   * Switch the current context to the given node.
   * Also adds the node to the body of the current context, except if addNode is False.
   *
   * @param node The node to switch to.
   * @param addNode Whether to add the node to the body of the current context.
   */
  enterContext = (node: ContainerNode | ContainerCommandNode, addNode: boolean = true) => {
    if (addNode) {
      this.currentContext.append(node)
    }

    this.contextStack.push(node)
  }

  /**
   * Switch the current context to the given node, run the given function, and switch back to the original context.
   * Also adds the node to the body of the current context, except if addNode is False.
   *
   * @param node The node to switch to.
   * @param callback The function to run.
   * @param addNode Whether to add the node to the body of the current context.
   *
   * @return The previously active context.
   * @throws Error if there is no previous context.
   */
  insideContext = (node: ContainerNode | ContainerCommandNode, callback: () => void, addNode: boolean = true) => {
    this.enterContext(node, addNode)
    callback()
    return this.exitContext()
  }

  /**
   * Leave the current context, and return to the previous one.
   *
   * @return The previously active context.
   * @throws Error if there is no previous context.
   */
  exitContext = () => {
    if (this.contextStack.length === 0) {
      throw new Error('No previous context to return to.')
    }

    if (this.contextStack.length === 1) {
      throw new Error('It is forbidden for a MCFunction to exit its latest context, since the MCFunction itself must be in the context stack.')
    }

    return this.contextStack.pop()
  }

  getValue = () => this.body.filter((node) => node.getValue() !== null).map((node) => node.getValue()).join('\n')
}

export type MCFunctionClassArguments = ({
  /**
   * The callback to run when the MCFunction is generated.
   *
   * @default () => {}
   */
  callback?: () => void

  /**
   * If true, then the function will only be created if it is called from another function. TODO: implement this
   */
  lazy?: boolean

  /**
   * Whether the function should run when the datapack loads.
   *
   * Defaults to `true` if `runEvery` is specified, else `false`.
   */
  runOnLoad?: boolean

  /**
   * The function tags to put this function in.
   */
  tags?: readonly (string | TagClass<'functions'>)[]

  /**
   * If specified, the function will run every given time.
   *
   * If `runOnLoad` is unspecified or `true`, then it will run on load too.
   *
   * If `runOnLoad` is `false`, you will have to manually start it.
   *
   * You can stop the automatic scheduling by running `theFunction.clearSchedule()`.
   *
   * @example
   *
   * // Run every 5 ticks, including on datapack load.
   * {
   *   runEvery: 5,
   * }
   *
   * // Run every 5 ticks, but wait 5 ticks before datapack loads for 1st execution.
   * {
   *   runEvery: 5,
   *   runOnLoad: false,
   * }
   *
   * // Run every 8 seconds
   * {
   *   runEvery: '8s'
   * }
   */
  runEvery?: TimeArgument

  /**
   * Whether the function should run each tick.
   */
  runEveryTick?: boolean

  /**
   * Optional. Whether to retain the execution context through async calls. Defaults to false.
   *
   * @warn **Waiting on Smithed Dimensions for root chunk to be functional.**
   */
  asyncContext?: boolean
}) & ResourceClassArguments<'function'>

export class _RawMCFunctionClass extends CallableResourceClass<MCFunctionNode> {
  public callback: NonNullable<MCFunctionClassArguments['callback']>

  public nested = 0

  public asyncContext: NonNullable<MCFunctionClassArguments['asyncContext']>

  protected tags: MCFunctionClassArguments['tags']

  protected lazy: boolean

  constructor(core: SandstoneCore, name: string, args: MCFunctionClassArguments) {
    super(core, { packType: core.pack.dataPack(), extension: 'mcfunction' }, MCFunctionNode, core.pack.resourceToPath(name, ['functions']), {
      ...args,
      addToSandstoneCore: args.lazy ? false : args.addToSandstoneCore,
    })

    this.callback = args.callback ?? (() => {})

    if (this.nested !== 0) {
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < this.nested; i++) {
        this.node.exitContext()
      }
    }

    this.asyncContext = args.asyncContext === undefined ? false : args.asyncContext

    this.lazy = !!args.lazy
    this.addToSandstoneCore = !!args.addToSandstoneCore
    this.tags = args.tags

    if (args.runOnLoad) {
      core.pack.loadTags.load.push(this.name)
    } else if (args.runEveryTick) {
      core.pack.registerTickedCommands('1t', () => this.__call__())
    }

    if (args.tags) {
      for (const tag of args.tags) {
        this.addToTag(`${tag}`)
      }
    }

    if (!args.runEveryTick && args.runEvery) {
      core.pack.registerTickedCommands(args.runEvery, () => this.__call__())
    }

    this.handleConflicts()
  }

  protected generate = () => {
    if (this.node.body.length > 0) {
      /*
       * Don't generate resource if the node already has commands.
       * Else, this might generate the nodes twice with fast refresh
       */
      // return
    }

    // TODO: Fix this

    // Doing .apply allows users to use `this()` inside the callback to call the MCFunction!

    // this.asCallable.push(() => this.callback.apply(this.asCallable))

    this.push(this.callback)
  }

  protected addToTag = (tag: string) => {
    if (tags[tag]) {
      tags[tag].push(this.name)
    } else {
      tags[tag] = new TagClass(this.core, 'functions', tag, {
        values: [this.name], addToSandstoneCore: true, creator: 'sandstone', onConflict: 'append',
      })
    }
  }

  __call__ = (): FinalCommandOutput => this.commands.functionCmd(this.name)

  schedule = {
    clear: (): FinalCommandOutput => this.commands.schedule.clear(this.name),

    function: (delay: TimeArgument, type: ScheduleType): FinalCommandOutput => this.commands.schedule.function(this.name, delay, type),
  }

  get push() {
    const commands = new Proxy(this.pack.commands, {
      get: (target, p, receiver) => {
        this.core.enterMCFunction(this)
        this.core.insideContext(this.node, () => (this.pack.commands as any)[p], false)
        this.core.exitMCFunction()
      },
    })

    return makeCallable(commands, (...contents: _RawMCFunctionClass[] | [() => void]) => {
      if (contents[0] instanceof _RawMCFunctionClass) {
        for (const mcfunction of contents as _RawMCFunctionClass[]) {
          this.node.body.push(...mcfunction.node.body)
        }
      } else {
        this.core.enterMCFunction(this)
        this.core.insideContext(this.node, contents[0], false)
        this.core.exitMCFunction()
      }
    }, true)
  }

  get unshift() {
    const fake = new MCFunctionClass(this.core, 'fake', {
      addToSandstoneCore: false,
      creator: 'sandstone',
      onConflict: 'ignore',
    })

    const commands = new Proxy(this.pack.commands, {
      get: (target, p, receiver) => {
        this.core.enterMCFunction(fake)
        this.core.insideContext(fake.node, () => (this.pack.commands as any)[p], false)
        this.core.exitMCFunction()
        this.node.body.unshift(...fake.node.body)
      },
    })

    return makeCallable(commands, (...contents: _RawMCFunctionClass[] | [() => void]) => {
      if (contents[0] instanceof _RawMCFunctionClass) {
        for (const mcfunction of contents as _RawMCFunctionClass[]) {
          this.node.body.unshift(...mcfunction.node.body)
        }
      } else {
        this.core.enterMCFunction(fake)
        this.core.insideContext(fake.node, contents[0], false)
        this.core.exitMCFunction()
        this.node.body.unshift(...fake.node.body)
      }
    }, true)
  }

  splice(start: number, removeItems: number | 'auto', ...contents: _RawMCFunctionClass[] | [() => void]) {
    const fake = new MCFunctionClass(this.core, 'fake', {
      addToSandstoneCore: false,
      creator: 'sandstone',
      onConflict: 'ignore',
    })

    const fullBody: Node[] = []

    if (contents[0] instanceof _RawMCFunctionClass) {
      for (const mcfunction of contents as _RawMCFunctionClass[]) {
        fullBody.push(...mcfunction.node.body)
      }
    } else {
      this.core.enterMCFunction(fake)
      this.core.insideContext(fake.node, contents[0], false)
      this.core.exitMCFunction()
      fullBody.push(...fake.node.body)
    }

    this.node.body.splice(start, removeItems === 'auto' ? fullBody.length : removeItems, ...fullBody)
  }
}

export const MCFunctionClass = makeClassCallable(_RawMCFunctionClass)
export type MCFunctionClass = MakeInstanceCallable<_RawMCFunctionClass>
