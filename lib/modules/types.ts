export interface ModuleDefinition {
  name: string
  version: string
  components?: Record<string, unknown>
  actions?: Record<string, (...args: any[]) => Promise<unknown> | void>
  schema?: Record<string, unknown>
  enabled?: boolean
}
