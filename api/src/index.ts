import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { initializeDatabase } from './database'
import categories from './routes/categories'
import items from './routes/items'
import labels from './routes/labels'

const app = new Hono()

app.use('*', cors())

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json(
    {
      success: false,
      error: 'Internal server error',
    },
    500
  )
})

app.get('/health', (c) => {
  return c.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  })
})

app.route('/api/categories', categories)
app.route('/api/items', items)
app.route('/api/labels', labels)

try {
  initializeDatabase()
  console.log('Database initialized successfully')

  const port = parseInt(process.env.API_PORT || '3001', 10)
  console.log(`Server is running on port ${port}`)

  serve({
    fetch: app.fetch,
    port,
  })
} catch (error) {
  console.error('Failed to start server:', error)
  process.exit(1)
}
