import React from 'react';
import { Button as SharedButton, ButtonProps as SharedButtonProps } from '@panpanocha/ui';
import { cn } from '@/lib/utils'; // Assuming Portal has a lib/utils or I should import from package? Portal TSConfig might not support path alias for shared lib directly if not exported? 
// Actually, @panpanocha/ui exports utils but I don't need it if I just pass props.
// BUT I need to map variants.

interface ButtonProps extends Omit<SharedButtonProps, 'variant' | 'size'> {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'icon';
}

export default function Button({
    variant = 'primary',
    size = 'md',
    className,
    ...props
}: ButtonProps) {
    // Map Portal variants to Shared variants
    const variantMap: Record<string, SharedButtonProps['variant']> = {
        primary: 'default',
        secondary: 'secondary',
        success: 'success',
        danger: 'destructive',
        ghost: 'ghost',
        outline: 'outline'
    };

    const sizeMap: Record<string, SharedButtonProps['size']> = {
        sm: 'sm',
        md: 'default',
        lg: 'lg',
        icon: 'icon'
    };

    return (
        <SharedButton
            variant={variantMap[variant] || 'default'}
            size={sizeMap[size] || 'default'}
            className={className}
            {...props}
        />
    );
}
