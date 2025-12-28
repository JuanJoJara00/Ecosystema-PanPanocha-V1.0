import { LucideIcon } from 'lucide-react'
import Button from './Button'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="text-center py-16 px-4 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center animate-fade-in-up">
            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                <Icon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 font-bold text-lg font-display uppercase tracking-wide mb-2">{title}</h3>
            <p className="text-gray-500 max-w-sm mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
