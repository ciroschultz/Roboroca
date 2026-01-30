'use client'

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
} from 'recharts'

// Cores padrão para gráficos
const COLORS = {
  green: '#6AAF3D',
  blue: '#3B82F6',
  yellow: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  orange: '#F97316',
  pink: '#EC4899',
}

const PIE_COLORS = [COLORS.green, COLORS.blue, COLORS.yellow, COLORS.red, COLORS.purple, COLORS.cyan]

// Componente de Gráfico de Pizza (Donut)
interface DonutChartProps {
  data: { name: string; value: number; color?: string }[]
  title: string
  centerLabel?: string
  centerValue?: string | number
}

export function DonutChart({ data, title, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => [`${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Centro do donut */}
        {centerValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-white">{centerValue}</span>
            {centerLabel && <span className="text-xs text-gray-400">{centerLabel}</span>}
          </div>
        )}
      </div>
      {/* Legenda */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color || PIE_COLORS[index % PIE_COLORS.length] }}
            />
            <span className="text-sm text-gray-400 truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Componente de Gráfico de Barras
interface BarChartComponentProps {
  data: any[]
  title: string
  dataKeys: { key: string; name: string; color: string }[]
  xAxisKey: string
}

export function BarChartComponent({ data, title, dataKeys, xAxisKey }: BarChartComponentProps) {
  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend
              wrapperStyle={{ color: '#9CA3AF' }}
            />
            {dataKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                fill={dk.color}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Componente de Gráfico de Linha
interface LineChartComponentProps {
  data: any[]
  title: string
  dataKeys: { key: string; name: string; color: string }[]
  xAxisKey: string
}

export function LineChartComponent({ data, title, dataKeys, xAxisKey }: LineChartComponentProps) {
  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend />
            {dataKeys.map((dk) => (
              <Line
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color}
                strokeWidth={2}
                dot={{ fill: dk.color, strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Componente de Gráfico de Área
interface AreaChartComponentProps {
  data: any[]
  title: string
  dataKeys: { key: string; name: string; color: string }[]
  xAxisKey: string
}

export function AreaChartComponent({ data, title, dataKeys, xAxisKey }: AreaChartComponentProps) {
  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {dataKeys.map((dk) => (
                <linearGradient key={`gradient-${dk.key}`} id={`gradient-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={dk.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={dk.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend />
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color}
                fill={`url(#gradient-${dk.key})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Componente de Gráfico de Barras Horizontais
interface HorizontalBarChartProps {
  data: any[]
  title: string
  dataKey: string
  nameKey: string
  color?: string
}

export function HorizontalBarChart({ data, title, dataKey, nameKey, color = COLORS.green }: HorizontalBarChartProps) {
  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a2e',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Componente de Gauge (Radial)
interface GaugeChartProps {
  value: number
  maxValue: number
  title: string
  label: string
  color?: string
}

export function GaugeChart({ value, maxValue, title, label, color = COLORS.green }: GaugeChartProps) {
  const data = [
    { name: 'value', value: value, fill: color },
    { name: 'rest', value: maxValue - value, fill: '#374151' },
  ]

  const percentage = ((value / maxValue) * 100).toFixed(1)

  return (
    <div className="bg-[#1a1a2e] border border-gray-700/50 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="100%"
            barSize={15}
            data={[data[0]]}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              background={{ fill: '#374151' }}
              dataKey="value"
              cornerRadius={10}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{percentage}%</span>
          <span className="text-sm text-gray-400">{label}</span>
        </div>
      </div>
    </div>
  )
}
