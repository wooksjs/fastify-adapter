import { createHttpContext, HttpError, rawBodySlot, TWooksHttpOptions, WooksHttp } from '@wooksjs/event-http'
import { current } from '@wooksjs/event-core'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { TWooksHandler } from 'wooks'

export interface TWooksFastifyOptions extends TWooksHttpOptions {
    /**
     * When true, respond with 404 for unmatched Wooks routes
     * instead of delegating to Fastify's not-found handler.
     * @default false
     */
    raise404?: boolean
}

/**
 * Fastify adapter for Wooks.
 *
 * Uses Wooks routing and composables on top of a Fastify application.
 * Registers itself as a catch-all route — requests matching Wooks routes
 * are handled by Wooks; unmatched requests fall through to Fastify's
 * not-found handler.
 *
 * @example
 * ```ts
 * import Fastify from 'fastify'
 * import { WooksFastify } from '@wooksjs/fastify-adapter'
 * import { useRouteParams } from '@wooksjs/event-http'
 *
 * const app = Fastify()
 * const wooks = new WooksFastify(app)
 *
 * wooks.get('/hello/:name', () => {
 *     const { get } = useRouteParams()
 *     return { hello: get('name') }
 * })
 *
 * app.listen({ port: 3000 })
 * ```
 */
export class WooksFastify extends WooksHttp {
    protected fastifyApp: FastifyInstance
    protected fastifyOpts: TWooksFastifyOptions

    constructor(fastifyApp: FastifyInstance, opts?: TWooksFastifyOptions) {
        super(opts)
        this.fastifyApp = fastifyApp
        this.fastifyOpts = opts ?? {}
        this.registerCatchAll()
    }

    /**
     * Start the Fastify server and return a promise that resolves when listening.
     */
    override async listen(...args: unknown[]): Promise<void> {
        await (this.fastifyApp.listen as (...a: unknown[]) => Promise<string>)(...args)
        this.server = this.fastifyApp.server
    }

    /**
     * Stop the Fastify server.
     */
    override async close(): Promise<unknown> {
        await this.fastifyApp.close()
        return undefined
    }

    /**
     * Registers a catch-all route in Fastify that routes requests through Wooks.
     * Matched routes are handled by Wooks; unmatched requests call reply.callNotFound().
     */
    private registerCatchAll() {
        const ctxOptions = this.eventContextOptions
        const requestLimits = this.fastifyOpts.requestLimits
        const defaultHeaders = this.fastifyOpts.defaultHeaders
        const notFoundHandler = this.fastifyOpts.onNotFound
        const raise404 = this.fastifyOpts.raise404

        // Disable Fastify's built-in body parsing so raw body is available to Wooks
        this.fastifyApp.removeAllContentTypeParsers()
        this.fastifyApp.addContentTypeParser(
            '*',
            { parseAs: 'buffer' },
            (_req: FastifyRequest, body: Buffer, done: (err: null, body: Buffer) => void) => {
                done(null, body)
            },
        )

        this.fastifyApp.all('/*', (request: FastifyRequest, reply: FastifyReply) => {
            const req = request.raw
            const res = reply.raw
            const response = new this.ResponseClass(res, req, ctxOptions.logger, defaultHeaders)
            const method = req.method || ''
            const url = req.url || ''

            createHttpContext(ctxOptions, { req, response, requestLimits }, () => {
                const ctx = current()

                // Fastify consumes the raw request stream before our handler runs.
                // Seed the already-parsed body into the wooks context so useRequest().rawBody() works.
                if (request.body !== undefined && request.body !== null) {
                    const buf = Buffer.isBuffer(request.body)
                        ? request.body
                        : Buffer.from(request.body as string)
                    ctx.set(rawBodySlot, Promise.resolve(buf))
                }

                const handlers = this.wooks.lookupHandlers(method, url, ctx)

                if (handlers || notFoundHandler) {
                    const result = this.processHandlers(
                        handlers || [notFoundHandler as TWooksHandler],
                        ctx,
                        response,
                    )
                    if (
                        result !== null &&
                        result !== undefined &&
                        typeof (result as Promise<unknown>).then === 'function'
                    ) {
                        ;(result as Promise<unknown>).catch((error: unknown) => {
                            this.logger.error('Internal error, please report', error as Error)
                            this.respond(error, response, ctx)
                        })
                    }
                    return result
                }

                // No Wooks route matched
                if (raise404) {
                    const error = new HttpError(404)
                    this.respond(error, response, ctx)
                    return error
                }

                // Delegate to Fastify's not-found handler
                reply.callNotFound()
            })
        })
    }
}
