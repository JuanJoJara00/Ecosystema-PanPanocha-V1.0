/// <reference types="react" />

declare module '@panpanocha/ui' {
    export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
        variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
        size?: 'sm' | 'md' | 'lg' | 'icon';
        isLoading?: boolean;
    }
    export const Button: React.FC<ButtonProps>;

    export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
        error?: string;
        label?: string;
    }
    export const Input: React.FC<InputProps>;

    export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
        noPadding?: boolean;
    }
    export const Card: React.FC<CardProps>;

    export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
        variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
    }
    export const Badge: React.FC<BadgeProps>;
}
