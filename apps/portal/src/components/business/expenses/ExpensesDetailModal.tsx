'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
    X,
    Wallet,
    FileText,
    Calendar,
    User,
    Store,
    CheckCircle,
    Image as ImageIcon
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export interface ExpensesDetailModalProps {
    expenseId: string | null
    onClose: () => void
}

export default function ExpensesDetailModal({ expenseId, onClose }: ExpensesDetailModalProps) {
    const [expense, setExpense] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (expenseId) fetchDetails()
    }, [expenseId])

    const fetchDetails = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select(`
                    *,
                    branch:branches(name),
                    user:users!expenses_user_id_fkey(full_name),
                    shift:shifts(id, start_time)
                `)
                .eq('id', expenseId)
                .single()

            if (error) throw error
            setExpense(data)

        } catch (err) {
            console.error('Error fetching expense details:', err)
        } finally {
            setLoading(false)
        }
    }

    if (!expenseId) return null

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-white/5">

                {/* Left Panel: Evidence / Context (2/3) */}
                <div className="flex-1 bg-gray-50 dark:bg-slate-800/50 p-8 flex flex-col items-center justify-center relative border-r border-gray-100 dark:border-white/5">

                    <button onClick={onClose} title="Cerrar" className="absolute top-6 left-6 p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 transition-colors z-20">
                        <X size={20} />
                    </button>

                    {expense?.voucher_url ? (
                        <div className="w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700 relative group">
                            <img
                                src={expense.voucher_url}
                                alt="Comprobante"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                                <p className="text-white font-bold uppercase tracking-widest text-xs mb-1">Evidencia Digital</p>
                                <p className="text-white/80 text-xs">Subido el {new Date(expense.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300 gap-4">
                            <div className="h-32 w-32 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-200">
                                <ImageIcon size={64} />
                            </div>
                            <p className="font-bold uppercase tracking-widest text-xs">Sin Comprobante Adjunto</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Data (1/3) */}
                <div className="w-full md:w-[400px] bg-white dark:bg-slate-900 p-8 flex flex-col">

                    {/* Header */}
                    <div className="mb-8">
                        <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                            <Wallet size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                            {formatCurrency(expense?.amount || 0)}
                        </h2>
                        <p className="text-gray-400 text-sm font-bold uppercase tracking-wide">
                            Monto del Gasto
                        </p>
                    </div>

                    <div className="space-y-8 flex-1">
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Descripción</p>
                                <p className="text-base font-bold text-gray-700 dark:text-gray-200 leading-snug">
                                    {expense?.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Categoría</p>
                                    <Badge variant="neutral" className="uppercase text-[10px] font-bold">
                                        {expense?.category}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Sede</p>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                                        {expense?.branch?.name}
                                    </p>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 w-full" />

                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-pp-gold/20 text-pp-brown flex items-center justify-center">
                                    <User size={14} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Registrado Por</p>
                                    <p className="text-xs font-bold text-gray-900 dark:text-white capitalize">
                                        {expense?.user?.full_name?.toLowerCase()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <Button onClick={onClose} className="w-full bg-gray-900 text-white font-black uppercase tracking-widest h-12 rounded-xl">
                            Cerrar Detalle
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    )
}
