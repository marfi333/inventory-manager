// @ts-nocheck
import Database from 'better-sqlite3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs'
import type {
  Category,
  Item,
  Label,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateItemRequest,
  UpdateItemRequest,
  CreateLabelRequest,
  UpdateLabelRequest,
} from './types'

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DB_DIR, 'inventory.db')

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true })
}

const db = new Database(DB_PATH)

export const initializeDatabase = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      skus TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT 'slate',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS item_labels (
      item_id TEXT NOT NULL,
      label_id TEXT NOT NULL,
      PRIMARY KEY (item_id, label_id),
      FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS category_labels (
      category_id TEXT NOT NULL,
      label_id TEXT NOT NULL,
      PRIMARY KEY (category_id, label_id),
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES labels (id) ON DELETE CASCADE
    )
  `)

  db.exec(`CREATE INDEX IF NOT EXISTS idx_item_labels_label ON item_labels(label_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_category_labels_label ON category_labels(label_id)`)

  console.log(`Database initialized at: ${DB_PATH}`)
}

// ---- Label helpers ----

const itemLabelIdsStmt = () => db.prepare('SELECT label_id FROM item_labels WHERE item_id = ?')
const categoryLabelIdsStmt = () => db.prepare('SELECT label_id FROM category_labels WHERE category_id = ?')

const getItemLabelIds = (itemId: string): string[] =>
  itemLabelIdsStmt().all(itemId).map((r: any) => r.label_id)

const getCategoryLabelIds = (categoryId: string): string[] =>
  categoryLabelIdsStmt().all(categoryId).map((r: any) => r.label_id)

const setItemLabelIds = (itemId: string, labelIds: string[]) => {
  const del = db.prepare('DELETE FROM item_labels WHERE item_id = ?')
  const ins = db.prepare('INSERT OR IGNORE INTO item_labels (item_id, label_id) VALUES (?, ?)')
  const tx = db.transaction((ids: string[]) => {
    del.run(itemId)
    for (const lid of ids) ins.run(itemId, lid)
  })
  tx(labelIds)
}

const setCategoryLabelIds = (categoryId: string, labelIds: string[]) => {
  const del = db.prepare('DELETE FROM category_labels WHERE category_id = ?')
  const ins = db.prepare('INSERT OR IGNORE INTO category_labels (category_id, label_id) VALUES (?, ?)')
  const tx = db.transaction((ids: string[]) => {
    del.run(categoryId)
    for (const lid of ids) ins.run(categoryId, lid)
  })
  tx(labelIds)
}

export const labelDb = {
  getAll: (): Label[] => {
    const rows = db.prepare('SELECT * FROM labels ORDER BY name').all()
    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },

  getById: (id: string): Label | null => {
    const row = db.prepare('SELECT * FROM labels WHERE id = ?').get(id)
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  getByName: (name: string): Label | null => {
    const row = db.prepare('SELECT * FROM labels WHERE name = ? COLLATE NOCASE').get(name)
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  create: (data: CreateLabelRequest): Label => {
    const id = uuidv4()
    const now = new Date().toISOString()
    const color = data.color || 'slate'
    db.prepare('INSERT INTO labels (id, name, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, data.name, color, now, now)
    return { id, name: data.name, color, createdAt: now, updatedAt: now }
  },

  update: (id: string, data: UpdateLabelRequest): Label | null => {
    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color) }
    if (updates.length === 0) return labelDb.getById(id)
    updates.push('updated_at = ?'); values.push(now); values.push(id)
    const result = db.prepare(`UPDATE labels SET ${updates.join(', ')} WHERE id = ?`).run(...values)
    if (result.changes === 0) return null
    return labelDb.getById(id)
  },

  delete: (id: string): boolean => {
    const result = db.prepare('DELETE FROM labels WHERE id = ?').run(id)
    return result.changes > 0
  },
}

export const categoryDb = {
  getAll: (): Category[] => {
    const stmt = db.prepare('SELECT * FROM categories ORDER BY name')
    const rows = stmt.all()
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      labelIds: getCategoryLabelIds(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },

  getById: (id: string): Category | null => {
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ?')
    const row = stmt.get(id)
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      labelIds: getCategoryLabelIds(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  create: (data: CreateCategoryRequest): Category => {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = db.prepare(
      'INSERT INTO categories (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    stmt.run(id, data.name, data.description || null, now, now)

    if (data.labelIds && data.labelIds.length > 0) {
      setCategoryLabelIds(id, data.labelIds)
    }

    return {
      id,
      name: data.name,
      description: data.description,
      labelIds: data.labelIds || [],
      createdAt: now,
      updatedAt: now,
    }
  },

  update: (id: string, data: UpdateCategoryRequest): Category | null => {
    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?')
      values.push(now)
      values.push(id)
      const stmt = db.prepare(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`)
      const result = stmt.run(...values)
      if (result.changes === 0 && data.labelIds === undefined) return null
    }

    if (data.labelIds !== undefined) {
      const exists = db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id)
      if (!exists) return null
      setCategoryLabelIds(id, data.labelIds)
    }

    return categoryDb.getById(id)
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },
}

export const itemDb = {
  getAll: (): Item[] => {
    const stmt = db.prepare('SELECT * FROM items ORDER BY name')
    const rows = stmt.all()
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      quantity: row.quantity,
      skus: JSON.parse(row.skus || '[]'),
      labelIds: getItemLabelIds(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },

  getById: (id: string): Item | null => {
    const stmt = db.prepare('SELECT * FROM items WHERE id = ?')
    const row = stmt.get(id)
    if (!row) return null
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      quantity: row.quantity,
      skus: JSON.parse(row.skus || '[]'),
      labelIds: getItemLabelIds(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  },

  getByCategoryId: (categoryId: string): Item[] => {
    const stmt = db.prepare('SELECT * FROM items WHERE category_id = ? ORDER BY name')
    const rows = stmt.all(categoryId)
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      quantity: row.quantity,
      skus: JSON.parse(row.skus || '[]'),
      labelIds: getItemLabelIds(row.id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  },

  create: (data: CreateItemRequest): Item => {
    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = db.prepare(
      'INSERT INTO items (id, name, description, category_id, quantity, skus, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    stmt.run(
      id,
      data.name,
      data.description || null,
      data.categoryId,
      data.quantity,
      JSON.stringify(data.skus || []),
      now,
      now
    )

    if (data.labelIds && data.labelIds.length > 0) {
      setItemLabelIds(id, data.labelIds)
    }

    return {
      id,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      quantity: data.quantity,
      skus: data.skus || [],
      labelIds: data.labelIds || [],
      createdAt: now,
      updatedAt: now,
    }
  },

  update: (id: string, data: UpdateItemRequest): Item | null => {
    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.categoryId !== undefined) {
      updates.push('category_id = ?')
      values.push(data.categoryId)
    }
    if (data.quantity !== undefined) {
      updates.push('quantity = ?')
      values.push(data.quantity)
    }
    if (data.skus !== undefined) {
      updates.push('skus = ?')
      values.push(JSON.stringify(data.skus))
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?')
      values.push(now)
      values.push(id)
      const stmt = db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`)
      const result = stmt.run(...values)
      if (result.changes === 0 && data.labelIds === undefined) return null
    }

    if (data.labelIds !== undefined) {
      const exists = db.prepare('SELECT 1 FROM items WHERE id = ?').get(id)
      if (!exists) return null
      setItemLabelIds(id, data.labelIds)
    }

    return itemDb.getById(id)
  },

  updateQuantity: (id: string, quantity: number, operation: 'set' | 'add' | 'subtract'): Item | null => {
    const now = new Date().toISOString()
    let sql: string

    switch (operation) {
      case 'set':
        sql = 'UPDATE items SET quantity = ?, updated_at = ? WHERE id = ?'
        break
      case 'add':
        sql = 'UPDATE items SET quantity = quantity + ?, updated_at = ? WHERE id = ?'
        break
      case 'subtract':
        sql = 'UPDATE items SET quantity = MAX(0, quantity - ?), updated_at = ? WHERE id = ?'
        break
    }

    const stmt = db.prepare(sql)
    const result = stmt.run(quantity, now, id)

    if (result.changes === 0) return null
    return itemDb.getById(id)
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM items WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },
}
