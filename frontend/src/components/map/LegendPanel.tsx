'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface LegendItem {
  id: string
  name: string
  color: string
  visible: boolean
  count?: number
}

interface LegendPanelProps {
  items: LegendItem[]
}

export default function LegendPanel({ items }: LegendPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = items.filter(i => i.visible)

  if (visibleItems.length === 0) return null

  return (
    <div className="bg-gray-800/90 rounded-lg overflow-hidden min-w-[140px]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-xs text-gray-300 font-medium uppercase tracking-wider">Legenda</span>
        {collapsed ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {!collapsed && (
        <div className="px-3 pb-2 space-y-1.5">
          {visibleItems.map(item => (
            <div key={item.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-300 truncate">{item.name}</span>
              {item.count !== undefined && (
                <span className="text-xs text-gray-500 ml-auto">{item.count}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
