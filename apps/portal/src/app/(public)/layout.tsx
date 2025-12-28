import React from 'react'

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex flex-col">
            <header className="p-4 border-b border-pp-gold/10">
                <nav className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold font-display uppercase tracking-widest text-pp-brown">PanPanocha</h1>
                    {/* TODO: Add Menu Links */}
                </nav>
            </header>
            <main className="flex-grow">
                {children}
            </main>
            <footer className="p-4 bg-pp-gold/10 text-center text-sm text-pp-brown border-t border-pp-gold/20 font-sans">
                © {new Date().getFullYear()} PanPanocha - Sabor Artesanal
            </footer>
        </div>
    )
}
