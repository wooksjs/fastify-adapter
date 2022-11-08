/* eslint-disable @typescript-eslint/no-explicit-any */
import { createWooksCtx, createWooksResponder, useCacheStore, useWooksCtx, innerCacheSymbols } from '@wooksjs/composables'
import { FastifyInstance } from 'fastify'

const methods = [
    'get', 'post', 'put', 'head', 'delete', 'patch', 'options',
]

export function applyFastiyfAdapter(app: FastifyInstance) {
    const responder = createWooksResponder()

    function useWooksDecorator(fn: () => unknown) {
        return async () => {
            const { restoreCtx, clearCtx } = useWooksCtx()
            try {
                const result = await fn()
                restoreCtx()
                responder.respond(result)
            } catch (e) {
                responder.respond(e)
            }
            clearCtx()
        }
    }

    const parseOptions = { parseAs: 'buffer' as ('buffer' | 'string') }
    app.addContentTypeParser('*', parseOptions, dummyBodyParser)
    app.addContentTypeParser('text/plain', parseOptions, dummyBodyParser)
    app.addContentTypeParser('application/json', parseOptions, dummyBodyParser)

    app.addHook('preHandler', (req, res, done) => {
        createWooksCtx({ req: req.raw, res: res.raw, params: req.params as Record<string, string> || {} })
        const { set } = useCacheStore(innerCacheSymbols.request)
        set('rawBody', Promise.resolve(req.body))
        done()
    })

    for (const m of methods) {
        const defFn: (...args: any[]) => void = (app[m as keyof FastifyInstance] as (...args: any[]) => void).bind(app)
        const newFn: (...args: any[]) => void = ((...args: Parameters<typeof defFn>) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
            return defFn(...args.map(a => typeof a === 'function' ? useWooksDecorator(a as (() => unknown)) : a))
        }).bind(app)
        Object.defineProperty(app, m, { value: newFn })
    }
}

function dummyBodyParser(req: any, body: any, done: (err: null, body: any) => void) {
    done(null, body)
}
