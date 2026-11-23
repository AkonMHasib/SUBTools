// Application Core Root Component
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import store from './redux/store';
import AppRoutes from './routes/AppRoutes';

// Load default toastify styles
import 'react-toastify/dist/ReactToastify.css';

import { CacheProvider } from './context/CacheContext';

import { authApi } from './api/authApi';
import { setUser } from './redux/slices/authSlice';

export const App = () => {
  useEffect(() => {
    // Initial theme check and body class initialization
    const theme = localStorage.getItem('subtools_theme') || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    // Restore and validate Supabase Auth session on page load/refresh
    const restoreSession = async () => {
      const token = localStorage.getItem('subtools_supabase_token') || localStorage.getItem('subtools_token');
      if (token) {
        try {
          const userData = await authApi.fetchUserProfile();
          if (userData) {
            store.dispatch(setUser(userData));
          }
        } catch (err) {
          console.warn("Failed to validate Supabase session:", err);
        }
      }
    };

    restoreSession();
  }, []);

  return (
    <Provider store={store}>
      <CacheProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
          
          {/* Toast Alert Coordinator */}
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
            className="text-xs"
          />
        </BrowserRouter>
      </CacheProvider>
    </Provider>
  );
};

export default App;
