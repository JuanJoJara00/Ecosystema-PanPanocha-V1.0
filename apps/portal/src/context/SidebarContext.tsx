'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface SidebarContextType {
    isOpen: boolean
    isCollapsed: boolean
    toggleSidebar: () => void
    closeSidebar: () => void
    openSidebar: () => void
    toggleCollapse: () => void
    setCollapsed: (v: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false) // Mobile open/close
    const [isCollapsed, setIsCollapsed] = useState(false) // Desktop collapsed state

    const toggleSidebar = () => setIsOpen(prev => !prev)
    const closeSidebar = () => setIsOpen(false)
    const openSidebar = () => setIsOpen(true)

    const toggleCollapse = () => setIsCollapsed(prev => !prev)
    const setCollapsed = (v: boolean) => setIsCollapsed(v)

    return (
        <SidebarContext.Provider value={{ isOpen, isCollapsed, toggleSidebar, closeSidebar, openSidebar, toggleCollapse, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    )
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider')
    }
    return context
}
