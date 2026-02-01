'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'wave',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-700/50 relative overflow-hidden'

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-xl',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  }

  const style: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : '100%',
    height: height ? (typeof height === 'number' ? `${height}px` : height) : variant === 'text' ? '1em' : '100%',
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  )
}

// Skeleton para cards de estatísticas
export function SkeletonStatCard() {
  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton variant="text" width="60%" height={14} />
          <div className="flex items-baseline gap-2">
            <Skeleton variant="text" width={80} height={32} />
            <Skeleton variant="text" width={30} height={16} />
          </div>
        </div>
        <Skeleton variant="rounded" width={48} height={48} />
      </div>
    </div>
  )
}

// Skeleton para cards de projeto
export function SkeletonProjectCard() {
  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton variant="rounded" width={48} height={48} />
          <div className="space-y-2">
            <Skeleton variant="text" width={150} height={18} />
            <Skeleton variant="text" width={100} height={14} />
          </div>
        </div>
        <Skeleton variant="rounded" width={80} height={28} />
      </div>
      <div className="flex gap-4">
        <Skeleton variant="text" width={60} height={14} />
        <Skeleton variant="text" width={80} height={14} />
        <Skeleton variant="text" width={70} height={14} />
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-gray-700/30">
        <Skeleton variant="rectangular" width="70%" height="100%" />
      </div>
    </div>
  )
}

// Skeleton para gráficos
export function SkeletonChart({ type = 'donut' }: { type?: 'donut' | 'bar' | 'line' }) {
  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
      <Skeleton variant="text" width={150} height={20} className="mb-4" />

      {type === 'donut' && (
        <div className="flex items-center justify-center py-8">
          <Skeleton variant="circular" width={180} height={180} />
        </div>
      )}

      {type === 'bar' && (
        <div className="flex items-end justify-center gap-3 h-48 pt-8">
          {[60, 80, 45, 90, 70, 55].map((h, i) => (
            <Skeleton key={i} variant="rounded" width={32} height={`${h}%`} />
          ))}
        </div>
      )}

      {type === 'line' && (
        <div className="h-48 pt-8 flex items-end">
          <Skeleton variant="rounded" width="100%" height="60%" />
        </div>
      )}

      <div className="flex justify-center gap-4 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton variant="circular" width={12} height={12} />
            <Skeleton variant="text" width={60} height={12} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton para lista de itens
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-800/30 rounded-lg p-4 flex items-center gap-4"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Skeleton variant="rounded" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" height={16} />
            <Skeleton variant="text" width="25%" height={12} />
          </div>
          <Skeleton variant="rounded" width={70} height={28} />
        </div>
      ))}
    </div>
  )
}

// Skeleton para tabela
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-gray-700/50 bg-gray-800/30">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / cols}%`} height={16} />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-4 border-b border-gray-700/30 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={`${100 / cols}%`}
              height={14}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Skeleton para perfil de projeto
export function SkeletonProjectProfile() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <Skeleton variant="rounded" width={64} height={64} />
            <div className="space-y-2">
              <Skeleton variant="text" width={200} height={24} />
              <Skeleton variant="text" width={150} height={16} />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton variant="rounded" width={100} height={40} />
            <Skeleton variant="rounded" width={120} height={40} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        <SkeletonChart type="donut" />
        <SkeletonChart type="donut" />
        <SkeletonChart type="bar" />
      </div>
    </div>
  )
}

// Loading overlay com spinner
export function LoadingOverlay({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-[#0f0f1a]/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-700 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-[#6AAF3D] rounded-full animate-spin" />
        </div>
        <p className="text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  )
}

// Componente de loading inline
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizes[size]} border-gray-700 rounded-full`} />
      <div className={`absolute inset-0 ${sizes[size]} border-transparent border-t-[#6AAF3D] rounded-full animate-spin`} />
    </div>
  )
}
