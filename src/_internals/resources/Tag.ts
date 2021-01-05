import { toMcFunctionName } from '@datapack/minecraft'

import { Resource } from './Resource'

import type { LiteralUnion } from '@/generalTypes'
import type {
  BLOCKS, ENTITY_TYPES, FLUIDS, ITEMS, TAG_TYPES,
} from '@arguments'
import type { Datapack } from '@datapack'
import type { McFunctionReturn } from '@datapack/Datapack'
import type { TagSingleValue } from '@datapack/resourcesTree'

export type HintedTagStringType<T extends TAG_TYPES> = (
  T extends 'blocks' ? LiteralUnion<BLOCKS> :
  T extends 'fluids' ? LiteralUnion<FLUIDS> :
  T extends 'entity_types' ? LiteralUnion<ENTITY_TYPES> :
  T extends 'functions' ? (LiteralUnion<string> | McFunctionReturn) :
  T extends 'items' ? LiteralUnion<ITEMS> :
  string
)

function isMcFunctionReturn(v: unknown): v is McFunctionReturn {
  return typeof v === 'function'
}

function isTagObject<T>(v: TagSingleValue<T>): v is Exclude<TagSingleValue<T>, T> {
  return typeof v === 'object'
}

function objectToString<TYPE extends TAG_TYPES>(value: TagSingleValue<HintedTagStringType<TYPE>>): TagSingleValue<string> {
  if (isMcFunctionReturn(value)) {
    return value.name
  }
  if (isTagObject(value) && isMcFunctionReturn(value.id)) {
    return {
      id: value.id.name,
      required: value.required,
    }
  }
  return value as string | TagSingleValue<string>
}

export class Tag<TYPE extends TAG_TYPES> extends Resource {
  readonly type

  readonly values: TagSingleValue<string>[]

  constructor(datapack: Datapack, type: TYPE, name: string, values: readonly TagSingleValue<HintedTagStringType<TYPE>>[], replace?: boolean) {
    super(datapack, name)

    this.type = type

    this.values = values.map(objectToString)

    this.datapack = datapack

    datapack.resources.addResource('tags', {
      children: new Map(),
      isResource: true,
      path: [this.path.namespace, type, ...this.path.fullPath],
      values: this.values,
      replace,
    })
  }

  get name() {
    return `#${toMcFunctionName(this.path.fullPathWithNamespace)}`
  }

  /** Adds a new value to this tag. */
  add(value: TagSingleValue<HintedTagStringType<TYPE>>) {
    this.values.push(objectToString(value))
  }

  toString() {
    return this.name
  }
}
