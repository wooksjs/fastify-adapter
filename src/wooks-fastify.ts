import { createHttpContext, HttpError, TWooksHttpOptions, WooksHttp } from '@wooksjs/event-http'
import { FastifyInstance, RouteHandlerMethod } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { ListenOptions } from 'net'
import { TWooksHandler } from 'wooks'

export class WooksFastify extends WooksHttp {
    constructor(protected fastifyApp: FastifyInstance, protected opts?: TWooksHttpOptions & { raise404?: boolean }) {
        super(opts)
        fastifyApp.all('*', this.getServerCb() as unknown as RouteHandlerMethod)
    }

    public listen(...args: Parameters<Server['listen']>) {
        this.fastifyApp.listen({
            port: (typeof (args[0]) === 'number' ? args[0] : args[0] && (args[0] as ListenOptions).port || undefined) as number,
            host: (typeof (args[1]) === 'string' ? args[1] : args[0] && (args[0] as ListenOptions).host || undefined) as string,
            backlog: (typeof (args[1]) === 'number' ? args[1] : args[0] && (args[0] as ListenOptions).backlog || undefined) as number,
        }, args.find(a => typeof a === 'function') as (err: Error | null, address: string) => void)
        const server = this.server = this.fastifyApp.server
        return new Promise((resolve, reject) => {
            server.once('listening', resolve)
            server.once('error', reject)
        })
    }

    getServerCb() {
        return (async (request: { raw: IncomingMessage }, reply: { raw: ServerResponse, callNotFound: () => void }) => {
            const { restoreCtx, clearCtx } = createHttpContext(
                { req: request.raw, res: reply.raw },
                this.mergeEventOptions(this.opts?.eventOptions),
            )
            const { handlers } = this.wooks.lookup(request.raw.method as string, request.raw.url as string)
            if (handlers || this.opts?.onNotFound) {
                try {
                    await this.processHandlers(handlers || [this.opts?.onNotFound as TWooksHandler])
                } catch (e) {
                    console.error('Internal error, please report: ', e as Error)
                    if ((e as Error).stack) {
                        console.warn((e as Error).stack)
                    }
                    restoreCtx()
                    this.respond(e)
                    clearCtx()
                }
            } else {
                // not found
                this.logger.debug(
                    `404 Not found (${request.raw.method as string})${request.raw.url as string
                    }`
                )
                if (this.opts?.raise404) {
                    this.respond(new HttpError(404))
                    clearCtx()
                } else {
                    reply.callNotFound()
                }
            }
        }) as unknown as ((req: IncomingMessage, res: ServerResponse) => Promise<void>)
    }
}
