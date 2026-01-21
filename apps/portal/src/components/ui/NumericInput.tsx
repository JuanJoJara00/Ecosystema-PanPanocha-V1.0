'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import Input from './Input';
import { formatNumber, parseNumber } from '@/lib/utils';

interface NumericInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> {
    value?: number;
    onChange?: (value: number) => void;
    allowDecimals?: boolean;
}

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(({
    value,
    onChange,
    allowDecimals = true,
    ...props
}, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value === undefined || value === null) {
            setDisplayValue('');
            return;
        }

        const formatted = formatNumber(value, {
            minimumFractionDigits: 0,
            maximumFractionDigits: allowDecimals ? 2 : 0,
        });

        // Only update if the numeric value actually changed to avoid cursor jumping
        if (parseNumber(formatted) !== parseNumber(displayValue)) {
            setDisplayValue(formatted);
        }
    }, [value, allowDecimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value;

        // Prevent leading zeros
        if (input.length > 1 && input.startsWith('0') && !input.startsWith('0,')) {
            input = input.substring(1);
        }

        // Allow only numbers, dots (thousands) and commas (decimals)
        const validChars = allowDecimals ? /[^\d,.]/g : /[^\d.]/g;
        input = input.replace(validChars, '');

        // Temporarily set display value to allow typing
        setDisplayValue(input);

        // Parse and notify parent
        const numericValue = parseNumber(input);
        if (!isNaN(numericValue) && onChange) {
            onChange(numericValue);
        }
    };

    const handleBlur = () => {
        if (value !== undefined) {
            setDisplayValue(formatNumber(value, {
                minimumFractionDigits: 0,
                maximumFractionDigits: allowDecimals ? 2 : 0,
            }));
        }
    };

    return (
        <Input
            {...props}
            type="text"
            ref={ref}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
});

NumericInput.displayName = 'NumericInput';

export default NumericInput;
