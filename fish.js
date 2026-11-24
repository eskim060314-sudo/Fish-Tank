/**
 * FISH TANK — Fish Entity & Rendering Class
 * 
 * Defines the Fish class:
 * - Pixel-art / retro styling using p5.js drawing primitives
 * - Procedural swimming physics and personality behaviors
 * - Tail wagging and fin flapping animations
 * - Food detection and bubble generation
 * - Accurate click hit-testing for opening fish profiles
 */

// Color palettes for the 6 selectable fish colors
const FISH_COLOR_PALETTES = {
  pink: {
    body: "#FF8BA7",
    highlight: "#FFCCD5",
    belly: "#FFF0F3",
    fin: "#E06D8A",
    finShadow: "#C44569",
    outline: "#2E4A62"
  },
  blue: {
    body: "#54A0FF",
    highlight: "#98CBFF",
    belly: "#E5F2FF",
    fin: "#2E86DE",
    finShadow: "#1B62AB",
    outline: "#2E4A62"
  },
  yellow: {
    body: "#FECA57",
    highlight: "#FFEAA7",
    belly: "#FFF9E6",
    fin: "#F39C12",
    finShadow: "#D68910",
    outline: "#2E4A62"
  },
  orange: {
    body: "#FF9F43",
    highlight: "#FECB89",
    belly: "#FFF3E6",
    fin: "#EE5253",
    finShadow: "#C0392B",
    outline: "#2E4A62"
  },
  purple: {
    body: "#A55EEA",
    highlight: "#D1A5FF",
    belly: "#F5EDFF",
    fin: "#8854D0",
    finShadow: "#6C3483",
    outline: "#2E4A62"
  },
  green: {
    body: "#1DD1A1",
    highlight: "#55EFC4",
    belly: "#E8FAF4",
    fin: "#10AC84",
    finShadow: "#0E8A6A",
    outline: "#2E4A62"
  }
};

// Size configurations: base width, height, scale
const FISH_SIZE_CONFIGS = {
  small: { scale: 0.75, width: 38, height: 24, hitRadius: 24 },
  medium: { scale: 1.0, width: 52, height: 32, hitRadius: 32 },
  large: { scale: 1.35, width: 68, height: 42, hitRadius: 42 }
};

class Fish {
  /**
   * Constructs a new animated Fish instance.
   * @param {Object} data - Fish data object (id, name, color, size, personality, owner, occupation, createdAt)
   * @param {number} startX - Initial X position in the aquarium
   * @param {number} startY - Initial Y position in the aquarium
   */
  constructor(data, startX = 200, startY = 200) {
    // Core data properties
    this.id = data.id || "fish-" + Math.random().toString(36).substring(2, 9);
    this.name = data.name || "Unnamed Fish";
    this.color = (data.color || "blue").toLowerCase();
    this.size = (data.size || "medium").toLowerCase();
    this.personality = (data.personality || "lazy").toLowerCase();
    this.owner = data.owner || "Anonymous";
    this.occupation = data.occupation || "Full-Time Swimmer";
    this.createdAt = data.createdAt || new Date().toISOString();

    // Lookups
    this.palette = FISH_COLOR_PALETTES[this.color] || FISH_COLOR_PALETTES.blue;
    this.sizeConfig = FISH_SIZE_CONFIGS[this.size] || FISH_SIZE_CONFIGS.medium;

    // Movement & physics variables
    this.x = startX;
    this.y = startY;
    this.facingDir = Math.random() < 0.5 ? 1 : -1; // 1 = facing right, -1 = facing left
    this.targetFacingDir = this.facingDir;
    this.turnInterpolation = 1.0; // Smooth horizontal turning flip
    
    // Personality-based parameters
    this.setupPersonalityParameters();

    // Initial velocities (ensure non-zero movement right from frame 1)
    this.vx = this.facingDir * this.baseSpeed;
    this.vy = (Math.random() - 0.5) * 1.0;

    // Animation timers
    this.tailTimer = Math.random() * 100;
    this.finTimer = Math.random() * 100;
    this.somersaultTimer = 0;
    this.isSomersaulting = false;
    this.isUpsideDown = false;
    this.isNapping = false;
    this.napTimer = 0;
    this.wanderTimer = Math.floor(Math.random() * 40);

    // Food seeking state
    this.targetFood = null;
    this.foodChompTimer = 0;

    // Bubble timer
    this.bubbleCooldown = Math.floor(150 + Math.random() * 200);

    // Visual selection highlight
    this.isSelected = false;
    this.hovered = false;
  }

  /**
   * Initializes specific swim speed and behavioral traits based on fish personality.
   */
  setupPersonalityParameters() {
    switch (this.personality) {
      case "lazy":
        this.baseSpeed = 1.3;
        this.tailSpeed = 0.09;
        this.wanderInterval = 120;
        this.verticalWobble = 0.6;
        break;

      case "energetic":
        this.baseSpeed = 3.6;
        this.tailSpeed = 0.25;
        this.wanderInterval = 45;
        this.verticalWobble = 1.1;
        break;

      case "dramatic":
        this.baseSpeed = 2.4;
        this.tailSpeed = 0.16;
        this.wanderInterval = 75;
        this.verticalWobble = 1.8;
        break;

      case "angry":
        this.baseSpeed = 3.0;
        this.tailSpeed = 0.22;
        this.wanderInterval = 50;
        this.verticalWobble = 0.6;
        break;

      case "silly":
        this.baseSpeed = 2.3;
        this.tailSpeed = 0.17;
        this.wanderInterval = 65;
        this.verticalWobble = 1.5;
        break;

      case "shy":
        this.baseSpeed = 1.8;
        this.tailSpeed = 0.12;
        this.wanderInterval = 90;
        this.verticalWobble = 0.6;
        break;

      default:
        this.baseSpeed = 2.0;
        this.tailSpeed = 0.14;
        this.wanderInterval = 80;
        this.verticalWobble = 0.8;
        break;
    }

    this.currentSpeed = this.baseSpeed;
    this.vx = this.facingDir * this.currentSpeed;
  }

  /**
   * Updates fish position, boundaries, animation timers, and reactions.
   * @param {number} tankWidth - Width of the aquarium in pixels
   * @param {number} tankHeight - Height of the aquarium in pixels
   * @param {Array} foodList - Array of active food pellets
   * @param {Object} mousePos - {x, y} mouse position
   * @returns {Object|null} New bubble particle if spawned, else null
   */
  update(tankWidth, tankHeight, foodList = [], mousePos = null) {
    // Top surface margin and bottom sand margin
    const topMargin = 40;
    const sandMargin = 75;
    const sideMargin = 35;

    const w = tankWidth || 800;
    const h = tankHeight || 500;

    // Boundary constraints with safety clamping
    const minY = topMargin;
    const maxY = Math.max(minY + 60, h - sandMargin);
    const minX = sideMargin;
    const maxX = Math.max(minX + 60, w - sideMargin);

    // Personality special quirks: Shy fish prefers lower depth
    let preferredMinY = minY;
    if (this.personality === "shy") {
      preferredMinY = Math.min(maxY - 40, h * 0.45);
    }

    // 1. Food reaction: seek closest food pellet if nearby
    this.checkFoodAttraction(foodList);

    // 2. Mouse avoidance for Shy fish
    if (this.personality === "shy" && mousePos) {
      const dMouse = Math.hypot(this.x - mousePos.x, this.y - mousePos.y);
      if (dMouse < 130 && dMouse > 0) {
        // Dart away quickly from mouse
        const escapeAngle = Math.atan2(this.y - mousePos.y, this.x - mousePos.x);
        this.vx = Math.cos(escapeAngle) * 3.5;
        this.vy = Math.sin(escapeAngle) * 2.5;
        this.targetFacingDir = this.vx >= 0 ? 1 : -1;
      }
    }

    // 3. Lazy fish occasional napping (drifts with water current)
    if (this.personality === "lazy") {
      this.napTimer++;
      if (!this.isNapping && this.napTimer > 360 && Math.random() < 0.01) {
        this.isNapping = true;
        this.napTimer = 0;
      } else if (this.isNapping && this.napTimer > 100) {
        this.isNapping = false;
        this.napTimer = 0;
      }
    }

    // 4. Dramatic fish occasional theatrical somersault
    if (this.personality === "dramatic" && !this.targetFood) {
      if (!this.isSomersaulting && Math.random() < 0.005) {
        this.isSomersaulting = true;
        this.somersaultTimer = 0;
      }
      if (this.isSomersaulting) {
        this.somersaultTimer += 0.14;
        if (this.somersaultTimer >= Math.PI * 2) {
          this.isSomersaulting = false;
          this.somersaultTimer = 0;
        }
      }
    }

    // 5. Silly fish occasional upside-down swim
    if (this.personality === "silly" && !this.targetFood) {
      if (Math.random() < 0.003) {
        this.isUpsideDown = !this.isUpsideDown;
      }
    } else {
      this.isUpsideDown = false;
    }

    // 6. Natural wandering logic when not chasing food
    if (!this.targetFood) {
      this.wanderTimer++;
      if (this.wanderTimer > this.wanderInterval) {
        this.wanderTimer = 0;
        
        // Randomly adjust direction or speed
        if (Math.random() < 0.35) {
          this.targetFacingDir = -this.targetFacingDir;
        }

        const speedVar = 0.85 + Math.random() * 0.35;
        this.currentSpeed = this.baseSpeed * speedVar;
        this.vx = this.targetFacingDir * this.currentSpeed;

        // Vertical drift
        this.vy = (Math.random() - 0.5) * this.verticalWobble * 1.5;
      }
    }

    // Smooth horizontal turning flip interpolation
    if (this.turnInterpolation < 1.0) {
      this.turnInterpolation += 0.15;
      if (this.turnInterpolation >= 1.0) {
        this.turnInterpolation = 1.0;
        this.facingDir = this.targetFacingDir;
      }
    } else if (this.facingDir !== this.targetFacingDir) {
      this.turnInterpolation = 0.0;
    }

    // Apply movement
    if (this.isNapping) {
      // Drifting gently with gentle current
      this.x += this.facingDir * 0.6;
      this.y += Math.sin(this.tailTimer * 0.8) * 0.4;
    } else {
      this.x += this.vx;
      this.y += this.vy + Math.sin(this.tailTimer * 1.6) * (this.verticalWobble * 0.5);
    }

    // 7. Tank boundary bounce & steering
    if (this.x < minX) {
      this.x = minX;
      this.targetFacingDir = 1;
      this.vx = Math.abs(this.vx) || this.baseSpeed;
    } else if (this.x > maxX) {
      this.x = maxX;
      this.targetFacingDir = -1;
      this.vx = -Math.abs(this.vx) || -this.baseSpeed;
    }

    if (this.y < preferredMinY) {
      this.y = preferredMinY;
      this.vy = Math.abs(this.vy) * 0.6 + 0.4;
    } else if (this.y > maxY) {
      this.y = maxY;
      this.vy = -Math.abs(this.vy) * 0.6 - 0.4;
    }

    // 8. Timers for tail wag and pectoral fin flap
    const speedMultiplier = this.isNapping ? 0.3 : (Math.abs(this.vx) / this.baseSpeed);
    this.tailTimer += this.tailSpeed * Math.max(0.4, speedMultiplier);
    this.finTimer += 0.08 * Math.max(0.4, speedMultiplier);

    // 9. Periodic bubble generation from mouth
    this.bubbleCooldown--;
    let spawnedBubble = null;
    if (this.bubbleCooldown <= 0) {
      this.bubbleCooldown = Math.floor(160 + Math.random() * 220);
      spawnedBubble = {
        x: this.x + (this.facingDir * this.sizeConfig.width * 0.55),
        y: this.y - 2,
        size: 4 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.8 - Math.random() * 0.6
      };
    }

    return spawnedBubble;
  }

  /**
   * Detects nearby food and steers the fish toward the closest pellet.
   */
  checkFoodAttraction(foodList) {
    if (!foodList || foodList.length === 0) {
      this.targetFood = null;
      return;
    }

    // Find closest food pellet within sensory radius (up to 320px)
    let closestFood = null;
    let minDist = 320;

    for (const food of foodList) {
      const d = Math.hypot(food.x - this.x, food.y - this.y);
      if (d < minDist) {
        minDist = d;
        closestFood = food;
      }
    }

    if (closestFood) {
      this.targetFood = closestFood;
      // Calculate angle towards food
      const angle = Math.atan2(closestFood.y - this.y, closestFood.x - this.x);
      const chaseSpeed = this.baseSpeed * 1.5;
      this.vx = Math.cos(angle) * chaseSpeed;
      this.vy = Math.sin(angle) * chaseSpeed;
      this.targetFacingDir = this.vx >= 0 ? 1 : -1;

      // If close enough, eat food!
      if (minDist < 18) {
        closestFood.eaten = true;
        this.targetFood = null;
        this.foodChompTimer = 25; // Brief happy chomping animation
      }
    } else {
      this.targetFood = null;
    }

    if (this.foodChompTimer > 0) {
      this.foodChompTimer--;
    }
  }

  /**
   * Draws the cute pixel-art style fish using p5.js canvas functions.
   * @param {Object} p - The p5 instance
   * @param {boolean} isInteractive - Whether hover / selection highlight applies
   */
  draw(p, isInteractive = true) {
    p.push();
    p.translate(this.x, this.y);

    // Apply somersault rotation if dramatic fish
    if (this.isSomersaulting) {
      p.rotate(this.somersaultTimer);
    }

    // Apply upside-down flip for silly fish
    if (this.isUpsideDown) {
      p.scale(1, -1);
    }

    // Horizontal direction scale with smooth turn flip
    const flipScale = (this.facingDir === 1 ? 1 : -1) * (0.3 + 0.7 * this.turnInterpolation);
    p.scale(flipScale * this.sizeConfig.scale, this.sizeConfig.scale);

    // Render Selection Highlight Ring if clicked or hovered
    if (this.isSelected && isInteractive) {
      p.noFill();
      p.stroke(255, 234, 167, 190);
      p.strokeWeight(3);
      p.ellipse(0, 0, 75, 48);
      // Cute twinkling sparkles
      p.fill(255, 240, 180);
      p.noStroke();
      p.ellipse(-38, -18, 5, 5);
      p.ellipse(38, 16, 4, 4);
    } else if (this.hovered && isInteractive) {
      p.noFill();
      p.stroke(255, 255, 255, 140);
      p.strokeWeight(2);
      p.ellipse(0, 0, 70, 44);
    }

    // 1. TAIL FIN (wags with tailTimer sine wave)
    const tailWagAngle = Math.sin(this.tailTimer) * 0.35;
    p.push();
    p.translate(-24, 0);
    p.rotate(tailWagAngle);

    // Tail fin triangle & retro notched back
    p.fill(this.palette.fin);
    p.stroke(this.palette.outline);
    p.strokeWeight(2.5);
    p.strokeJoin('round');
    p.beginShape();
    p.vertex(0, -3);
    p.vertex(-18, -15);
    p.vertex(-14, 0);
    p.vertex(-18, 15);
    p.vertex(0, 3);
    p.endShape('close');

    // Inner tail accent lines
    p.stroke(this.palette.finShadow);
    p.strokeWeight(1.5);
    p.line(-3, -2, -14, -8);
    p.line(-3, 0, -11, 0);
    p.line(-3, 2, -14, 8);
    p.pop();

    // 2. DORSAL FIN (Top)
    p.fill(this.palette.fin);
    p.stroke(this.palette.outline);
    p.strokeWeight(2.5);
    p.beginShape();
    p.vertex(-10, -14);
    p.vertex(4, -22);
    p.vertex(14, -14);
    p.endShape('close');

    // 3. MAIN BODY (Chubby, cute rounded retro capsule)
    p.fill(this.palette.body);
    p.stroke(this.palette.outline);
    p.strokeWeight(2.5);
    p.strokeJoin('round');
    p.ellipse(0, 0, 48, 30);

    // Belly Highlight (lighter bottom contour)
    p.noStroke();
    p.fill(this.palette.belly);
    p.arc(2, 4, 40, 20, 0, Math.PI);

    // Top Shimmer Highlight
    p.fill(this.palette.highlight);
    p.ellipse(-2, -7, 26, 6);

    // 4. PERSONALITY DETAILS & ACCESSORIES
    // Shy blush cheeks
    if (this.personality === "shy") {
      p.fill("#FF758F");
      p.noStroke();
      p.ellipse(8, 5, 8, 5);
    }

    // Angry furrowed eyebrow
    if (this.personality === "angry") {
      p.stroke(this.palette.outline);
      p.strokeWeight(2.5);
      p.line(10, -9, 19, -4);
    }

    // 5. EYE RENDERING
    const eyeX = 14;
    const eyeY = -4;

    if (this.isNapping || this.personality === "lazy" && Math.sin(this.tailTimer * 0.4) > 0.7) {
      // Sleepy closed eye (cute curved arc)
      p.stroke(this.palette.outline);
      p.strokeWeight(2.5);
      p.noFill();
      p.arc(eyeX, eyeY, 8, 8, 0, Math.PI);
      // Cute "z" sleep bubble floating
      p.fill(this.palette.outline);
      p.noStroke();
      p.textSize(8);
      p.text("z", -5, -16);
    } else {
      // Big retro shiny eye
      p.fill("#FFFFFF");
      p.stroke(this.palette.outline);
      p.strokeWeight(2);
      p.circle(eyeX, eyeY, 11);

      // Pupil
      p.fill(this.palette.outline);
      p.noStroke();
      if (this.personality === "silly") {
        // Goofy looking-up pupil
        p.circle(eyeX + 1, eyeY - 2, 5);
      } else {
        p.circle(eyeX + 1, eyeY, 5.5);
      }

      // Sparkle Highlights (Retro anime/pixel shine)
      p.fill("#FFFFFF");
      p.circle(eyeX + 2, eyeY - 1.5, 2.5);
      if (this.personality === "dramatic") {
        // Extra star shine for dramatic personality
        p.circle(eyeX - 1, eyeY + 1.5, 1.5);
      }
    }

    // 6. MOUTH
    p.stroke(this.palette.outline);
    p.strokeWeight(2);
    p.noFill();

    if (this.foodChompTimer > 0) {
      // Chomping mouth
      p.fill("#C44569");
      p.arc(24, 1, 8, 8, -Math.PI / 3, Math.PI / 3);
    } else if (this.personality === "angry") {
      // Grumpy downturned mouth
      p.arc(22, 5, 6, 6, Math.PI, Math.PI * 1.8);
    } else if (this.personality === "silly") {
      // Silly tongue blep
      p.arc(22, 2, 6, 6, 0, Math.PI);
      p.fill("#FF7675");
      p.noStroke();
      p.ellipse(23, 4, 4, 5);
    } else {
      // Gentle happy smile
      p.arc(21, 2, 6, 6, 0, Math.PI * 0.85);
    }

    // 7. PECTORAL FIN (Front side fin, flaps smoothly)
    const finFlap = Math.sin(this.finTimer) * 0.4;
    p.push();
    p.translate(-2, 3);
    p.rotate(finFlap);
    p.fill(this.palette.fin);
    p.stroke(this.palette.outline);
    p.strokeWeight(2);
    p.ellipse(0, 0, 14, 9);
    p.pop();

    p.pop();
  }

  /**
   * Hit-testing: checks if a given canvas coordinate (mx, my) lands on this fish.
   * Uses radius calculated from fish size config.
   * @param {number} mx - Mouse X
   * @param {number} my - Mouse Y
   * @returns {boolean} True if inside fish bounds
   */
  containsPoint(mx, my) {
    const radius = this.sizeConfig.hitRadius;
    const dist = Math.hypot(mx - this.x, my - this.y);
    return dist <= radius;
  }
}

// Make available globally
window.Fish = Fish;
window.FISH_COLOR_PALETTES = FISH_COLOR_PALETTES;
window.FISH_SIZE_CONFIGS = FISH_SIZE_CONFIGS;

