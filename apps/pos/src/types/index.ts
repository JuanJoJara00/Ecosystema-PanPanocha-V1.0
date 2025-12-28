// Re-export EVERYTHING from shared types
export * from '@panpanocha/types';

// Compatibility Aliases
// POS components expect 'Order' to mean 'TableOrder' (Service Order), 
// whereas Shared 'Order' is 'SupplierOrder'.
import type { TableOrder } from '@panpanocha/types';
export type Order = TableOrder;

// Any future UI extensions can go here
