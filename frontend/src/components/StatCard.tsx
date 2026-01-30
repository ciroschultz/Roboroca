'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
  }
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple'
}

export default function StatCard({
  title,
  value,
  unit,
  icon,
  trend,
  color = 'green'
}: StatCardProps) {
  const colorClasses = {
    green: 'from-[#6AAF3D]/20 to-[#6AAF3D]/5 border-[#6AAF3D]/30',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  }

  const iconColorClasses = {
    green: 'text-[#6AAF3D]',
    blue: 'text-blue-500',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
  }

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp size={14} className="text-green-500" />
    if (trend.value < 0) return <TrendingDown size={14} className="text-red-500" />
    return <Minus size={14} className="text-gray-500" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-green-500'
    if (trend.value < 0) return 'text-red-500'
    return 'text-gray-500'
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-5 card-hover`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">{value}</span>
            {unit && <span className="text-lg text-gray-400">{unit}</span>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gray-800/50 ${iconColorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
