'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Search,
    Wallet,
    DollarSign,
    Store,
    Calendar,
    Plus,
    FileText,
    PieChart,
    User,
    AlertCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import ExpensesDetailModal from './ExpensesDetailModal'
import ExpensesFormModal from './ExpensesFormModal'
import ExpensesMetrics from './ExpensesMetrics'
import Image from 'next/image'
import { appConfig } from '@/config/app-config'
import DateRangeFilter from '@/components/ui/DateRangeFilter'

export default function ExpensesList() {
    const [expenses, setExpenses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showNewExpenseModal, setShowNewExpenseModal] = useState(false)
    const [selectedBranch, setSelectedBranch] = useState<string>('all')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
    const [branches, setBranches] = useState<any[]>([])

    // Filters
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })

    const categories = ['nomina', 'servicios', 'arriendo', 'mantenimiento', 'insumos_urgentes', 'general']

    useEffect(() => {
        fetchBranches()
        fetchExpenses()
    }, [selectedBranch, selectedCategory, dateRange])

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name')
        if (data) setBranches(data)
    }

    const fetchExpenses = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('expenses')
                .select(`
                    *,
                    branch:branches(name),
                    user:users!expenses_user_id_fkey(full_name)
                `)
                .order('created_at', { ascending: false })
                .gte('created_at', `${dateRange.start}T00:00:00`)
                .lte('created_at', `${dateRange.end}T23:59:59`)

            if (selectedBranch !== 'all') {
                query = query.eq('branch_id', selectedBranch)
            }
            if (selectedCategory !== 'all') {
                query = query.eq('category', selectedCategory)
            }

            const { data, error } = await query
            if (error) throw error
            setExpenses(data || [])
        } catch (error) {
            console.error('Error fetching expenses:', JSON.stringify(error, null, 2))
        } finally {
            setLoading(false)
        }
    }

    const filteredExpenses = expenses.filter(exp =>
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Calculate Metrics
    const metrics = useMemo(() => {
        const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)
        const totalCount = filteredExpenses.length

        // Distribution of Categories for PieChart
        const catMap = filteredExpenses.reduce((acc, exp) => {
            const cat = exp.category || 'general'
            acc[cat] = (acc[cat] || 0) + exp.amount
            return acc
        }, {} as Record<string, number>)

        const distribution = Object.entries(catMap)
            .map(([name, value]) => ({
                name,
                value: Number(((value / totalAmount) * 100).toFixed(1))
            }))
            .sort((a, b) => b.value - a.value)

        return {
            totalAmount,
            totalCount,
            distribution
        }
    }, [filteredExpenses])

    const kpis = [
        {
            title: 'Gastos Totales',
            value: formatCurrency(metrics.totalAmount),
            icon: Wallet,
            theme: 'red' as const,
        },
        {
            title: 'Registros',
            value: metrics.totalCount.toString(),
            icon: FileText,
            theme: 'blue' as const
        },
        {
            title: 'Categoría Top',
            value: metrics.distribution[0]?.name || '-',
            icon: PieChart,
            theme: 'orange' as const
        },
        {
            title: 'Sede Mayor Gasto',
            value: '-', // Needs logic to calc top branch
            icon: Store,
            theme: 'purple' as const
        }
    ]

    return (
        <div className="flex gap-2 w-full h-[calc(100vh-4rem)] animate-in fade-in duration-500">
            {/* LEFT PANEL - Dashboard & Filters */}
            <div className="w-1/2 flex-shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 flex-shrink-0">

                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 transition-transform hover:scale-105 duration-300">
                                <Image
                                    src={appConfig.company.logoUrl}
                                    alt="Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 dark:text-gray-50 tracking-tight uppercase">
                                    Gastos Operativos
                                </h1>
                                <p className="text-xs text-gray-400 font-medium">Control de egresos y costos</p>
                            </div>
                        </div>

                        {/* Date Filter */}
                        <DateRangeFilter
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                            onStartDateChange={(d) => setDateRange(prev => ({ ...prev, start: d }))}
                            onEndDateChange={(d) => setDateRange(prev => ({ ...prev, end: d }))}
                            onFilter={() => fetchExpenses()}
                        />
                    </div>

                    <ModuleHeader
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Buscar gasto..."
                        actions={
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="h-9 text-xs">
                                    <FileText size={14} className="mr-2" /> Reporte
                                </Button>
                                <Button
                                    className="h-9 px-4 text-xs font-bold bg-pp-brown text-white hover:bg-pp-brown/90 shadow-lg shadow-pp-brown/20"
                                    onClick={() => setShowNewExpenseModal(true)}
                                >
                                    <Plus size={14} className="mr-2" /> Nuevo Gasto
                                </Button>
                            </div>
                        }
                        className="mb-4"
                    />

                    {/* Filters Tabs */}
                    <div className="flex flex-col gap-2 border-t border-gray-100 pt-2">
                        <ModuleTabs
                            tabs={branches.map(b => ({ id: b.id, label: b.name }))}
                            activeTabId={selectedBranch}
                            onTabChange={setSelectedBranch}
                            labelAll="Todas las Sedes"
                        />
                        <div className="overflow-x-auto pb-1 custom-scrollbar">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedCategory === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                >
                                    Todas
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${selectedCategory === cat ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {cat.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Dashboard */}
                <div className="flex-grow">
                    <ExpensesMetrics
                        kpis={kpis}
                        categoryDistribution={metrics.distribution}
                    />
                </div>
            </div>

            {/* RIGHT PANEL - Scrollable List */}
            <div className="w-1/2 overflow-y-auto custom-scrollbar pl-1">
                {loading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                        <Wallet size={48} className="text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No hay gastos registrados</h3>
                        <p className="text-sm text-gray-500">Intenta cambiar los filtros de fecha o sede.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 pb-20">
                        {filteredExpenses.map(exp => (
                            <Card
                                key={exp.id}
                                hover
                                onClick={() => setSelectedExpenseId(exp.id)}
                                className="group cursor-pointer border-none shadow-sm ring-1 ring-gray-100 hover:ring-pp-gold/30 hover:shadow-lg transition-all"
                            >
                                <div className="p-5 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        {/* Main Icon */}
                                        <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            <DollarSign size={20} />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="neutral" className="text-[9px] py-0.5 px-1.5 uppercase font-black">
                                                    {exp.category || 'General'}
                                                </Badge>
                                                {exp.voucher_url && (
                                                    <span className="text-[9px] font-bold text-blue-500 flex items-center gap-1">
                                                        <FileText size={10} /> Evidencia
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-900 leading-tight line-clamp-1" title={exp.description}>
                                                {exp.description}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 font-medium">
                                                <Store size={10} /> {exp.branch?.name}
                                                <span className="text-gray-300">•</span>
                                                <User size={10} /> {exp.user?.full_name?.split(' ')[0]}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xl font-black text-gray-900 group-hover:text-red-600 transition-colors">
                                            {formatCurrency(exp.amount)}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            {new Date(exp.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            <ExpensesDetailModal
                expenseId={selectedExpenseId}
                onClose={() => setSelectedExpenseId(null)}
            />

            {/* Create Modal */}
            <ExpensesFormModal
                isOpen={showNewExpenseModal}
                onClose={() => setShowNewExpenseModal(false)}
                onSuccess={() => {
                    fetchExpenses()
                    // If we had metrics state that needed manual refresh, we'd do it here,
                    // but fetchExpenses updates the list which recalculates metrics
                }}
            />
        </div>
    )
}
