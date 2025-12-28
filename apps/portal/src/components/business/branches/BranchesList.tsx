'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Building2, MapPin, Phone, User, Monitor } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import ModuleHeader from '@/components/ui/ModuleHeader'
import ModuleTabs from '@/components/ui/ModuleTabs'
import PageHeader from '@/components/ui/PageHeader'
import Badge from '@/components/ui/Badge'
import BranchDetail from './BranchDetail'
import BranchForm from './BranchForm'

export default function BranchesList() {
    const [branches, setBranches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isFormModalOpen, setIsFormModalOpen] = useState(false)
    const [editingBranch, setEditingBranch] = useState<any | null>(null)
    const [selectedBranch, setSelectedBranch] = useState<any | null>(null)
    const [selectedCity, setSelectedCity] = useState('all')

    useEffect(() => {
        fetchBranches()
    }, [])

    const fetchBranches = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .order('name')

        if (data) setBranches(data)
        setLoading(false)
    }

    const handleSuccess = () => {
        fetchBranches()
        setIsFormModalOpen(false)
        setEditingBranch(null)
    }

    const filteredBranches = branches.filter(branch =>
        (selectedCity === 'all' || branch.city === selectedCity) &&
        (branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.city?.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <PageHeader title="Sedes" subtitle="Gestión de puntos de venta" />
            <ModuleHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar sede..."
                actions={
                    <Button
                        onClick={() => {
                            setEditingBranch(null)
                            setIsFormModalOpen(true)
                        }}
                        startIcon={<Plus className="h-4 w-4" />}
                    >
                        Nueva Sede
                    </Button>
                }
            />

            <ModuleTabs
                tabs={Array.from(new Set(branches.map(b => b.city).filter(Boolean))).map((city: any) => ({
                    id: city,
                    label: city
                }))}
                activeTabId={selectedCity}
                onTabChange={setSelectedCity}
                labelAll="Todas las Sedes"
            />

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBranches.map(branch => (
                    <Card
                        key={branch.id}
                        hover
                        className="flex flex-col h-full bg-white p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        onClick={() => setSelectedBranch(branch)}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 bg-pp-gold/10 rounded-xl flex items-center justify-center text-pp-brown mb-2">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <Badge variant={branch.is_active !== false ? 'success' : 'neutral'}>
                                {branch.is_active !== false ? 'Activa' : 'Inactiva'}
                            </Badge>
                        </div>

                        <h3 className="text-xl font-bold text-pp-brown font-display mb-1">{branch.name}</h3>
                        <p className="text-sm text-gray-500 font-sans mb-4 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {branch.city || 'Ciudad no registrada'}
                        </p>

                        <div className="space-y-3 mt-auto pt-4 border-t border-gray-100">
                            {branch.address && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="text-gray-400 w-4"><MapPin className="h-4 w-4" /></span>
                                    {branch.address}
                                </p>
                            )}
                            {branch.phone && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="text-gray-400 w-4"><Phone className="h-4 w-4" /></span>
                                    {branch.phone}
                                </p>
                            )}
                            {branch.manager_name && (
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="text-gray-400 w-4"><User className="h-4 w-4" /></span>
                                    {branch.manager_name}
                                </p>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedBranch}
                onClose={() => setSelectedBranch(null)}
                title=""
                maxWidth="max-w-2xl"
                hideHeader={true}
            >
                {selectedBranch && (
                    <BranchDetail
                        branch={selectedBranch}
                        onClose={() => setSelectedBranch(null)}
                        onEdit={() => {
                            setEditingBranch(selectedBranch)
                            setSelectedBranch(null)
                            setIsFormModalOpen(true)
                        }}
                    />
                )}
            </Modal>

            {/* Form Modal */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title={editingBranch ? "Editar Sede" : "Nueva Sede"}
            >
                <BranchForm
                    initialData={editingBranch}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsFormModalOpen(false)}
                />
            </Modal>
        </div>
    )
}
