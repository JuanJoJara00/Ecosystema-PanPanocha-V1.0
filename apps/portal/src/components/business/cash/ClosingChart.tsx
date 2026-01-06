import React, { useMemo, useState } from 'react';
import Card from '@/components/ui/Card';
import { TrendingUp, ArrowUp, ArrowDown, Store, FileText, Wallet, TrendingDown } from 'lucide-react';

interface ClosingChartProps {
    currentData: any[]; // UnifiedClosing[]
    prevData: any[]; // UnifiedClosing[]
}

const SmoothedChartCurve = ({ data, keyName, color, dashed, id, showArea }: { data: any[], keyName: string, color: string, dashed?: boolean, id: string, showArea?: boolean }) => {
    if (data.length < 2) return null;
    const width = 1000;
    const height = 300;
    const step = width / (data.length - 1);

    // Normalize data to 0-100 range for the chart
    const allValues = data.flatMap(d => [d.currentValue, d.prevValue].filter(v => v !== undefined && v !== null));
    const max = Math.max(...allValues, 1000);
    const min = 0;

    const points = data.map((d: any, i: number) => {
        const val = d[keyName];
        const yVal = val !== undefined ? val : 0;
        return {
            x: i * step,
            y: height - ((yVal - min) / (max - min) * height)
        }
    });

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

export const ClosingChart = ({ currentData, prevData }: ClosingChartProps) => {
    const [hoveredPoint, setHoveredPoint] = useState<any>(null);
    const [activeMetric, setActiveMetric] = useState<'panpanocha' | 'siigo' | 'expenses'>('panpanocha');

    // Calculate Totals for Cards (Current Period)
    const totals = useMemo(() => {
        return currentData.reduce((acc, item) => {
            // Cash Delivered = Final Count - Base (Pure cash generated)
            const mysCash = (item.panpanocha?.cash_audit_count || 0) - (item.panpanocha?.base_cash || 0);
            const siigoCash = (item.siigo?.cash_audit_count || 0) - (item.siigo?.base_cash || 0);

            // Expenses: Merge expenses + tips from both sources
            const mysExp = (item.panpanocha?.expenses_total || 0) + (item.panpanocha?.tips_total || 0);
            const siigoExp = (item.siigo?.expenses_total || 0) + (item.siigo?.tips_total || 0);

            return {
                panpanocha: acc.panpanocha + mysCash,
                siigo: acc.siigo + siigoCash,
                expenses: acc.expenses + (mysExp + siigoExp)
            };
        }, { panpanocha: 0, siigo: 0, expenses: 0 });
    }, [currentData]);

    // Aggregate and Align Data
    const chartData = useMemo(() => {
        const processData = (data: any[]) => {
            const grouped: Record<string, { total: number, dateObj: Date }> = {};
            data.forEach(item => {
                const dateKey = new Date(item.date).toLocaleDateString();
                if (!grouped[dateKey]) grouped[dateKey] = { total: 0, dateObj: new Date(item.date) };

                let val = 0;

                if (activeMetric === 'panpanocha') {
                    // Cash Delivered
                    val = (item.panpanocha?.cash_audit_count || 0) - (item.panpanocha?.base_cash || 0);
                } else if (activeMetric === 'siigo') {
                    // Cash Delivered
                    val = (item.siigo?.cash_audit_count || 0) - (item.siigo?.base_cash || 0);
                } else {
                    // Expenses
                    const mysExp = (item.panpanocha?.expenses_total || 0) + (item.panpanocha?.tips_total || 0);
                    const siigoExp = (item.siigo?.expenses_total || 0) + (item.siigo?.tips_total || 0);
                    val = mysExp + siigoExp;
                }

                grouped[dateKey].total += val;
            });
            return Object.entries(grouped)
                .map(([_, val]) => ({
                    date: val.dateObj,
                    total: val.total
                }))
                .sort((a, b) => a.date.getTime() - b.date.getTime());
        };

        const currentSeries = processData(currentData);
        const prevSeries = processData(prevData);

        const maxLength = Math.max(currentSeries.length, prevSeries.length);

        const aligned = [];
        for (let i = 0; i < maxLength; i++) {
            const cur = currentSeries[i];
            const prev = prevSeries[i];

            // Format labels shorter: "10/12"
            const label = cur
                ? cur.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'numeric' })
                : (prev ? `Prev ${i + 1}` : '-');

            aligned.push({
                label,
                currentValue: cur ? cur.total : 0,
                prevValue: prev ? prev.total : 0,
                fullDate: cur ? cur.date : new Date()
            });
        }

        return aligned;
    }, [currentData, prevData, activeMetric]);

    const maxVal = Math.max(...chartData.flatMap(d => [d.currentValue, d.prevValue]), 1000);

    const localFormatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

    if (chartData.length < 0) return null; // Allow empty initially? POS allows it.

    return (
        <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* PanPanocha Card */}
                <div
                    onClick={() => setActiveMetric('panpanocha')}
                    className={`cursor-pointer transition-all duration-200 p-6 rounded-3xl border-2 hover:shadow-lg relative overflow-hidden group ${activeMetric === 'panpanocha' ? 'bg-white dark:bg-slate-800 border-yellow-400 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-slate-800 border-transparent shadow-sm hover:border-yellow-200 dark:hover:border-yellow-500/30'}`}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-xl transition-colors ${activeMetric === 'panpanocha' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                                <Store className="w-5 h-5" />
                            </div>
                            <h4 className={`text-xs font-bold uppercase tracking-widest ${activeMetric === 'panpanocha' ? 'text-yellow-600' : 'text-gray-400 dark:text-gray-500'}`}>Efectivo PanPanocha</h4>
                        </div>
                        <p className={`text-2xl font-black tracking-tight ${activeMetric === 'panpanocha' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {localFormatCurrency(totals.panpanocha)}
                        </p>
                    </div>
                </div>

                {/* Siigo Card */}
                <div
                    onClick={() => setActiveMetric('siigo')}
                    className={`cursor-pointer transition-all duration-200 p-6 rounded-3xl border-2 hover:shadow-lg relative overflow-hidden group ${activeMetric === 'siigo' ? 'bg-white dark:bg-slate-800 border-blue-400 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-slate-800 border-transparent shadow-sm hover:border-blue-200 dark:hover:border-blue-500/30'}`}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-xl transition-colors ${activeMetric === 'siigo' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <h4 className={`text-xs font-bold uppercase tracking-widest ${activeMetric === 'siigo' ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`}>Efectivo Siigo</h4>
                        </div>
                        <p className={`text-2xl font-black tracking-tight ${activeMetric === 'siigo' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {localFormatCurrency(totals.siigo)}
                        </p>
                    </div>
                </div>

                {/* Expenses Card */}
                <div
                    onClick={() => setActiveMetric('expenses')}
                    className={`cursor-pointer transition-all duration-200 p-6 rounded-3xl border-2 hover:shadow-lg relative overflow-hidden group ${activeMetric === 'expenses' ? 'bg-white dark:bg-slate-800 border-red-400 shadow-md transform scale-[1.02]' : 'bg-white dark:bg-slate-800 border-transparent shadow-sm hover:border-red-200 dark:hover:border-red-500/30'}`}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2 rounded-xl transition-colors ${activeMetric === 'expenses' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                                <Wallet className="w-5 h-5" />
                            </div>
                            <h4 className={`text-xs font-bold uppercase tracking-widest ${activeMetric === 'expenses' ? 'text-red-600' : 'text-gray-400 dark:text-gray-500'}`}>Gastos de Caja</h4>
                        </div>
                        <p className={`text-2xl font-black tracking-tight ${activeMetric === 'expenses' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {localFormatCurrency(totals.expenses)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm p-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-8 z-10 relative">
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            Comparación de {activeMetric === 'panpanocha' ? 'Efectivo PanPanocha' : activeMetric === 'siigo' ? 'Efectivo Siigo' : 'Gastos de Caja'}
                        </h3>
                    </div>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#78350f]"></div><span className="text-xs font-bold text-[#78350f] uppercase tracking-wide">Periodo Anterior</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-400"></div><span className="text-xs font-bold text-yellow-500 uppercase tracking-wide">Periodo Actual</span></div>
                    </div>
                </div>

                <div className="w-full h-[350px] relative z-10 group" onMouseLeave={() => setHoveredPoint(null)}>
                    <svg viewBox="0 0 1000 350" className="w-full h-full overflow-visible preserve-3d">
                        {/* Grid Lines */}
                        {[0, 1, 2, 3, 4].map(i => <line key={i} x1="0" y1={i * 75} x2="1000" y2={i * 75} className="stroke-gray-100 dark:stroke-white/5" strokeWidth="2" />)}

                        {/* Y-Axis Labels */}
                        {[4, 3, 2, 1, 0].map(i => <text key={i} x="-10" y={i * 75 + 5} className="text-[10px] fill-gray-300 dark:fill-gray-600 font-mono" textAnchor="end">{localFormatCurrency(maxVal / 4 * (4 - i))}</text>)}

                        {/* Curves */}
                        <SmoothedChartCurve data={chartData} keyName="prevValue" color="#78350f" dashed id="prev" showArea />
                        <SmoothedChartCurve data={chartData} keyName="currentValue" color="#facc15" id="curr" showArea />

                        {/* Interactive Points */}
                        {chartData.map((d, i) => {
                            const step = 1000 / (chartData.length - 1);
                            const x = i * step;
                            const yCur = 300 - (d.currentValue / maxVal * 300);
                            const yPrev = 300 - (d.prevValue / maxVal * 300);

                            // Calculate growth
                            const growth = d.prevValue !== 0 ? ((d.currentValue - d.prevValue) / d.prevValue) * 100 : 0;
                            const isPositive = growth >= 0;

                            return (
                                <g key={i}>
                                    {/* Current Point (Invisible Hit Area) */}
                                    <rect
                                        x={x - (1000 / chartData.length / 2)}
                                        y="0"
                                        width={1000 / chartData.length}
                                        height="300"
                                        fill="transparent"
                                        onMouseEnter={() => setHoveredPoint({ ...d, x, yCur, growth, isPositive })}
                                        className="cursor-crosshair"
                                    />

                                    {/* Render Points ONLY if hovered */}
                                    {hoveredPoint?.label === d.label && (
                                        <>
                                            {/* Connecting Line */}
                                            <line x1={x} y1={0} x2={x} y2={300} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />

                                            {/* Points */}
                                            <circle cx={x} cy={yPrev} r="5" fill="white" stroke="#78350f" strokeWidth="3" />
                                            <circle cx={x} cy={yCur} r="5" fill="white" stroke="#facc15" strokeWidth="3" />
                                        </>
                                    )}
                                </g>
                            );
                        })}

                        {/* X-Axis Labels (SVG Text with robust positioning) */}
                        <g className="pointer-events-none">
                            {chartData.map((d, i) => {
                                // Logic: Show max 10 labels evenly distributed
                                const total = chartData.length;
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
                                    <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{hoveredPoint.label}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Actual</p>
                                    <p className="text-xl font-black text-yellow-500">{localFormatCurrency(hoveredPoint.currentValue)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Anterior</p>
                                    <p className="text-xl font-bold text-[#78350f]">{localFormatCurrency(hoveredPoint.prevValue)}</p>
                                </div>
                            </div>

                            {hoveredPoint.prevValue > 0 && (
                                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${hoveredPoint.isPositive ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                    {hoveredPoint.isPositive ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
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
            </div>
        </div>
    );
};
