'use client'

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    className?: string
    maxWidth?: string
    hideHeader?: boolean
}

export default function Modal({ isOpen, onClose, title, children, className, maxWidth = "max-w-2xl", hideHeader = false }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onClose()
        }
    }

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
            <div className={twMerge(`bg-white rounded-xl shadow-xl w-full ${maxWidth || 'max-w-2xl'} max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`, className)}>
                {!hideHeader && (
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 flex-shrink-0">
                        <h2 className="text-xl font-bold text-gray-800 font-display uppercase tracking-tight">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}
                <div className={hideHeader ? "flex-1 overflow-hidden flex flex-col" : "p-6 overflow-y-auto flex-1"}>
                    {children}
                </div>
            </div>
        </div>
    )
}
