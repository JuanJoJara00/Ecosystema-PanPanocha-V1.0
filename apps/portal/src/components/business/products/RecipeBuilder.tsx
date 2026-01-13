'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Plus,
    Trash2,
    Save,
    X,
    Loader2,
    Search,
    Check,
    AlertCircle,
    ChefHat,
    DollarSign,
    Scale,
    Info,
    AlertTriangle,
    ArrowRight
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface RecipeBuilderProps {
    product: { id: string, name: string, price?: number }
    onClose: () => void
}

interface Ingredient {
    id: string
    name: string
    unit: string
    unit_cost: number
}

interface RecipeItem {
    id?: string
    ingredient_id: string
    quantity_required: number
    ingredient_name?: string
    unit?: string
    unit_cost?: number
}

export default function RecipeBuilder({ product, onClose }: RecipeBuilderProps) {
    const [ingredients, setIngredients] = useState<Ingredient[]>([])
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Form state for adding new ingredient
    const [selectedIngredientId, setSelectedIngredientId] = useState('')
    const [quantity, setQuantity] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    // UI Refs
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchData()

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch available inventory items with unit_cost
            const { data: invData } = await supabase
                .from('inventory_items')
                .select('id, name, unit, unit_cost')
                .order('name')

            if (invData) setIngredients(invData)

            // 2. Fetch existing recipe
            const { data: recipeData } = await supabase
                .from('product_recipes')
                .select(`
                    id,
                    ingredient_id,
                    quantity_required,
                    ingredient:inventory_items (name, unit, unit_cost)
                `)
                .eq('product_id', product.id)

            if (recipeData) {
                const mappedItems = recipeData.map((r: any) => ({
                    id: r.id,
                    ingredient_id: r.ingredient_id,
                    quantity_required: Number(r.quantity_required),
                    ingredient_name: r.ingredient?.name,
                    unit: r.ingredient?.unit,
                    unit_cost: Number(r.ingredient?.unit_cost || 0)
                }))
                setRecipeItems(mappedItems)
            }
        } catch (error) {
            console.error('Error loading recipe:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalCost = useMemo(() => {
        return recipeItems.reduce((acc, item) => {
            const cost = (item.unit_cost || 0) * item.quantity_required
            return acc + cost
        }, 0)
    }, [recipeItems])

    const projectedMargin = useMemo(() => {
        const productPrice = product.price || 0
        const margin = productPrice - totalCost
        const marginPercentage = productPrice > 0 ? (margin / productPrice) * 100 : 0
        return { margin, marginPercentage }
    }, [totalCost, product.price])

    const handleAddItem = () => {
        if (!selectedIngredientId || !quantity) return

        const ingredient = ingredients.find(i => i.id === selectedIngredientId)
        if (!ingredient) return

        if (recipeItems.some(item => item.ingredient_id === selectedIngredientId)) {
            return
        }

        const newItem: RecipeItem = {
            ingredient_id: selectedIngredientId,
            quantity_required: parseFloat(quantity),
            ingredient_name: ingredient.name,
            unit: ingredient.unit,
            unit_cost: ingredient.unit_cost
        }

        setRecipeItems([...recipeItems, newItem])
        setSelectedIngredientId('')
        setSearchTerm('')
        setQuantity('')
        setIsDropdownOpen(false)
    }

    const handleRemoveItem = (index: number) => {
        setRecipeItems(recipeItems.filter((_, i) => i !== index))
    }

    const handleSelectIngredient = (ing: Ingredient) => {
        setSelectedIngredientId(ing.id)
        setSearchTerm(ing.name)
        setIsDropdownOpen(false)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await supabase
                .from('product_recipes')
                .delete()
                .eq('product_id', product.id)

            if (recipeItems.length > 0) {
                const payload = recipeItems.map(item => ({
                    product_id: product.id,
                    ingredient_id: item.ingredient_id,
                    quantity_required: item.quantity_required
                }))

                const { error } = await supabase
                    .from('product_recipes')
                    .insert(payload)

                if (error) throw error
            }
            onClose()
        } catch (error: any) {
            console.error('Error saving recipe:', error)
            alert('Error al guardar receta: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const filteredIngredients = ingredients.filter(ing =>
        ing.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in-95 duration-300">
            {/* Header Area */}
            <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-pp-gold h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg shadow-pp-gold/20">
                        <ChefHat className="h-8 w-8 text-pp-brown" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter font-display leading-tight">
                            Constructor de Recetas
                        </h2>
                        <p className="text-sm font-bold text-gray-500 flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                            Composición para: <span className="text-pp-gold font-black">{product.name}</span>
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-12 w-12 rounded-full hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-white/10"
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Split Content Body */}
            <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">

                {/* Left Panel: Selection & Builder (3/5) */}
                <div className="lg:w-3/5 p-8 overflow-y-auto space-y-8">

                    {/* Input Section */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-blue-500/10 p-1.5 rounded-lg text-blue-500">
                                <Plus size={16} strokeWidth={3} />
                            </div>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Agregar Ingrediente</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Searchable Dropdown */}
                            <div className="md:col-span-7 relative" ref={dropdownRef}>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-pp-gold transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Buscar materia prima..."
                                        className="w-full bg-gray-50 dark:bg-slate-900/50 border border-transparent focus:border-pp-gold/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-black uppercase tracking-tight outline-none ring-0 transition-all placeholder:text-gray-400 placeholder:normal-case shadow-inner"
                                        value={searchTerm}
                                        onChange={e => {
                                            setSearchTerm(e.target.value)
                                            setIsDropdownOpen(true)
                                            if (!e.target.value) setSelectedIngredientId('')
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                    />
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-50 p-2 animate-in slide-in-from-top-2 duration-200">
                                        {filteredIngredients.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <Info className="mx-auto h-8 w-8 text-gray-200 mb-2" />
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sin resultados</p>
                                            </div>
                                        ) : (
                                            filteredIngredients.map(ing => (
                                                <button
                                                    key={ing.id}
                                                    onClick={() => handleSelectIngredient(ing)}
                                                    className="w-full text-left p-4 rounded-xl hover:bg-pp-gold/5 dark:hover:bg-pp-gold/10 flex justify-between items-center group transition-all"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-gray-800 dark:text-white uppercase tracking-tight group-hover:text-pp-brown transition-colors">{ing.name}</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5 group-hover:text-pp-gold transition-colors">Costo: ${ing.unit_cost}/{ing.unit}</span>
                                                    </div>
                                                    <div className="bg-gray-100 dark:bg-slate-700/50 px-3 py-1 rounded-lg text-[10px] font-black text-gray-500 uppercase group-hover:bg-pp-gold group-hover:text-pp-brown transition-all">
                                                        {ing.unit}
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Quantity Input */}
                            <div className="md:col-span-3 h-full">
                                <div className="relative h-full">
                                    <input
                                        type="number"
                                        step="0.001"
                                        placeholder="0.00"
                                        className="w-full h-full bg-gray-50 dark:bg-slate-900/50 border border-transparent focus:border-pp-gold/50 rounded-2xl px-4 py-3.5 text-sm font-black text-pp-brown outline-none ring-0 transition-all shadow-inner text-center"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                    />
                                    {selectedIngredientId && (
                                        <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none">
                                            <Badge size="sm" className="bg-white/50 dark:bg-black/20 text-[9px] font-black border-none uppercase py-0.5">{ingredients.find(i => i.id === selectedIngredientId)?.unit}</Badge>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add Button */}
                            <div className="md:col-span-2">
                                <Button
                                    onClick={handleAddItem}
                                    disabled={!selectedIngredientId || !quantity}
                                    className="w-full h-full rounded-2xl bg-pp-brown text-white hover:bg-pp-brown/90 shadow-lg shadow-pp-brown/20 border-none transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-50"
                                >
                                    <Check className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Composition List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Scale size={14} className="text-pp-gold" />
                                Composición Actual
                            </h3>
                            <span className="text-[10px] font-black text-pp-gold uppercase bg-pp-gold/10 px-2 py-0.5 rounded-full">{recipeItems.length} Elementos</span>
                        </div>

                        {recipeItems.length === 0 ? (
                            <div className="bg-gray-50 dark:bg-slate-800/50 border-2 border-dashed border-gray-200 dark:border-white/5 p-12 rounded-3xl flex flex-col items-center text-center">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl mb-4 shadow-sm">
                                    <AlertTriangle className="h-8 w-8 text-gray-400" />
                                </div>
                                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1">Receta Vacía</h4>
                                <p className="text-xs font-bold text-gray-400 leading-relaxed max-w-xs uppercase tracking-tighter">Empieza agregando ingredientes desde el panel superior para calcular el costo de producción.</p>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {recipeItems.map((item, index) => {
                                    const cost = (item.unit_cost || 0) * item.quantity_required
                                    return (
                                        <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm group hover:border-pp-gold/30 hover:shadow-md transition-all flex items-center justify-between animate-in slide-in-from-left-4 duration-200">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-gray-100 dark:bg-slate-700 h-10 w-10 rounded-xl flex items-center justify-center font-black text-gray-400 text-xs">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-gray-800 dark:text-white uppercase tracking-tight leading-tight">{item.ingredient_name}</h4>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                                        {item.quantity_required} {item.unit} <span className="text-pp-gold/70 mx-1">•</span> <span className="font-mono">${item.unit_cost}/{item.unit}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Costo Ind.</span>
                                                    <span className="font-black font-mono text-base text-gray-900 dark:text-white leading-none">${Math.round(cost).toLocaleString()}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    aria-label={`Eliminar ingrediente ${item.ingredient_name}`}
                                                    className="h-10 w-10 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Cost Analysis Summary (2/5) */}
                <div className="lg:w-2/5 border-l border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-800/20 p-8 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <AlertCircle size={14} className="text-gray-400" />
                                Resumen Analítico
                            </h3>

                            <div className="space-y-4">
                                {/* Summary Cards */}
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Costo de Producción</span>
                                        <div className="bg-blue-500/10 p-1.5 rounded-lg text-blue-500">
                                            <DollarSign size={14} strokeWidth={3} />
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-gray-900 dark:text-white font-mono tracking-tighter">
                                            ${Math.round(totalCost).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-pp-brown p-6 rounded-3xl shadow-xl shadow-pp-brown/20 relative overflow-hidden group">
                                    <div className="absolute -right-4 -top-4 opacity-5 bg-white h-24 w-24 rounded-full transition-transform group-hover:scale-150 duration-700" />
                                    <div className="flex justify-between items-center mb-2 relative z-10">
                                        <span className="text-[10px] font-black text-pp-gold uppercase tracking-widest">Margen de Utilidad</span>
                                        <Badge
                                            size="sm"
                                            className={`${projectedMargin.marginPercentage > 30 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'} border-none py-0.5 px-3 text-[10px] font-black uppercase`}
                                        >
                                            {projectedMargin.marginPercentage > 30 ? 'Rentable' : 'Margin Bajo'}
                                        </Badge>
                                    </div>
                                    <div className="relative z-10 flex flex-col">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-white font-mono tracking-tighter">${Math.round(projectedMargin.margin).toLocaleString()}</span>
                                            <span className="text-sm font-black text-pp-gold font-mono">({Math.round(projectedMargin.marginPercentage)}%)</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2 leading-tight">Basado en precio de venta: <span className="text-pp-gold">${(product.price || 0).toLocaleString()}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-white dark:border-white/10 flex items-start gap-4">
                            <div className="text-pp-gold mt-1 shrink-0"><Info size={20} /></div>
                            <p className="text-[10px] font-black text-gray-500 uppercase leading-snug tracking-tighter">
                                El costo de receta se calcula sumando el costo unitario de cada ingrediente multiplicado por la cantidad requerida. Este costo impactará directamente en tus indicadores de rentabilidad del tablero principal.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full h-16 rounded-[2rem] bg-pp-gold text-pp-brown hover:bg-pp-gold/90 shadow-2xl shadow-pp-gold/20 border-none font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:scale-95 text-lg"
                        >
                            {saving ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-6 w-6" />
                                    Guardar Receta
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                            Volver
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

