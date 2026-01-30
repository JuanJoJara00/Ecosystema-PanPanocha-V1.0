'use client'

import React from 'react'
import Card from '@/components/ui/Card'
import { ArrowUpRight, ArrowDownRight, PieChart } from 'lucide-react'
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip } from 'recharts'

interface KpiData {
    title: string
    value: string
    icon: any
    theme: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange'
    trend?: { value: number, isPositive: boolean }
}

interface ExpensesMetricsProps {
    kpis: KpiData[]
    categoryDistribution?: { name: string, value: number }[]
    className?: string
}

export default function ExpensesMetrics({ kpis, categoryDistribution, className }: ExpensesMetricsProps) {
    const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899']

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
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider mb-0.5">{kpi.title}</p>
                                <h3 className="text-xl font-black text-gray-900 leading-tight">{kpi.value}</h3>
                            </div>
                        </Card>
                    )
                })}
            </div>

            {/* Distribution Chart */}
            <Card className="p-6 border-gray-100 shadow-sm bg-white overflow-hidden relative">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <PieChart size={16} className="text-red-500" />
                            Distribución de Gastos
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">Por Categoría</p>
                    </div>
                </div>

                <div className="h-48 w-full flex items-center">
                    {categoryDistribution && categoryDistribution.length > 0 ? (
                        <div className="w-full h-full flex items-center justify-between">
                            <div className="h-full w-1/2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={categoryDistribution}
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {categoryDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-1/2 flex flex-col gap-2 pl-2">
                                {categoryDistribution.slice(0, 4).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            <span className="font-bold text-gray-600 truncate">{item.name}</span>
                                        </div>
                                        <span className="font-mono text-gray-400 font-bold">{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
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
