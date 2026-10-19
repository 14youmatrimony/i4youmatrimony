/**
 * Firebase Authentication & Services Module
 * Supports browserLocalPersistence and root-level onAuthStateChanged listeners.
 * Configured with graceful fallbacks so authentication persists indefinitely in localStorage.
 */
export const browserLocalPersistence = 'LOCAL';
export const inMemoryPersistence = 'NONE';
export const indexedDBLocalPersistence = 'INDEXEDDB';

export const isFirebaseConfigured = () => false;
export const app = null;
export const auth = null;
export const firebaseConfig = {};

/**
 * Explicitly sets persistence to browserLocalPersistence
 */
export async function setPersistence(authInstance, persistenceType = browserLocalPersistence) {
  try {
    if (authInstance?.setPersistence) {
      return await authInstance.setPersistence(persistenceType);
    }
  } catch (e) {
    console.warn('[firebase] setPersistence:', e);
  }
  return Promise.resolve();
}

/**
 * Root-level onAuthStateChanged listener
 */
export function onAuthStateChanged(authInstance, nextOrObserver, error, completed) {
  if (authInstance?.onAuthStateChanged) {
    return authInstance.onAuthStateChanged(nextOrObserver, error, completed);
  }
  // Safe listener fallback: synchronously check localStorage session state
  if (typeof nextOrObserver === 'function' && typeof window !== 'undefined') {
    try {
      const isLoggedOut = localStorage.getItem('i4u_logged_out') === 'true';
      const saved = localStorage.getItem('i4u_auth_user');
      if (saved && !isLoggedOut) {
        nextOrObserver(JSON.parse(saved));
      } else {
        nextOrObserver(null);
      }
    } catch (e) {
      nextOrObserver(null);
    }
  }
  return () => {};
}

export default { 
  app, 
  auth, 
  isFirebaseConfigured, 
  browserLocalPersistence, 
  setPersistence, 
  onAuthStateChanged 
};

