import { useState, type ReactNode } from 'react'
import type { PortfolioItem } from '../../portfolio/types'

/**
 * Minimal drag-to-reorder list (HTML5 drag & drop). Emits the ordered id list
 * via `onReorder`; the caller persists it with `reorderItems`.
 */

interface ReorderListProps {
  items: PortfolioItem[]
  onReorder: (orderedIds: string[]) => void
  renderRow: (item: PortfolioItem, index: number) => ReactNode
}

export function ReorderList({ items, onReorder, renderRow }: ReorderListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const onDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const reordered = [...items]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setDragIndex(null)
    onReorder(reordered.map((i) => i.id))
  }

  return (
    <ul className="admin-reorder">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={`admin-reorder-item${dragIndex === index ? ' admin-reorder-drag' : ''}`}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDrop(index)}
        >
          <span className="admin-reorder-grip" aria-hidden="true">
            ⠿
          </span>
          {renderRow(item, index)}
        </li>
      ))}
    </ul>
  )
}
