# 🐟 Fish Tank — A Shared Virtual Aquarium

> A creative coding and shared virtual aquarium website where users design custom fish and release them into a shared tank. Built as an **Interactive Media Arts (IMA)** project exploring JSON data modeling, browser `localStorage`, and real-time cloud data synchronization using **Firebase Firestore**.

---

## 🎨 Project Overview

Fish Tank is a cozy, retro browser game and virtual habitat. Anyone can visit, design a fish with unique colors, sizes, and quirky personalities, and watch it swim alongside fish created by other visitors.

### Key Features
* **Customizable Fish Creation:** Pick from 6 retro pastel colors, 3 sizes, and 6 distinct personalities (Lazy, Dramatic, Angry, Silly, Shy, Energetic).
* **Live Interactive Preview:** Watch your fish wag its tail and update in real-time as you customize it in the designer popup.
* **Autonomous Swimming Simulation (p5.js):** Each fish personality exhibits unique swimming behaviors—lazy fish drift and nap, dramatic fish perform somersaults, shy fish hide near the seabed, and silly fish occasionally swim upside-down.
* **Interactive Feeding:** Click "FEED THE FISH" or click directly on the water to drop sinking food pellets. Nearby fish notice the food and swim over to nibble it up!
* **Fish Profiles & Funny Occupations:** Click any fish in the tank or directory to view its full profile, including its automatically assigned silly occupation (e.g., *Professional Bubble Watcher*, *Ocean Drama Queen*, *Part-Time Seaweed Inspector*).
* **Resident Directory & Search:** Browse all fish ever released into the tank, filter by color, search by name or owner, and track the live resident count.
* **Dual-Tier Data Architecture:**
  1. **Immediate Local Mode (`localStorage`):** Runs out of the box with zero setup needed.
  2. **Real-Time Cloud Mode (`Firebase Firestore`):** When configured, fish sync across multiple computers and browsers instantly using Firestore's `onSnapshot` listener.

---

## 📁 Project File Structure

```text
Fish Tank/
├── index.html           # Website structure, semantic layout, and dialog modals
├── style.css            # Retro cozy pastel styling, animations, and responsive layout
├── fish.js              # Fish entity class, p5.js drawing primitives, physics & personality logic
├── aquarium.js          # p5.js aquarium canvas, kelp, sand, bubbles, and food simulation
├── storage.js           # JSON data modeling, localStorage persistence & Firestore sync
├── firebase-config.js   # Firebase configuration placeholder & detection logic
├── app.js               # UI controller, form validation, preview renderer, and toasts
└── README.md            # Comprehensive setup and IMA class guide
```

---

## 🚀 How to Run the Website Locally

You can run Fish Tank immediately in **Local Demo Mode** without installing anything:

### Option A: Using Python's Built-in Local Server (Recommended)
Open your terminal in the `Fish Tank` folder and run:

```bash
# Python 3
python3 -m http.server 8000
```
Then open your browser and navigate to:
```
http://localhost:8000
```

### Option B: Open Directly in Browser
You can also directly double-click `index.html` in your file explorer to open it in Chrome, Safari, or Firefox.

*(Note: In Local Demo Mode, 4 charming starter fish are pre-seeded so you can test swimming, feeding, profiles, and directory searching right away. Any new fish you create will be safely saved in your browser's `localStorage`.)*

---

## 💾 Understanding the Data Architecture (For IMA Class)

This project satisfies all three levels of user-generated data storage:

### 1. JSON (JavaScript Object Notation)
Every fish in the tank is represented as a structured JavaScript object that cleanly maps to JSON:

```json
{
  "id": "fish-1700778400-ab3f9",
  "name": "Mr. Bubbles",
  "color": "blue",
  "size": "small",
  "personality": "dramatic",
  "owner": "Anonymous",
  "occupation": "Professional Bubble Watcher",
  "createdAt": "2026-11-23T15:30:00.000Z"
}
```

### 2. Browser `localStorage`
Before connecting to the cloud, the application uses the browser's built-in `localStorage` API:
* **Saving:** Converts the fish list array to a JSON string using `JSON.stringify(fishList)`.
* **Loading:** Parses the stored string back into live JavaScript objects using `JSON.parse(stored)`.
* **Survival:** Data persists when the user refreshes the page or closes the tab.

### 3. Firebase Cloud Firestore
Provides a shared, real-time cloud database:
* Collection name: `fish`.
* Each fish document is keyed by its unique `id`.
* Uses `onSnapshot` real-time listeners so when Person A releases a fish in New York, it instantly pops up swimming in Person B's aquarium in Tokyo without page refreshes!

---

## 🔥 Step-by-Step Firebase Firestore Setup

Follow these exact steps to connect your virtual aquarium to Firebase:

### Step 1: Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **"Add project"** (or "Create a project").
3. Name your project (e.g. `shared-fish-tank`).
4. Google Analytics is optional (you can disable it for a simpler setup).
5. Click **"Create project"** and wait for it to finish.

### Step 2: Register a Web App
1. On your project overview page, click the **Web icon (`</>`)** to add a web application.
2. Enter an app nickname (e.g. `Fish Tank Web`).
3. You do **not** need to check "Firebase Hosting" for now.
4. Click **"Register app"**.
5. Firebase will display your `firebaseConfig` object, looking similar to this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyD-EXAMPLE-KEY-HERE",
     authDomain: "shared-fish-tank.firebaseapp.com",
     projectId: "shared-fish-tank",
     storageBucket: "shared-fish-tank.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456"
   };
   ```

### Step 3: Insert Config into `firebase-config.js`
1. Open [`firebase-config.js`](file:///Users/jessicakim/Desktop/Fish%20Tank/firebase-config.js) in your text editor.
2. Replace the placeholder values inside `const firebaseConfig = { ... };` with your actual keys from Step 2.
3. Save the file.

### Step 4: Enable Cloud Firestore
1. In the Firebase Console left sidebar, click **"Build"** ➔ **"Firestore Database"**.
2. Click **"Create database"**.
3. Choose a location closest to you (e.g. `nam5 (us-central)` or `us-east1`).
4. Select **"Start in production mode"** and click **Create**.

### Step 5: Configure Firestore Security Rules
1. In your Firestore Database dashboard, click the **"Rules"** tab at the top.
2. Replace the existing rules with these safe, non-unrestricted security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fish/{fishId} {
      // 1. Allow public reading of all fish in the virtual tank
      allow read: if true;

      // 2. Allow creating new fish with strict schema validation
      allow create: if request.resource.data.keys().hasOnly([
                        'id', 'name', 'color', 'size', 'personality', 
                        'owner', 'occupation', 'createdAt'
                      ])
                    && request.resource.data.id is string
                    && request.resource.data.id == fishId
                    && request.resource.data.id.size() >= 3
                    && request.resource.data.id.size() <= 64
                    && request.resource.data.name is string
                    && request.resource.data.name.size() > 0
                    && request.resource.data.name.size() <= 20
                    && request.resource.data.color is string
                    && request.resource.data.color in ['pink', 'blue', 'yellow', 'orange', 'purple', 'green']
                    && request.resource.data.size is string
                    && request.resource.data.size in ['small', 'medium', 'large']
                    && request.resource.data.personality is string
                    && request.resource.data.personality in ['lazy', 'dramatic', 'angry', 'silly', 'shy', 'energetic']
                    && request.resource.data.owner is string
                    && request.resource.data.owner.size() > 0
                    && request.resource.data.owner.size() <= 30
                    && request.resource.data.occupation is string
                    && request.resource.data.occupation.size() > 0
                    && request.resource.data.occupation.size() <= 60
                    && request.resource.data.createdAt is string
                    && request.resource.data.createdAt.size() <= 40;

      // 3. Disallow updating or deleting any fish to protect the shared aquarium
      allow update: if false;
      allow delete: if false;
    }
  }
}
```
3. Click **"Publish"**.

> [!NOTE]
> These security rules allow anyone to read the fish and release a new fish (validating field types, string lengths, and rejecting any arbitrary extra fields), while preventing anyone from deleting or overwriting existing fish!

### Step 6: Test Real-Time Synchronization Across Browsers
1. Open the website in **Google Chrome**.
2. Open the same website in an **Incognito Window** or a **different browser** (such as Safari or Firefox).
3. The badge in the top-right header will say **"🔥 Firestore Live"**.
4. In Browser 1, click **"ADD A FISH"**, design a purple dramatic fish, and click **"RELEASE INTO THE TANK!"**.
5. Look at Browser 2: you will see the new fish automatically swim into the tank in real time without refreshing the page!

---

## 🐠 Swimming Personalities & Physics

Fish movement is simulated locally in JavaScript at 60 frames per second using p5.js:

| Personality | Swimming Behavior & Visual Features |
| :--- | :--- |
| **Lazy** 💤 | Swims slowly, pauses periodically to take cozy naps, drifts with water currents, half-closed eyelid. |
| **Dramatic** 🎭 | Swims in majestic vertical swoops and occasionally performs theatrical 360-degree somersaults with sparkle highlights. |
| **Angry** 💢 | Fast and snappy with sharp turns, furrowed brow, and agitated tail flapping. |
| **Silly** 🤪 | Wobbly swimming trajectory, goofy eyes, tongue blep, and occasionally swims completely upside-down! |
| **Shy** 🙈 | Cautious swimmer with blush cheeks, stays near the bottom sand and kelp, and darts away if the user hovers near it. |
| **Energetic** ⚡ | High-speed swimmer with endless zoomies and brisk tail movement. |

---

## 🛠️ Code Conventions Used
* **Variables:** Store fish states, animation timers, form inputs, and environmental entities.
* **Objects:** Encapsulate fish data models, color palettes, and size specifications.
* **Arrays:** Hold active swimming fish, food particles, kelp stalks, and directory cards.
* **Loops:** Update and render multiple fish, bubbles, and background elements every frame.
* **Conditionals (`if` statements):** Drive personality-specific behaviors, boundary bouncing, food-seeking, and form validation.
* **Modular Functions:** Organized into dedicated files (`fish.js`, `aquarium.js`, `storage.js`, `app.js`).

---

## 🎓 About the Assignment
Created as an **Interactive Media Arts (IMA)** creative coding project exploring time, shared spaces, generative animation, and user data persistence.

