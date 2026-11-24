/**
 * FISH TANK — Data Storage Manager
 * 
 * Demonstrates:
 * 1. JSON data structures for user-generated content.
 * 2. localStorage persistence for instant offline & prototype use.
 * 3. Firebase Cloud Firestore integration for real-time shared multi-user aquarium.
 */

// Key for browser localStorage persistence
const LOCAL_STORAGE_KEY = "fish_tank_residents_v1";

// Curated list of funny occupations assigned at fish creation
const SILLY_OCCUPATIONS = [
  "Professional Bubble Watcher",
  "Unemployed",
  "Underwater Influencer",
  "CEO of Nothing",
  "Part-Time Seaweed Inspector",
  "Professional Napper",
  "Ocean Drama Queen",
  "Certified Fish",
  "Bubble Quality Inspector",
  "Full-Time Swimmer",
  "Coral Reef Consultant",
  "Sand Castle Architect",
  "Plankton Connoisseur",
  "Professional Drifter",
  "Senior Fin Strategist",
  "Algae Nibble Critic"
];

// Seed fish to populate the tank on first load so the aquarium feels alive immediately
const SEED_FISH = [
  {
    id: "seed-bubbles-01",
    name: "Mr. Bubbles",
    color: "blue",
    size: "small",
    personality: "dramatic",
    owner: "Captain Coral",
    occupation: "Professional Bubble Watcher",
    createdAt: "2026-11-20T14:30:00.000Z"
  },
  {
    id: "seed-peaches-02",
    name: "Peaches",
    color: "pink",
    size: "medium",
    personality: "shy",
    owner: "Marina",
    occupation: "Part-Time Seaweed Inspector",
    createdAt: "2026-11-21T09:15:00.000Z"
  },
  {
    id: "seed-sunny-03",
    name: "Sunny",
    color: "yellow",
    size: "medium",
    personality: "energetic",
    owner: "Finn",
    occupation: "Full-Time Swimmer",
    createdAt: "2026-11-22T11:45:00.000Z"
  },
  {
    id: "seed-barnaby-04",
    name: "Barnaby",
    color: "orange",
    size: "large",
    personality: "lazy",
    owner: "Anonymous",
    occupation: "Professional Napper",
    createdAt: "2026-11-23T08:00:00.000Z"
  }
];

class FishStorageManager {
  constructor() {
    this.mode = "local"; // 'local' or 'firebase'
    this.firestoreDb = null;
    this.firestoreUnsubscribe = null;
    this.fishList = [];
    this.listeners = []; // Callbacks for data updates

    // Preload localStorage immediately so initial state is never empty
    this.loadFromLocalStorage();
  }

  /**
   * Initializes data storage.
   * Checks if Firebase credentials have been configured.
   * If yes: connects to Cloud Firestore with real-time onSnapshot listener.
   * If no: operates in localStorage demo mode.
   */
  async init() {
    const isConfigured = typeof window.isFirebaseConfigured === "function" && 
                         window.isFirebaseConfigured(window.firebaseConfig);

    if (isConfigured && typeof firebase !== "undefined") {
      try {
        console.log("🔥 Initializing Firebase Cloud Firestore...");
        if (!firebase.apps.length) {
          firebase.initializeApp(window.firebaseConfig);
        }
        this.firestoreDb = firebase.firestore();
        this.mode = "firebase";
        console.log("✅ Firebase Firestore connected successfully!");
        this.setupFirestoreListener();
        return { mode: "firebase", success: true };
      } catch (err) {
        console.warn("⚠️ Firebase connection failed, falling back to localStorage:", err);
        this.mode = "local";
      }
    } else {
      console.log("💾 Running in localStorage mode (Firebase not configured yet).");
      this.mode = "local";
    }

    // Initialize local storage
    this.loadFromLocalStorage();
    return { mode: "local", success: true };
  }

  /**
   * Returns current mode: 'local' or 'firebase'
   */
  getMode() {
    return this.mode;
  }

  /**
   * Randomly selects a silly occupation for a newly born fish.
   */
  getRandomOccupation() {
    const index = Math.floor(Math.random() * SILLY_OCCUPATIONS.length);
    return SILLY_OCCUPATIONS[index];
  }

  /**
   * Subscribes a callback to fish updates.
   * Callback receives (fishArray).
   */
  subscribe(callback) {
    if (typeof callback === "function") {
      this.listeners.push(callback);
      // Immediately notify subscriber with current list
      callback(this.fishList);
    }
  }

  /**
   * Notifies all registered subscribers of updated fish data.
   */
  notifySubscribers() {
    for (const listener of this.listeners) {
      try {
        listener(this.fishList);
      } catch (e) {
        console.error("Subscriber notification error:", e);
      }
    }
  }

  /* ------------------------------------------------------------------------
     localStorage Persistence (Step B)
     ------------------------------------------------------------------------ */

  /**
   * Loads fish from browser localStorage using JSON.parse().
   * Seeds default fish if storage is empty.
   */
  loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        // Parse stored JSON string back into JavaScript Objects
        this.fishList = JSON.parse(stored);
      } else {
        // Seed with sample fish
        this.fishList = [...SEED_FISH];
        this.saveToLocalStorage();
      }
    } catch (e) {
      console.error("Failed to load fish from localStorage:", e);
      this.fishList = [...SEED_FISH];
    }
    this.notifySubscribers();
  }

  /**
   * Saves the current fishList array to localStorage using JSON.stringify().
   */
  saveToLocalStorage() {
    try {
      const jsonString = JSON.stringify(this.fishList);
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
    } catch (e) {
      console.error("Failed to save fish to localStorage:", e);
    }
  }

  /**
   * Resets local storage back to the default seed fish.
   */
  resetLocalDemo() {
    this.fishList = [...SEED_FISH];
    this.saveToLocalStorage();
    this.notifySubscribers();
  }

  /* ------------------------------------------------------------------------
     Firebase Cloud Firestore Integration (Step C)
     ------------------------------------------------------------------------ */

  /**
   * Sets up a real-time Firestore listener on the "fish" collection.
   * Whenever anyone adds a fish, all connected users receive the update!
   */
  setupFirestoreListener() {
    if (!this.firestoreDb) return;

    try {
      // Real-time listener ordered by creation time
      this.firestoreUnsubscribe = this.firestoreDb
        .collection("fish")
        .orderBy("createdAt", "desc")
        .onSnapshot(
          (snapshot) => {
            const remoteFish = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              remoteFish.push({
                id: doc.id,
                name: data.name || "Unnamed Fish",
                color: data.color || "blue",
                size: data.size || "medium",
                personality: data.personality || "lazy",
                owner: data.owner || "Anonymous",
                occupation: data.occupation || "Full-Time Swimmer",
                createdAt: data.createdAt || new Date().toISOString()
              });
            });

            console.log(`📡 Firestore real-time update: ${remoteFish.length} fish loaded.`);
            this.fishList = remoteFish;
            // Also update localStorage as an offline backup
            this.saveToLocalStorage();
            this.notifySubscribers();
          },
          (error) => {
            console.warn("⚠️ Firestore onSnapshot notice:", error.message);
            if (error.code === "permission-denied") {
              console.info("🔒 Firestore rules: In production mode, update your Firestore Security Rules in the Firebase Console (see rules in chat/README.md) to enable public reads & fish releases.");
            }
            // Fallback to local cache if permission is pending or network is offline
            this.loadFromLocalStorage();
          }
        );
    } catch (e) {
      console.error("Failed to initialize Firestore listener:", e);
      this.loadFromLocalStorage();
    }
  }

  /* ------------------------------------------------------------------------
     Unified Save Operation
     ------------------------------------------------------------------------ */

  /**
   * Saves a newly created fish object.
   * If in Firebase mode: saves as a Firestore document.
   * If in Local mode: appends to array and serializes to localStorage.
   * 
   * @param {Object} fishData - The sanitized fish object
   * @returns {Promise<Object>} The saved fish object
   */
  async saveFish(fishData) {
    // Ensure all required fields exist
    const completeFish = {
      id: fishData.id || "fish-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      name: fishData.name.trim(),
      color: fishData.color.toLowerCase(),
      size: fishData.size.toLowerCase(),
      personality: fishData.personality.toLowerCase(),
      owner: (fishData.owner && fishData.owner.trim()) ? fishData.owner.trim() : "Anonymous",
      occupation: fishData.occupation || this.getRandomOccupation(),
      createdAt: fishData.createdAt || new Date().toISOString()
    };

    if (this.mode === "firebase" && this.firestoreDb) {
      try {
        console.log("Saving fish to Cloud Firestore...", completeFish);
        await this.firestoreDb.collection("fish").doc(completeFish.id).set(completeFish);
        console.log("Fish successfully saved to Firestore!");
        // The real-time listener will automatically update this.fishList
        return completeFish;
      } catch (err) {
        console.error("Failed to save fish to Firestore, saving locally:", err);
        // Fallback to local save on error
        this.addFishLocally(completeFish);
        return completeFish;
      }
    } else {
      // LocalStorage mode
      this.addFishLocally(completeFish);
      return completeFish;
    }
  }

  /**
   * Internal helper to add a fish to local memory and localStorage.
   */
  addFishLocally(fish) {
    // Add to beginning of array (newest first)
    this.fishList.unshift(fish);
    this.saveToLocalStorage();
    this.notifySubscribers();
  }

  /**
   * Gets all fish sorted by newest first.
   */
  getAllFish() {
    return [...this.fishList].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
  }

  /**
   * Finds a specific fish by its ID.
   */
  getFishById(id) {
    return this.fishList.find(f => f.id === id) || null;
  }
}

// Global instance
window.fishStorage = new FishStorageManager();

