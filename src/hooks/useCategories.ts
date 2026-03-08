import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Category, type CategoryGroup } from '../db/database'
import { sanitizeString } from '../utils/sanitize'

export function useCategories() {
  const categories = useLiveQuery(() => db.categories.toArray()) ?? []

  const categoriesByGroup = (group: CategoryGroup) =>
    categories.filter((c) => c.group === group)

  const getCategoryById = (id: number) =>
    categories.find((c) => c.id === id)

  const addCategory = async (category: Omit<Category, 'id'>) => {
    return db.categories.add({
      ...category,
      name: sanitizeString(category.name, 100),
      color: sanitizeString(category.color ?? '#64748b', 20),
      icon: sanitizeString(category.icon ?? '', 20),
    })
  }

  const updateCategory = async (id: number, changes: Partial<Category>) => {
    const sanitized: Partial<Category> = { ...changes }
    if (changes.name !== undefined) sanitized.name = sanitizeString(changes.name, 100)
    if (changes.color !== undefined) sanitized.color = sanitizeString(changes.color, 20)
    if (changes.icon !== undefined) sanitized.icon = sanitizeString(changes.icon, 20)
    return db.categories.update(id, sanitized)
  }

  const deleteCategory = async (id: number) => {
    const txCount = await db.transactions
      .where('categoryId')
      .equals(id)
      .count()
    if (txCount > 0) {
      throw new Error(
        `Cannot delete: ${txCount} transaction(s) use this category. Reassign them first.`,
      )
    }
    return db.categories.delete(id)
  }

  return {
    categories,
    categoriesByGroup,
    getCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
  }
}
