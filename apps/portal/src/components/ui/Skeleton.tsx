import { HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    className?: string
}

export default function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={twMerge("animate-pulse rounded bg-gray-200", className)}
            {...props}
        />
    )
}
