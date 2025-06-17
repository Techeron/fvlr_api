// Vlr2 API with HONO and Redis
import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { cors } from 'hono/cors'
import addRoutes from './routes/router'
import { createClient } from 'redis'
import 'dotenv/config'
import { Match } from './scrapers/matches/one'
import { statusEnum, typeEnum } from './schemas/schemas'
const DB_URI = process.env.DB_URI || 'redis://redis:6379'
export const PORT = process.env.PORT || 9091
// Initial Setup
const app = new OpenAPIHono()
export const client = createClient({
  url: DB_URI,
})
let CacheEnabled = process.env.CACHE_ENABLED || true
let ConnectionCount = 0
// CORS
app.use(
  '*',
  cors({
    origin: '*',
  })
)
/* --- Caching Middleware --- */
app.use('*', async (c, next) => {
  // Skip caching for docs, favicon, or root
  const skipCache = [
    '', '/',
    '/doc',
  ]
  if (
    c.req.path.includes('favicon.ico') ||
    skipCache.includes(c.req.path)
  ) {
    await next()
    return
  }
  // Only cache GET requests
  if (c.req.method !== 'GET') {
    await next()
    return
  }
  const DefaultResult = { cached: false, status: 'success', data: {} }
  if (!CacheEnabled) {
    await next()
    const data = await c.res.json()
    c.res = c.json({ ...DefaultResult, cached: false, data })
    return
  }
  // Use normalized path for cache key
  const cachedPath = c.req.path.replaceAll(/\/0+/gm, '/')
  // Try to serve from cache
  if (await client.exists(cachedPath)) {
    try {
      const cachedData = await client.get(cachedPath)
      if (!cachedData) return
      const cachedResponse = JSON.parse(cachedData)
      if (cachedResponse.status === 'error') {
        c.res = c.json({ ...DefaultResult, cached: true, status: 'error', message: cachedResponse.message })
      } else {
        c.res = c.json({ ...DefaultResult, cached: true, data: cachedResponse })
      }
      return
    } catch {
      await client.del(cachedPath)
      await next()
      return
    }
  }
  // Not cached: generate response
  await next()
  if (c.res.status === 404) {
    c.res = c.json({ status: 'error', message: 'Route not found' }, 404)
    return
  }
  let data = await c.res.json()
  // Set cache lifespan
  let cacheLifespan = 60 * 60 // 1 hour default
  const mainRoute = c.req.path.split('/')[1]
  if (mainRoute === 'match') {
    data = data as Match
    cacheLifespan = (data.status === statusEnum.Enum.Completed)
      ? 60 * 60 * 24 * 365 // 1 year
      : 60 * 5 // 5 minutes for live stats
  } else if (mainRoute === 'event' && data.status === statusEnum.Enum.Completed) {
    cacheLifespan = 60 * 60 * 24 * 365 // 1 year
  }
  client.setEx(cachedPath, cacheLifespan, JSON.stringify(data))
  if (data.status === 'error') {
    c.res = c.json({ ...DefaultResult, cached: false, status: data.status, message: data.message })
    return
  }
  c.res = c.json({ ...DefaultResult, cached: false, data })
})

app.use('/', async (c, next) => {
  c.res.headers.append('Content-Type', 'text/html')
  await next()
})

// Routes
addRoutes(app)

// Swagger UI
app.get(
  '/',
  swaggerUI({
    url: '/doc',
  })
)

// OpenAPI Docs
app.doc('/doc', {
  openapi: '3.1.0',
  servers: [
    {
      description: 'Development',
      url: 'http://localhost:9091',
    },
    {
      description: 'Production',
      url: 'https://api.fantasyvlr.xyz',
    },
  ],
  info: {
    title: 'VLR API',
    contact: {
      name: 'Cody Krist',
      url: 'https://discord.gg/5drhYDQuQm',
    },
    version: 'v1.0.0',
  },
})

// JSON errors
app.onError((err, c) => {
  console.error(`${err}`)
  return c.json({
    status: 'error',
    message: `${err}`,
  })
})

// Connect to Redis
const RedisConnect = async () => {
  client
    .connect()
    .then(() => {
      console.log('Redis connected!')
      // client.flushAll().then(() => {
      //   console.log('Cleared Cache')
      // })
      CacheEnabled = true
    })
    .catch((err) => {
      ConnectionCount++
      console.log('Redis Connection Error: Attempt ' + ConnectionCount)
      console.log('Caching Disabled')
      CacheEnabled = false
      if (ConnectionCount > 3) {
        console.log('Redis Connection Error: Max Attempts Reached')
        console.log('Caching Permanently Disabled')
        return
      } else {
        setTimeout(() => {
          RedisConnect()
        }, 5000)
      }
    })
}
RedisConnect()
// Start the server
export default {
  port: PORT,
  ...app,
}
