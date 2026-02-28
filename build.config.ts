import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
    declaration: true,
    rollup: {
        emitCJS: true,
    },
    externals: [
        '@wooksjs/event-http',
        '@wooksjs/event-core',
        'wooks',
        'fastify',
    ],
    entries: [
        'src/index',
    ],
})
