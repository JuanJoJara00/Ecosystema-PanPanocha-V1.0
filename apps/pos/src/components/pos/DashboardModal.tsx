import { X, Calendar, ChevronDown, Package, Target, TrendingDown, Heart, BarChart3, PieChart } from 'lucide-react';
import { BrandBackground } from './BrandBackground';
import { Button, Card } from '@panpanocha/ui';
import { useEffect, useState, useMemo } from 'react';
import { usePosStore } from '../../store';
import { formatCurrency } from '@panpanocha/shared';
import { supabase } from '../../api/client';

interface DashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type DateRange = 'shift' | 'today' | '7days' | '15days';

export const DashboardModal = ({ isOpen, onClose }: DashboardModalProps) => {
    const { currentShift, refreshDashboardTrigger } = usePosStore();
    const [mounted, setMounted] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange>('today');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Data State
    const [allSales, setAllSales] = useState<any[]>([]);
    const [allExpenses, setAllExpenses] = useState<any[]>([]);
    const [shiftStats, setShiftStats] = useState<any>({ totalSales: 0, netCash: 0 });
    const [productStats, setProductStats] = useState<{ top: any[]; low: any[] }>({ top: [], low: [] });
    const [dataSource, setDataSource] = useState<'supabase' | 'local'>('local');
    const [hoveredPayment, setHoveredPayment] = useState<any>(null);
    const [hoveredChannel, setHoveredChannel] = useState<any>(null);
    const [hoveredExpenseCategory, setHoveredExpenseCategory] = useState<any>(null);
    const [hoveredPoint, setHoveredPoint] = useState<any>(null);
    const [activeMetric, setActiveMetric] = useState<'sales' | 'ticket' | 'expenses' | 'tips'>('sales');

    const MONTHLY_GOAL = 15000000;
    const periodGoal = useMemo(() => {
        if (dateRange === 'shift' || dateRange === 'today') return MONTHLY_GOAL / 30;
        if (dateRange === '7days') return (MONTHLY_GOAL / 30) * 7;
        return (MONTHLY_GOAL / 30) * 15;
    }, [dateRange]);

    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => setMounted(false), 300);
            return () => clearTimeout(timer);
        }
        setMounted(true);
        loadData();

        // Real-time Subscription (Supabase)
        const channel = supabase
            .channel('dashboard-sales')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'sales' },
                () => {
                    loadData();
                }
            )
            .subscribe();

        // Polling (Local Sync / Fallback)
        const interval = setInterval(() => {
            loadData();
        }, 15000); // Update every 15 seconds

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [isOpen, dateRange, refreshDashboardTrigger]);

    const loadData = async () => {
        console.log("[ULTRA-DEBUG] Dashboard loadData starting...");
        try {
            // 1. Fetch Sales (Prioritize Local SQLite for performance and mock data stability)
            let salesData: any[] = [];
            let source: 'local' | 'supabase' = 'local';

            try {
                salesData = await window.electron.getAllSales();
                if (salesData && salesData.length > 0) {
                    source = 'local';
                } else if (navigator.onLine) {
                    // Fallback to Supabase if local is empty
                    const pastDate = new Date();
                    pastDate.setDate(pastDate.getDate() - 65);

                    const { data, error } = await supabase
                        .from('sales')
                        .select('id, total_amount, created_at, tip_amount, payment_method, sale_channel, created_by_system, notes, client_id')
                        .gte('created_at', pastDate.toISOString());

                    if (!error && data) {
                        salesData = data;
                        source = 'supabase';
                    }
                }
            } catch (e) {
                console.warn("Fetch failed, attempting local fallback", e);
                salesData = await window.electron.getAllSales();
                source = 'local';
            }

            setDataSource(source);
            setAllSales(salesData || []);

            // 1.1 Fetch Expenses
            let expensesData: any[] = [];
            try {
                // Fetch ALL local expenses to ensure historical data is present
                // @ts-ignore
                expensesData = await window.electron.getAllExpenses();

                // Fallback to Supabase if local is completely empty (rare case for POS)
                if ((!expensesData || expensesData.length === 0) && navigator.onLine) {
                    const pastDate = new Date();
                    pastDate.setDate(pastDate.getDate() - 65);
                    const { data } = await supabase
                        .from('expenses')
                        .select('*')
                        .gte('created_at', pastDate.toISOString());
                    if (data) expensesData = data;
                }
            } catch (e) {
                console.warn("Expenses fetch failed", e);
            }
            setAllExpenses(expensesData);

            // 2. Fetch Shift Stats (Always Local/Accurate for current Shift)
            if (currentShift) {
                const summary = await window.electron.getShiftSummary(currentShift.id);
                setShiftStats({
                    totalSales: summary.totalSales,
                    netCash: summary.totalSales - (summary.totalExpenses || 0)
                });
            }

            // 3. Products (Comparative Trends & Sparklines)
            const nowForProd = new Date();
            nowForProd.setHours(23, 59, 59, 999);
            let startDate = new Date();
            let prevStartDate = new Date();
            let prevEndDate = new Date();

            if (dateRange === 'shift') {
                if (currentShift?.start_time) {
                    startDate = new Date(currentShift.start_time);
                    const shiftDuration = nowForProd.getTime() - startDate.getTime();
                    prevStartDate = new Date(startDate.getTime() - shiftDuration);
                    prevEndDate = new Date(startDate.getTime());
                } else {
                    startDate.setHours(0, 0, 0, 0);
                    prevStartDate.setDate(startDate.getDate() - 1);
                    prevEndDate.setDate(startDate.getDate() - 1);
                    prevEndDate.setHours(23, 59, 59, 999);
                }
            } else if (dateRange === 'today') {
                startDate.setHours(0, 0, 0, 0);
                prevStartDate.setDate(startDate.getDate() - 1);
                prevStartDate.setHours(0, 0, 0, 0);
                prevEndDate.setDate(startDate.getDate() - 1);
                prevEndDate.setHours(23, 59, 59, 999);
            } else if (dateRange === '7days') {
                startDate.setDate(nowForProd.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                prevStartDate.setDate(nowForProd.getDate() - 14);
                prevStartDate.setHours(0, 0, 0, 0);
                prevEndDate.setDate(nowForProd.getDate() - 7);
                prevEndDate.setHours(23, 59, 59, 999);
            } else {
                startDate.setDate(nowForProd.getDate() - 15);
                startDate.setHours(0, 0, 0, 0);
                prevStartDate.setDate(nowForProd.getDate() - 30);
                prevStartDate.setHours(0, 0, 0, 0);
                prevEndDate.setDate(nowForProd.getDate() - 15);
                prevEndDate.setHours(23, 59, 59, 999);
            }

            const toSqlDate = (d: Date) => d.toISOString();

            const [trendsCurrent, trendsPrev, dailyRaw] = await Promise.all([
                window.electron.getProductTrendsByRange(toSqlDate(startDate), toSqlDate(nowForProd)),
                window.electron.getProductTrendsByRange(toSqlDate(prevStartDate), toSqlDate(prevEndDate)),
                window.electron.getProductDailyTrends(dateRange === 'today' ? 2 : (dateRange === '7days' ? 7 : 15))
            ]);

            console.log("Dashboard Debug - Current Trends:", trendsCurrent?.length, trendsCurrent?.slice(0, 2));
            console.log("Dashboard Debug - Prev Trends:", trendsPrev?.length, trendsPrev?.slice(0, 2));

            const prevMap = new Map((trendsPrev || []).map((p: any) => [p.name, p]));
            const dailyMap = new Map<string, number[]>();
            (dailyRaw || []).forEach((d: any) => {
                if (!dailyMap.has(d.name)) dailyMap.set(d.name, []);
                dailyMap.get(d.name)?.push(d.quantity);
            });

            const pStats = (trendsCurrent || []).map((p: any) => {
                const prevItem = prevMap.get(p.name) as any;
                const prevQty = Number(prevItem?.quantity) || 0;
                const currentQty = Number(p.quantity) || 0;
                const diff = currentQty - prevQty;

                let percent = 0;
                if (prevQty > 0) {
                    percent = (diff / prevQty) * 100;
                } else if (currentQty > 0) {
                    percent = 100;
                }

                const finalPercent = isFinite(percent) ? percent : 0;

                return {
                    name: p.name,
                    quantity: currentQty,
                    total: Number(p.total) || 0,
                    prevQuantity: prevQty,
                    percentChange: finalPercent,
                    sparkline: dailyMap.get(p.name) || []
                };
            });

            setProductStats({
                top: [...pStats].sort((a, b) => b.quantity - a.quantity).slice(0, 50),
                low: []
            });

        } catch (err) {
            console.error("Dashboard Load Error", err);
        }
    };

    // --- Filtering Logic ---
    const stats = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        let startDate = new Date();
        let prevStartDate = new Date();
        let prevEndDate = new Date();

        if (dateRange === 'shift') {
            // For shift filter, use shift start time
            if (currentShift?.start_time) {
                startDate = new Date(currentShift.start_time);
                // Previous period = same duration as current shift
                const shiftDuration = now.getTime() - startDate.getTime();
                prevStartDate = new Date(startDate.getTime() - shiftDuration);
                prevEndDate = new Date(startDate.getTime());
            } else {
                // Fallback to today if no shift
                startDate.setHours(0, 0, 0, 0);
                prevStartDate.setDate(startDate.getDate() - 1);
                prevStartDate.setHours(0, 0, 0, 0);
                prevEndDate.setDate(startDate.getDate() - 1);
                prevEndDate.setHours(23, 59, 59, 999);
            }
        } else if (dateRange === 'today') {
            startDate.setHours(0, 0, 0, 0);
            prevStartDate.setDate(startDate.getDate() - 1);
            prevStartDate.setHours(0, 0, 0, 0);
            prevEndDate.setDate(startDate.getDate() - 1);
            prevEndDate.setHours(23, 59, 59, 999);
        } else if (dateRange === '7days') {
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            prevStartDate.setDate(now.getDate() - 14);
            prevStartDate.setHours(0, 0, 0, 0);
            prevEndDate.setDate(now.getDate() - 7);
            prevEndDate.setHours(23, 59, 59, 999);
        } else {
            startDate.setDate(now.getDate() - 15);
            startDate.setHours(0, 0, 0, 0);
            prevStartDate.setDate(now.getDate() - 30);
            prevStartDate.setHours(0, 0, 0, 0);
            prevEndDate.setDate(now.getDate() - 15);
            prevEndDate.setHours(23, 59, 59, 999);
        }

        const filterSales = (start: Date, end: Date) => {
            return allSales.filter(s => {
                const d = new Date(s.created_at);
                return d >= start && d <= end;
            });
        };

        const currentSales = filterSales(startDate, now);
        const prevSales = filterSales(prevStartDate, prevEndDate);

        const sum = (arr: any[]) => arr.reduce((acc, s) => acc + (s.total_amount || 0), 0);
        const tips = (arr: any[]) => arr.reduce((acc, s) => acc + (s.tip_amount || 0), 0);
        const sumExp = (arr: any[]) => arr.reduce((acc, e) => acc + (e.amount || 0), 0);

        const grossSales = sum(currentSales);
        const totalTips = tips(currentSales);

        // Filter and sum expenses
        // Filter and sum expenses
        console.log('[Dashboard] Filtering Expenses:', { all: allExpenses.length, start: startDate, end: now });
        const currentExpenses = allExpenses.filter(e => {
            const d = new Date(e.created_at);
            return d >= startDate && d <= now;
        });
        console.log('[Dashboard] Filtered Expenses:', currentExpenses.length);
        const totalExpenses = sumExp(currentExpenses);

        const avgTicket = currentSales.length ? grossSales / currentSales.length : 0;

        // Chart Data
        const getChartPoints = (salesData: any[], start: Date, durationDays: number) => {
            const points = [];
            const isHourly = durationDays === 0;
            const steps = isHourly ? 14 : (durationDays === 7 ? 7 : 10);
            const interval = isHourly ? 1 : Math.ceil(durationDays / steps);

            for (let i = 0; i < steps; i++) {
                let s = new Date(start);
                let e = new Date(start);
                let label = "";

                if (isHourly) {
                    s.setHours(8 + i, 0, 0, 0);
                    e.setHours(8 + i, 59, 59, 999);
                    label = `${8 + i}`;
                } else {
                    s.setDate(s.getDate() + (i * interval));
                    s.setHours(0, 0, 0, 0);
                    e.setDate(e.getDate() + (i * interval) + interval - 1);
                    e.setHours(23, 59, 59, 999);
                    label = s.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                }

                const periodData = salesData.filter(sale => {
                    const d = new Date(sale.created_at);
                    return d >= s && d <= e;
                });

                let val = 0;
                if (activeMetric === 'sales') {
                    val = periodData.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
                } else if (activeMetric === 'ticket') {
                    const total = periodData.reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
                    val = periodData.length > 0 ? total / periodData.length : 0;
                } else if (activeMetric === 'tips') {
                    val = periodData.reduce((acc, sale) => acc + (sale.tip_amount || 0), 0);
                } else if (activeMetric === 'expenses') {
                    val = allExpenses.filter(exp => {
                        const d = new Date(exp.created_at);
                        return d >= s && d <= e;
                    }).reduce((acc, exp) => acc + (exp.amount || 0), 0);
                }

                points.push({ label, value: val });
            }
            return points;
        };

        const cPoints = getChartPoints(currentSales, startDate, dateRange === 'shift' ? 0 : (dateRange === 'today' ? 0 : (dateRange === '7days' ? 7 : 15)));
        const pPoints = getChartPoints(prevSales, prevStartDate, dateRange === 'shift' ? 0 : (dateRange === 'today' ? 0 : (dateRange === '7days' ? 7 : 15)));

        // Hourly Average Logic (6 AM - 12 AM)
        const getHourlyData = (salesData: any[], durationDays: number) => {
            const hours = [];
            const days = durationDays || 1;

            for (let i = 6; i <= 24; i++) {
                const hourIndex = i % 24;
                const hourSales = salesData.filter(sale => {
                    const d = new Date(sale.created_at);
                    return d.getHours() === hourIndex;
                }).reduce((acc, sale) => acc + (sale.total_amount || 0), 0);

                hours.push({
                    label: `${hourIndex === 0 ? '00' : (hourIndex < 10 ? '0' + hourIndex : hourIndex)}:00`,
                    value: hourSales / days,
                    total: hourSales
                });
            }
            return hours;
        };

        const hourlyData = getHourlyData(currentSales, dateRange === 'shift' || dateRange === 'today' ? 1 : (dateRange === '7days' ? 7 : 15));
        const maxHourly = Math.max(...hourlyData.map(h => h.value), 1000);
        const hourlyChartData = hourlyData.map(h => ({
            label: h.label,
            percent: (h.value / maxHourly) * 100,
            value: h.value
        }));

        const rawMax = Math.max(
            ...cPoints.map(p => p.value),
            ...pPoints.map(p => p.value),
            1000
        );

        // Round maxVal up to the nearest logical "5" step for clean distribution
        let roundStep = 500000;
        if (rawMax > 10000000) roundStep = 5000000;
        else if (rawMax < 1000000) roundStep = 100000;
        const maxVal = Math.ceil(rawMax / roundStep) * roundStep;

        const formatYAxis = (val: number) => {
            if (val >= 1000000) return `$${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
            if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
            return `$${val}`;
        };

        const chartData = cPoints.map((p, i) => ({
            label: p.label,
            current: (p.value / maxVal) * 100,
            previous: (pPoints[i]?.value / maxVal) * 100 || 0,
            currVal: p.value,
            prevVal: pPoints[i]?.value || 0
        }));

        const paymentMethods = currentSales.reduce((acc: any, s) => {
            const rawMethod = (s.payment_method || 'efectivo').toLowerCase();
            const methodMap: any = {
                'cash': 'efectivo',
                'efectivo': 'efectivo',
                'card': 'tarjeta',
                'tarjeta': 'tarjeta',
                'datáfono': 'tarjeta',
                'transfer': 'transferencia',
                'transferencia': 'transferencia'
            };
            const method = methodMap[rawMethod] || 'efectivo';
            acc[method] = (acc[method] || 0) + (s.total_amount || 0);
            return acc;
        }, { efectivo: 0, tarjeta: 0, transferencia: 0 });

        // Calculate Sales Channels from real data
        const saleChannels = currentSales.reduce((acc: any, s) => {
            let channel = 'Cliente General';
            if (s.sale_channel) {
                const channelMap: any = {
                    'pos': 'Cliente General',
                    'delivery': 'Domicilios',
                    'rappi': 'Rappi',
                    'registered': 'Cliente Registrado',
                    'web': 'Web'
                };
                channel = channelMap[s.sale_channel] || 'Cliente General';
            } else {
                const notesLower = (s.notes || '').toLowerCase();
                if (notesLower.includes('rappi') || s.created_by_system === 'pos-rappi') {
                    channel = 'Rappi';
                } else if (notesLower.includes('domicilio') || s.created_by_system === 'pos-delivery') {
                    channel = 'Domicilios';
                } else if (s.client_id) {
                    channel = 'Cliente Registrado';
                }
            }
            acc[channel] = (acc[channel] || 0) + s.total_amount;
            return acc;
        }, {});

        const allChannels = {
            'Cliente General': saleChannels['Cliente General'] || 0,
            'Domicilios': saleChannels['Domicilios'] || 0,
            'Rappi': saleChannels['Rappi'] || 0,
            'Cliente Registrado': saleChannels['Cliente Registrado'] || 0,
            'Web': saleChannels['Web'] || 0
        };

        // Placeholder for Taxes
        const taxRate = 0.08; // Impoconsumo 8% placeholder
        const totalTax = grossSales * taxRate;
        const netSales = grossSales - totalTax;

        return {
            grossSales,
            netSales,
            totalTax,
            avgTicket,
            totalOrders: currentSales.length,
            totalTips,
            totalExpenses,
            chartData,
            paymentMethods,
            saleChannels: allChannels,
            expenseCategories: currentExpenses.reduce((acc: any, e: any) => {
                const cat = (e.category || 'Otros').toLowerCase();
                // Normalized categories
                let category = 'Otros';
                if (cat.includes('suministro')) category = 'Suministros';
                else if (cat.includes('servicio')) category = 'Servicios';
                else if (cat.includes('nómina') || cat.includes('nomina')) category = 'Nómina';
                else if (cat.includes('arriendo')) category = 'Arriendo';
                else if (cat.includes('domicilio')) category = 'Domicilios';
                else if (cat.includes('propina')) category = 'Propinas';
                else category = 'Otros';

                acc[category] = (acc[category] || 0) + (e.amount || 0);
                return acc;
            }, {}),
            hourlyChartData,
            maxVal,
            goalProgress: (grossSales / periodGoal) * 100,
            formatYAxis
        };

    }, [allSales, dateRange, activeMetric, allExpenses]);

    if (!isOpen && !mounted) return null;

    const SmoothedChartCurve = ({ data, keyName, color, dashed, id, showArea }: { data: any[], keyName: string, color: string, dashed?: boolean, id: string, showArea?: boolean }) => {
        if (data.length < 2) return null;
        const width = 1000;
        const height = 300;
        const step = width / (data.length - 1);

        const points = data.map((d: any, i: number) => ({
            x: i * step,
            y: height - (d[keyName] / 100 * height)
        }));

        // Bézier curve calculation
        let pathData = `M ${points[0].x},${points[0].y}`;
        for (let k = 0; k < points.length - 1; k++) {
            const p0 = points[k];
            const p1 = points[k + 1];
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            const cp2x = cp1x;
            pathData += ` C ${cp1x},${p0.y} ${cp2x},${p1.y} ${p1.x},${p1.y}`;
        }

        const areaData = `${pathData} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

        return (
            <g>
                <defs>
                    <linearGradient id={`chart-gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {showArea && (
                    <path
                        d={areaData}
                        fill={`url(#chart-gradient-${id})`}
                        stroke="none"
                    />
                )}
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="3.5"
                    strokeDasharray={dashed ? "8,8" : "none"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="drop-shadow-sm"
                />
            </g>
        );
    };

    return (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full max-w-[95vw] h-[95vh] bg-gray-50 flex flex-col overflow-hidden rounded-3xl shadow-2xl transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Header */}
                <div className="bg-brand-secondary p-6 flex items-center justify-between shrink-0 relative z-20 shadow-sm">
                    <div className="flex items-center gap-6">
                        <div>
                            <h2 className="text-3xl font-bold font-display tracking-wide text-white">PANEL DE CONTROL</h2>
                            <p className="opacity-80 font-medium text-white/50 text-sm">
                                Resumen de Operación {dataSource === 'local' && dateRange === '15days' && <span className="text-yellow-400 text-xs ml-2">(Datos locales limitados)</span>}
                            </p>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all font-medium border border-white/10"
                            >
                                <Calendar size={18} />
                                <span>{dateRange === 'shift' ? 'Turno Activo' : (dateRange === 'today' ? 'Hoy' : dateRange === '7days' ? 'Últimos 7 Días' : 'Últimos 15 Días')}</span>
                                <ChevronDown size={16} />
                            </button>
                            {showFilterMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <button onClick={() => { setDateRange('shift'); setShowFilterMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700">Turno Activo</button>
                                        <button onClick={() => { console.log('[DashboardModal] Switching filter to Today'); setDateRange('today'); setShowFilterMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700">Hoy</button>
                                        <button onClick={() => { console.log('[DashboardModal] Switching filter to 7 Days'); setDateRange('7days'); setShowFilterMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700">Últimos 7 Días</button>
                                        <button onClick={() => { console.log('[DashboardModal] Switching filter to 15 Days'); setDateRange('15days'); setShowFilterMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm font-medium text-gray-700">Últimos 15 Días</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white text-gray-900 px-6 py-3 rounded-xl shadow-lg text-right border border-white/20">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Balance Turno</p>
                            <p className="text-2xl font-black font-mono">{formatCurrency(shiftStats.netCash)}</p>
                        </div>
                        <Button variant="ghost" onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center">
                            <X size={24} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 relative bg-gray-50/50">
                    <BrandBackground opacity={0.05} />

                    <div className="relative z-10 space-y-8 max-w-[1600px] mx-auto">

                        {/* 1. Comparative Chart Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                            <Card
                                onClick={() => setActiveMetric('sales')}
                                className={`p-6 border-0 shadow-sm rounded-3xl cursor-pointer transition-all hover:scale-[1.02] ${activeMetric === 'sales' ? 'ring-2 ring-green-500 bg-green-50' : 'bg-white'}`}
                            >
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Venta Bruta</h3>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(stats.grossSales)}</p>
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Total órdenes: <span className="text-gray-900">{stats.totalOrders}</span></p>
                            </Card>

                            <Card
                                onClick={() => setActiveMetric('ticket')}
                                className={`p-6 border-0 shadow-sm rounded-3xl cursor-pointer transition-all hover:scale-[1.02] ${activeMetric === 'ticket' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}`}
                            >
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ticket Promedio</h3>
                                <p className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(stats.avgTicket)}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Promedio por Venta</p>
                            </Card>

                            <Card
                                onClick={() => setActiveMetric('expenses')}
                                className={`p-6 border-0 shadow-sm rounded-3xl cursor-pointer transition-all hover:scale-[1.02] ${activeMetric === 'expenses' ? 'ring-2 ring-red-500 bg-red-50' : 'bg-white'}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingDown className="h-3 w-3 text-red-500" />
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gastos / Compras</h3>
                                </div>
                                <p className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(stats.totalExpenses)}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Salidas de Caja</p>
                            </Card>

                            <Card
                                onClick={() => setActiveMetric('tips')}
                                className={`p-6 border-0 shadow-sm rounded-3xl cursor-pointer transition-all hover:scale-[1.02] ${activeMetric === 'tips' ? 'ring-2 ring-yellow-400 bg-yellow-50' : 'bg-white'}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Heart size={12} className="text-yellow-500 fill-yellow-500" />
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Propinas</h3>
                                </div>
                                <p className="text-3xl font-black text-gray-900 tracking-tight">{formatCurrency(stats.totalTips)}</p>
                                <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Acumulado Periodo</p>
                            </Card>
                        </div>

                        <Card className="p-8 border-0 shadow-sm bg-white rounded-3xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                        Comparación de {activeMetric === 'sales' ? 'Ventas' : activeMetric === 'ticket' ? 'Ticket Promedio' : activeMetric === 'expenses' ? 'Gastos' : 'Propinas'}
                                    </h3>
                                </div>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-800"></div><span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Periodo anterior</span></div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-400"></div><span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">Periodo actual</span></div>
                                </div>
                            </div>
                            <div className="w-full h-[350px] relative z-10 group mt-4" onMouseLeave={() => setHoveredPoint(null)}>
                                <svg viewBox="0 0 1000 350" className="w-full h-full overflow-visible preserve-3d">
                                    {[0, 1, 2, 3, 4].map(i => <line key={i} x1="0" y1={i * 75} x2="1000" y2={i * 75} stroke="#f3f4f6" strokeWidth="2" />)}
                                    {[4, 3, 2, 1, 0].map(i => <text key={i} x="-20" y={i * 75 + 5} className="text-[10px] fill-gray-300 font-mono" textAnchor="end">{stats.formatYAxis(stats.maxVal / 4 * (4 - i))}</text>)}
                                    <SmoothedChartCurve data={stats.chartData} keyName="previous" color="#78350f" dashed id="prev" showArea />
                                    <SmoothedChartCurve data={stats.chartData} keyName="current" color="#facc15" id="curr" showArea />

                                    {stats.chartData.map((d, i) => {
                                        const step = 1000 / (stats.chartData.length - 1);
                                        const x = i * step;
                                        const yCurr = 300 - (d.current / 100 * 300);
                                        const yPrev = 300 - (d.previous / 100 * 300);

                                        const diff = d.currVal - d.prevVal;
                                        const growth = d.prevVal > 0 ? (diff / d.prevVal) * 100 : (d.currVal > 0 ? 100 : 0);
                                        const isPositive = diff >= 0;

                                        return (
                                            <g key={i}>
                                                {/* Current Point (Hit Area) */}
                                                <rect
                                                    x={x - (1000 / stats.chartData.length / 2)}
                                                    y="0"
                                                    width={1000 / stats.chartData.length}
                                                    height="300"
                                                    fill="transparent"
                                                    onMouseEnter={() => setHoveredPoint({ x, y: yCurr, label: d.label, val: d.currVal, prevVal: d.prevVal, growth, isPositive })}
                                                    className="cursor-crosshair"
                                                />

                                                {hoveredPoint?.label === d.label && (
                                                    <>
                                                        <line x1={x} y1={0} x2={x} y2={300} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
                                                        <circle cx={x} cy={yPrev} r="5" fill="white" stroke="#78350f" strokeWidth="3" pointerEvents="none" />
                                                        <circle cx={x} cy={yCurr} r="5" fill="white" stroke="#facc15" strokeWidth="3" pointerEvents="none" />
                                                    </>
                                                )}
                                            </g>
                                        );
                                    })}
                                    {/* X-Axis Labels (SVG Text with robust positioning) */}
                                    <g className="pointer-events-none">
                                        {stats.chartData.map((d, i) => {
                                            // Logic: Show max 10 labels evenly distributed
                                            const total = stats.chartData.length;
                                            const interval = Math.ceil(total / 10);
                                            const showLabel = total < 12 || i % interval === 0;

                                            const step = 1000 / (total - 1);
                                            const x = i * step;

                                            return showLabel ? (
                                                <g key={i} transform={`translate(${x}, 325)`}>
                                                    <line x1="0" y1="-25" x2="0" y2="-17" stroke="#e5e7eb" strokeWidth="1" />
                                                    <text
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        className="text-[10px] font-medium fill-gray-400"
                                                        style={{ fontSize: '10px' }}
                                                    >
                                                        {d.label}
                                                    </text>
                                                </g>
                                            ) : null;
                                        })}
                                    </g>
                                </svg>
                            </div>

                            {/* Fixed Info Bar */}
                            <div className="mt-8 border-t border-gray-100 pt-6 min-h-[80px]">
                                {hoveredPoint ? (
                                    <div className="flex items-center justify-center gap-16 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-16">
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fecha</p>
                                                <p className="text-xl font-bold text-gray-800">{hoveredPoint.label}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Actual</p>
                                                <p className="text-xl font-black text-yellow-500">{formatCurrency(hoveredPoint.val)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Anterior</p>
                                                <p className="text-xl font-bold text-[#78350f]">{formatCurrency(hoveredPoint.prevVal)}</p>
                                            </div>
                                        </div>

                                        {hoveredPoint.prevVal > 0 && (
                                            <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${hoveredPoint.isPositive ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                                {hoveredPoint.isPositive ? <TrendingDown className="w-5 h-5 rotate-180" /> : <TrendingDown className="w-5 h-5" />}
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase opacity-60">Crecimiento</p>
                                                    <p className="text-lg font-black">{Math.abs(hoveredPoint.growth).toFixed(1)}%</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-300 text-sm font-medium italic">
                                        Desliza sobre la gráfica para ver detalles
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* 2. Goal Section (Dynamic Context) */}
                        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Target className="h-5 w-5 text-purple-600" />
                                <span className="text-sm font-semibold text-purple-700">Meta de Ventas ({dateRange === 'shift' ? 'Turno' : (dateRange === 'today' ? 'Hoy' : (dateRange === '7days' ? '7 Días' : '15 Días'))})</span>
                            </div>
                            <div className="flex justify-between items-end mb-2">
                                <div><p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.grossSales)}</p><p className="text-xs text-gray-600">de {formatCurrency(periodGoal)}</p></div>
                                <span className="text-lg font-bold text-purple-600">{stats.goalProgress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-500" style={{ width: `${Math.min(stats.goalProgress, 100)}%` }} />
                            </div>
                        </Card>



                        {/* 3. Product Performance Redesign (Stock-style) */}
                        <Card className="bg-white border-0 shadow-sm rounded-3xl overflow-hidden p-0">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Package className="h-5 w-5 text-gray-400" />
                                    Ranking de Productos
                                </h3>
                                <span className="text-xs font-medium text-gray-400">Rendimiento por cantidad</span>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {productStats.top.length === 0 ? (
                                    <p className="text-sm text-gray-500 py-8 text-center font-medium">Sin datos de ventas en este periodo</p>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {productStats.top.map((p: any, i) => {
                                            const pChange = Number(p.percentChange) || 0;
                                            const color = pChange >= 0 ? '#10b981' : '#ef4444';
                                            const arrow = pChange >= 0 ? '↑' : '↓';

                                            return (
                                                <div key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-default gap-4">
                                                    <div className="flex items-center gap-4 flex-shrink-0">
                                                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{p.name}</p>
                                                            <p className="text-[10px] font-medium text-gray-400">{formatCurrency(p.total)} venta total</p>
                                                        </div>
                                                    </div>

                                                    {/* Sparkline - Apple Stocks Style */}
                                                    {p.sparkline?.length > 1 ? (
                                                        <div className="flex-1 overflow-visible px-6">
                                                            <svg width="100%" height="40" className="overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                                                                <defs>
                                                                    <linearGradient id={`gradient-${i}`} x1="0" y1={Number(p.percentChange) >= 0 ? "0" : "1"} x2="0" y2={Number(p.percentChange) >= 0 ? "1" : "0"}>
                                                                        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                                                                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                                                                    </linearGradient>
                                                                </defs>
                                                                {(() => {
                                                                    let rawData = p.sparkline.map((v: any) => Number(v) || 0);
                                                                    const data = rawData.length === 1 ? [rawData[0], rawData[0]] : rawData;
                                                                    const min = Math.min(...data);
                                                                    const max = Math.max(...data, min + 1);
                                                                    const range = max - min;

                                                                    const getY = (v: number) => 36 - ((v - min) / range) * 32;
                                                                    const points = data.map((v: number, idx: number) => ({
                                                                        x: (idx / (data.length - 1)) * 100,
                                                                        y: getY(v)
                                                                    }));

                                                                    // Smoothed Path Logic (Apple Stocks Style)
                                                                    let pathData = `M ${points[0].x},${points[0].y}`;
                                                                    for (let k = 0; k < points.length - 1; k++) {
                                                                        const p0 = points[k];
                                                                        const p1 = points[k + 1];
                                                                        const cp1x = p0.x + (p1.x - p0.x) / 2;
                                                                        const cp2x = cp1x;
                                                                        pathData += ` C ${cp1x},${p0.y} ${cp2x},${p1.y} ${p1.x},${p1.y}`;
                                                                    }

                                                                    // Calculate Mathematical Average for the Baseline
                                                                    const avgValue = data.reduce((sum: number, v: number) => sum + v, 0) / data.length;
                                                                    const avgY = getY(avgValue);

                                                                    // Anchor area fill to the baseline (Average) instead of the bottom
                                                                    const areaData = `${pathData} L ${points[points.length - 1].x},${avgY} L ${points[0].x},${avgY} Z`;

                                                                    return (
                                                                        <>
                                                                            {/* Area Fill */}
                                                                            <path
                                                                                d={areaData}
                                                                                fill={`url(#gradient-${i})`}
                                                                                stroke="none"
                                                                            />
                                                                            {/* Reference Baseline (Average) - Rendered over area for visibility */}
                                                                            <line
                                                                                x1="0" y1={avgY} x2="100" y2={avgY}
                                                                                stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3"
                                                                                vectorEffect="non-scaling-stroke"
                                                                            />
                                                                            {/* Main Line */}
                                                                            <path
                                                                                d={pathData}
                                                                                fill="none"
                                                                                stroke={color}
                                                                                strokeWidth="1.8"
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                vectorEffect="non-scaling-stroke"
                                                                                className="drop-shadow-sm"
                                                                            />
                                                                            {/* End Cap Dot - Using path cap to prevent squashing in stretched SVG */}
                                                                            <path
                                                                                d={`M ${points[points.length - 1].x},${points[points.length - 1].y} L ${points[points.length - 1].x},${points[points.length - 1].y}`}
                                                                                stroke={color}
                                                                                strokeWidth="5"
                                                                                strokeLinecap="round"
                                                                                vectorEffect="non-scaling-stroke"
                                                                            />
                                                                        </>
                                                                    );
                                                                })()}
                                                            </svg>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex items-center px-6">
                                                            <div className="w-full h-[1px] bg-gray-100 opacity-30" />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-4 lg:gap-8 flex-shrink-0">
                                                        <div className="text-right min-w-[60px]">
                                                            <div className={`text-xs font-bold flex items-center justify-end gap-1`} style={{ color }}>
                                                                {arrow} {Math.abs(Number(p.percentChange) || 0).toFixed(1)}%
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 font-medium">vs periodo ant.</p>
                                                        </div>

                                                        <div className="bg-gray-50 px-4 py-2 rounded-2xl min-w-[75px] text-center border border-gray-100/50">
                                                            <p className="text-sm font-black text-gray-900">{p.quantity}</p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">unidades</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* 4. Bottom Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {/* Ventas por Hora */}
                            <Card className="p-6 border-0 shadow-lg bg-white/90 backdrop-blur">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><BarChart3 size={24} /></div>
                                    <div><h3 className="font-bold text-gray-800">Ventas por Hora</h3><p className="text-xs text-gray-500">{dateRange === 'today' || dateRange === 'shift' ? 'Distribución' : 'Promedio por Hora'}</p></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-56 flex items-end justify-between gap-1">
                                        {stats.hourlyChartData.map((d, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 bg-blue-500/20 rounded-t hover:bg-blue-500 transition-colors group relative"
                                                style={{ height: `${d.percent}%` }}
                                            >
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-gray-900 text-[11px] font-bold py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl border border-gray-100 whitespace-nowrap z-50 pointer-events-none transform scale-90 group-hover:scale-100">
                                                    {formatCurrency(d.value)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between text-[8px] text-gray-400 font-mono">
                                        {stats.hourlyChartData.filter((_, i) => i % 2 === 0).map((d, i) => (
                                            <span key={i} className="flex-1 text-center">{d.label}</span>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            {/* Métodos de Pago - Pie Chart */}
                            <Card className="p-6 border-0 shadow-lg bg-white/90 backdrop-blur">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-green-100 rounded-lg text-green-600"><PieChart size={24} /></div>
                                    <div><h3 className="font-bold text-gray-800">Métodos de Pago</h3><p className="text-xs text-gray-500">Distribución</p></div>
                                </div>
                                <div className="flex items-center justify-center">
                                    <svg viewBox="0 0 200 200" className="w-40 h-40">
                                        {(() => {
                                            const entries = Object.entries(stats.paymentMethods);
                                            const total = entries.reduce((sum, [, v]: any) => sum + v, 0);

                                            // Color mapping for payment methods (using normalized keys)
                                            const colorMap: any = {
                                                'efectivo': '#10b981',      // Verde
                                                'transferencia': '#3b82f6', // Azul
                                                'tarjeta': '#ef4444'        // Rojo
                                            };

                                            // If no sales, show empty state
                                            if (total === 0 || entries.length === 0) {
                                                return <circle cx="100" cy="100" r="80" fill="#e5e7eb" />;
                                            }

                                            // If only one payment method, show full circle
                                            if (entries.length === 1) {
                                                const method = entries[0][0].toLowerCase();
                                                const color = colorMap[method] || '#10b981';
                                                const name = entries[0][0]; // Original name
                                                return (
                                                    <g
                                                        onMouseEnter={() => setHoveredPayment({ name, percent: 100, color })}
                                                        onMouseLeave={() => setHoveredPayment(null)}
                                                        className="cursor-pointer"
                                                    >
                                                        <circle cx="100" cy="100" r="80" fill={color} opacity="0.8" />
                                                    </g>
                                                );
                                            }

                                            let cumulativePercent = 0;

                                            return entries.map(([method, amount]: any, i) => {
                                                const percent = (amount / total) * 100;
                                                const startAngle = (cumulativePercent / 100) * 360;
                                                const endAngle = ((cumulativePercent + percent) / 100) * 360;

                                                const x1 = 100 + 80 * Math.cos((Math.PI * startAngle) / 180);
                                                const y1 = 100 + 80 * Math.sin((Math.PI * startAngle) / 180);
                                                const x2 = 100 + 80 * Math.cos((Math.PI * endAngle) / 180);
                                                const y2 = 100 + 80 * Math.sin((Math.PI * endAngle) / 180);
                                                const largeArc = percent > 50 ? 1 : 0;

                                                const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                                cumulativePercent += percent;

                                                const color = colorMap[method.toLowerCase()] || '#10b981';
                                                return (
                                                    <g
                                                        key={i}
                                                        className="group cursor-pointer"
                                                        onMouseEnter={() => setHoveredPayment({ name: method, percent, color })}
                                                        onMouseLeave={() => setHoveredPayment(null)}
                                                    >
                                                        <path d={path} fill={color} opacity={hoveredPayment?.name === method ? "1" : "0.8"} className="transition-opacity" />
                                                    </g>
                                                );
                                            });
                                        })()}
                                        {/* Donut Hole */}
                                        <circle cx="100" cy="100" r="45" fill="white" />
                                        {hoveredPayment && (
                                            <g className="pointer-events-none">
                                                <text x="100" y="95" textAnchor="middle" className="text-[10px] font-bold fill-gray-500 uppercase">
                                                    {hoveredPayment.name}
                                                </text>
                                                <text x="100" y="115" textAnchor="middle" className="text-[18px] font-black" style={{ fill: hoveredPayment.color }}>
                                                    {hoveredPayment.percent.toFixed(1)}%
                                                </text>
                                            </g>
                                        )}
                                    </svg>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {[
                                        { key: 'efectivo', label: 'Efectivo', color: '#10b981' },
                                        { key: 'transferencia', label: 'Transferencia', color: '#3b82f6' },
                                        { key: 'tarjeta', label: 'Tarjeta / Datáfono', color: '#ef4444' }
                                    ].map((m) => (
                                        <div key={m.key} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: m.color }}></div>
                                                <span className="text-gray-600">{m.label}</span>
                                            </div>
                                            <span className="font-bold text-gray-700">{formatCurrency(stats.paymentMethods[m.key] || 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Canales de Venta - Pie Chart */}
                            <Card className="p-6 border-0 shadow-lg bg-white/90 backdrop-blur">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><PieChart size={24} /></div>
                                    <div><h3 className="font-bold text-gray-800">Canales de Venta</h3><p className="text-xs text-gray-500">Distribución</p></div>
                                </div>
                                <div className="flex items-center justify-center">
                                    <svg viewBox="0 0 200 200" className="w-40 h-40">
                                        {(() => {
                                            const channels = [
                                                { name: 'Cliente General', value: stats.saleChannels['Cliente General'], color: '#92400e' },
                                                { name: 'Domicilios', value: stats.saleChannels['Domicilios'], color: '#3b82f6' },
                                                { name: 'Rappi', value: stats.saleChannels['Rappi'], color: '#f59e0b' },
                                                { name: 'Cliente Registrado', value: stats.saleChannels['Cliente Registrado'], color: '#facc15' },
                                                { name: 'Web', value: stats.saleChannels['Web'], color: '#10b981' }
                                            ];
                                            const total = channels.reduce((sum, c) => sum + c.value, 0);

                                            // If no sales, show empty state
                                            if (total === 0) {
                                                return <circle cx="100" cy="100" r="80" fill="#e5e7eb" />;
                                            }

                                            // If only one channel, show full circle
                                            const activeChannels = channels.filter(c => c.value > 0);
                                            if (activeChannels.length === 1) {
                                                const ch = activeChannels[0];
                                                return (
                                                    <g
                                                        onMouseEnter={() => setHoveredChannel({ name: ch.name, percent: 100, color: ch.color })}
                                                        onMouseLeave={() => setHoveredChannel(null)}
                                                        className="cursor-pointer"
                                                    >
                                                        <circle cx="100" cy="100" r="80" fill={ch.color} opacity="0.8" />
                                                    </g>
                                                );
                                            }

                                            let cumulativePercent = 0;

                                            return channels.map((channel, i) => {
                                                if (channel.value === 0) return null; // Skip empty channels

                                                const percent = (channel.value / total) * 100;
                                                const startAngle = (cumulativePercent / 100) * 360;
                                                const endAngle = ((cumulativePercent + percent) / 100) * 360;

                                                const x1 = 100 + 80 * Math.cos((Math.PI * startAngle) / 180);
                                                const y1 = 100 + 80 * Math.sin((Math.PI * startAngle) / 180);
                                                const x2 = 100 + 80 * Math.cos((Math.PI * endAngle) / 180);
                                                const y2 = 100 + 80 * Math.sin((Math.PI * endAngle) / 180);
                                                const largeArc = percent > 50 ? 1 : 0;

                                                const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                                cumulativePercent += percent;

                                                return (
                                                    <g
                                                        key={i}
                                                        className="group cursor-pointer"
                                                        onMouseEnter={() => setHoveredChannel({ name: channel.name, percent, color: channel.color })}
                                                        onMouseLeave={() => setHoveredChannel(null)}
                                                    >
                                                        <path d={path} fill={channel.color} opacity={hoveredChannel?.name === channel.name ? "1" : "0.8"} className="transition-opacity" />
                                                    </g>
                                                );
                                            });
                                        })()}
                                        {/* Donut Hole */}
                                        <circle cx="100" cy="100" r="45" fill="white" />
                                        {hoveredChannel && (
                                            <g className="pointer-events-none">
                                                <text x="100" y="95" textAnchor="middle" className="text-[10px] font-bold fill-gray-500 uppercase">
                                                    {hoveredChannel.name.length > 15 ? hoveredChannel.name.substring(0, 12) + '...' : hoveredChannel.name}
                                                </text>
                                                <text x="100" y="115" textAnchor="middle" className="text-[18px] font-black" style={{ fill: hoveredChannel.color }}>
                                                    {hoveredChannel.percent.toFixed(1)}%
                                                </text>
                                            </g>
                                        )}
                                    </svg>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {[
                                        { name: 'Cliente General', value: stats.saleChannels['Cliente General'], color: '#92400e' },
                                        { name: 'Domicilios', value: stats.saleChannels['Domicilios'], color: '#3b82f6' },
                                        { name: 'Rappi', value: stats.saleChannels['Rappi'], color: '#f59e0b' },
                                        { name: 'Cliente Registrado', value: stats.saleChannels['Cliente Registrado'], color: '#facc15' },
                                        { name: 'Web', value: stats.saleChannels['Web'], color: '#10b981' }
                                    ].map((channel, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: channel.color }}></div>
                                                <span className="text-gray-600">{channel.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-700">{formatCurrency(channel.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Gastos de Caja (New) - Pie Chart */}
                            <Card className="p-6 border-0 shadow-lg bg-white/90 backdrop-blur">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-red-100 rounded-lg text-red-600"><PieChart size={24} /></div>
                                    <div><h3 className="font-bold text-gray-800">Gastos de Caja</h3><p className="text-xs text-gray-500">Por Categoría</p></div>
                                </div>
                                <div className="flex items-center justify-center">
                                    <svg viewBox="0 0 200 200" className="w-40 h-40">
                                        {(() => {
                                            const categories = [
                                                { name: 'Suministros', value: stats.expenseCategories['Suministros'] || 0, color: '#06b6d4' },
                                                { name: 'Servicios', value: stats.expenseCategories['Servicios'] || 0, color: '#f59e0b' },
                                                { name: 'Nómina', value: stats.expenseCategories['Nómina'] || 0, color: '#d946ef' },
                                                { name: 'Arriendo', value: stats.expenseCategories['Arriendo'] || 0, color: '#6366f1' },
                                                { name: 'Domicilios', value: stats.expenseCategories['Domicilios'] || 0, color: '#3b82f6' },
                                                { name: 'Propinas', value: stats.expenseCategories['Propinas'] || 0, color: '#10b981' }, // Emerald-500
                                                { name: 'Otros', value: stats.expenseCategories['Otros'] || 0, color: '#9ca3af' }
                                            ];
                                            const total = categories.reduce((sum, c) => sum + c.value, 0);

                                            // If no sales, show empty state
                                            if (total === 0) {
                                                return <circle cx="100" cy="100" r="80" fill="#e5e7eb" />;
                                            }

                                            // If only one category, show full circle
                                            const activeCategories = categories.filter(c => c.value > 0);
                                            if (activeCategories.length === 1) {
                                                const cat = activeCategories[0];
                                                return (
                                                    <g
                                                        onMouseEnter={() => setHoveredExpenseCategory({ name: cat.name, percent: 100, color: cat.color })}
                                                        onMouseLeave={() => setHoveredExpenseCategory(null)}
                                                        className="cursor-pointer"
                                                    >
                                                        <circle cx="100" cy="100" r="80" fill={cat.color} opacity="0.8" />
                                                    </g>
                                                );
                                            }

                                            let cumulativePercent = 0;

                                            return categories.map((cat, i) => {
                                                if (cat.value === 0) return null; // Skip empty

                                                const percent = (cat.value / total) * 100;
                                                const startAngle = (cumulativePercent / 100) * 360;
                                                const endAngle = ((cumulativePercent + percent) / 100) * 360;

                                                const x1 = 100 + 80 * Math.cos((Math.PI * startAngle) / 180);
                                                const y1 = 100 + 80 * Math.sin((Math.PI * startAngle) / 180);
                                                const x2 = 100 + 80 * Math.cos((Math.PI * endAngle) / 180);
                                                const y2 = 100 + 80 * Math.sin((Math.PI * endAngle) / 180);
                                                const largeArc = percent > 50 ? 1 : 0;

                                                const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                                                cumulativePercent += percent;

                                                return (
                                                    <g
                                                        key={i}
                                                        className="group cursor-pointer"
                                                        onMouseEnter={() => setHoveredExpenseCategory({ name: cat.name, percent, color: cat.color })}
                                                        onMouseLeave={() => setHoveredExpenseCategory(null)}
                                                    >
                                                        <path d={path} fill={cat.color} opacity={hoveredExpenseCategory?.name === cat.name ? "1" : "0.8"} className="transition-opacity" />
                                                    </g>
                                                );
                                            });
                                        })()}
                                        {/* Donut Hole */}
                                        <circle cx="100" cy="100" r="45" fill="white" />
                                        {hoveredExpenseCategory && (
                                            <g className="pointer-events-none">
                                                <text x="100" y="95" textAnchor="middle" className="text-[10px] font-bold fill-gray-500 uppercase">
                                                    {hoveredExpenseCategory.name.length > 15 ? hoveredExpenseCategory.name.substring(0, 12) + '...' : hoveredExpenseCategory.name}
                                                </text>
                                                <text x="100" y="115" textAnchor="middle" className="text-[18px] font-black" style={{ fill: hoveredExpenseCategory.color }}>
                                                    {hoveredExpenseCategory.percent.toFixed(1)}%
                                                </text>
                                            </g>
                                        )}
                                    </svg>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {[
                                        { name: 'Suministros', color: '#06b6d4' },
                                        { name: 'Servicios', color: '#f59e0b' },
                                        { name: 'Nómina', color: '#d946ef' },
                                        { name: 'Arriendo', color: '#6366f1' },
                                        { name: 'Domicilios', color: '#3b82f6' },
                                        { name: 'Propinas', color: '#10b981' },
                                        { name: 'Otros', color: '#9ca3af' }
                                    ].map((cat, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }}></div>
                                                <span className="text-gray-600">{cat.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-700">{formatCurrency(stats.expenseCategories[cat.name] || 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
