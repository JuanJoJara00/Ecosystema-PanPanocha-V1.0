import React, { forwardRef } from 'react';
import { Input as SharedInput, InputProps as SharedInputProps } from '@panpanocha/ui';
import { cn } from '@/lib/utils'; // Or import from package if possible, but wrappers usually rely on app context or just pass through

interface InputProps extends SharedInputProps {
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
    fullWidth = true,
    className,
    ...props
}, ref) => {
    return (
        <SharedInput
            ref={ref}
            className={cn(className)}
            {...props}
        />
    );
});

Input.displayName = 'Input';

export default Input;


