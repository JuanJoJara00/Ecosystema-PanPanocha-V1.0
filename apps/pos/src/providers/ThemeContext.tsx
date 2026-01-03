import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
}

export interface BrandingMeta {
    logoUrl: string;
    companyName: string;
}

interface ThemeContextType {
    colors: ThemeColors;
    meta: BrandingMeta;
    setTheme: (colors: ThemeColors, meta?: BrandingMeta) => void;
    resetTheme: () => void;
}

const defaultColors: ThemeColors = {
    primary: '#F6B323',
    secondary: '#4A3728',
    accent: '#F9F1E0',
    background: '#ffffff',
    text: '#1f2937'
};

const defaultMeta: BrandingMeta = {
    logoUrl: '/images/logo_v2.png',
    companyName: 'PANPANOCHA'
};

function isValidThemeColors(obj: unknown): obj is ThemeColors {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof (obj as ThemeColors).primary === 'string' &&
        typeof (obj as ThemeColors).secondary === 'string' &&
        typeof (obj as ThemeColors).accent === 'string' &&
        typeof (obj as ThemeColors).background === 'string' &&
        typeof (obj as ThemeColors).text === 'string'
    );
}

function isValidBrandingMeta(obj: unknown): obj is BrandingMeta {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof (obj as BrandingMeta).logoUrl === 'string' &&
        typeof (obj as BrandingMeta).companyName === 'string'
    );
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [colors, setColors] = useState<ThemeColors>(() => {
        try {
            const stored = localStorage.getItem('theme-colors');
            if (!stored) return defaultColors;
            const parsed = JSON.parse(stored);
            return isValidThemeColors(parsed) ? parsed : defaultColors;
        } catch (e) {
            return defaultColors;
        }
    });

    const [meta, setMeta] = useState<BrandingMeta>(() => {
        try {
            const stored = localStorage.getItem('theme-meta');
            if (!stored) return defaultMeta;
            const parsed = JSON.parse(stored);
            return isValidBrandingMeta(parsed) ? parsed : defaultMeta;
        } catch (e) {
            return defaultMeta;
        }
    });

    useEffect(() => {
        const root = document.documentElement;
        // Inject variables into :root
        root.style.setProperty('--brand-primary', colors.primary);
        root.style.setProperty('--brand-secondary', colors.secondary);
        root.style.setProperty('--brand-accent', colors.accent);
        root.style.setProperty('--brand-background', colors.background);
        root.style.setProperty('--brand-text', colors.text);
        localStorage.setItem('theme-colors', JSON.stringify(colors));
    }, [colors]);

    useEffect(() => {
        localStorage.setItem('theme-meta', JSON.stringify(meta));
    }, [meta]);

    const setTheme = (newColors: ThemeColors, newMeta?: BrandingMeta) => {
        setColors(newColors);
        if (newMeta) setMeta(newMeta);
    };

    const resetTheme = () => {
        setColors(defaultColors);
        setMeta(defaultMeta);
    };

    return (
        <ThemeContext.Provider value={{ colors, meta, setTheme, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
