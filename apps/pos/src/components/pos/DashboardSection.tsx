import { useState, useEffect } from 'react';
import { TrendingUp, Package, DollarSign, Target, TrendingDown, Heart, AlertTriangle } from 'lucide-react';
import { usePosStore } from '../../store';
import { formatCurrency } from '@panpanocha/shared';
import { Card } from '@panpanocha/ui';

interface ProductStats {
    product_id: string;
    product_name: string;
    quantity: number;
    total_revenue: number;
}

export default function DashboardSection() {
    const { currentShift } = usePosStore();
    const [stats, setStats] = useState({
        totalSales: 0,
        totalExpenses: 0, // NEW
        netCash: 0,      // NEW
        salesCount: 0,
        averageTicket: 0,
        totalTips: 0,
        topProducts: [] as ProductStats[],
        lowProducts: [] as ProductStats[]
    });
    const [loading, setLoading] = useState(true);

    // Daily sales goal (TODO: Load from configuration)
    const dailyGoal = 500000; // $500,000 COP

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, [currentShift]);

    const loadStats = async () => {
        try {
            setLoading(true);

            if (!currentShift) {
                setStats({
                    totalSales: 0,
                    totalExpenses: 0,
                    netCash: 0,
                    salesCount: 0,
                    averageTicket: 0,
                    totalTips: 0,
                    topProducts: [],
                    lowProducts: []
                });
                return;
            }

            // Use the optimized summary from DAO (Strict Shift Data for Financials)
            const summary = await window.electron.getShiftSummary(currentShift.id);

            // Fetch 7-Day Product Trends (For Analysis: "Productos menos vendidos en los ultimos 7 dias")
            const productTrends = await window.electron.getProductTrends(7);

            // Process Top/Low products from 7-Day Trends
            const productStats = productTrends.map((p: any) => ({
                product_id: p.name, // Using name as ID for display aggregation if needed
                product_name: p.name,
                quantity: p.quantity,
                total_revenue: p.total
            }));

            const topProducts = [...productStats]
                .sort((a: any, b: any) => b.quantity - a.quantity)
                .slice(0, 5);

            const lowProducts = [...productStats]
                .sort((a: any, b: any) => a.quantity - b.quantity)
                .slice(0, 5);

            // Calculate Net Cash (Sales - Expenses)
            // Note: In strict accounting, Net Cash = Initial + Sales - Expenses
            // But for Dashboard "Profit/Loss" view, Sales - Expenses is often what's wanted.
            // Let's show Net Cash Flow = Cash Sales - Expenses (liquidity available generated)
            // Or just Sales vs Expenses. Let's show Sales - Expenses as "Balance Operativo"

            setStats({
                totalSales: summary.totalSales,
                totalExpenses: summary.totalExpenses || 0,
                netCash: summary.totalSales - (summary.totalExpenses || 0),
                salesCount: summary.salesCount,
                averageTicket: summary.salesCount > 0 ? summary.totalSales / summary.salesCount : 0,
                totalTips: summary.totalTips,
                topProducts,
                lowProducts
            });

        } catch (error) {
            console.error('[Dashboard] Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const goalProgress = (stats.totalSales / dailyGoal) * 100;

    if (loading && stats.salesCount === 0) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando estadísticas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">📊 Dashboard</h2>
                    <p className="text-sm text-gray-600">
                        {currentShift ? `Turno: ${currentShift.turn_type}` : 'Sin turno activo'}
                    </p>
                </div>
                {/* Net Balance Badge */}
                <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-md">
                    <p className="text-xs text-gray-400 uppercase font-bold">Balance Turno</p>
                    <p className={`text-xl font-bold ${stats.netCash >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(stats.netCash)}
                    </p>
                </div>
            </div>

            {/* Daily Goal Progress */}
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">Meta de Ventas</span>
                </div>
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
                        <p className="text-xs text-gray-600">de {formatCurrency(dailyGoal)}</p>
                    </div>
                    <span className="text-lg font-bold text-purple-600">{goalProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-500"
                        style={{ width: `${Math.min(goalProgress, 100)}%` }}
                    />
                </div>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                {/* Ventas */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">Ventas</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSales)}</p>
                    <p className="text-xs text-green-700 mt-1">{stats.salesCount} ops</p>
                </Card>

                {/* Gastos */}
                <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        <span className="text-xs font-semibold text-red-700">Gastos</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalExpenses)}</p>
                    <p className="text-xs text-red-700 mt-1">Egresos caja</p>
                </Card>

                {/* Propinas */}
                <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Heart size={20} className="text-yellow-600 fill-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-700">Propinas</span>
                    </div>
                    {/* @ts-ignore */}
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalTips || 0)}</p>
                    <p className="text-xs text-yellow-700 mt-1">Acumulado</p>
                </Card>

                {/* Ticket Promedio */}
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-700">Promedio</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageTicket)}</p>
                    <p className="text-xs text-blue-700 mt-1">/ Cliente</p>
                </Card>
            </div>

            {/* Top Products */}
            <div className="grid grid-cols-2 gap-6">
                <Card className="bg-white border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Package className="h-5 w-5 text-[#D4AF37]" />
                        Más Vendidos
                    </h3>
                    {stats.topProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">Sin datos</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {stats.topProducts.map((product, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="w-5 h-5 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="text-xs font-medium text-gray-900">{product.product_name}</p>
                                            <p className="text-[10px] text-gray-500">{formatCurrency(product.total_revenue)}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-700">{product.quantity}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Low Check */}
                <Card className="bg-white border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        Menos Vendidos
                    </h3>
                    {stats.lowProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">Sin datos</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {stats.lowProducts.map((product, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-orange-50/50 rounded border border-orange-100">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-xs font-medium text-gray-900">{product.product_name}</p>
                                            <p className="text-[10px] text-gray-500">{formatCurrency(product.total_revenue)}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-orange-700">{product.quantity}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <div className="text-xs text-gray-400 text-center">
                Actualizado: {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
}
