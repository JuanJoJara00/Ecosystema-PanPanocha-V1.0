
import { SaleItem, Sale, Expense } from '@panpanocha/types'

export const MOCK_SALES: any[] = [
    {
        id: 'VENT-001',
        created_at: new Date().toISOString(),
        total_amount: 154500,
        payment_method: 'card',
        status: 'completed',
        sale_channel: 'POS',
        branch_id: 'BR-001',
        branch: { name: 'Sede Principal' },
        client: { full_name: 'Juan Perez' },
        user: { full_name: 'Cajero 1' },
        items: [
            { id: '1', name: 'Pan de Bono', quantity: 5, unit_price: 2500, total_price: 12500 },
            { id: '2', name: 'Chocolate Caliente', quantity: 2, unit_price: 4500, total_price: 9000 },
            { id: '3', name: 'Torta de Zanahoria', quantity: 1, unit_price: 133000, total_price: 133000 }
        ]
    },
    {
        id: 'VENT-002',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        total_amount: 25000,
        payment_method: 'cash',
        status: 'completed',
        sale_channel: 'Portal',
        branch_id: 'BR-002',
        branch: { name: 'Sede Norte' },
        client: { full_name: 'Maria Gomez' },
        user: { full_name: 'Admin Portal' },
        items: [
            { id: '4', name: 'Café Latte', quantity: 2, unit_price: 5500, total_price: 11000 },
            { id: '5', name: 'Croissant', quantity: 2, unit_price: 7000, total_price: 14000 }
        ]
    },
    {
        id: 'VENT-003',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        total_amount: 85000,
        payment_method: 'transfer',
        status: 'pending',
        sale_channel: 'Rappi',
        branch_id: 'BR-001',
        branch: { name: 'Sede Principal' },
        client: { full_name: 'Rappi Driver' },
        user: { full_name: 'Cajero 2' },
        items: [
            { id: '6', name: 'Promoción Desayuno', quantity: 5, unit_price: 17000, total_price: 85000 }
        ]
    }
]

export const MOCK_EXPENSES: any[] = [
    {
        id: 'EXP-001',
        created_at: new Date().toISOString(),
        description: 'Compra de leche de emergencia',
        amount: 45000,
        category: 'insumos_urgentes',
        branch_id: 'BR-001',
        branch: { name: 'Sede Principal' },
        user: { full_name: 'Jefe de Cocina' },
        voucher_url: 'https://placehold.co/400x600/png'
    },
    {
        id: 'EXP-002',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        description: 'Pago servicio de internet',
        amount: 120000,
        category: 'servicios',
        branch_id: 'BR-002',
        branch: { name: 'Sede Norte' },
        user: { full_name: 'Admin' },
        voucher_url: null
    },
    {
        id: 'EXP-003',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        description: 'Reparación nevera mostrador',
        amount: 250000,
        category: 'mantenimiento',
        branch_id: 'BR-001',
        branch: { name: 'Sede Principal' },
        user: { full_name: 'Gerente' },
        voucher_url: 'https://placehold.co/400x600/png'
    }
]
