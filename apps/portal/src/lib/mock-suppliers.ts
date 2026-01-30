import { Supplier } from '@panpanocha/types'

export const MOCK_SUPPLIERS: Supplier[] = [
    {
        id: '1',
        name: 'Distribuidora PanPanocha',
        active: true,
        category: 'Alimentos',
        contact_name: 'Juan Pérez',
        phone: '300-123-4567',
        email: 'ventas@panpanocha.com',
        tax_id: '900.123.456',
        address: 'Calle 123 #45-67',
        payment_terms: 'net30',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '2',
        name: 'Lácteos del Norte',
        active: true,
        category: 'Bebidas',
        contact_name: 'Maria Rodriguez',
        phone: '310-987-6543',
        email: 'pedidos@lacteosnorte.com',
        tax_id: '900.987.654',
        address: 'Carrera 10 #20-30',
        payment_terms: 'immediate',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '3',
        name: 'Empaques Industriales SAS',
        active: true,
        category: 'Empaques',
        contact_name: 'Carlos Gomez',
        phone: '320-555-1234',
        email: 'contacto@empaques.com.co',
        tax_id: '800.555.123',
        address: 'Zona Industrial Bodega 5',
        payment_terms: 'net15',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '4',
        name: 'Limpieza Total',
        active: false,
        category: 'Limpieza',
        contact_name: 'Ana Torres',
        phone: '315-333-2211',
        email: 'ana@limpiezatotal.com',
        tax_id: '900.333.221',
        address: 'Av. Principal #100',
        payment_terms: 'net30',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
]

export const MOCK_STATS = {
    '1': { total_purchased: 15000000, current_debt: 2500000 },
    '2': { total_purchased: 8500000, current_debt: 0 },
    '3': { total_purchased: 3200000, current_debt: 150000 },
    '4': { total_purchased: 1200000, current_debt: 0 }
}

export const MOCK_PAYMENT_HISTORY = [
    {
        id: 'ORD-2024-001',
        created_at: '2024-01-28T10:00:00Z',
        total_amount: 500000,
        invoice_url: '#',
        payment_proof_url: 'https://example.com/receipt.pdf',
        payment_status: 'paid',
        status: 'received',
        supplier: { name: 'Distribuidora PanPanocha' },
        branch: { name: 'Sede Principal' }
    },
    {
        id: 'ORD-2024-002',
        created_at: '2024-01-25T14:30:00Z',
        total_amount: 1200000,
        invoice_url: null,
        payment_proof_url: null,
        payment_status: 'pending',
        status: 'pending', // Pending delivery
        supplier: { name: 'Lácteos del Norte' },
        branch: { name: 'Sede Norte' }
    },
    {
        id: 'ORD-2024-003',
        created_at: '2024-01-20T09:15:00Z',
        total_amount: 350000,
        invoice_url: '#',
        payment_proof_url: null,
        payment_status: 'pending', // Received but not paid (Accounts Payable)
        status: 'received',
        supplier: { name: 'Empaques Industriales SAS' },
        branch: { name: 'Sede Principal' }
    },
    {
        id: 'ORD-2024-004', // DRAFT / CANCELLED CONCEPT
        created_at: '2024-01-29T08:00:00Z',
        total_amount: 0,
        invoice_url: null,
        payment_proof_url: null,
        payment_status: 'pending',
        status: 'cancelled',
        supplier: { name: 'Limpieza Total' },
        branch: { name: 'Sede Centro' }
    }
]

export const MOCK_ORDER_ITEMS = [
    {
        id: 'item-1',
        quantity: 10,
        unit_price: 50000,
        total_price: 500000,
        item: { name: 'Harina de Trigo', unit: 'bulto', sku: 'HAR-001' }
    },
    {
        id: 'item-2',
        quantity: 50,
        unit_price: 24000,
        total_price: 1200000,
        item: { name: 'Leche Deslactosada', unit: 'litro', sku: 'LAC-002' }
    },
    {
        id: 'item-3',
        quantity: 100,
        unit_price: 3500,
        total_price: 350000,
        item: { name: 'Bolsas de Papel', unit: 'paquete', sku: 'EMP-003' }
    }
]
