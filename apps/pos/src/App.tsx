import { useEffect } from 'react';
import { usePosStore } from './store';
import { PosLayout } from './components/pos/PosLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { supabase } from './api/client';
import { ProvisioningScreen } from './components/auth/ProvisioningScreen';
import { OpenShiftScreen } from './components/pos/OpenShiftScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { LoadingSpinner } from './components/Loading';
// import { useLiveQuery } from './hooks/useLiveQuery'; // Removed unused import to satisfy linter
// import { powerSync } from './lib/powersync'; // DISABLED FOR PHASE 2 MIGRATION

function App() {

  const { initialize, currentUser, currentShift, isLoading, isProvisioned, refreshProductsTrigger, reloadProducts } = usePosStore();

  // Initial Load
  // Initial Load
  useEffect(() => {
    initialize();

    // --- PHASE 2: RENDERER DB DISABLED ---
    // The Database now lives in the Main Process. 
    // We do NOT initialize PowerSyncWeb here to avoid Split-Brain.
    /*
    const url = import.meta.env.VITE_POWERSYNC_URL;
    const token = import.meta.env.VITE_POWERSYNC_TOKEN;

    if (url && token) {
      powerSync.init(url, token)
        .then(() => console.log("[App.tsx] PowerSync init called successfully"))
        .catch(err => console.error("[App.tsx] Failed to init PowerSync:", err));
    } else {
      console.error("[App.tsx] ❌ Missing PowerSync Credentials in .env.local");
    }
    */
  }, [initialize]);

  // Auth Listener for Electron Sync
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        console.log('[App] Auth Update:', event);
        window.electron.setAuthToken(session.access_token).catch(console.error);
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);



  // Global Alert Override
  useEffect(() => {
    // @ts-ignore
    if (!window._originalAlert) window._originalAlert = window.alert;

    window.alert = (msg) => {
      usePosStore.getState().showAlert('info', 'Notificación', String(msg));
    };
  }, []);

  // Listen for product refresh trigger
  useEffect(() => {
    if (refreshProductsTrigger > 0) {

      reloadProducts();
    }
  }, [refreshProductsTrigger, reloadProducts]);

  // Global Alert Override
  useEffect(() => {
    // @ts-ignore
    if (!window._originalAlert) window._originalAlert = window.alert;

    window.alert = (msg) => {
      usePosStore.getState().showAlert('info', 'Notificación', String(msg));
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" className="text-[#D4AF37] mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Iniciando POS...</p>
        </div>
      </div>
    );
  }

  // 1. Provisioning Check (Device Auth)
  if (!isProvisioned) {
    return <ProvisioningScreen />;
  }

  // 2. User Auth
  if (!currentUser) {
    return <LoginScreen />;
  }

  if (!currentShift) {
    return <OpenShiftScreen />;
  }

  return (
    <ErrorBoundary>
      <PosLayout />
      <ToastContainer />
    </ErrorBoundary>
  );
}

export default App;
