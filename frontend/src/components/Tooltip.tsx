'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: TooltipPosition
  delay?: number
  className?: string
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [actualPosition, setActualPosition] = useState(position)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  // Ajustar posição se o tooltip sair da tela
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const triggerRect = triggerRef.current.getBoundingClientRect()

      let newPosition = position

      // Verificar se sai da tela
      if (position === 'top' && tooltipRect.top < 0) {
        newPosition = 'bottom'
      } else if (position === 'bottom' && tooltipRect.bottom > window.innerHeight) {
        newPosition = 'top'
      } else if (position === 'left' && tooltipRect.left < 0) {
        newPosition = 'right'
      } else if (position === 'right' && tooltipRect.right > window.innerWidth) {
        newPosition = 'left'
      }

      if (newPosition !== actualPosition) {
        setActualPosition(newPosition)
      }
    }
  }, [isVisible, position, actualPosition])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800',
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      ref={triggerRef}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 ${positionClasses[actualPosition]}
            px-3 py-2 text-sm text-gray-200 bg-gray-800 rounded-lg shadow-xl
            whitespace-nowrap animate-fade-in border border-gray-700/50
            ${className}
          `}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-[6px] ${arrowClasses[actualPosition]}`}
          />
        </div>
      )}
    </div>
  )
}

// Tooltip para ícones de ajuda
export function HelpTooltip({ content }: { content: string }) {
  return (
    <Tooltip content={content} position="top">
      <button className="p-1 text-gray-500 hover:text-gray-400 rounded-full hover:bg-gray-700/30 transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </button>
    </Tooltip>
  )
}

// Tooltip para badges de informação
export function InfoBadge({ label, value, tooltip }: { label: string; value: string | number; tooltip: string }) {
  return (
    <Tooltip content={tooltip} position="top">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/30 cursor-help">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-medium text-white">{value}</span>
      </div>
    </Tooltip>
  )
}
