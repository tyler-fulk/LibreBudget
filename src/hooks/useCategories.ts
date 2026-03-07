import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Category, type CategoryGroup } from '../db/database'

export function useCategories() {
  const categories = useLiveQuery(() => db.categories.toArray()) ?? []

  const categoriesByGroup = (group: CategoryGroup) =>
    categories.filter((c) => c.group === group)

  const getCategoryById = (id: number) =>
    categories.find((c) => c.id === id)

  const addCategory = async (category: Omit<Category, 'id'>) => {
    return db.categories.add(category)
  }

  const updateCategory = async (id: number, changes: Partial<Category>) => {
    return db.categories.update(id, changes)
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
