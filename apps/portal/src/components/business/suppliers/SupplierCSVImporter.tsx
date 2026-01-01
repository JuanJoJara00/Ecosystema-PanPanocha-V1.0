'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, Check, AlertCircle, Loader2, CircleX, Download } from 'lucide-react'
import Button from '@/components/ui/Button'

import { Supplier } from '@panpanocha/types'

// Type suitable for import (no ID, no stats)
type ImportedSupplier = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>

interface SupplierCSVImporterProps {
    onSuccess: () => void
}

export default function SupplierCSVImporter({ onSuccess }: SupplierCSVImporterProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<ImportedSupplier[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successCount, setSuccessCount] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0])
        }
    }

    const handleFile = (file: File) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Por favor sube un archivo CSV válido.')
            return
        }

        setFile(file)
        setError(null)
        setSuccessCount(0)
        parseCSV(file)
    }

    const parseCSV = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                try {
                    const parsedSuppliers = results.data.map((row: any) => {
                        // Map CSV columns to database fields
                        const name = row['PROVEEDOR'] || ''
                        const phone = row['CELULAR'] || ''
                        const email = row['CORREO ELECTRONICO'] || ''

                        // Payment terms
                        let payment_terms = row['PLAZO PAGO (DIAS)'] || ''
                        if (payment_terms && !isNaN(payment_terms)) {
                            payment_terms = `${payment_terms} días`
                        }

                        const order_day = row['DIAS DE PEDIDO'] || ''
                        const delivery_day = row['DIAS DE ENTREGA'] || ''

                        // Combine other fields into notes
                        const notesParts = []
                        if (row['MEDIO PEDIDO']) notesParts.push(`Medio Pedido: ${row['MEDIO PEDIDO']}`)
                        if (row['MEDIO PAGO']) notesParts.push(`Medio Pago: ${row['MEDIO PAGO']}`)
                        if (row['HORARIO ATENCION']) notesParts.push(`Horario: ${row['HORARIO ATENCION']}`)
                        if (row['PEDIDO MIN']) notesParts.push(`Pedido Min: ${row['PEDIDO MIN']}`)
                        if (row['NOTAS']) notesParts.push(row['NOTAS'])

                        return {
                            name: name.trim(),
                            phone: phone.trim(),
                            email: email === 'N/A' ? '' : email.trim(),
                            payment_terms: payment_terms.trim(),
                            order_day: order_day.trim(),
                            delivery_day: delivery_day.trim(),
                            notes: notesParts.join('\n').trim(),
                            category: 'Otros', // Default category
                            active: true
                        }
                    }).filter((s: ImportedSupplier) => s.name) // Filter out empty rows

                    setPreview(parsedSuppliers)
                } catch (err) {
                    setError('Error al procesar el archivo CSV. Verifica el formato.')
                    console.error(err)
                }
            },
            error: (err: any) => {
                setError(`Error de lectura CSV: ${err.message}`)
            }
        })
    }

    const downloadTemplate = () => {
        const headers = [
            'PROVEEDOR',
            'CELULAR',
            'CORREO ELECTRONICO',
            'PLAZO PAGO (DIAS)',
            'DIAS DE PEDIDO',
            'DIAS DE ENTREGA',
            'MEDIO PEDIDO',
            'MEDIO PAGO',
            'HORARIO ATENCION',
            'PEDIDO MIN',
            'NOTAS'
        ]
        const csvContent = headers.join(',') + '\n' + 'Distribuidora Ejemplo,3001234567,contacto@ejemplo.com,30,Lunes/Jueves,Martes/Viernes,WhatsApp,Transferencia,8am-5pm,500000,Entregar por la puerta trasera'
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'plantilla_proveedores.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleImport = async () => {
        if (preview.length === 0) return

        setLoading(true)
        setError(null)

        try {
            // Bulk insert
            const { error } = await supabase
                .from('suppliers')
                .insert(preview)

            if (error) throw error

            setSuccessCount(preview.length)
            setPreview([])
            setFile(null)
            onSuccess()

            // Auto close/reset after short delay (parent handles modal close usually, but we verify here)
            setTimeout(() => {
                setSuccessCount(0)
            }, 3000)

        } catch (err: any) {
            console.error('Import error:', err)
            setError(`Error al guardar proveedores: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                    Descarga la plantilla para asegurar el formato correcto.
                </p>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadTemplate}
                    className="text-pp-brown hover:text-pp-brown/80 font-bold underline decoration-pp-gold decoration-2"
                    startIcon={<Download className="h-4 w-4" />}
                >
                    Descargar Plantilla CSV
                </Button>
            </div>

            {!file && !successCount ? (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                        ${isDragging ? 'border-pp-gold bg-pp-gold/5' : 'border-gray-300 hover:border-pp-gold hover:bg-gray-50'}
                    `}
                >
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Arrastra tu CSV aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-500 mt-2">Columnas esperadas: PROVEEDOR, CELULAR, EMAIL, PLAZO PAGO, etc.</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        aria-label="Seleccionar archivo CSV"
                        onChange={handleFileInput}
                        className="hidden"
                    />
                </div>
            ) : successCount > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-green-800 font-bold text-lg">¡Importación Exitosa!</h3>
                    <p className="text-green-600">{successCount} proveedores han sido creados correctamente.</p>
                    <div className="flex justify-center mt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setSuccessCount(0)}
                            className="text-green-700 underline hover:text-green-800"
                        >
                            Importar otro archivo
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">{file?.name}</p>
                                <p className="text-xs text-gray-500">{preview.length} proveedores encontrados</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setFile(null); setPreview([]); }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Eliminar archivo seleccionado"
                        >
                            <CircleX className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0">
                                <tr>
                                    <th className="px-3 py-2">Proveedor</th>
                                    <th className="px-3 py-2">Teléfono</th>
                                    <th className="px-3 py-2">Términos</th>
                                    <th className="px-3 py-2">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {preview.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-800">{row.name}</td>
                                        <td className="px-3 py-2 text-gray-600">{row.phone}</td>
                                        <td className="px-3 py-2 text-gray-600">{row.payment_terms}</td>
                                        <td className="px-3 py-2 text-gray-500 truncate max-w-xs">{row.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button
                            variant="ghost"
                            onClick={() => { setFile(null); setPreview([]); }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={loading}
                            isLoading={loading}
                        >
                            Importar {preview.length} Proveedores
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}


