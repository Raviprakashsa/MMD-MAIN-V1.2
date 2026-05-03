import type { ModuleDefinition } from '../types'

const coreModule: ModuleDefinition = {
  name: 'core-platform',
  version: '1.0.0',
  enabled: true,
  schema: { entities: ['Requirement', 'Candidate', 'Activity'] },
  actions: {},
  components: {},
}

export default coreModule
