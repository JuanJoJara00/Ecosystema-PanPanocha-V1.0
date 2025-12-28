import type { PaymentMethod, DeliveryStatus, SaleStatus } from '../config/business';

/**
 * Product interface - shared across POS and Portal
 */
export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    is_active: boolean;
    image_url?: string;
    last_synced_at?: string;
}

/**
 * User interface - shared across POS and Portal
 */
export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'cajero' | 'staff';
}

/**
 * Branch/Sede interface
 */
export interface Branch {
    id: string;
    name: string;
    city?: string;
    address?: string;
}

/**
 * Product detail in delivery/order
 */
export interface ProductDetail {
    id: string;
    name: string;
    quantity: number;
    price: number;
}

/**
 * Delivery interface - shared across POS and Portal
 */
export interface Delivery {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    product_details: string | ProductDetail[]; // JSON or parsed
    delivery_fee: number;
    status: DeliveryStatus;
    created_at: string;
    branch_id: string;
    assigned_driver?: string;
    notes?: string;
    last_edited_at?: string;
    client_payment_proof_url?: string;
    delivery_receipt_url?: string;
}

/**
 * Sale interface - for POS
 */
export interface Sale {
    id: string;
    branch_id: string;
    shift_id?: string;
    created_by: string;
    total_amount: number;
    payment_method: PaymentMethod;
    status: SaleStatus;
    created_at: string;
    synced: boolean;
}

/**
 * Sale item interface
 */
export interface SaleItem {
    id: string;
    sale_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

/**
 * Shift interface - for POS
 */
export interface Shift {
    id: string;
    branch_id: string;
    user_id: string;
    turn_type: string;
    initial_cash: number;
    final_cash?: number;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at?: string;
}

/**
 * Cart item interface - for POS
 */
export interface CartItem {
    product: Product;
    quantity: number;
}
