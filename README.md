# Fastify Adapter (Wooks Composables)

**!!! This is work-in-progress library, breaking changes are expected !!!**

<p align="center">
<img src="./docs/icon.png" height="156px"><br>
<a  href="https://github.com/wooksjs/fastify-adapter/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</a>
</p>

Want to use [@wooksjs/event-http](https://www.npmjs.com/package/@wooksjs/event-http) but your project is coupled with fastify? ✅ This is not a problem with this Fastify Adapter for [wooks](https://www.npmjs.com/package/wooks)

## Install

`npm install @wooksjs/fastify-adapter @wooksjs/event-http`

## Usage

```ts
import fastify from 'fastify'
import { applyFastifyAdapter } from '@wooksjs/fastify-adapter'
import { useBody } from '@wooksjs/http-body'
import { WooksError } from '@wooksjs/event-http'
import { useRouteParams } = from '@wooksjs/event-core'

const app = fastify()

applyFastifyAdapter(app)

app.get('/test/:param', () => {
    const { get } = useRouteParams()
    return { message: 'it works', param: get('param') }
})

app.post('/post', () => {
    const { parseBody } = useBody()
    return parseBody()
})

app.get('/error', () => {
    throw new WooksError(400, 'test error')
})

app.listen(3000, () => console.log('listening 3000'))
```
