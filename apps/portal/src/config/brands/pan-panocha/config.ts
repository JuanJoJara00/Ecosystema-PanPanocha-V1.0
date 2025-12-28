export const config = {
    company: {
        name: 'Pan Panocha',
        nameShort: 'PP',
        // El logo debe estar en public/brands/pan-panocha/ o usar una ruta absoluta
        // Por ahora mantenemos la ruta original o sugerimos moverla
        logoUrl: '/images/logo_v2.png',
    },
    theme: {
        colors: {
            // Palette Reference:
            // Gold: #F6B323
            // Brown: #4A3728
            // Cream: #F9F1E0
            primary: '#F6B323',
            secondary: '#4A3728',
            background: '#ffffff',
            accent: '#F9F1E0',
        }
    },
    routes: {
        home: '/portal/dashboard',
        login: '/portal/login',
    }
}
