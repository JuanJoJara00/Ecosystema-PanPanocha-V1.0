'use client'

import { useState, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, Check, AlertCircle, Loader2, CircleX } from 'lucide-react'

import { Employee } from '@panpanocha/types'

// Extended type for import (includes temp fields, omits generated ones)
type ImportedEmployee = Omit<Employee, 'id' | 'created_at' | 'updated_at'> & {
    branch_name?: string
}

interface EmployeeCSVImporterProps {
    onSuccess: () => void
}

export default function EmployeeCSVImporter({ onSuccess }: EmployeeCSVImporterProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<ImportedEmployee[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successCount, setSuccessCount] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [branches, setBranches] = useState<any[]>([])

    useEffect(() => {
        fetchBranches()
    }, [])

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name')
        if (data) setBranches(data)
    }

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
                    const parsedEmployees: ImportedEmployee[] = []

                    results.data.forEach((row: any) => {
                        const name = row['NOMBRE COMPLETO'] || ''
                        if (!name) return

                        const email = row['EMAIL'] || ''
                        const phone = row['TELEFONO'] || ''
                        const position = row['CARGO'] || ''
                        const branchName = row['SEDE'] || ''
                        const hireDate = row['FECHA CONTRATACION'] || new Date().toISOString().split('T')[0]
                        const salaryType = parseSalaryType(row['TIPO SALARIO'])
                        const baseSalary = parseFloat(row['SALARIO BASE']) || 0

                        // Find branch ID
                        const branch = branches.find(b => b.name.toLowerCase() === branchName.toLowerCase())
                        const branchId = branch ? branch.id : null

                        if (!branchId) {
                            console.warn(`Sede no encontrada para: ${branchName}`)
                            // We could throw error or skip. For now, we'll try to use first branch or handle error later
                        }

                        parsedEmployees.push({
                            full_name: name.trim(),
                            email: email.trim(),
                            phone: phone.trim(),
                            position: position.trim(),
                            branch_id: branchId, // Required field in DB usually
                            hire_date: hireDate,
                            salary_type: salaryType,
                            base_salary: baseSalary,
                            active: true,
                            branch_name: branchName
                        })
                    })

                    if (parsedEmployees.some(e => !e.branch_id)) {
                        setError('Algunos empleados tienen sedes que no coinciden con las registradas. Verifica los nombres de las sedes.')
                    }

                    setPreview(parsedEmployees)
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

    const parseSalaryType = (type: string) => {
        const t = type?.toLowerCase().trim()
        if (t === 'mensual') return 'monthly'
        if (t === 'quincenal') return 'biweekly'
        if (t === 'diario') return 'daily'
        if (t === 'por hora' || t === 'hora') return 'hourly'
        return 'monthly' // Default
    }

    const downloadTemplate = () => {
        const headers = [
            'NOMBRE COMPLETO',
            'EMAIL',
            'TELEFONO',
            'CARGO',
            'SEDE',
            'FECHA CONTRATACION',
            'TIPO SALARIO',
            'SALARIO BASE'
        ]
        const csvContent = headers.join(',') + '\n' + 'Juan Perez,juan@ejemplo.com,3001234567,Cajero,Sede Principal,2024-01-15,Mensual,1300000'
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', 'plantilla_empleados.csv')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleImport = async () => {
        if (preview.length === 0) return

        // Final validation
        if (preview.some(e => !e.branch_id)) {
            setError('No se puede importar: Hay empleados con sedes inválidas.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Prepare data for insertion (remove temp fields)
            const insertData = preview.map(({ branch_name, ...rest }) => rest)

            const { error } = await supabase
                .from('employees')
                .insert(insertData)

            if (error) throw error

            setSuccessCount(preview.length)
            setPreview([])
            setFile(null)
            onSuccess()

            setTimeout(() => {
                setSuccessCount(0)
            }, 3000)

        } catch (err: any) {
            console.error('Import error:', err)
            setError(`Error al guardar empleados: ${err.message}`)
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
                <button
                    onClick={downloadTemplate}
                    className="text-sm text-pp-brown hover:text-pp-brown/80 font-bold underline font-display uppercase tracking-wider"
                >
                    Descargar Plantilla CSV
                </button>
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
                    <p className="text-gray-600 font-medium font-display">Arrastra tu CSV aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-500 mt-2 font-sans">Columnas: NOMBRE, EMAIL, CARGO, SEDE, ETC.</p>
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
                    <h3 className="text-green-800 font-bold text-lg font-display">¡Importación Exitosa!</h3>
                    <p className="text-green-600 font-sans">{successCount} empleados han sido creados correctamente.</p>
                    <button
                        onClick={() => setSuccessCount(0)}
                        className="mt-4 text-sm text-green-700 underline hover:text-green-800"
                    >
                        Importar otro archivo
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-lg">
                                <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800 font-display">{file?.name}</p>
                                <p className="text-xs text-gray-500 font-sans">{preview.length} empleados encontrados</p>
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
                        <table className="w-full text-sm text-left font-sans">
                            <thead className="bg-gray-50 text-gray-600 font-medium sticky top-0 font-display">
                                <tr>
                                    <th className="px-3 py-2">Nombre</th>
                                    <th className="px-3 py-2">Cargo</th>
                                    <th className="px-3 py-2">Sede</th>
                                    <th className="px-3 py-2">Salario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {preview.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-800">{row.full_name}</td>
                                        <td className="px-3 py-2 text-gray-600">{row.position}</td>
                                        <td className={`px-3 py-2 ${!row.branch_id ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                                            {row.branch_name || 'N/A'} {!row.branch_id && '(No Encontrada)'}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">${row.base_salary}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-sans">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => { setFile(null); setPreview([]); }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors font-display"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={loading || preview.some(e => !e.branch_id)}
                            className="px-4 py-2 bg-pp-gold hover:bg-pp-gold/80 text-pp-brown rounded-lg font-bold transition-colors flex items-center gap-2 shadow-sm font-display uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Importar Empleados
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
