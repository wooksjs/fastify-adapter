# Fastify Adapter (Wooks Composables)

**!!! This is work-in-progress library, breaking changes are expected !!!**

<p align="center">
<img src="./docs/icon.png" height="156px"><br>
<a  href="https://github.com/wooksjs/fastify-adapter/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</a>
</p>

Want to use [Wooks Composables](https://github.com/wooksjs/composables) but your project is coupled with fastify? ✅ This is not a problem with this Fastify Adapter for [Wooks Composables](https://github.com/wooksjs/composables)

🔥 Get power of [Wooks Composables](https://github.com/wooksjs/composables) in your fastify project!

## Install

`npm install @wooksjs/fastify-adapter @wooksjs/composables`

## Usage

```ts
import fastify from 'fastify'
import { applyFastifyAdapter } from '@wooksjs/fastify-adapter'
import { useBody } from '@wooksjs/body'
import { useRouteParams, WooksError } from '@wooksjs/composables'

const app = fastify()

applyFastifyAdapter(app)

app.get('/test/:param', () => {
    const { getRouteParam } = useRouteParams()
    return { message: 'it works', param: getRouteParam('param') }
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
