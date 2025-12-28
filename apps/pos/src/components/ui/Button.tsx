import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    isLoading?: boolean;
    startIcon?: React.ReactNode;
    endIcon?: React.ReactNode;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    children,
    isLoading = false,
    startIcon,
    endIcon,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = `
        inline-flex items-center justify-center gap-2
        font-medium uppercase tracking-wider
        border-none rounded-full
        transition-all duration-300 ease-out
        cursor-pointer outline-none
        shadow-md hover:shadow-xl
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `;

    const variants = {
        primary: `
            bg-[#D4AF37] text-white
            hover:bg-[#C19B2D] hover:-translate-y-1 hover:shadow-amber-400/40
            active:translate-y-0
        `,
        secondary: `
            bg-[#4A312C] text-white
            hover:bg-[#3A2622] hover:-translate-y-1 hover:shadow-stone-800/40
            active:translate-y-0
        `,
        success: `
            bg-[#48C774] text-white
            hover:bg-[#3db066] hover:-translate-y-1 hover:shadow-green-400/40
            active:translate-y-0
        `,
        danger: `
            bg-red-500 text-white
            hover:bg-red-600 hover:-translate-y-1 hover:shadow-red-400/40
            active:translate-y-0
        `,
        ghost: `
            bg-transparent text-gray-700 shadow-none
            hover:bg-gray-100 hover:shadow-sm
            active:bg-gray-200
        `
    };

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base'
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {!isLoading && startIcon && startIcon}
            {children}
            {!isLoading && endIcon && endIcon}
        </button>
    );
}
