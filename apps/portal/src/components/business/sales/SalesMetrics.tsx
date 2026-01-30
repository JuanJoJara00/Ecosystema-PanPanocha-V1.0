'use client'

import React from 'react'
import Card from '@/components/ui/Card'
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface KpiData {
    title: string
    value: string
    icon: any
    theme: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'
    trend?: { value: number, isPositive: boolean }
}

interface SalesMetricsProps {
    kpis: KpiData[]
    chartData?: any[]
    className?: string
}

export default function SalesMetrics({ kpis, chartData, className }: SalesMetricsProps) {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{label}</p>
                    <p className="text-sm font-black text-pp-brown">
                        ${payload[0].value.toLocaleString()}
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
                {kpis.map((kpi, idx) => {
                    const Icon = kpi.icon
                    const colorClasses = {
                        blue: 'bg-blue-50 text-blue-600',
                        green: 'bg-emerald-50 text-emerald-600',
                        red: 'bg-red-50 text-red-600',
                        yellow: 'bg-amber-50 text-amber-600',
                        purple: 'bg-purple-50 text-purple-600',
                        orange: 'bg-orange-50 text-orange-600'
                    }

                    return (
                        <Card key={idx} noPadding className="p-4 flex flex-col justify-between border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-xl ${colorClasses[kpi.theme]} transition-transform group-hover:scale-110 duration-300`}>
                                    <Icon size={18} />
                                </div>
                                {kpi.trend && (
                                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${kpi.trend.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {kpi.trend.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                        {kpi.trend.value}%
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-0.5">{kpi.title}</p>
                                <h3 className="text-xl font-black text-gray-900 leading-tight">{kpi.value}</h3>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Main Chart */}
            <Card className="p-6 border-gray-100 shadow-sm bg-white overflow-hidden relative">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <TrendingUp size={16} className="text-pp-gold" />
                            Tendencia de Ventas
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">Últimos 7 días</p>
                    </div>
                </div>

                <div className="h-48 w-full">
                    {chartData && chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D4A017" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#D4A017" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickMargin={10}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => `$${val / 1000}k`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#D4A017"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                    animationDuration={1500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-300 text-xs font-bold uppercase tracking-widest">
                            No hay datos suficientes
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
