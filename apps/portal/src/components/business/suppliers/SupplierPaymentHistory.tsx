'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, FileText, Calendar, Building2, Download, CheckCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface PaidOrder {
    id: string
    created_at: string
    total_amount: number
    invoice_url: string
    payment_proof_url: string
    payment_status: string
    status: string
    supplier: { name: string }
    branch: { name: string }
}

export default function SupplierPaymentHistory() {
    const [orders, setOrders] = useState<PaidOrder[]>([])
    const [currentOrders, setCurrentOrders] = useState<PaidOrder[]>([]) // Filtered list
    const [suppliers, setSuppliers] = useState<{ name: string }[]>([])
    const [branches, setBranches] = useState<string[]>([])

    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
    const [selectedBranch, setSelectedBranch] = useState<string>('all')

    useEffect(() => {
        fetchHistory()
    }, [])

    useEffect(() => {
        if (orders.length > 0) {
            const uniqueBranches = Array.from(new Set(orders.map(o => o.branch?.name))).filter(Boolean).sort()
            setBranches(uniqueBranches)
        }
    }, [orders])

    useEffect(() => {
        filterOrders()
    }, [searchTerm, selectedSupplier, selectedBranch, orders])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            // Fetch paid and received orders
            const { data, error } = await supabase
                .from('purchase_orders')
                .select(`
                    id,
                    created_at,
                    status,
                    payment_status,
                    invoice_url,
                    payment_proof_url,
                    total_amount,
                    supplier:suppliers(name),
                    branch:branches(name)
                `)
                .eq('status', 'received')
                .eq('payment_status', 'paid')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Cast data to ensure it matches PaidOrder structure, handling array/object differences if any
            const typedOrders = (data || []).map((order: any) => ({
                ...order,
                supplier: Array.isArray(order.supplier) ? order.supplier[0] : order.supplier,
                branch: Array.isArray(order.branch) ? order.branch[0] : order.branch,
            })) as PaidOrder[]

            setOrders(typedOrders)

            // Extract unique suppliers for filter
            const uniqueSuppliers = Array.from(new Set(typedOrders.map(o => o.supplier?.name))).filter(Boolean).sort()
            setSuppliers(uniqueSuppliers.map(name => ({ name: name as string })))

        } catch (error) {
            console.error('Error fetching payment history:', error)
        } finally {
            setLoading(false)
        }
    }

    const filterOrders = () => {
        let filtered = orders

        if (selectedSupplier !== 'all') {
            filtered = filtered.filter(o => o.supplier?.name === selectedSupplier)
        }

        if (selectedBranch !== 'all') {
            filtered = filtered.filter(o => o.branch?.name === selectedBranch)
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase()
            filtered = filtered.filter(o =>
                o.supplier?.name?.toLowerCase().includes(lowerTerm) ||
                o.id.toLowerCase().includes(lowerTerm)
            )
        }

        setCurrentOrders(filtered)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount || 0)
    }

    if (loading) {
        return <div className="text-center py-12 text-gray-500 font-sans">Cargando historial...</div>
    }

    return (
        <div className="space-y-6">
            {/* Filters Card */}
            <Card className="flex flex-col md:flex-row gap-4 bg-gray-50/50 p-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por proveedor o ID de pedido..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pp-gold/50 focus:border-pp-gold transition-all outline-none font-sans"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={selectedSupplier}
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pp-gold/50 focus:border-pp-gold outline-none font-sans w-full md:w-auto"
                    >
                        <option value="all">Todos los Proveedores</option>
                        {suppliers.map(s => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Branch Filters (Pills) */}
            <div className="flex overflow-x-auto gap-2 p-1 bg-gray-200/50 rounded-lg max-w-full pb-1">
                <button
                    onClick={() => setSelectedBranch('all')}
                    className={`px-4 py-1.5 font-bold text-sm transition-all rounded-md whitespace-nowrap font-display uppercase tracking-wide ${selectedBranch === 'all'
                        ? 'bg-white text-pp-brown shadow-sm border border-pp-gold/20'
                        : 'text-gray-500 hover:text-pp-brown hover:bg-gray-200/50'
                        }`}
                >
                    Todas las Sedes
                </button>
                {branches.map(branch => (
                    <button
                        key={branch}
                        onClick={() => setSelectedBranch(branch)}
                        className={`px-4 py-1.5 font-bold text-sm transition-all rounded-md whitespace-nowrap font-display uppercase tracking-wide ${selectedBranch === branch
                            ? 'bg-white text-pp-brown shadow-sm border border-pp-gold/20'
                            : 'text-gray-500 hover:text-pp-brown hover:bg-gray-200/50'
                            }`}
                    >
                        {branch}
                    </button>
                ))}
            </div>

            {/* List */}
            {currentOrders.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-sans">No se encontraron pagos registrados con los filtros seleccionados</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {currentOrders.map(order => (
                        <Card key={order.id} hover className="p-0 overflow-hidden transition-all duration-200 border border-gray-100 shadow-sm group">
                            <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-pp-brown text-lg font-display uppercase tracking-tight">
                                            {order.supplier?.name || 'Proveedor Desconocido'}
                                        </h3>
                                        <Badge variant="success" size="sm" className="shadow-none">Pagado</Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            {new Date(order.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </span>
                                        <span className="hidden md:block w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <Building2 className="h-4 w-4 text-gray-400" />
                                            {order.branch?.name}
                                        </span>
                                        <span className="hidden md:block w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">ID: {order.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Monto Total</p>
                                        <p className="font-bold text-xl text-green-700 font-mono tracking-tight">
                                            {formatCurrency(order.total_amount)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 px-4 py-3 md:px-6 border-t border-gray-100 flex justify-between items-center text-sm">
                                <div className="flex gap-4">
                                    {order.invoice_url ? (
                                        <a
                                            href={order.invoice_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-gray-600 hover:text-pp-brown font-medium transition-colors group/link"
                                        >
                                            <div className="bg-white p-1 rounded border border-gray-200 group-hover/link:border-pp-gold/50 transition-colors">
                                                <FileText className="h-4 w-4 text-gray-400 group-hover/link:text-pp-gold" />
                                            </div>
                                            Factura
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 text-gray-400 cursor-not-allowed opacity-50">
                                            <div className="bg-white p-1 rounded border border-gray-200">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            Factura
                                        </span>
                                    )}

                                    {order.payment_proof_url ? (
                                        <a
                                            href={order.payment_proof_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-gray-600 hover:text-green-700 font-medium transition-colors group/link"
                                        >
                                            <div className="bg-white p-1 rounded border border-gray-200 group-hover/link:border-green-300 transition-colors">
                                                <CheckCircle className="h-4 w-4 text-gray-400 group-hover/link:text-green-500" />
                                            </div>
                                            Comprobante
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 text-gray-400 cursor-not-allowed opacity-50">
                                            <div className="bg-white p-1 rounded border border-gray-200">
                                                <CheckCircle className="h-4 w-4" />
                                            </div>
                                            Comprobante
                                        </span>
                                    )}
                                </div>

                                <button className="text-gray-400 hover:text-pp-brown transition-colors">
                                    <Download className="h-5 w-5" />
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
