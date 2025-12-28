import React from 'react';
import { Badge as SharedBadge, BadgeProps as SharedBadgeProps } from '@panpanocha/ui';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    size?: 'sm' | 'md';
}

export default function Badge({ className, variant = 'neutral', size = 'md', children, ...props }: BadgeProps) {
    // Map Portal variants to Shared variants
    const variantMap: Record<string, SharedBadgeProps['variant']> = {
        success: 'success',
        warning: 'warning',
        error: 'error',
        info: 'info',
        neutral: 'neutral'
    };

    // Shared Badge doesn't explicitly handle 'size' like the portal did in classes,
    // but we can pass classes for padding modification if needed.
    // However, keeping it simple: shared badge has one size.
    // Portal had sm/md. 
    // sm: 'px-2 py-0.5 text-[10px]'
    // md: 'px-2.5 py-0.5 text-xs'

    // We can inject class names based on size
    const sizeClasses = size === 'sm' ? "text-[10px] px-2" : "text-xs px-2.5";

    return (
        <SharedBadge
            variant={variantMap[variant] || 'default'}
            className={cn(sizeClasses, className)}
            {...props}
        >
            {children}
        </SharedBadge>
    );
}
