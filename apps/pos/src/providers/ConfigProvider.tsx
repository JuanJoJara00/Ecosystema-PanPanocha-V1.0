import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';
// import { useOrganizationStore } from '../store/organization'; // Hypothetical store

interface ConfigProviderProps {
    children: ReactNode;
}

/**
 * Runs theme initialization side effects (for example, applying organization-provided theme settings) and renders its children.
 *
 * The component uses the theme context to apply a theme when available; current logic is a placeholder for loading settings from an organization store or API.
 *
 * @param children - React nodes to render inside the consumer
 * @returns The same children wrapped in a fragment
 */
function ConfigConsumer({ children }: { children: ReactNode }) {
    const { setTheme } = useTheme();

    useEffect(() => {
        // TODO: Load from Organization Store or API
        // const orgSettings = useOrganizationStore.getState().settings;
        // if (orgSettings?.theme) {
        //     setTheme(orgSettings.theme);
        // }

        // Example: hardcoded switch for logic testing
        // setTheme({
        //     primary: '#0000FF', // Blue Theme test
        //     secondary: '#000000',
        //     accent: '#EEEEEE',
        //     background: '#ffffff',
        //     text: '#000000'
        // });
    }, [setTheme]);

    return <>{children}</>;
}

/**
 * Provides app-wide configuration and theming context to its children.
 *
 * @param children - React nodes to render inside the configuration provider
 * @returns The given children wrapped with the configuration and theme providers
 */
export function ConfigProvider({ children }: ConfigProviderProps) {
    return (
        <ThemeProvider>
            <ConfigConsumer>
                {children}
            </ConfigConsumer>
        </ThemeProvider>
    );
}