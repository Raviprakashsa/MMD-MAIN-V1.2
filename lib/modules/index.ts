import type { ModuleDefinition } from './types'
import coreModule from './modules/core'

const registry: ModuleDefinition[] = [coreModule]

export function listModules() {
  return registry.filter((m) => m.enabled !== false)
}

export function findModule(name: string) {
  return registry.find((m) => m.name === name)
}
