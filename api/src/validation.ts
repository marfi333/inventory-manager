import { z } from 'zod'

const labelIdsSchema = z.array(z.string().uuid('Label ID must be a valid UUID'))

export const createLabelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  color: z.string().max(20).optional(),
})

export const updateLabelSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters').optional(),
  color: z.string().max(20).optional(),
})

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  labelIds: labelIdsSchema.optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  labelIds: labelIdsSchema.optional(),
})

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer'),
  skus: z.array(z.string().max(50, 'SKU must be less than 50 characters')).default([]),
  labelIds: labelIdsSchema.optional(),
})

export const updateItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  categoryId: z.string().uuid('Category ID must be a valid UUID').optional(),
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer').optional(),
  skus: z.array(z.string().max(50, 'SKU must be less than 50 characters')).optional(),
  labelIds: labelIdsSchema.optional(),
})

export const updateQuantitySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity must be a non-negative integer'),
  operation: z.enum(['set', 'add', 'subtract'], {
    errorMap: () => ({ message: 'Operation must be one of: set, add, subtract' }),
  }),
})

export const uuidSchema = z.string().uuid('ID must be a valid UUID')

export const idParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
})

export const categoryIdParamSchema = z.object({
  categoryId: z.string().uuid('Category ID must be a valid UUID'),
})
