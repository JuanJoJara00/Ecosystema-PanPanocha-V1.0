import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';
// import { useOrganizationStore } from '../store/organization'; // Hypothetical store

interface ConfigProviderProps {
    children: ReactNode;
}

// Inner component to handle logic that requires useTheme
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

export function ConfigProvider({ children }: ConfigProviderProps) {
    return (
        <ThemeProvider>
            <ConfigConsumer>
                {children}
            </ConfigConsumer>
        </ThemeProvider>
    );
}
