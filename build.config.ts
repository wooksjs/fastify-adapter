import { defineBuildConfig } from 'unbuild'
import constants from './build.constants'

export default defineBuildConfig({
    declaration: true,
    rollup: {
      emitCJS: true,
      inlineDependencies: true,
      replace: {
          values: constants,
          preventAssignment: true
      },
    },
    entries: [
      'src/index'
    ],
  })