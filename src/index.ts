/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHttpContext, createWooksResponder, useHttpContext } from '@wooksjs/event-http'
import { FastifyInstance, RouteOptions } from 'fastify'

const methods = [
    'get', 'post', 'put', 'head', 'delete', 'patch', 'options',
]

export function applyFastifyAdapter(app: FastifyInstance) {
    const responder = createWooksResponder()

    function useWooksDecorator(fn: () => unknown) {
        return async () => {
            console.log('enter wooks decorator')
            const { restoreCtx, clearCtx } = useHttpContext()
            try {
                const result = await fn()
                restoreCtx()
                await responder.respond(result)
            } catch (e) {
                restoreCtx()
                await responder.respond(e)
            }
            clearCtx()
        }
    }

    const parseOptions = { parseAs: 'buffer' as ('buffer' | 'string') }
    app.addContentTypeParser('*', parseOptions, dummyBodyParser)
    app.addContentTypeParser('text/plain', parseOptions, dummyBodyParser)
    app.addContentTypeParser('application/json', parseOptions, dummyBodyParser)

    app.addHook('preHandler', (req, res, done) => {
        console.log('preHandler')
        const { restoreCtx, store } = createHttpContext({ req: req.raw, res: res.raw })
        store('routeParams').value = req.params as Record<string, string | string[]>
        store('request').hook('rawBody').value = Promise.resolve(req.body) as Promise<Buffer>
        restoreCtx()
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
    const m = 'route'
    const defFn = app[m].bind(app)
    const newFn = ((opts: RouteOptions) => {
        const newOpts = {
            ...opts,
            handler: useWooksDecorator(opts.handler as () => unknown),
        }
        return defFn(newOpts)
    }).bind(app)
    Object.defineProperty(app, m, { value: newFn })
}

function dummyBodyParser(req: any, body: any, done: (err: null, body: any) => void) {
    done(null, body)
}
