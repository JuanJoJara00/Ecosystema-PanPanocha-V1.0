import { useState, useMemo, useEffect } from 'react';
import { usePosStore } from '../../store';
import { MASTER_PIN } from '../../constants';
import { Navbar } from './Navbar';
import { BrandBackground } from './BrandBackground';
import { CategoryTabs } from './CategoryTabs';
import { ProductGrid } from './ProductGrid';
import { CartPanel } from './CartPanel';
import ShiftHistorySection from './ShiftHistorySection';
import { TableSelector } from './TableSelector';
import { ManageTablesModal } from './ManageTablesModal';
import { OpenTableModal } from './OpenTableModal';
import { TransferTableModal } from './TransferTableModal';
import { PinCodeModal } from './PinCodeModal';
import SaleConfirmation from './SaleConfirmation';
import CustomAlert from './CustomAlert';
import Sidebar from './Sidebar';
import SidebarNavigation from './SidebarNavigation';
import { DashboardModal } from './DashboardModal';
import DeliveriesSection from './DeliveriesSection';
import SalesHistorySection from './SalesHistorySection';
import ExpensesSection from './ExpensesSection';
import RappiFormModal from './RappiFormModal';
import DeliveryFormModal from './DeliveryFormModal';
import { ExpenseFormModal } from './ExpenseFormModal';
import { UserProfileModal } from './UserProfileModal';
import { CloseShiftFAB } from './CloseShiftFAB';
import { CloseShiftMenuModal } from './CloseShiftMenuModal';
import { useLiveQuery, type PaginatedResponse } from '../../hooks/useLiveQuery';
import type { Product } from '../../types';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'; // Pagination Icons

export function PosLayout() {
    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [page, setPage] = useState(1);
    const pageSize = 50;

    const [showManageTables, setShowManageTables] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showClearPinModal, setShowClearPinModal] = useState(false);
    const [tableToOpen, setTableToOpen] = useState<string | null>(null);
    const [showRappiModal, setShowRappiModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showCloseShiftMenu, setShowCloseShiftMenu] = useState(false);

    // const { products: storeProducts } = usePosStore(); // REMOVED
    const {
        cart,
        tables,
        activeTableId,
        setActiveTable,
        openTableSession,
        loadTables,
        addToCart,
        removeFromCart,
        clearCart,
        clearTableOrder,
        checkout,
        getCartTotal,
        saleConfirmation,
        closeSaleConfirmation,
        showAlert,
        alert, // Get alert state
        closeAlert, // Get close action
        sidebarOpen,
        sidebarSection,
        openSidebar,
        closeSidebar
    } = usePosStore();

    // Load tables on mount
    useEffect(() => {
        loadTables();
    }, []);

    // Data Logic: Fetch Categories from DB (DISTINCT)
    const { data: categories = [] } = useLiveQuery<string[]>('db:get-categories');

    // Data Logic: Products (Server-Side Pagination from Main Process)
    // 1. Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [activeCategory, searchTerm]);

    // 2. Fetch Page
    const { data: paginatedData, loading: isLoadingProducts } = useLiveQuery<PaginatedResponse<Product>>('db:get-products', {
        page,
        pageSize,
        search: searchTerm,
        category: activeCategory
    });

    const productsToRender = paginatedData?.data || [];
    const totalPages = paginatedData?.totalPages || 1;
    const totalItems = paginatedData?.total || 0;

    // DEBUG: Log first filtered product
    useEffect(() => {
        if (productsToRender.length > 0) {
            // console.log("[PosLayout] Rendering products:", productsToRender.length);
        }
    }, [productsToRender]);

    const handleTableSelect = (tableId: string | null) => {
        if (!tableId) {
            setActiveTable(null);
            return;
        }

        const table = tables.find(t => t.id === tableId);
        if (table && table.status === 'available') {
            setTableToOpen(tableId);
        } else {
            setActiveTable(tableId);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-brand-accent text-foreground font-sans overflow-hidden relative">
            {/* Background Brand Mosaic */}
            <BrandBackground opacity={0.20} />

            {/* Top Bar (z-index ensure above bg) */}
            <div className="relative z-10">
                <Navbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onOpenSidebar={(section) => openSidebar(section)}
                    onOpenDashboard={() => setShowDashboard(true)}
                    onOpenUserModal={() => {
                        console.log('PosLayout: Opening User Modal');
                        setShowUserModal(true);
                    }}
                />
            </div>

            {/* Main Content Area (z-index ensure above bg) */}
            <div className="flex flex-1 overflow-hidden relative z-10">

                {/* Left: Store (Tables + Categories + Grid) */}
                <div className="flex-1 flex flex-col min-w-0 z-0 relative">
                    {/* Table Selector */}
                    <div className="px-3 pt-3 pb-2 bg-brand-accent/70 backdrop-blur-sm">
                        <TableSelector
                            tables={tables}
                            activeTableId={activeTableId}
                            onSelectTable={handleTableSelect}
                            onManageTables={() => setShowManageTables(true)}
                        />
                    </div>

                    {/* Categories */}
                    <div className="px-3 pb-3 bg-brand-accent/50 backdrop-blur-sm z-10 sticky top-0">
                        <CategoryTabs
                            categories={categories}
                            selectedCategory={activeCategory}
                            onSelect={setActiveCategory}
                        />
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto">
                            {isLoadingProducts && productsToRender.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    <span className="text-sm font-medium">Cargando productos...</span>
                                </div>
                            ) : (
                                <ProductGrid
                                    products={productsToRender}
                                    onProductClick={addToCart}
                                />
                            )}
                        </div>

                        {/* Pagination Footer */}
                        <div className="px-4 py-3 bg-white/90 backdrop-blur border-t border-brand-accent/20 flex justify-between items-center text-sm shadow-lg z-20">
                            <span className="text-gray-500 font-medium">
                                {totalItems} productos encontrados
                            </span>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || isLoadingProducts}
                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all text-gray-700 font-medium shadow-sm active:translate-y-0.5"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Anterior
                                </button>

                                <span className="bg-gray-100 px-3 py-1 rounded-md text-gray-700 font-bold min-w-[80px] text-center border border-gray-200/50">
                                    Pag {page} / {totalPages}
                                </span>

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages || isLoadingProducts}
                                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-all text-gray-700 font-medium shadow-sm active:translate-y-0.5"
                                >
                                    Siguiente <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Cart Panel */}
                <CartPanel
                    cart={cart}
                    onRemove={removeFromCart}
                    onClear={clearCart}
                    onCheckout={checkout}
                    total={getCartTotal()}
                    activeTableName={activeTableId ? tables.find(t => t.id === activeTableId)?.name : undefined}
                    onTransfer={activeTableId ? () => setShowTransferModal(true) : undefined}
                    onClearTable={activeTableId ? () => setShowClearPinModal(true) : undefined}
                    onOpenRappiModal={() => setShowRappiModal(true)}
                    onOpenDeliveryModal={() => setShowDeliveryModal(true)}
                    onOpenExpenseModal={() => setShowExpenseModal(true)}
                />
            </div>

            {/* Modals */}
            <DashboardModal isOpen={showDashboard} onClose={() => setShowDashboard(false)} />
            <UserProfileModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} />
            {showExpenseModal && <ExpenseFormModal onClose={() => setShowExpenseModal(false)} />}

            {showManageTables && <ManageTablesModal onClose={() => setShowManageTables(false)} />}

            {showTransferModal && activeTableId && (
                <TransferTableModal
                    fromTableId={activeTableId}
                    fromTableName={tables.find(t => t.id === activeTableId)?.name || 'Mesa'}
                    onClose={() => setShowTransferModal(false)}
                />
            )}

            {showClearPinModal && activeTableId && (
                <PinCodeModal
                    title="Borrar Mesa"
                    subtitle="Ingresa código maestro para borrar la mesa"
                    onClose={() => setShowClearPinModal(false)}
                    onSubmit={(pin) => {
                        if (pin === MASTER_PIN) {
                            setShowClearPinModal(false);
                            clearTableOrder(activeTableId);
                        } else {
                            showAlert('error', 'Código Incorrecto', 'El código ingresado no es válido.');
                            setTimeout(() => setShowClearPinModal(false), 1500);
                        }
                    }}
                />
            )}

            {/* Rappi Modal */}
            {showRappiModal && (
                <RappiFormModal
                    onClose={() => setShowRappiModal(false)}
                    cartItems={cart}
                />
            )}

            {/* Delivery Modal */}
            {showDeliveryModal && (
                <DeliveryFormModal
                    onClose={() => setShowDeliveryModal(false)}
                    cartItems={cart}
                />
            )}

            {tableToOpen && (
                <OpenTableModal
                    tableName={tables.find(t => t.id === tableToOpen)?.name || ''}
                    onConfirm={(diners) => {
                        openTableSession(tableToOpen, diners);
                        setTableToOpen(null);
                    }}
                    onCancel={() => setTableToOpen(null)}
                />
            )}

            {/* Sale Confirmation */}
            {saleConfirmation && (
                <SaleConfirmation
                    total={saleConfirmation.total}
                    received={saleConfirmation.received}
                    change={saleConfirmation.change}
                    onClose={closeSaleConfirmation}
                    onOpenHistory={() => {
                        closeSaleConfirmation();
                        openSidebar('history');
                    }}
                />
            )}

            {/* Global Alert */}
            {alert && (
                <CustomAlert
                    open={true}
                    type={alert.type}
                    title={alert.title}
                    message={alert.message}
                    onClose={closeAlert}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                activeSection={sidebarSection || 'history'}
                onClose={closeSidebar}
                onSectionChange={(section) => {
                    const store = usePosStore.getState();
                    store.sidebarSection = section;
                    usePosStore.setState({ sidebarSection: section });
                }}
            >
                <SidebarNavigation
                    activeSection={sidebarSection || 'history'}
                    onSectionChange={(section) => usePosStore.setState({ sidebarSection: section })}
                />

                {/* Sidebar Content Sections */}
                <div className="flex-1 overflow-y-auto">
                    {{
                        'history': <SalesHistorySection />,
                        'deliveries': <DeliveriesSection />,
                        'user': null, // User is now a modal, not in sidebar
                        'expenses': <ExpensesSection />,
                        'close-shift': <ShiftHistorySection />
                    }[sidebarSection || 'history']}
                </div>
            </Sidebar>

            {/* Close Shift FAB */}
            <CloseShiftFAB onClick={() => setShowCloseShiftMenu(true)} />

            {/* Close Shift Menu Modal */}
            {showCloseShiftMenu && (
                <CloseShiftMenuModal
                    onClose={() => setShowCloseShiftMenu(false)}
                    onLogout={() => {
                        setShowCloseShiftMenu(false);
                        // Clear session and go to login
                        usePosStore.setState({ currentShift: null, currentUser: null });
                    }}
                />
            )}
        </div>
    );
}
