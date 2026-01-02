import { useCallback } from 'react';
import { usePosStore } from '../store';
// Internal type definition to avoid strict dependency on external package in this file if not needed, 
// using the Store's implicit CartItem structure.
interface CartItem {
    product: {
        category?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

export const useSmartPrinter = () => {
    const { currentUser } = usePosStore();

    const printKitchenTicket = useCallback(async (orderId: string, items: any[]) => { // Using any[] to allow both CartItem and SaleItem
        // 1. Classification Strategy
        // We define "Bar Items" as drinks. Everything else goes to Kitchen for now.
        const barKeywords = ['bebida', 'gaseosa', 'licor', 'cerveza', 'jugo'];

        // Map to Printer Structure (Flat Format)
        const printableItems = items.map(i => ({
            ...i,
            product_name: i.product?.name || i.product_name || 'Item',
            notes: i.note || i.notes || ''
        }));

        const isBarItem = (item: any) => {
            // Handle both CartItem (nested product) and already flattened items if any
            const cat = (item.product?.category || item.category || '').toLowerCase();
            return barKeywords.some(k => cat.includes(k));
        };

        const kitchenItems = printableItems.filter(i => !isBarItem(i));
        const barItems = printableItems.filter(i => isBarItem(i));

        const printPromises: Promise<any>[] = [];

        // 2. Kitchen Routing (Food)
        if (kitchenItems.length > 0) {
            console.log(`[SmartPrinter] Routing ${kitchenItems.length} items to KITCHEN`);
            printPromises.push(window.electron.printTicket({
                target: 'kitchen',
                items: kitchenItems,
                metadata: {
                    orderId,
                    waiter: currentUser?.full_name,
                    location: 'COCINA'
                }
            }));
            // Note: Updated to use single argument object with 'target' property as per my Main.ts implementation
        }

        // 3. Bar Routing (Drinks)
        if (barItems.length > 0) {
            console.log(`[SmartPrinter] Routing ${barItems.length} items to BAR`);
            // We use the same 'kitchen' target logically for specific format (no prices), 
            // but we might want to tag it as 'bar' in metadata if we had a specific printer for it.
            // Currently Main.ts only supports 'receipt' and 'kitchen' generic targets.
            // Real routing to DIFFERENT physical printers would require Main.ts to accept a 'printerName' or 'type' override.
            // For now, we print to the KITCHEN channel/printer but label it BARRA.
            printPromises.push(window.electron.printTicket({
                target: 'kitchen',
                items: barItems,
                metadata: {
                    orderId,
                    waiter: currentUser?.full_name,
                    location: 'BARRA'
                }
            }));
        }

        // 4. Parallel Execution (Non-blocking)
        try {
            await Promise.all(printPromises);
            return true;
        } catch (error) {
            console.error('[SmartPrinter] Partial print error:', error);
            return false;
        }
    }, [currentUser]);

    return { printKitchenTicket };
};
