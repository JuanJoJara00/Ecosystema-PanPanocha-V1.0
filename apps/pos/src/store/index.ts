import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, User, Sale, SaleItem, ClosingSession, Shift, Table, Expense, Order } from '../types';
import { supabase } from '../api/client';
import { getTurnType } from '@panpanocha/shared';

// UI Specific Cart Item (extends shared or keeps local if specific UI logic needed)
interface CartItem {
    id: string; // UUID for UI list handling (Unique Line Item ID)
    product: Product;
    quantity: number;
    note?: string; // Optional: "Sin cebolla", "Término medio"
}

interface PosState {
    // Data
    currentUser: User | null;
    isProvisioned: boolean;
    organizationId: string;
    currentBranchId: string;

    // Shift State
    currentShift: Shift | null;
    branches: { id: string, name: string }[];

    // Table State
    tables: Table[];
    activeTableId: string | null;
    tableOrders: { [tableId: string]: CartItem[] };
    tableSessions: { [tableId: string]: { diners: number; startTime: string; orderId?: string } };
    setActiveTable: (tableId: string | null) => void;
    openTableSession: (tableId: string, diners: number) => void;
    transferTable: (fromTableId: string, toTableId: string) => Promise<void>;
    clearTableOrder: (tableId: string) => Promise<void>;
    loadTables: () => Promise<void>;

    // Sale confirmation
    saleConfirmation: {
        show: boolean;
        total: number;
        received: number;
        change: number;
    } | null;
    closeSaleConfirmation: () => void;

    // Sidebar
    sidebarOpen: boolean;
    sidebarSection: 'history' | 'deliveries' | 'user' | 'expenses' | 'close-shift' | null;
    openSidebar: (section: 'history' | 'deliveries' | 'user' | 'expenses' | 'close-shift') => void;
    closeSidebar: () => void;
    refreshDeliveriesTrigger: number; // Counter to trigger refresh
    triggerDeliveriesRefresh: () => void;
    refreshProductsTrigger: number; // Counter to trigger products refresh
    triggerProductsRefresh: () => void;
    refreshHistoryTrigger: number; // Counter to trigger history refresh
    triggerHistoryRefresh: () => void;
    refreshDashboardTrigger: number; // Counter to trigger dashboard refresh
    triggerDashboardRefresh: () => void;

    // Cart (per active table/order)
    cart: CartItem[];
    addToCart: (product: Product, note?: string) => void;
    updateCartItemQuantity: (itemId: string, delta: number) => void;
    updateCartItemNote: (itemId: string, note: string) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    finalizeCart: () => void; // Clears cart WITHOUT restoring stock (for completed sales)
    getCartTotal: () => number;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    checkout: (data: { total: number; received: number; change: number; client?: any }) => Promise<void>;
    refundSale: (saleId: string, itemIds: string[], reason: string) => Promise<void>;

    // Sync & Init
    initialize: () => Promise<void>;
    sync: (silent?: boolean) => Promise<void>;

    // Shift Actions
    openShift: (branchId: string, initialCash: number) => Promise<void>;
    closeShift: (finalCash: number) => Promise<void>;

    // Expenses
    expenses: Expense[];
    createExpense: (data: { amount: number; description: string; shift_id: string; branch_id: string; user_id: string; category: string; voucher_number?: string | null }) => Promise<void>;
    loadExpenses: (shiftId: string) => Promise<void>;
    loadAllExpenses: () => Promise<void>;
    deleteExpense: (id: string) => Promise<void>;

    // Global Alert State
    alert: { show: boolean; type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; } | null;
    showAlert: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
    closeAlert: () => void;

    // UI State
    isLoading: boolean;
    lastSync: number;
    sidebarDateFilter: 'shift' | 'today' | '7d' | '15d';
    setSidebarDateFilter: (filter: 'shift' | 'today' | '7d' | '15d') => void;

    // Closing Session State (Persistence)
    closingSession: ClosingSession;
    updateClosingSession: (section: 'panpanocha' | 'siigo' | 'tips', data: Partial<ClosingSession['panpanocha'] | ClosingSession['siigo'] | ClosingSession['tips']>) => void;
    resetClosingSession: () => void;
}

export const usePosStore = create<PosState>()(persist((set, get) => ({
    currentUser: null,
    isProvisioned: false,
    organizationId: '',
    currentBranchId: '',
    currentShift: null,
    branches: [],

    // Alert implementation
    alert: null,
    showAlert: (type, title, message) => set({ alert: { show: true, type, title, message } }),
    closeAlert: () => set({ alert: null }),

    // Initial Closing Session
    closingSession: {
        panpanocha: {
            completed: false,
            cashCounts: {}
        },
        siigo: {
            completed: false,
            step: 1,
            formData: {
                shift: 'mañana',
                initial_cash: 0,
                sales_cash: 0,
                sales_card: 0,
                sales_transfer: 0,
                tips: 0
            },
            productsSold: [],
            expensesList: [],
            cashCounts: {}
        },
        tips: {
            completed: false
        }
    },

    // Closing Session Actions
    updateClosingSession: (section, data) => set((state) => ({
        closingSession: {
            ...state.closingSession,
            [section]: {
                ...state.closingSession[section],
                ...data
            }
        }
    })),

    resetClosingSession: () => set({
        closingSession: {
            panpanocha: { completed: false, cashCounts: {} },
            siigo: {
                completed: false,
                step: 1,
                formData: {
                    shift: 'mañana',
                    initial_cash: 0,
                    sales_cash: 0,
                    sales_card: 0,
                    sales_transfer: 0,
                    tips: 0
                },
                productsSold: [],
                expensesList: [],
                cashCounts: {}
            },
            tips: { completed: false }
        }
    }),

    // Table initialization
    tables: [],
    activeTableId: null,
    tableOrders: {},
    tableSessions: {},

    setActiveTable: (tableId) => {
        const { tableOrders } = get();
        // Save current cart to previous table
        const prevTableId = get().activeTableId;
        if (prevTableId) {
            set(state => ({
                tableOrders: { ...state.tableOrders, [prevTableId]: state.cart }
            }));
        } else if (prevTableId === null && get().cart.length > 0) {
            // Save "Cliente General" cart
            set(state => ({
                tableOrders: { ...state.tableOrders, 'general': state.cart }
            }));
        }

        // Load new table's cart
        const newCart = tableId === null
            ? (tableOrders['general'] || [])
            : (tableOrders[tableId] || []);

        set({ activeTableId: tableId, cart: newCart });
    },

    openTableSession: async (tableId, diners) => {
        const { currentBranchId, currentShift, currentUser } = get();

        // 1. Update UI immediately
        set((state) => ({
            tableSessions: {
                ...state.tableSessions,
                [tableId]: { diners, startTime: new Date().toISOString() }
            },
            activeTableId: tableId,
            tables: state.tables.map(t => t.id === tableId ? { ...t, status: 'occupied' } : t)
        }));

        // 2. Persist to DB
        try {
            const existingOrder = await window.electron.getPendingOrder(tableId);

            if (existingOrder) {
                await window.electron.updateOrderDiners(existingOrder.id, diners);
                set(state => ({
                    tableSessions: {
                        ...state.tableSessions,
                        [tableId]: { ...state.tableSessions[tableId], orderId: existingOrder.id }
                    }
                }));
            } else {
                const newOrder: Order = {
                    id: crypto.randomUUID(),
                    table_id: tableId,
                    shift_id: currentShift?.id,
                    branch_id: currentBranchId,
                    organization_id: get().organizationId,
                    customer_name: 'Cliente General',
                    status: 'pending',
                    total_amount: 0,
                    diners: diners,
                    created_by: currentUser?.id
                };
                await window.electron.createOrder({ order: newOrder, items: [] });
                set(state => ({
                    tableSessions: {
                        ...state.tableSessions,
                        [tableId]: { ...state.tableSessions[tableId], orderId: newOrder.id }
                    }
                }));
            }
        } catch (err) {
            console.error('Failed to persist table session', err);
        }
    },

    transferTable: async (fromTableId, toTableId) => {
        const { tableOrders, tableSessions, tables, activeTableId } = get();

        // Check if target is occupied
        const toTable = tables.find(t => t.id === toTableId);
        if (toTable?.status === 'occupied') {
            get().showAlert('error', 'Mesa Ocupada', 'No se puede transferir a una mesa ocupada.');
            return;
        }

        // 1. Get Cart and Session data
        // IMPORTANT: If fromTableId is active, cart is in 'cart' state, not 'tableOrders'
        const fromCart = fromTableId === activeTableId ? get().cart : (tableOrders[fromTableId] || []);
        const fromSession = tableSessions[fromTableId];

        console.log(`[Transfer] Moving ${fromCart.length} items from ${fromTableId} to ${toTableId}`);

        // 2. Persist to DB (if Order ID exists)
        if (fromSession?.orderId) {
            try {
                await window.electron.updateOrderTable(fromSession.orderId, toTableId);
                console.log(`[Store] Transferred order ${fromSession.orderId} from ${fromTableId} to ${toTableId}`);
            } catch (err) {
                console.error("Failed to transfer table in DB", err);
                get().showAlert('error', 'Error de Base de Datos', 'No se pudo transferir la orden.');
                return;
            }
        }

        // 3. Update Local State
        const newTableOrders = { ...tableOrders };
        newTableOrders[toTableId] = [...fromCart];
        delete newTableOrders[fromTableId];

        const newTableSessions = { ...tableSessions };
        if (fromSession) {
            newTableSessions[toTableId] = { ...fromSession };
            delete newTableSessions[fromTableId];
        }

        set((state) => ({
            tableOrders: newTableOrders,
            tableSessions: newTableSessions,
            tables: state.tables.map(t => {
                if (t.id === fromTableId) return { ...t, status: 'available' };
                if (t.id === toTableId) return { ...t, status: 'occupied' };
                return t;
            }),
            activeTableId: toTableId,
            // Update cart to the transferred items
            cart: fromCart
        }));

        get().showAlert('success', 'Mesa Transferida', 'La cuenta se movió exitosamente.');
    },

    clearTableOrder: async (tableId: string) => {
        const { tableOrders, tableSessions, tables, activeTableId, cart } = get();

        const session = tableSessions[tableId];
        const orderCart = tableOrders[tableId] || (activeTableId === tableId ? cart : []);

        // 1. Restore stock for all items
        const restockMap: Record<string, number> = {};
        orderCart.forEach(item => {
            restockMap[item.product.id] = (restockMap[item.product.id] || 0) + item.quantity;
        });

        // Restore stock in DB
        for (const productId in restockMap) {
            await window.electron.updateProductStock(productId, restockMap[productId]).catch(console.error);
        }

        // Update local product state
        // const updatedProducts = products.map(p =>

        // 2. Delete order from database (if exists)
        if (session?.orderId) {
            try {
                await window.electron.deleteOrder(session.orderId);
                console.log(`[Store] Deleted order ${session.orderId} for table ${tableId}`);
            } catch (err) {
                console.error("Failed to delete order", err);
                get().showAlert('error', 'Error', 'No se pudo eliminar la orden de la base de datos.');
                return;
            }
        }

        // 3. Update local state
        const newTableOrders = { ...tableOrders };
        delete newTableOrders[tableId];

        const newTableSessions = { ...tableSessions };
        delete newTableSessions[tableId];

        set({
            tableOrders: newTableOrders,
            tableSessions: newTableSessions,
            tables: tables.map(t => t.id === tableId ? { ...t, status: 'available' } : t),
            // Clear cart if this was the active table
            cart: activeTableId === tableId ? [] : get().cart,
            activeTableId: activeTableId === tableId ? null : activeTableId
        });

        get().showAlert('success', 'Mesa Borrada', 'La mesa se limpió exitosamente.');
    },

    loadTables: async () => {
        const { currentBranchId } = get();
        if (!currentBranchId) return;

        try {
            const tables = await window.electron.getTables(currentBranchId);

            // Restore sessions from pending orders
            const sessions: any = {};
            for (const table of tables) {
                if (table.status === 'occupied') {
                    try {
                        const order = await window.electron.getPendingOrder(table.id);
                        if (order) {
                            sessions[table.id] = {
                                diners: order.diners || 1,
                                startTime: order.created_at,
                                orderId: order.id
                            };
                            console.log(`[Store] Restored session for table ${table.name}: ${order.diners} diners`);
                        }
                    } catch (e) {
                        console.error(`Failed to restore session for table ${table.id}`, e);
                    }
                }
            }

            // Restore Cart Items (Table Orders)
            const restoredOrders: Record<string, CartItem[]> = {};

            for (const tableId in sessions) {
                const session = sessions[tableId];
                if (session.orderId) {
                    try {
                        const items = await window.electron.orderGetItems(session.orderId);
                        // Map DB items to CartItems
                        // We need "Product" object. We have products in state.

                        // FIX: We need to fetch products from DB since they are not in state anymore
                        // For now we skip or fetch individually? 
                        // Actually, we should probably fetch products for these items.
                        // But since this is `loadTables`, we might need to optimize.
                        // Assuming products are synced to local DB, we can get them.
                        // For MVP: We assume specific component handles displaying them or we fetch them here.

                        // const stateProducts = get().products;
                        const stateProducts: any[] = [];

                        const cartItems: CartItem[] = items.map((dbItem: any) => {
                            const product = stateProducts.find(p => p.id === dbItem.product_id);
                            if (!product) return null;
                            return {
                                id: dbItem.id,
                                product: product,
                                quantity: dbItem.quantity,
                                note: undefined // DB item doesn't have note yet? OrderDAO.addItem doesn't save note?
                                // Let's check schema. order_items has no note?
                            };
                        }).filter(Boolean) as CartItem[];

                        if (cartItems.length > 0) {
                            restoredOrders[tableId] = cartItems;
                            console.log(`[Store] Restored ${cartItems.length} items for table ${tableId}`);
                        }
                    } catch (err) {
                        console.error(`Failed to restore items for table ${tableId}`, err);
                    }
                }
            }

            set({ tables, tableSessions: sessions, tableOrders: restoredOrders });
        } catch (err) {
            console.error('Failed to load tables', err);
        }
    },

    // Sale confirmation
    saleConfirmation: null,
    closeSaleConfirmation: () => set({ saleConfirmation: null }),

    // Sidebar
    sidebarOpen: false,
    sidebarSection: null,
    openSidebar: (section) => set({ sidebarOpen: true, sidebarSection: section }),
    closeSidebar: () => set({ sidebarOpen: false, sidebarSection: null }),

    cart: [],

    addToCart: (product, note) => {
        const { cart, closingSession } = get();

        // BLOCKING: If PanPanocha closing is done, stop sales
        if (closingSession?.panpanocha?.completed) {
            get().showAlert('error', 'Cierre Realizado', 'El turno ha sido cerrado. Debes abrir uno nuevo para vender.');
            return;
        }

        // 1. Live Stock Deduction
        window.electron.updateProductStock(product.id, -1).catch((err: any) => console.error("Failed to deduct stock", err));

        // 2. Update Cart
        const existing = cart.find(item =>
            item.product.id === product.id &&
            (item.note || '') === (note || '')
        );

        if (existing) {
            const newQty = existing.quantity + 1;
            set({
                cart: cart.map(item =>
                    item.id === existing.id
                        ? { ...item, quantity: newQty }
                        : item
                )
            });

            // Persist Update
            const { activeTableId, tableSessions } = get();
            if (activeTableId && tableSessions[activeTableId]?.orderId) {
                const newTotal = product.price * newQty;
                window.electron.orderUpdateItem(existing.id, newQty, newTotal).catch(console.error);
            }
        } else {
            const newItemId = crypto.randomUUID();
            const newItem = {
                id: newItemId,
                product: { ...product },
                quantity: 1,
                note: note
            };

            set({
                cart: [...cart, newItem]
            });

            // Persist Insert
            const { activeTableId, tableSessions } = get();
            if (activeTableId && tableSessions[activeTableId]?.orderId) {
                const orderId = tableSessions[activeTableId].orderId;
                if (!orderId) return;

                const itemToSave = {
                    id: newItem.id,
                    order_id: orderId,
                    product_id: product.id,
                    quantity: 1,
                    unit_price: product.price,
                    total_price: product.price
                };
                window.electron.orderAddItem(itemToSave).catch(console.error);
            }
        }
    },

    updateCartItemQuantity: (itemId: string, delta: number) => {
        const { cart } = get();
        const item = cart.find(i => i.id === itemId);
        if (!item) return;

        // 1. Live Stock Update (Inverse of delta)
        // If adding 1 to cart (+1), we subtract 1 from stock (-1).
        window.electron.updateProductStock(item.product.id, -delta).catch(console.error);

        // 2. Update Local Product State
        set({
            cart: cart.map(cartItem => {
                if (cartItem.id === itemId) {
                    const newQty = cartItem.quantity + delta;

                    // Persist Update
                    const { activeTableId, tableSessions } = get();
                    if (activeTableId && tableSessions[activeTableId]?.orderId) {
                        if (newQty > 0) {
                            const newTotal = cartItem.product.price * newQty;
                            window.electron.orderUpdateItem(cartItem.id, newQty, newTotal).catch(console.error);
                        } else {
                            // If quantity <= 0, it will be filtered out (removed)
                            window.electron.orderDeleteItem(cartItem.id).catch(console.error);
                        }
                    }

                    return newQty > 0 ? { ...cartItem, quantity: newQty } : null;
                }
                return cartItem;
            }).filter(Boolean) as CartItem[]
        });
    },

    updateCartItemNote: (itemId: string, note: string) => {
        const { cart } = get();
        set({
            cart: cart.map(item =>
                item.id === itemId
                    ? { ...item, note }
                    : item
            )
        });
    },

    removeFromCart: (itemId: string) => {
        const { cart } = get();
        const item = cart.find(i => i.id === itemId);
        if (!item) return;

        // Restore Stock
        window.electron.updateProductStock(item.product.id, item.quantity).catch(console.error);

        set({
            cart: cart.filter(product => product.id !== itemId)
        });

        // Persist Delete
        const { activeTableId, tableSessions } = get();
        if (activeTableId && tableSessions[activeTableId]?.orderId) {
            window.electron.orderDeleteItem(itemId).catch(console.error);
        }
    },

    clearCart: () => {
        const { cart } = get();

        // Restore All Stock
        cart.forEach(item => {
            window.electron.updateProductStock(item.product.id, item.quantity).catch(console.error);
        });

        // Update Local State (Efficiently)
        // Map of restorations
        const restockMap: Record<string, number> = {};
        cart.forEach(item => {
            restockMap[item.product.id] = (restockMap[item.product.id] || 0) + item.quantity;
        });

        set({ cart: [] });
    },

    finalizeCart: () => {
        // Clears cart state WITHOUT restoring stock (because sale is confirmed)
        // Check if there are pending order items in DB to delete (if working on a table)
        const { activeTableId, tableSessions } = get();

        if (activeTableId && tableSessions[activeTableId]?.orderId) {
            // Remove the pending order (and cascade items) since it's now a Sale
            const orderId = tableSessions[activeTableId].orderId;
            window.electron.deleteOrder(orderId).catch(console.error);
        }

        set({ cart: [] });
    },

    getCartTotal: () => {
        return get().cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    },

    isLoading: false,
    lastSync: 0,
    sidebarDateFilter: 'shift',
    setSidebarDateFilter: (filter) => set({ sidebarDateFilter: filter }),

    initialize: async () => {
        set({ isLoading: true });
        try {
            // 1. Load local data first (for offline)
            // 1. Load local data first (for offline)
            const localBranches = await window.electron.getBranches();
            const activeShift = await window.electron.getShift();

            console.log("[Store] Loaded local data:", {
                branches: localBranches.length,
                shift: activeShift
            });

            // Check Provisioning Status
            const storedToken = localStorage.getItem('panpanocha_device_token');
            const storedOrgId = localStorage.getItem('panpanocha_org_id');
            const isProvisioned = !!storedToken;

            // Set initial state
            set({
                branches: localBranches,
                currentShift: activeShift,
                currentBranchId: activeShift?.branch_id || '',
                isProvisioned: isProvisioned,
                organizationId: storedOrgId || activeShift?.organization_id || '' // Fallback to shift if available
            });

            // Restore Session for Electron Sync
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                window.electron.setAuthToken(session.access_token).catch(console.error);
            }

            // 2. Sync NOW (not background) to get fresh data
            try {
                // With PowerSync, data might already be coming in.
                // We just ensure we have the latest view from SQLite.
            } catch (syncErr) {
                console.warn('[Init] ⚠️ Reload failed, using local data:', syncErr);
                // Continue with local data - offline mode
            }

        } catch (error) {
            console.error("Init failed", error);
        } finally {
            set({ isLoading: false });
        }
    },

    sync: async (silent = false) => {
        if (!silent) set({ isLoading: true });
        try {
            // With PowerSync, we just need to reload from the local DB
            // The replication happens in the background.

            // Also trigger other reloads if needed
            set({ refreshHistoryTrigger: get().refreshHistoryTrigger + 1 });

            if (!silent) get().showAlert('success', 'Actualizado', 'Datos recargados correctamente.');
        } catch (e) {
            console.error("Sync error:", e);
            if (!silent) get().showAlert('error', 'Error', 'No se pudo recargar la información.');
        } finally {
            if (!silent) set({ isLoading: false });
        }
    },



    login: async (email, password) => {
        set({ isLoading: true });
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                // Pass Token to Electron for Background Sync
                if (data.session?.access_token) {
                    window.electron.setAuthToken(data.session.access_token).catch(console.error);
                }

                const user: User = {
                    id: data.user.id,
                    email: data.user.email || '',
                    full_name: data.user.user_metadata?.full_name || 'Staff',
                    role: data.user.user_metadata?.role || 'staff',
                    organization_id: get().organizationId // Tenant Context
                };

                set({ currentUser: user });

                // 1. Refresh Shift FIRST to get currentBranchId
                const activeShift = await window.electron.getShift();
                if (activeShift) {
                    set({ currentShift: activeShift, currentBranchId: activeShift.branch_id });
                }

                // 2. Then Sync (will use currentBranchId for stock)
                await get().sync();
            }
        } catch (e) {
            console.error("Login failed", e);
            throw e;
        } finally {
            set({ isLoading: false });
        }
    },

    openShift: async (branchId, initialCash) => {
        const { currentUser } = get();
        if (!currentUser) throw new Error("Must be logged in");

        const turnType = getTurnType();

        const shift: Shift = {
            id: crypto.randomUUID(),
            branch_id: branchId,
            user_id: currentUser.id, // Ensure we use ID here
            start_time: new Date().toISOString(),
            initial_cash: initialCash,
            turn_type: turnType,
            status: 'open',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            synced: false
        } as Shift; // Casting as we construct it client-side

        const result = await window.electron.openShift(shift);

        if (result && (result as any).status === 'exists') {
            // Handle the 'exists' case which might return a different structure temporarily
            get().showAlert('info', 'Turno Retomado', `Ya existe un turno abierto. Retomando sesión iniciada el ${new Date((result as any).shift.start_time).toLocaleString()}`);
            set({ currentShift: (result as any).shift, currentBranchId: branchId });
        } else {
            set({ currentShift: result, currentBranchId: branchId });
        }

        // Sync to get stock for this branch immediately
        await get().sync();
    },

    closeShift: async (finalCash) => {
        const { currentShift } = get();
        if (!currentShift) return;

        // Calculate expected from DB summary
        const summary = await window.electron.getShiftSummary(currentShift.id);
        await window.electron.closeShift({
            id: currentShift.id,
            endTime: new Date().toISOString(),
            finalCash,
            expectedCash: currentShift.initial_cash + summary.cashSales - (summary.totalExpenses || 0)
        });

        get().resetClosingSession();
        get().triggerHistoryRefresh();
        set({ currentShift: null, currentBranchId: '' });
    },

    expenses: [],

    createExpense: async (data: Omit<Expense, 'id' | 'created_at' | 'synced' | 'voucher_number' | 'organization_id'> & { voucher_number?: string | null }) => {
        try {
            const expense: Expense = {
                ...data,
                id: crypto.randomUUID(),
                organization_id: get().organizationId,
                voucher_number: data.voucher_number || undefined,
                created_at: new Date().toISOString(),
                synced: false
            };

            await window.electron.createExpense(expense);
            await get().loadExpenses(data.shift_id);
        } catch (e) {
            console.error("Failed to create expense", e);
            throw e;
        }
    },

    loadExpenses: async (shiftId) => {
        try {
            const expenses = await window.electron.getExpensesByShift(shiftId);
            set({ expenses });
        } catch (e) {
            console.error("Failed to load expenses", e);
        }
    },
    loadAllExpenses: async () => {
        try {
            const expenses = await window.electron.getAllExpenses();
            set({ expenses });
        } catch (e) {
            console.error("Failed to load all expenses", e);
        }
    },
    deleteExpense: async (id: string) => {
        try {
            await window.electron.deleteExpense(id);
            // Optimistic update
            const { expenses } = get();
            const updatedExpenses = expenses.filter(e => e.id !== id);
            set({ expenses: updatedExpenses });

            // Reload based on current view to ensure consistency
            const { currentShift, loadExpenses, loadAllExpenses, sidebarDateFilter } = get();

            if (sidebarDateFilter === 'shift' && currentShift) {
                await loadExpenses(currentShift.id);
            } else {
                await loadAllExpenses();
            }
        } catch (error) {
            console.error('Failed to delete expense:', error);
        }
    },

    checkout: async (data: { total: number; received: number; change: number; client?: any; tipAmount?: number; discountAmount?: number; diners?: number }) => {
        try {
            const { cart, currentBranchId, currentShift, currentUser, finalizeCart, closingSession } = get();

            console.log('[Checkout] Starting checkout...', { data, cartLength: cart.length });

            // BLOCKING: If PanPanocha closing is done, stop sales
            if (closingSession?.panpanocha?.completed) {
                get().showAlert('error', 'Cierre Realizado', 'El turno ha sido cerrado. Debes abrir uno nuevo para vender.');
                return;
            }

            if (cart.length === 0) {
                get().showAlert('warning', 'Carrito Vacío', 'Agrega productos antes de cobrar.');
                return;
            }

            if (!currentShift) {
                get().showAlert('error', 'Turno Cerrado', 'Debes abrir turno para poder vender.');
                return;
            }

            // Fix: Use the total passed from CheckoutScreen which includes tips/discounts
            const total = data.total;
            const saleId = crypto.randomUUID();

            console.log('[Checkout] Creating sale...', { saleId, total, client: data.client?.full_name || 'General' });

            // Get diners count from active table session or use provided value
            const { activeTableId, tableSessions } = get();
            const diners = activeTableId && tableSessions[activeTableId]
                ? tableSessions[activeTableId].diners
                : (data.diners || 1);

            const sale: Sale = {
                id: saleId,
                branch_id: currentBranchId,
                organization_id: get().organizationId,
                shift_id: currentShift.id,
                created_by: currentUser?.id || 'demo-user',
                total_amount: total,
                payment_method: 'cash', // Always cash in this POS
                status: 'completed',
                created_at: new Date().toISOString(),
                tip_amount: data.tipAmount || 0,
                discount_amount: data.discountAmount || 0,
                diners: diners,
                synced: false
            };

            const items: SaleItem[] = cart.map(item => ({
                id: crypto.randomUUID(),
                sale_id: saleId,
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
                total_price: item.product.price * item.quantity
            }));

            console.log('[Checkout] Saving sale to database...', { sale, itemsCount: items.length });

            await window.electron.saveSale(sale, items);

            console.log('[Checkout] Sale saved locally!');

            // Trigger dashboard refresh immediately
            get().triggerDashboardRefresh();

            // RELOAD PRODUCTS NOT NEEDED if we trust local state, 
            // but good practice to ensure consistency with reservations etc.
            // await get().reloadProducts(); 

            // STEP 2: Stock Update (Optimized)
            // Stock was ALREADY deducted when items were added to cart (Real-time deduction).
            // We DO NOT need to deduct again.
            // We DO NOT need to restore.
            // We just need to clear the cart state.

            finalizeCart();
            set({ lastSync: Date.now() });

            // Show success confirmation card instead of alert
            set({
                saleConfirmation: {
                    show: true,
                    total,
                    received: data.received,
                    change: data.change
                }
            });

            console.log('[Checkout] Printing ticket with client:', data.client?.full_name || 'General');

            // Pass client data and payment details to print ticket
            await window.electron.printTicket({
                sale,
                items,
                client: data.client,
                paymentData: {
                    received: data.received,
                    change: data.change
                },
                diners: data.diners
            });

            console.log('[Checkout] Starting background sync...');

            // Sync happens automatically in background via PowerSync
            // SyncService.push().catch(err => console.error("Background push failed", err));

            console.log('[Checkout] Checkout completed successfully!');
        } catch (error) {
            console.error('[Checkout] Error during checkout:', error);
            get().showAlert('error', 'Error en Venta', error instanceof Error ? error.message : 'Error desconocido al procesar la venta.');
        }
    },

    // Refund Sale - Tracks as waste/loss. Stock already deducted (sold), don't restore
    refundSale: async (saleId: string, itemIds: string[], reason: string) => {
        try {
            console.log(`[Refund] Processing refund for sale ${saleId}, items:`, itemIds);

            // 1. Get sale items to refund
            const saleItems = await window.electron.getSaleItems(saleId);
            const itemsToRefund = saleItems.filter((item: any) => itemIds.includes(item.id));

            if (itemsToRefund.length === 0) {
                get().showAlert('error', 'Error', 'No se encontraron productos para reembolsar');
                return;
            }

            // 2. Calculate refund amount
            const refundAmount = itemsToRefund.reduce((sum: number, item: any) => sum + item.total_price, 0);

            // 3. Log as waste (stock already deducted during sale, products contaminated)
            for (const item of itemsToRefund) {
                console.log(`[Refund] Waste: ${item.quantity}x ${item.product_name} - Reason: ${reason}`);
                // Stock stays deducted (products sold = already removed from inventory)
                // Future: could track in waste_tracking table
            }

            // 4. Success - money returned, products marked as loss
            get().showAlert('success', 'Reembolso Procesado',
                `Reembolso de $${refundAmount.toLocaleString('es-CO')} procesado.\nProductos registrados como pérdida.`
            );

            console.log(`[Refund] Complete. Amount: $${refundAmount}, Waste tracked, stock unchanged.`);
        } catch (error) {
            console.error('[Refund] Error:', error);
            get().showAlert('error', 'Error', 'No se pudo procesar el reembolso');
        }
    },

    // Delivery refresh trigger
    refreshDeliveriesTrigger: 0,
    triggerDeliveriesRefresh: () => set(state => ({ refreshDeliveriesTrigger: state.refreshDeliveriesTrigger + 1 })),
    refreshProductsTrigger: 0,
    triggerProductsRefresh: () => set(state => ({ refreshProductsTrigger: state.refreshProductsTrigger + 1 })),
    refreshHistoryTrigger: 0,
    triggerHistoryRefresh: () => set(state => ({ refreshHistoryTrigger: state.refreshHistoryTrigger + 1 })),
    refreshDashboardTrigger: 0,
    triggerDashboardRefresh: () => set(state => ({ refreshDashboardTrigger: state.refreshDashboardTrigger + 1 })),

}), {
    name: 'pos-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
        currentUser: state.currentUser,
        currentBranchId: state.currentBranchId,
        currentShift: state.currentShift,
        closingSession: state.closingSession
    }),
}));
