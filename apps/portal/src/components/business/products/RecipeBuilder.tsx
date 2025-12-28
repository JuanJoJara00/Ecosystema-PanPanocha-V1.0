'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Save, X, Loader2, Search, Check, AlertCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface RecipeBuilderProps {
    product: { id: string, name: string }
    onClose: () => void
}

interface Ingredient {
    id: string
    name: string
    unit: string
}

interface RecipeItem {
    id?: string // Optional for new items not yet saved
    ingredient_id: string
    quantity_required: number
    ingredient_name?: string // For display
    unit?: string // For display
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

        // Close dropdown when clicking outside
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
            // 1. Fetch all available inventory items
            const { data: invData } = await supabase
                .from('inventory_items')
                .select('id, name, unit')
                .order('name')

            if (invData) setIngredients(invData)

            // 2. Fetch existing recipe for this product
            const { data: recipeData, error } = await supabase
                .from('product_recipes')
                .select(`
                    id,
                    ingredient_id,
                    quantity_required,
                    inventory_items (name, unit)
                `)
                .eq('product_id', product.id)

            if (recipeData) {
                const mappedItems = recipeData.map((r: any) => ({
                    id: r.id,
                    ingredient_id: r.ingredient_id,
                    quantity_required: r.quantity_required,
                    ingredient_name: r.inventory_items?.name,
                    unit: r.inventory_items?.unit
                }))
                setRecipeItems(mappedItems)
            }

        } catch (error) {
            console.error('Error loading recipe:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddItem = () => {
        if (!selectedIngredientId || !quantity) return

        const ingredient = ingredients.find(i => i.id === selectedIngredientId)
        if (!ingredient) return

        // Prevent duplicates
        if (recipeItems.some(item => item.ingredient_id === selectedIngredientId)) {
            alert('Este ingrediente ya está en la receta')
            return
        }

        const newItem: RecipeItem = {
            ingredient_id: selectedIngredientId,
            quantity_required: parseFloat(quantity),
            ingredient_name: ingredient.name,
            unit: ingredient.unit
        }

        setRecipeItems([...recipeItems, newItem])

        // Reset form
        setSelectedIngredientId('')
        setSearchTerm('')
        setQuantity('')
        setIsDropdownOpen(false)
    }

    const handleRemoveItem = (index: number) => {
        const newItems = [...recipeItems]
        newItems.splice(index, 1)
        setRecipeItems(newItems)
    }

    const handleSelectIngredient = (ing: Ingredient) => {
        setSelectedIngredientId(ing.id)
        setSearchTerm(ing.name)
        setIsDropdownOpen(false)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            // 1. Delete existing recipe items for this product (simple overwrite strategy)
            const { error: deleteError } = await supabase
                .from('product_recipes')
                .delete()
                .eq('product_id', product.id)

            if (deleteError) throw deleteError

            if (recipeItems.length > 0) {
                const payload = recipeItems.map(item => ({
                    product_id: product.id,
                    ingredient_id: item.ingredient_id,
                    quantity_required: item.quantity_required
                }))

                const { error: insertError } = await supabase
                    .from('product_recipes')
                    .insert(payload)

                if (insertError) throw insertError
            }

            alert('Receta guardada correctamente')
            onClose()

        } catch (error: any) {
            console.error('Error saving recipe:', error)
            alert('Error al guardar receta: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    // Filter ingredients based on search
    const filteredIngredients = ingredients.filter(ing =>
        ing.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <Card className="w-full max-w-3xl flex flex-col max-h-[85vh] p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center bg-gray-50/80 backdrop-blur-sm">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 font-display">
                        🍳 Constructor de Recetas
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 font-sans">
                        Define los ingredientes para: <span className="font-bold text-pp-brown">{product.name}</span>
                    </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 font-sans">

                {/* Add Ingredient Form */}
                <div className="bg-pp-gold/10 p-5 rounded-xl border border-pp-gold/20">
                    <h3 className="text-sm font-bold text-pp-brown mb-4 flex items-center gap-2 font-display">
                        <Plus className="h-4 w-4 bg-pp-gold text-pp-brown rounded-full p-0.5" />
                        Agregar Nuevo Ingrediente
                    </h3>
                    <div className="flex gap-4 items-start md:items-end flex-col md:flex-row">

                        {/* Searchable Dropdown */}
                        <div className="flex-1 w-full relative" ref={dropdownRef}>
                            <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider font-display">Buscar Ingrediente</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Escribe para buscar..."
                                    className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-pp-gold focus:ring-2 focus:ring-pp-gold transition-all font-medium"
                                    value={searchTerm}
                                    onChange={e => {
                                        setSearchTerm(e.target.value)
                                        setIsDropdownOpen(true)
                                        if (!e.target.value) setSelectedIngredientId('')
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                />
                            </div>

                            {/* Dropdown List */}
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto z-20">
                                    {filteredIngredients.length === 0 ? (
                                        <div className="p-4 text-sm text-gray-400 text-center italic">No se encontraron resultados</div>
                                    ) : (
                                        filteredIngredients.map(ing => (
                                            <button
                                                key={ing.id}
                                                onClick={() => handleSelectIngredient(ing)}
                                                className="w-full text-left px-4 py-3 text-sm hover:bg-pp-gold/10 flex justify-between items-center group transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <span className="font-semibold text-gray-700 group-hover:text-pp-brown">{ing.name}</span>
                                                <span className="text-xs font-mono text-gray-400 group-hover:text-pp-brown bg-gray-100 group-hover:bg-pp-gold/20 px-2 py-0.5 rounded-full">{ing.unit}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-32">
                            <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider font-display">Cantidad</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.00"
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-pp-gold focus:ring-2 focus:ring-pp-gold font-bold text-gray-700"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                />
                                {selectedIngredientId && (
                                    <span className="absolute right-3 top-2 text-xs font-bold text-gray-400 pointer-events-none">
                                        {ingredients.find(i => i.id === selectedIngredientId)?.unit}
                                    </span>
                                )}
                            </div>
                        </div>

                        <Button
                            onClick={handleAddItem}
                            disabled={!selectedIngredientId || !quantity}
                            className="w-full md:w-auto"
                            startIcon={<Plus className="h-5 w-5" />}
                        >
                            Agregar
                        </Button>
                    </div>
                </div>

                {/* Recipe List */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-pp-gold" />
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 font-bold tracking-wider font-display">
                                <tr>
                                    <th className="px-6 py-4">Ingrediente</th>
                                    <th className="px-6 py-4 text-right">Cantidad</th>
                                    <th className="px-6 py-4 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recipeItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <AlertCircle className="h-8 w-8 text-gray-200" />
                                                <p className="text-gray-400 font-medium">No hay ingredientes en esta receta aún.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    recipeItems.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4 font-semibold text-gray-800">
                                                {item.ingredient_name}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-mono font-bold text-pp-brown bg-pp-gold/20 px-2 py-1 rounded-md">
                                                    {item.quantity_required} {item.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="text-gray-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <Button
                    onClick={onClose}
                    variant="ghost"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                >
                    Guardar Receta
                </Button>
            </div>
        </Card>
    )
}
