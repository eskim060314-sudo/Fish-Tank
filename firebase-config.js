/**
 * FISH TANK — Firebase Configuration
 * 
 * Connected to Firebase Project: fish-tank-c46d2
 */

const firebaseConfig = {
  apiKey: "AIzaSyAkPBfqxIgUVyw2PGizmPsrqBCOeWi_grU",
  authDomain: "fish-tank-c46d2.firebaseapp.com",
  projectId: "fish-tank-c46d2",
  storageBucket: "fish-tank-c46d2.firebasestorage.app",
  messagingSenderId: "472395884304",
  appId: "1:472395884304:web:f4e6571575d5c7d911e795",
  measurementId: "G-S22LC1GCCB"
};

/**
 * Checks if the user has replaced placeholder credentials with valid Firebase keys.
 * @param {Object} config - Firebase configuration object
 * @returns {boolean} True if Firebase has been configured
 */
function isFirebaseConfigured(config) {
  if (!config) return false;
  const isPlaceholder = 
    !config.apiKey ||
    config.apiKey === "YOUR_API_KEY_HERE" ||
    config.apiKey.includes("YOUR_") ||
    !config.projectId ||
    config.projectId === "YOUR_PROJECT_ID";
    
  return !isPlaceholder;
}

// Make available globally
window.firebaseConfig = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;
