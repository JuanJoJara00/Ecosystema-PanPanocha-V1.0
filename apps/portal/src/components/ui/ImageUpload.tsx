'use client'

import React, { useState, useEffect } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ImageUploadProps {
    value?: string
    onChange: (url: string) => void
    bucket?: string
    folder?: string
    label?: string
    className?: string
}

export default function ImageUpload({
    value,
    onChange,
    bucket = 'products',
    folder = 'products',
    label = 'Imagen del Producto',
    className = ''
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState(value || '')

    useEffect(() => {
        setPreview(value || '')
    }, [value])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true)
            if (!e.target.files || e.target.files.length === 0) {
                return
            }
            const file = e.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
            const filePath = `${folder}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath)

            setPreview(publicUrl)
            onChange(publicUrl)
        } catch (error: any) {
            alert('Error al subir imagen: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = () => {
        setPreview('')
        onChange('')
    }

    return (
        <div className={className}>
            <label className="block text-sm font-bold text-gray-700 mb-1 font-display uppercase tracking-wide">
                {label}
            </label>

            {preview ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-pp-gold/50 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <Loader2 className="w-10 h-10 mb-3 text-pp-gold animate-spin" />
                        ) : (
                            <Upload className="w-10 h-10 mb-3 text-gray-400 group-hover:text-pp-gold transition-colors" />
                        )}
                        <p className="mb-2 text-sm text-gray-500 font-medium group-hover:text-gray-700">
                            {uploading ? 'Subiendo...' : 'Click para subir imagen'}
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG or WEBP</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                </label>
            )}
        </div>
    )
}
