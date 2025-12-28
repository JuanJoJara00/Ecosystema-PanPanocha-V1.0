
// packages/types/src/inventory_v2.ts
import { ProductId, WarehouseId } from './brands';

export interface InventoryItemV2 {
    id: ProductId;
    sku: string;
    name: string;
    description?: string;
    
    // Unit Configuration
    buying_unit: string;      // e.g. "Saco"
    usage_unit: string;       // e.g. "Gramo"
    conversion_factor: number; // e.g. 50000 (1 Saco = 50k Gramos)
    
    // Financials
    last_purchase_price: number; // In Buying Unit (Integers or Precision handled by Dinero wrapper)
    weighted_avg_cost: number;   // In Usage Unit
    
    // Aggregates
    total_stock_usage: number; // Sum of all branches
    stock_status: 'CRITICAL' | 'LOW' | 'GOOD' | 'OVERSTOCK';
    
    // Relationships (Aggregated via json_agg)
    branches: InventoryBranchStock[];
}

export interface InventoryBranchStock {
    branch_id: WarehouseId;
    branch_name: string;
    quantity: number; // Usage Units
}

// DTO for the RPC response
export interface InventoryListResponseDTO {
    id: string; // Raw UUID from DB
    sku: string;
    name: string;
    buying_unit: string;
    usage_unit: string;
    conversion_factor: number;
    last_purchase_price: number;
    weighted_avg_cost: number;
    branches: {
        branch_id: string;
        branch_name: string;
        quantity: number;
    }[];
}
