/**
 * FISH TANK — Main Application Controller & UI Interactions
 * 
 * Coordinates:
 * - Aquarium engine and storage manager lifecycle
 * - Modal management (Add Fish, Profile, Directory, About)
 * - Live fish preview renderer in the creation dialog
 * - Input validation and sanitization
 * - Feeding interactions and toast notifications
 * - Responsive rendering and empty/loading state transitions
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const aquariumContainer = document.getElementById("canvasWrapper");
  const emptyTankOverlay = document.getElementById("emptyTankOverlay");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const emptyAddFishBtn = document.getElementById("emptyAddFishBtn");
  const residentCounterBadge = document.getElementById("counterText");
  const directoryResidentsCounter = document.getElementById("directoryResidentsCounter");
  const storageBadgeIcon = document.getElementById("storageBadgeIcon");
  const storageBadgeText = document.getElementById("storageBadgeText");
  const storageModeBadge = document.getElementById("storageModeBadge");

  // Navigation Buttons
  const openAddFishBtn = document.getElementById("openAddFishBtn");
  const openDirectoryBtn = document.getElementById("openDirectoryBtn");
  const openAboutBtn = document.getElementById("openAboutBtn");
  const navFeedFishBtn = document.getElementById("navFeedFishBtn");
  const tankFeedBtn = document.getElementById("tankFeedBtn");
  const clearTankBtn = document.getElementById("clearTankBtn");

  // Modals
  const addFishModal = document.getElementById("addFishModal");
  const fishProfileModal = document.getElementById("fishProfileModal");
  const directoryModal = document.getElementById("directoryModal");
  const aboutModal = document.getElementById("aboutModal");

  // Creation Form Elements
  const createFishForm = document.getElementById("createFishForm");
  const fishNameInput = document.getElementById("fishNameInput");
  const nameCharCount = document.getElementById("nameCharCount");
  const nameError = document.getElementById("nameError");
  const colorPickerGroup = document.getElementById("colorPickerGroup");
  const sizePickerGroup = document.getElementById("sizePickerGroup");
  const personalityPickerGroup = document.getElementById("personalityPickerGroup");
  const ownerNameInput = document.getElementById("ownerNameInput");
  const submitFishBtn = document.getElementById("submitFishBtn");
  const previewPersonalityHint = document.getElementById("previewPersonalityHint");

  // Directory Elements
  const directoryGrid = document.getElementById("directoryGrid");
  const directorySearchInput = document.getElementById("directorySearchInput");
  const directoryFilterPills = document.getElementById("directoryFilterPills");
  const directoryEmptyMsg = document.getElementById("directoryEmptyMsg");

  // Profile Elements
  const profileName = document.getElementById("profileName");
  const profileColor = document.getElementById("profileColor");
  const profileSize = document.getElementById("profileSize");
  const profilePersonality = document.getElementById("profilePersonality");
  const profileOwner = document.getElementById("profileOwner");
  const profileOccupation = document.getElementById("profileOccupation");
  const profileBorn = document.getElementById("profileBorn");
  const profileFollowBtn = document.getElementById("profileFollowBtn");
  const profileAvatarBox = document.getElementById("profileAvatarBox");

  // Toast Container
  const toastContainer = document.getElementById("toastContainer");

  // Current Form State
  let currentFormState = {
    name: "",
    color: "pink",
    size: "medium",
    personality: "lazy",
    owner: ""
  };

  let currentlySelectedFish = null;
  let activeDirectoryColorFilter = "all";

  /* ------------------------------------------------------------------------
     1. Initialize Aquarium & Storage
     ------------------------------------------------------------------------ */
  const aquarium = new AquariumEngine("canvasWrapper");

  // Handle clicking on a fish in the aquarium
  aquarium.onFishClick = (fishData) => {
    openFishProfile(fishData);
  };

  // Handle empty tank indicator
  aquarium.onEmptyStateChange = (isEmpty) => {
    if (isEmpty) {
      emptyTankOverlay.classList.remove("hidden");
    } else {
      emptyTankOverlay.classList.add("hidden");
    }
  };

  // Subscribe aquarium and UI to storage updates
  window.fishStorage.subscribe((allFish) => {
    // Sync aquarium entities
    aquarium.syncFishData(allFish);

    // Update counter pill and directory counter
    const count = allFish.length;
    residentCounterBadge.textContent = `RESIDENTS: ${count}`;
    directoryResidentsCounter.textContent = `CURRENT RESIDENTS: ${count} FISH`;

    // Refresh directory if modal is open
    if (!directoryModal.classList.contains("hidden")) {
      renderDirectoryCards();
    }
  });

  // Initialize storage (Firestore or LocalStorage)
  const storageResult = await window.fishStorage.init();

  // Update storage badge indicator
  if (storageResult.mode === "firebase") {
    storageBadgeIcon.textContent = "🔥";
    storageBadgeText.textContent = "Firestore Live";
    storageModeBadge.classList.add("live");
    storageModeBadge.title = "Connected to Firebase Cloud Firestore with real-time sync";

    // Update About modal database card
    const aboutTitle = document.getElementById("aboutFbTitle");
    const aboutDesc = document.getElementById("aboutFbDescription");
    if (aboutTitle) aboutTitle.textContent = "Database Status: Firebase Cloud Firestore (Live)";
    if (aboutDesc) aboutDesc.textContent = "Your fish are syncing live across all visitors!";
  } else {
    storageBadgeIcon.textContent = "💾";
    storageBadgeText.textContent = "Local Mode";
    storageModeBadge.title = "Operating in local browser storage mode (Firebase not configured yet)";
  }

  // Hide loading overlay smoothly
  setTimeout(() => {
    loadingOverlay.style.opacity = "0";
    setTimeout(() => {
      loadingOverlay.classList.add("hidden");
    }, 300);
  }, 450);

  /* ------------------------------------------------------------------------
     2. Live Preview Canvas in Creation Modal
     ------------------------------------------------------------------------ */
  let previewP5 = null;
  let previewFishInstance = null;

  function initPreviewCanvas() {
    if (previewP5) return;

    const sketch = (p) => {
      p.setup = () => {
        const canvas = p.createCanvas(180, 140);
        canvas.parent("previewCanvasContainer");
        p.frameRate(60);

        previewFishInstance = new Fish({
          id: "preview-fish",
          name: "Preview",
          color: currentFormState.color,
          size: currentFormState.size,
          personality: currentFormState.personality
        }, 90, 70);
      };

      p.draw = () => {
        p.clear();
        if (previewFishInstance) {
          // Keep centered in preview box
          previewFishInstance.x = 90;
          previewFishInstance.y = 70 + Math.sin(p.frameCount * 0.05) * 4;
          previewFishInstance.tailTimer += previewFishInstance.tailSpeed;
          previewFishInstance.finTimer += 0.08;
          previewFishInstance.draw(p, false);
        }
      };
    };

    previewP5 = new p5(sketch);
  }

  function updatePreviewFish() {
    if (!previewFishInstance) return;

    previewFishInstance.color = currentFormState.color;
    previewFishInstance.size = currentFormState.size;
    previewFishInstance.personality = currentFormState.personality;
    previewFishInstance.palette = window.FISH_COLOR_PALETTES[currentFormState.color];
    previewFishInstance.sizeConfig = window.FISH_SIZE_CONFIGS[currentFormState.size];
    previewFishInstance.setupPersonalityParameters();

    // Update personality hint text
    const hints = {
      lazy: "“Swims slowly and takes peaceful naps.” 💤",
      dramatic: "“Majestic vertical swoops and somersaults!” 🎭",
      angry: "“Speedy, snappy turns with determination.” 💢",
      silly: "“Wobbly swimming and goofy upside-down spins!” 🤪",
      shy: "“Prefers the quiet bottom sand and plants.” 🙈",
      energetic: "“Non-stop zooming around the tank!” ⚡"
    };
    previewPersonalityHint.textContent = hints[currentFormState.personality] || "";
  }

  /* ------------------------------------------------------------------------
     3. Modal Management (Open & Close)
     ------------------------------------------------------------------------ */
  function openModal(modal) {
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Prevent background scroll
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    aquarium.clearSelection();
  }

  // Global close button handler
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-close");
      const targetModal = document.getElementById(targetId);
      if (targetModal) closeModal(targetModal);
    });
  });

  // Close modals when clicking backdrop
  [addFishModal, fishProfileModal, directoryModal, aboutModal].forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });

  // Close modals when pressing Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      [addFishModal, fishProfileModal, directoryModal, aboutModal].forEach(modal => {
        if (!modal.classList.contains("hidden")) {
          closeModal(modal);
        }
      });
    }
  });

  // Soft, cheerful retro sound synthesizer (Web Audio API, zero external files)
  function playRetroBloop(type = "bloop") {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "feed") {
        // High gentle chime for feeding
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.14); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.24);
      } else if (type === "release") {
        // Happy ascending splash for releasing fish
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.09, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.36);
      } else {
        // Soft bubble bloop
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.09);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      }
    } catch {
      // AudioContext unavailable or blocked - silent fallback
    }
  }

  // Open Add Fish Modal
  function handleOpenAddFish() {
    initPreviewCanvas();
    updatePreviewFish();
    openModal(addFishModal);
    setTimeout(() => fishNameInput.focus(), 100);
  }

  openAddFishBtn.addEventListener("click", handleOpenAddFish);
  emptyAddFishBtn.addEventListener("click", handleOpenAddFish);

  // Open Directory Modal
  openDirectoryBtn.addEventListener("click", () => {
    openModal(directoryModal);
    renderDirectoryCards();
  });

  // Open About Modal
  openAboutBtn.addEventListener("click", () => {
    openModal(aboutModal);
  });

  // Storage badge click: open about modal to inspect status
  storageModeBadge.addEventListener("click", () => {
    openModal(aboutModal);
  });

  /* ------------------------------------------------------------------------
     4. Form Customization Interactions
     ------------------------------------------------------------------------ */

  // Name input counter & live sanitization
  fishNameInput.addEventListener("input", (e) => {
    const val = e.target.value;
    nameCharCount.textContent = `${val.length}/20`;
    if (val.trim().length > 0) {
      nameError.textContent = "";
    }
  });

  // Color Swatch Selection
  colorPickerGroup.querySelectorAll(".color-swatch-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      colorPickerGroup.querySelectorAll(".color-swatch-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFormState.color = btn.getAttribute("data-color");
      updatePreviewFish();
    });
  });

  // Size Picker Selection
  sizePickerGroup.querySelectorAll(".pill-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      sizePickerGroup.querySelectorAll(".pill-choice").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFormState.size = btn.getAttribute("data-size");
      updatePreviewFish();
    });
  });

  // Personality Picker Selection
  personalityPickerGroup.querySelectorAll(".personality-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      personalityPickerGroup.querySelectorAll(".personality-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFormState.personality = btn.getAttribute("data-personality");
      updatePreviewFish();
    });
  });

  // Form Submission: "RELEASE INTO THE TANK!"
  createFishForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawName = fishNameInput.value.trim();

    // 1. Validate inputs
    if (!rawName) {
      nameError.textContent = "Please name your fish!";
      fishNameInput.focus();
      return;
    }

    if (rawName.length > 20) {
      nameError.textContent = "Name cannot exceed 20 characters.";
      return;
    }

    // Prevent duplicate submissions while saving
    submitFishBtn.disabled = true;
    submitFishBtn.innerHTML = '<span class="btn-icon">🫧</span> Releasing...';

    // 2. Create fish object
    const rawOwner = ownerNameInput.value.trim();
    const fishData = {
      name: escapeHtml(rawName),
      color: currentFormState.color,
      size: currentFormState.size,
      personality: currentFormState.personality,
      owner: rawOwner ? escapeHtml(rawOwner) : "Anonymous",
      createdAt: new Date().toISOString()
    };

    try {
      // 3. Save fish data
      const savedFish = await window.fishStorage.saveFish(fishData);

      // 4. Close popup
      closeModal(addFishModal);

      // 5. Reset form
      fishNameInput.value = "";
      nameCharCount.textContent = "0/20";
      ownerNameInput.value = "";

      // 6. Display new fish swimming & celebrate
      aquarium.celebrateNewFish(savedFish.id);
      playRetroBloop("release");

      // 7. Show confirmation toast
      showToast("Your fish has joined the tank! 🐟✨");
    } catch (err) {
      console.error("Save error:", err);
      showToast("Could not release fish. Please try again.");
    } finally {
      submitFishBtn.disabled = false;
      submitFishBtn.innerHTML = '<span class="btn-icon">🌊</span> RELEASE INTO THE TANK!';
    }
  });

  /* ------------------------------------------------------------------------
     5. Fish Profile Card
     ------------------------------------------------------------------------ */
  let profileAvatarP5 = null;
  let profileFishInstance = null;

  function openFishProfile(fish) {
    if (!fish) return;
    currentlySelectedFish = fish;

    profileName.textContent = fish.name || "Unnamed Fish";
    profileColor.textContent = capitalize(fish.color);
    profileSize.textContent = capitalize(fish.size);
    profilePersonality.textContent = capitalize(fish.personality);
    profileOwner.textContent = fish.owner || "Anonymous";
    profileOccupation.textContent = fish.occupation || "Full-Time Swimmer";
    profileBorn.textContent = formatDate(fish.createdAt);

    // Render avatar canvas in profile
    renderProfileAvatar(fish);

    openModal(fishProfileModal);
  }

  function renderProfileAvatar(fish) {
    if (!profileAvatarP5) {
      profileAvatarBox.innerHTML = "";
      const sketch = (p) => {
        p.setup = () => {
          const canvas = p.createCanvas(200, 140);
          canvas.parent("profileAvatarBox");
          p.frameRate(60);

          profileFishInstance = new Fish(fish, 100, 70);
        };

        p.draw = () => {
          p.clear();
          if (profileFishInstance) {
            profileFishInstance.x = 100;
            profileFishInstance.y = 70 + Math.sin(p.frameCount * 0.05) * 5;
            profileFishInstance.tailTimer += profileFishInstance.tailSpeed;
            profileFishInstance.finTimer += 0.08;
            profileFishInstance.draw(p, false);
          }
        };
      };
      profileAvatarP5 = new p5(sketch);
    } else {
      profileFishInstance = new Fish(fish, 100, 70);
    }
  }

  // Watch Swim button: closes profile and highlights fish in tank
  profileFollowBtn.addEventListener("click", () => {
    if (currentlySelectedFish) {
      aquarium.selectFish(currentlySelectedFish.id);
      closeModal(fishProfileModal);
      showToast(`Watching ${currentlySelectedFish.name} swim! 🌊`);
    }
  });

  /* ------------------------------------------------------------------------
     6. Fish Directory
     ------------------------------------------------------------------------ */
  function renderDirectoryCards() {
    const allFish = window.fishStorage.getAllFish();
    const query = directorySearchInput.value.toLowerCase().trim();

    // Filter by search query & color filter
    const filtered = allFish.filter(fish => {
      const matchesSearch = 
        fish.name.toLowerCase().includes(query) ||
        (fish.owner && fish.owner.toLowerCase().includes(query)) ||
        fish.personality.toLowerCase().includes(query);

      const matchesColor = 
        activeDirectoryColorFilter === "all" ||
        fish.color.toLowerCase() === activeDirectoryColorFilter;

      return matchesSearch && matchesColor;
    });

    directoryGrid.innerHTML = "";

    if (filtered.length === 0) {
      directoryEmptyMsg.classList.remove("hidden");
    } else {
      directoryEmptyMsg.classList.add("hidden");

      filtered.forEach(fish => {
        const card = document.createElement("div");
        card.className = "fish-directory-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");

        const personalityIcons = {
          lazy: "💤",
          dramatic: "🎭",
          angry: "💢",
          silly: "🤪",
          shy: "🙈",
          energetic: "⚡"
        };
        const pIcon = personalityIcons[fish.personality.toLowerCase()] || "🐟";

        card.innerHTML = `
          <div class="card-fish-canvas-box"></div>
          <div class="card-title-row">
            <span class="card-fish-name" title="${fish.name}">${fish.name}</span>
            <span class="card-personality-badge">${pIcon} ${capitalize(fish.personality)}</span>
          </div>
          <div class="card-meta">
            <div>By: <strong>${fish.owner || "Anonymous"}</strong></div>
            <div>Born: ${formatShortDate(fish.createdAt)}</div>
          </div>
        `;

        card.addEventListener("click", () => {
          closeModal(directoryModal);
          openFishProfile(fish);
        });

        directoryGrid.appendChild(card);

        // Draw mini fish thumbnail into the card canvas box
        const canvasBox = card.querySelector(".card-fish-canvas-box");
        drawCardThumbnail(canvasBox, fish);
      });
    }
  }

  // Draw a static cute mini thumbnail for a directory card
  function drawCardThumbnail(box, fish) {
    if (!box) return;

    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 90;
    box.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    // Simple, lightweight canvas 2D rendering for crisp directory thumbnails
    const palette = window.FISH_COLOR_PALETTES[fish.color.toLowerCase()] || window.FISH_COLOR_PALETTES.blue;
    const cx = 90;
    const cy = 45;
    const sizeScale = fish.size === "small" ? 0.75 : (fish.size === "large" ? 1.25 : 1.0);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sizeScale, sizeScale);

    // Tail fin
    ctx.fillStyle = palette.fin;
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(-32, -13);
    ctx.lineTo(-27, 0);
    ctx.lineTo(-32, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.fillStyle = palette.body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Belly
    ctx.fillStyle = palette.belly;
    ctx.beginPath();
    ctx.arc(1, 2, 20, 0, Math.PI);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(7, -2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = palette.outline;
    ctx.beginPath();
    ctx.arc(8, -2, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(9, -3, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(11, 2, 3, 0, Math.PI * 0.9);
    ctx.stroke();

    ctx.restore();
  }

  // Directory search filter
  directorySearchInput.addEventListener("input", () => {
    renderDirectoryCards();
  });

  // Directory color filter pills
  directoryFilterPills.querySelectorAll(".filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      directoryFilterPills.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activeDirectoryColorFilter = pill.getAttribute("data-filter");
      renderDirectoryCards();
    });
  });

  /* ------------------------------------------------------------------------
     7. Feeding Interaction
     ------------------------------------------------------------------------ */
  function handleFeedTheFish() {
    aquarium.dropFood();
    playRetroBloop("feed");
    showToast("The fish are very pleased. 🐟✨");
  }

  navFeedFishBtn.addEventListener("click", handleFeedTheFish);
  tankFeedBtn.addEventListener("click", handleFeedTheFish);

  /* ------------------------------------------------------------------------
     8. Demo Reset (localStorage)
     ------------------------------------------------------------------------ */
  clearTankBtn.addEventListener("click", () => {
    if (confirm("Reset demo fish back to default starter residents?")) {
      window.fishStorage.resetLocalDemo();
      showToast("Demo tank reset! 🐠");
    }
  });

  /* ------------------------------------------------------------------------
     9. Toast Notification System
     ------------------------------------------------------------------------ */
  function showToast(message, duration = 2800) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, duration);
  }

  /* ------------------------------------------------------------------------
     10. Helper Utilities
     ------------------------------------------------------------------------ */
  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatDate(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return "November 23, 2026";
    }
  }

  function formatShortDate(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return "Recent";
    }
  }

  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
});
