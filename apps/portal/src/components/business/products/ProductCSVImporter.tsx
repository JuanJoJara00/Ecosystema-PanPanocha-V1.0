'use client'

import { useState } from 'react'
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ProductCSVImporterProps {
    onSuccess: () => void
    onCancel: () => void
}

export default function ProductCSVImporter({ onSuccess, onCancel }: ProductCSVImporterProps) {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<any[] | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            parseCSV(selectedFile)
        }
    }

    const downloadTemplate = () => {
        const headers = ['NOMBRE', 'CATEGORIA', 'PRECIO', 'ACTIVO']
        const csvContent = headers.join(',') + '\n' + 'Croissant,Panaderia,4500,true'
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'plantilla_productos.csv'
        a.click()
    }

    const parseCSV = async (file: File) => {
        try {
            const text = await file.text()
            const lines = text.split('\n').filter(line => line.trim() !== '')
            const headers = lines[0].split(',').map(h => h.trim().toUpperCase())

            // Validate headers
            const required = ['NOMBRE', 'CATEGORIA', 'PRECIO']
            const missing = required.filter(h => !headers.includes(h))
            if (missing.length > 0) {
                throw new Error(`Faltan columnas requeridas: ${missing.join(', ')}`)
            }

            // Simple preview of first 3 rows
            const previewData = lines.slice(1, 4).map(line => {
                const values = line.split(',')
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index]?.trim()
                    return obj
                }, {} as any)
            })

            setPreview(previewData)
            setError(null)
        } catch (err: any) {
            setError(err.message || "Error al leer el archivo.")
            setPreview(null)
        }
    }

    const handleImport = async () => {
        if (!file) return
        setLoading(true)
        setError(null)

        try {
            // Get user organization
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            const { data: profile } = await supabase
                .from('users')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            if (!profile?.organization_id) throw new Error("No hay organización asignada");
            const organization_id = profile.organization_id;
            const text = await file.text()
            const lines = text.split('\n').filter(line => line.trim() !== '')
            const headers = lines[0].split(',').map(h => h.trim().toUpperCase())

            const rows = lines.slice(1).map(line => {
                const values = line.split(',')
                return headers.reduce((obj, header, index) => {
                    obj[header] = values[index]?.trim()
                    return obj
                }, {} as any)
            })

            let successCount = 0

            for (const row of rows) {
                if (!row.NOMBRE) continue

                // 1. Get or Create Category
                let categoryId = null
                if (row.CATEGORIA) {
                    const categoryName = row.CATEGORIA;
                    let { data: catData } = await supabase
                        .from('categories')
                        .select('id')
                        .eq('name', categoryName)
                        .eq('organization_id', organization_id)
                        .maybeSingle()

                    if (!catData) {
                        const { data: newCat, error: catError } = await supabase
                            .from('categories')
                            .insert({
                                name: categoryName,
                                organization_id: organization_id
                            })
                            .select()
                            .maybeSingle()
                        if (newCat) {
                            categoryId = newCat.id;
                        } else if (catError) {
                            console.error('Error creating category:', catError);
                        }
                    } else {
                        categoryId = catData.id;
                    }
                }

                // 2. Upsert Product
                const { error: prodError } = await supabase
                    .from('products')
                    .insert({
                        organization_id: organization_id,
                        name: row.NOMBRE,
                        category_id: categoryId,
                        price: parseFloat(row.PRECIO) || 0,
                        active: row.ACTIVO?.toLowerCase() === 'true' || row.ACTIVO === '1' || !row.ACTIVO
                    })

                if (!prodError) successCount++
                else console.error('Error importing row:', prodError)
            }

            onSuccess()
        } catch (err: any) {
            setError("Error en la importación: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                    Descarga la plantilla para asegurar el formato correcto.
                </p>
                <button
                    onClick={downloadTemplate}
                    className="text-sm text-pp-brown hover:text-pp-brown/80 font-bold underline font-display uppercase tracking-wider"
                >
                    Descargar Plantilla CSV
                </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="product-csv-upload"
                />
                <label htmlFor="product-csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-pp-gold" />
                    <span className="text-gray-600 font-medium">Click para subir CSV de Productos</span>
                    <span className="text-xs text-gray-400">o arrastra el archivo aquí</span>
                </label>
            </div>

            {file && (
                <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-blue-800 font-medium truncate">{file.name}</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {error}
                </div>
            )}

            {preview && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Vista previa (Primeras filas)</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
                        <pre>{JSON.stringify(preview, null, 2)}</pre>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    onClick={handleImport}
                    disabled={!file || loading}
                    className="px-4 py-2 bg-pp-gold hover:bg-pp-gold/80 text-pp-brown rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm font-display uppercase tracking-wider"
                >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Importar Productos
                </button>
            </div>
        </div>
    )
}
