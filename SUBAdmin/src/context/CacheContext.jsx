// CacheContext.jsx - React Provider for System-Wide Cache & Network State
import { createContext, useContext, useEffect, useState } from "react";
import BackgroundSyncService from "../services/BackgroundSyncService";
import CacheManager from "../services/CacheManager";

const CacheContext = createContext({
  isOffline: false,
  invalidateCache: () => {},
});

export const CacheProvider = ({ children }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const unsubscribeNetwork = BackgroundSyncService.subscribe((onlineStatus) => {
      setIsOffline(!onlineStatus);
    });

    return () => {
      unsubscribeNetwork();
    };
  }, []);

  const invalidateCache = (key) => {
    CacheManager.invalidate(key);
  };

  return (
    <CacheContext.Provider value={{ isOffline, invalidateCache }}>
      {isOffline && (
        <div className="bg-amber-500 text-white text-center text-xs font-bold py-1.5 px-4 shadow-md sticky top-0 z-[9999] flex items-center justify-center space-x-2">
          <span>⚠️ Offline Mode Active — Displaying Cached System Data. Update actions disabled.</span>
        </div>
      )}
      {children}
    </CacheContext.Provider>
  );
};

export const useCache = () => useContext(CacheContext);
export default CacheContext;
