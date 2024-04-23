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
// Caching
app.use('*', async (c, next) => {
  // Set a Default Return Value
  const DefaultResult = {
    cached: false,
    status: 'success',
    data: {},
  }

  if (!CacheEnabled) {
    await next()
    const data = await c.res.json()
    c.res = c.json(Object.assign(DefaultResult, { cached: false, data }))
    return
  }
  // Reject Blacklisted Routes
  if (
    c.req.path.includes('favicon.ico') ||
    c.req.path === '' ||
    c.req.path === '/' ||
    c.req.path === '/doc'
  ) {
    await next()
    return
  }
  console.log(c.req.path)

  const cachedPath = c.req.path.replaceAll(/\/0+/gm, '/') // Remove any trailing zeros from the path
  // Cached Response
  if (await client.exists(c.req.path)) {
    console.log('Cached Response')
    const cachedData = await client.get(cachedPath) // .001ms
    if (cachedData === null) return // Should never happen
    let cachedResponse
    // Clear the Cache if the data is not valid JSON
    try {
      cachedResponse = JSON.parse(cachedData)
    } catch {
      // Clear Cache and close the request
      client.del(cachedPath)
      await next()
      return
    }
    // Return the Cached Response
    // If the Cached Response was an error, we Overwrite the fields
    if (cachedResponse.status === 'error') {
      c.res = c.json(
        Object.assign(DefaultResult, {
          cached: true,
          status: 'error',
          message: cachedResponse.message,
        })
      )
    }
    // Otherwise we return the cached response normally
    else {
      c.res = c.json(
        Object.assign(DefaultResult, {
          cached: true,
          data: cachedResponse,
        })
      )
    }
    return
  }
  // Non-Cached Response
  else {
    console.log('Not Cached Response')
    // Let the page generate as normal
    await next()
    // check if the route was not found
    if (c.res.status === 404) {
      c.res = c.json(
        {
          status: 'error',
          message: 'Route not found',
        },
        404
      )
      return
    }
    // Intercept the JSON
    let data = await c.res.json()
    // Cache the response
    let cacheLifespan = 60 * 60 * 1 // 1 Hour
    switch (c.req.path.split('/')[1]) {
      case 'match':
        data = data as Match
        // Check if the match is completed
        if (data.status === statusEnum.Enum.Completed)
          cacheLifespan = 60 * 60 * 24 * 365 // 1 Year
        else
          cacheLifespan = 60 // For live stats
        break
      case 'event':
        if (data.status) {
          if (data.status === statusEnum.Enum.Completed)
            cacheLifespan = 60 * 60 * 24 * 365 // 1 Year
        }
        break
    }
    client.setEx(cachedPath, cacheLifespan, JSON.stringify(data))
    // Check if it was an Error
    if (data.status === 'error') {
      c.res = c.json(
        Object.assign(DefaultResult, {
          cached: false,
          status: data.status,
          message: data.message,
        })
      )
      return
    }
    // Otherwise return the data
    else {
      c.res = c.json(Object.assign(DefaultResult, { cached: false, data }))
      return
    }
  }
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
      url: 'http://localhost:3000',
    },
    {
      description: 'Production',
      url: 'https://api.fantasyvlr.xyz',
    },
  ],
  info: {
    title: 'Vlr API',
    contact: {
      name: 'Cody Krist',
      url: 'https://discord.gg/5drhYDQuQm',
    },
    version: 'v0.1',
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
