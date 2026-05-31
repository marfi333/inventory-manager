import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { labelDb } from '../database'
import { createLabelSchema, updateLabelSchema, idParamSchema } from '../validation'

const labels = new Hono()

labels.get('/', (c) => {
  try {
    return c.json({ success: true, data: labelDb.getAll() })
  } catch (error) {
    console.error('Error fetching labels:', error)
    return c.json({ success: false, error: 'Failed to fetch labels' }, 500)
  }
})

labels.get('/:id', zValidator('param', idParamSchema), (c) => {
  try {
    const { id } = c.req.valid('param')
    const label = labelDb.getById(id)
    if (!label) return c.json({ success: false, error: 'Label not found' }, 404)
    return c.json({ success: true, data: label })
  } catch (error) {
    console.error('Error fetching label:', error)
    return c.json({ success: false, error: 'Failed to fetch label' }, 500)
  }
})

labels.post('/', zValidator('json', createLabelSchema), (c) => {
  try {
    const data = c.req.valid('json')
    const existing = labelDb.getByName(data.name)
    if (existing) {
      return c.json({ success: false, error: 'Label with this name already exists' }, 409)
    }
    const label = labelDb.create(data)
    return c.json({ success: true, data: label }, 201)
  } catch (error) {
    console.error('Error creating label:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create label' }, 500)
  }
})

labels.put('/:id', zValidator('param', idParamSchema), zValidator('json', updateLabelSchema), (c) => {
  try {
    const { id } = c.req.valid('param')
    const data = c.req.valid('json')
    if (data.name) {
      const existing = labelDb.getByName(data.name)
      if (existing && existing.id !== id) {
        return c.json({ success: false, error: 'Label with this name already exists' }, 409)
      }
    }
    const label = labelDb.update(id, data)
    if (!label) return c.json({ success: false, error: 'Label not found' }, 404)
    return c.json({ success: true, data: label })
  } catch (error) {
    console.error('Error updating label:', error)
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update label' }, 500)
  }
})

labels.delete('/:id', zValidator('param', idParamSchema), (c) => {
  try {
    const { id } = c.req.valid('param')
    const deleted = labelDb.delete(id)
    if (!deleted) return c.json({ success: false, error: 'Label not found' }, 404)
    return c.json({ success: true, message: 'Label deleted successfully' })
  } catch (error) {
    console.error('Error deleting label:', error)
    return c.json({ success: false, error: 'Failed to delete label' }, 500)
  }
})

export default labels
