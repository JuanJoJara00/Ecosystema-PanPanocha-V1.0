'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface UserPermissions {
    // User info
    userId: string
    email: string
    role: 'developer' | 'administrator' | 'cajera' | 'empleado'
    branchId: string | null

    // Portal Modules
    accessDashboard: boolean
    accessBranches: boolean
    accessEmployees: boolean
    accessPayroll: boolean
    accessInventory: boolean
    accessProducts: boolean
    accessOrders: boolean
    accessDeliveries: boolean
    accessCashClosing: boolean
    accessReports: boolean

    // POS
    accessPos: boolean
    posFullAccess: boolean
    posRegisterOnly: boolean
    posCheckout: boolean

    // Data Scope
    viewAllBranches: boolean
    viewOwnBranchOnly: boolean
    viewOwnDataOnly: boolean

    // Management
    manageAllUsers: boolean
    manageBranchUsers: boolean
    viewAllPayroll: boolean
}

export function usePermissions() {
    const [permissions, setPermissions] = useState<UserPermissions | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadPermissions()
    }, [])

    const loadPermissions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            // Get user profile with role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, branch_id, email')
                .eq('id', user.id)
                .single()

            if (!profile) {
                setLoading(false)
                return
            }

            // Get effective permissions (role + custom)
            const { data: perms } = await supabase
                .rpc('get_effective_permissions', { target_user_id: user.id })

            // Convert array to object
            const permissionsMap: Record<string, boolean> = {}
            if (perms) {
                perms.forEach((p: any) => {
                    permissionsMap[camelCase(p.permission_name)] = p.permission_value
                })
            }

            setPermissions({
                userId: user.id,
                email: profile.email || user.email || '',
                role: profile.role,
                branchId: profile.branch_id,

                // Portal
                accessDashboard: permissionsMap.accessDashboard ?? false,
                accessBranches: permissionsMap.accessBranches ?? false,
                accessEmployees: permissionsMap.accessEmployees ?? false,
                accessPayroll: permissionsMap.accessPayroll ?? false,
                accessInventory: permissionsMap.accessInventory ?? false,
                accessProducts: permissionsMap.accessProducts ?? false,
                accessOrders: permissionsMap.accessOrders ?? false,
                accessDeliveries: permissionsMap.accessDeliveries ?? false,
                accessCashClosing: permissionsMap.accessCashClosing ?? false,
                accessReports: permissionsMap.accessReports ?? false,

                // POS
                accessPos: permissionsMap.accessPos ?? false,
                posFullAccess: permissionsMap.posFullAccess ?? false,
                posRegisterOnly: permissionsMap.posRegisterOnly ?? false,
                posCheckout: permissionsMap.posCheckout ?? false,

                // Scope
                viewAllBranches: permissionsMap.viewAllBranches ?? false,
                viewOwnBranchOnly: permissionsMap.viewOwnBranchOnly ?? false,
                viewOwnDataOnly: permissionsMap.viewOwnDataOnly ?? false,

                // Management
                manageAllUsers: permissionsMap.manageAllUsers ?? false,
                manageBranchUsers: permissionsMap.manageBranchUsers ?? false,
                viewAllPayroll: permissionsMap.viewAllPayroll ?? false,
            })
        } catch (error) {
            console.error('Error loading permissions:', error)
        } finally {
            setLoading(false)
        }
    }

    return { permissions, loading, reload: loadPermissions }
}

function camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
}
