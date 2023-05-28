import { createHttpContext, HttpError, TWooksHttpOptions, WooksHttp } from '@wooksjs/event-http'
import { FastifyInstance, RouteHandlerMethod } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'http'
import { TWooksHandler } from 'wooks'

export class WooksFastify extends WooksHttp {
    constructor(protected fastifyApp: FastifyInstance, protected opts?: TWooksHttpOptions & { raise404?: boolean }) {
        super(opts)
        fastifyApp.all('*', this.getServerCb() as unknown as RouteHandlerMethod)
    }

    public async listen(...args: Parameters<Server['listen']>) {
        const server = this.server = this.fastifyApp.server
        return new Promise((resolve, reject) => {
            server.once('listening', resolve)
            server.once('error', reject)
        })
    }

    getServerCb() {
        return (async (request: { req: IncomingMessage }, reply: { res: ServerResponse, callNotFound: () => void }) => {
            const { restoreCtx, clearCtx } = createHttpContext(
                { req: request.req, res: reply.res },
                this.mergeEventOptions(this.opts?.eventOptions),
            )
            const { handlers } = this.wooks.lookup(request.req.method as string, request.req.url as string)
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
                    `404 Not found (${request.req.method as string})${request.req.url as string
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
