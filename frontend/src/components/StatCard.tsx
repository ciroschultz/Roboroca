'use client'

import { useState, useEffect, useRef } from 'react'
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
  animate?: boolean
  delay?: number
}

// Hook para animar números
function useCountUp(end: number, duration: number = 1000, delay: number = 0) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const delayTimer = setTimeout(() => {
      setHasStarted(true)
    }, delay)

    return () => clearTimeout(delayTimer)
  }, [delay])

  useEffect(() => {
    if (!hasStarted) return

    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * end))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration, hasStarted])

  return count
}

export default function StatCard({
  title,
  value,
  unit,
  icon,
  trend,
  color = 'green',
  animate = true,
  delay = 0,
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Parse numeric value for animation
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''))
  const isNumeric = !isNaN(numericValue)
  const animatedValue = useCountUp(
    animate && isNumeric ? numericValue : 0,
    1200,
    delay
  )

  // Format the displayed value
  const displayValue = animate && isNumeric
    ? typeof value === 'number'
      ? animatedValue.toLocaleString()
      : String(value).replace(/[\d.]+/, animatedValue.toLocaleString())
    : value

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const colorClasses = {
    green: {
      bg: 'from-[#6AAF3D]/20 to-[#6AAF3D]/5',
      border: 'border-[#6AAF3D]/30 hover:border-[#6AAF3D]/50',
      icon: 'text-[#6AAF3D] bg-[#6AAF3D]/10',
      glow: 'hover:shadow-[#6AAF3D]/10',
    },
    blue: {
      bg: 'from-blue-500/20 to-blue-500/5',
      border: 'border-blue-500/30 hover:border-blue-500/50',
      icon: 'text-blue-400 bg-blue-500/10',
      glow: 'hover:shadow-blue-500/10',
    },
    yellow: {
      bg: 'from-yellow-500/20 to-yellow-500/5',
      border: 'border-yellow-500/30 hover:border-yellow-500/50',
      icon: 'text-yellow-400 bg-yellow-500/10',
      glow: 'hover:shadow-yellow-500/10',
    },
    red: {
      bg: 'from-red-500/20 to-red-500/5',
      border: 'border-red-500/30 hover:border-red-500/50',
      icon: 'text-red-400 bg-red-500/10',
      glow: 'hover:shadow-red-500/10',
    },
    purple: {
      bg: 'from-purple-500/20 to-purple-500/5',
      border: 'border-purple-500/30 hover:border-purple-500/50',
      icon: 'text-purple-400 bg-purple-500/10',
      glow: 'hover:shadow-purple-500/10',
    },
  }

  const classes = colorClasses[color]

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp size={14} />
    if (trend.value < 0) return <TrendingDown size={14} />
    return <Minus size={14} />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-green-400 bg-green-500/10'
    if (trend.value < 0) return 'text-red-400 bg-red-500/10'
    return 'text-gray-400 bg-gray-500/10'
  }

  return (
    <div
      ref={cardRef}
      className={`
        relative overflow-hidden bg-gradient-to-br ${classes.bg} ${classes.border} border rounded-xl p-5
        transition-all duration-300 hover:shadow-xl ${classes.glow}
        ${isVisible ? 'animate-slide-in-bottom opacity-100' : 'opacity-0'}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-gray-400 text-sm font-medium">{title}</p>

          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-white tabular-nums tracking-tight">
              {displayValue}
            </span>
            {unit && (
              <span className="text-lg text-gray-400 font-medium">{unit}</span>
            )}
          </div>

          {trend && (
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()} mt-2`}
            >
              {getTrendIcon()}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500 font-normal">{trend.label}</span>
            </div>
          )}
        </div>

        <div
          className={`p-3 rounded-xl ${classes.icon} transition-transform duration-300 hover:scale-110`}
        >
          {icon}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-20`}
      />
    </div>
  )
}
