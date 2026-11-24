/**
 * FISH TANK — p5.js Aquarium Sketch & Environment Engine
 * 
 * Manages:
 * - Responsive p5.js canvas rendering inside the aquarium container
 * - Cozy retro underwater atmosphere: water gradient, caustic light rays,
 *   waving kelp/seaweed plants, sandy bottom dunes, shells, starfish, and rocks
 * - Ambient bubble particle system
 * - Food flake particle simulation & fish feeding mechanics
 * - Fish lifecycle: synchronization with storage, max animation limit,
 *   hover detection, and click-to-profile selection
 */

class AquariumEngine {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.p5Instance = null;
    
    // Fish management
    this.activeFish = []; // Array of Fish class instances swimming in the tank
    this.allFishData = []; // Full raw data array from storage
    this.maxAnimatedFish = 28; // Performance guard to maintain 60fps on mobile/tablets
    this.selectedFishId = null;

    // Environmental entities
    this.ambientBubbles = [];
    this.foodParticles = [];
    this.kelpPlants = [];
    this.seabedDecorations = [];
    this.causticRays = [];

    // Interaction callbacks
    this.onFishClick = null;
    this.onEmptyStateChange = null;

    this.initP5();
  }

  /**
   * Initializes p5.js in instance mode for modularity and isolation.
   */
  initP5() {
    const sketch = (p) => {
      this.p = p;

      p.setup = () => {
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 500;
        const canvas = p.createCanvas(width, height);
        canvas.parent(this.containerId);
        p.frameRate(60);

        this.generateEnvironment(width, height);
      };

      p.windowResized = () => {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width && height) {
          p.resizeCanvas(width, height);
          this.generateEnvironment(width, height);
        }
      };

      p.draw = () => {
        // Ensure canvas dimensions synchronize dynamically if container resolves after CSS load
        if (this.container && this.container.clientWidth > 50 && this.container.clientHeight > 50) {
          if (Math.abs(p.width - this.container.clientWidth) > 5 || Math.abs(p.height - this.container.clientHeight) > 5) {
            p.resizeCanvas(this.container.clientWidth, this.container.clientHeight);
            this.generateEnvironment(this.container.clientWidth, this.container.clientHeight);
          }
        }

        p.clear();

        // 1. Draw water background gradient & sunbeam caustics
        this.drawWaterBackground(p);

        // 2. Draw back layer of kelp plants
        this.drawKelpLayer(p, 0);

        // 3. Update & render ambient bubbles
        this.updateAndDrawBubbles(p);

        // 4. Update & render falling food flakes
        this.updateAndDrawFood(p);

        // 5. Update & render swimming fish
        this.updateAndDrawFish(p);

        // 6. Draw front layer of kelp plants & sandy seabed with decorations
        this.drawKelpLayer(p, 1);
        this.drawSandySeabed(p);
      };

      // Mouse click on canvas: check if clicked a fish, else drop food flake
      p.mouseClicked = () => {
        // Ensure click originated inside this canvas
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) {
          return;
        }

        // Check fish hit test (frontmost first)
        let clickedFish = null;
        for (let i = this.activeFish.length - 1; i >= 0; i--) {
          const fish = this.activeFish[i];
          if (fish.containsPoint(p.mouseX, p.mouseY)) {
            clickedFish = fish;
            break;
          }
        }

        if (clickedFish) {
          this.selectFish(clickedFish.id);
          if (typeof this.onFishClick === "function") {
            const rawData = this.allFishData.find(d => d.id === clickedFish.id) || clickedFish;
            this.onFishClick(rawData);
          }
        } else {
          // Clicking empty water drops a food pellet right there!
          this.dropFood(p.mouseX, p.mouseY);
          // Also spawn a small water ripple bubble
          this.spawnClickRipples(p.mouseX, p.mouseY);
        }
      };
    };

    this.p5Instance = new p5(sketch);
  }

  /**
   * Generates procedural seabed hills, decorative shells, rocks, and swaying kelp.
   */
  generateEnvironment(w, h) {
    // Generate layered kelp stalks
    this.kelpPlants = [];
    const kelpCount = Math.max(7, Math.floor(w / 110));
    for (let i = 0; i < kelpCount; i++) {
      this.kelpPlants.push({
        x: (i / kelpCount) * w + (Math.random() * 40 - 20),
        baseY: h - 25,
        height: 120 + Math.random() * 110,
        swaySpeed: 0.02 + Math.random() * 0.015,
        swayOffset: Math.random() * Math.PI * 2,
        layer: i % 2, // 0 = back layer, 1 = front layer
        color: i % 2 === 0 ? "#48C9B0" : "#1ABC9C",
        width: 14 + Math.random() * 6
      });
    }

    // Generate decorative seabed rocks and shells
    this.seabedDecorations = [];
    const decorCount = Math.max(6, Math.floor(w / 140));
    for (let i = 0; i < decorCount; i++) {
      const type = Math.random() < 0.4 ? "shell" : (Math.random() < 0.7 ? "pebble" : "starfish");
      this.seabedDecorations.push({
        x: (i / decorCount) * w + Math.random() * 50,
        y: h - 20 - Math.random() * 20,
        type: type,
        size: 10 + Math.random() * 12,
        color: type === "shell" ? "#FFF3B0" : (type === "starfish" ? "#FF8BA7" : "#A2B9C6")
      });
    }

    // Seed ambient rising bubbles
    this.ambientBubbles = [];
    for (let i = 0; i < 18; i++) {
      this.ambientBubbles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 3 + Math.random() * 7,
        speedY: 0.6 + Math.random() * 0.9,
        wobbleOffset: Math.random() * 100,
        wobbleSpeed: 0.03 + Math.random() * 0.02
      });
    }

    // Sunbeam light rays
    this.causticRays = [];
    for (let i = 0; i < 5; i++) {
      this.causticRays.push({
        x: (w * 0.15) + (i * (w * 0.18)),
        width: 40 + Math.random() * 35,
        alphaPhase: Math.random() * Math.PI * 2,
        speed: 0.015 + Math.random() * 0.01
      });
    }
  }

  /**
   * Draws the water gradient and shimmering atmospheric light shafts.
   */
  drawWaterBackground(p) {
    // Soft light-turquoise to deeper gentle blue water gradient
    for (let y = 0; y < p.height; y += 4) {
      const inter = y / p.height;
      // Interpolate between top water #D7F3FE and bottom water #6EC0D8
      const r = p.lerp(215, 110, inter);
      const g = p.lerp(243, 192, inter);
      const b = p.lerp(254, 216, inter);
      p.noStroke();
      p.fill(r, g, b);
      p.rect(0, y, p.width, 4);
    }

    // Gentle sunbeam light rays shimmering down
    for (const ray of this.causticRays) {
      ray.alphaPhase += ray.speed;
      const alpha = 18 + Math.sin(ray.alphaPhase) * 10;
      p.noStroke();
      p.fill(255, 255, 255, alpha);
      p.beginShape();
      p.vertex(ray.x, 0);
      p.vertex(ray.x + ray.width, 0);
      p.vertex(ray.x + ray.width * 1.8 + 50, p.height);
      p.vertex(ray.x - 20, p.height);
      p.endShape(p.CLOSE);
    }
  }

  /**
   * Draws swaying kelp plants with smooth sine curves.
   */
  drawKelpLayer(p, targetLayer) {
    for (const kelp of this.kelpPlants) {
      if (kelp.layer !== targetLayer) continue;

      p.push();
      p.noStroke();
      p.fill(kelp.color);

      // Draw waving kelp stalk using vertices
      p.beginShape();
      const segments = 9;
      const segHeight = kelp.height / segments;

      for (let s = 0; s <= segments; s++) {
        const segY = kelp.baseY - (s * segHeight);
        const swayAmount = Math.sin(p.frameCount * kelp.swaySpeed + kelp.swayOffset + s * 0.4) * (s * 3.2);
        p.curveVertex(kelp.x + swayAmount, segY);
      }
      p.endShape();

      // Draw little rounded leaves along the stalk
      for (let s = 1; s < segments; s++) {
        const segY = kelp.baseY - (s * segHeight);
        const sway = Math.sin(p.frameCount * kelp.swaySpeed + kelp.swayOffset + s * 0.4) * (s * 3.2);
        const leafDir = s % 2 === 0 ? 1 : -1;
        p.ellipse(kelp.x + sway + (leafDir * 10), segY, kelp.width, kelp.width * 0.55);
      }
      p.pop();
    }
  }

  /**
   * Draws the rolling sandy seabed and decorative pebbles/shells.
   */
  drawSandySeabed(p) {
    p.push();
    const sandHeight = 70;
    const baseSandY = p.height - sandHeight;

    // Sandy floor base curve
    p.fill("#FFEAA7");
    p.stroke("#2E4A62");
    p.strokeWeight(2.5);
    p.beginShape();
    p.vertex(0, p.height);
    p.vertex(0, baseSandY);

    for (let x = 0; x <= p.width; x += 40) {
      const duneY = baseSandY + Math.sin(x * 0.015) * 8 + Math.cos(x * 0.03) * 4;
      p.vertex(x, duneY);
    }

    p.vertex(p.width, baseSandY);
    p.vertex(p.width, p.height);
    p.endShape(p.CLOSE);

    // Sand dune accent shadow
    p.noStroke();
    p.fill(249, 202, 36, 50);
    p.rect(0, p.height - 25, p.width, 25);

    // Decorative pebbles, shells, and starfish
    for (const decor of this.seabedDecorations) {
      p.push();
      p.translate(decor.x, decor.y);
      p.stroke("#2E4A62");
      p.strokeWeight(2);
      p.fill(decor.color);

      if (decor.type === "shell") {
        p.arc(0, 0, decor.size, decor.size * 0.9, Math.PI, Math.PI * 2);
        p.line(0, 0, 0, -decor.size * 0.4);
      } else if (decor.type === "pebble") {
        p.ellipse(0, 0, decor.size, decor.size * 0.65);
      } else if (decor.type === "starfish") {
        p.noStroke();
        p.fill(decor.color);
        p.ellipse(0, 0, decor.size, decor.size);
        p.stroke("#2E4A62");
        p.strokeWeight(1.5);
        p.circle(0, 0, 4);
      }
      p.pop();
    }
    p.pop();
  }

  /**
   * Updates and draws rising ambient bubbles.
   */
  updateAndDrawBubbles(p) {
    p.push();
    p.stroke(255, 255, 255, 180);
    p.strokeWeight(1.5);
    p.fill(255, 255, 255, 80);

    for (const bubble of this.ambientBubbles) {
      bubble.y -= bubble.speedY;
      const wobble = Math.sin(p.frameCount * bubble.wobbleSpeed + bubble.wobbleOffset) * 0.8;
      bubble.x += wobble;

      p.circle(bubble.x, bubble.y, bubble.size);

      // Little shine dot inside bubble
      p.noStroke();
      p.fill(255, 255, 255, 220);
      p.circle(bubble.x - bubble.size * 0.22, bubble.y - bubble.size * 0.22, bubble.size * 0.25);
      p.stroke(255, 255, 255, 180);
      p.fill(255, 255, 255, 80);

      // Reset when reaching top water surface
      if (bubble.y < 30) {
        bubble.y = p.height - 30 - Math.random() * 40;
        bubble.x = Math.random() * p.width;
      }
    }
    p.pop();
  }

  /**
   * Updates and renders falling food flakes.
   */
  updateAndDrawFood(p) {
    p.push();
    for (let i = this.foodParticles.length - 1; i >= 0; i--) {
      const food = this.foodParticles[i];

      food.y += food.vy;
      food.x += Math.sin(food.wobblePhase) * 0.4;
      food.wobblePhase += 0.08;

      // Draw cute toasted food flake/pellet
      p.noStroke();
      p.fill("#F39C12");
      p.ellipse(food.x, food.y, 6, 5);
      p.fill("#FFEAA7");
      p.ellipse(food.x - 1, food.y - 1, 3, 2);

      // Remove food if eaten or reached the bottom sand
      if (food.eaten || food.y > p.height - 45) {
        // Tiny water puff when food hits floor or eaten
        if (food.eaten) {
          this.spawnChompBubble(food.x, food.y);
        }
        this.foodParticles.splice(i, 1);
      }
    }
    p.pop();
  }

  /**
   * Spawns a small puff bubble when food is eaten.
   */
  spawnChompBubble(x, y) {
    this.ambientBubbles.push({
      x: x,
      y: y,
      size: 5,
      speedY: 1.5,
      wobbleOffset: Math.random() * 10,
      wobbleSpeed: 0.04
    });
  }

  /**
   * Spawns ripple bubbles when user clicks the water.
   */
  spawnClickRipples(x, y) {
    for (let i = 0; i < 4; i++) {
      this.ambientBubbles.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 15,
        size: 3 + Math.random() * 4,
        speedY: 1.2 + Math.random() * 0.8,
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.05
      });
    }
  }

  /**
   * Drops food flakes into the aquarium.
   * If (x, y) provided, drops at coordinates; otherwise drops 8 flakes across the top.
   */
  dropFood(x = null, y = null) {
    const p = this.p;
    if (!p) return;

    if (x !== null && y !== null) {
      // Single drop at click coordinate
      this.foodParticles.push({
        x: x,
        y: y,
        vy: 0.8 + Math.random() * 0.5,
        wobblePhase: Math.random() * Math.PI,
        eaten: false
      });
    } else {
      // Scatter 8 delicious pellets from the top water surface
      const dropCount = 8;
      for (let i = 0; i < dropCount; i++) {
        this.foodParticles.push({
          x: 40 + Math.random() * (p.width - 80),
          y: 40 + Math.random() * 25,
          vy: 0.7 + Math.random() * 0.6,
          wobblePhase: Math.random() * Math.PI,
          eaten: false
        });
      }
    }
  }

  /**
   * Updates all active swimming fish and draws them.
   */
  updateAndDrawFish(p) {
    const isMouseInside = (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height);
    const mousePos = isMouseInside ? { x: p.mouseX, y: p.mouseY } : null;

    // Check hover state to update cursor style
    let isHoveringAnyFish = false;

    for (const fish of this.activeFish) {
      fish.isSelected = (fish.id === this.selectedFishId);
      fish.hovered = mousePos ? fish.containsPoint(mousePos.x, mousePos.y) : false;
      if (fish.hovered) isHoveringAnyFish = true;

      // Update fish physics and behavior
      const bubble = fish.update(p.width, p.height, this.foodParticles, mousePos);
      if (bubble) {
        this.ambientBubbles.push({
          x: bubble.x,
          y: bubble.y,
          size: bubble.size,
          speedY: Math.abs(bubble.vy),
          wobbleOffset: Math.random() * 10,
          wobbleSpeed: 0.04
        });
      }

      // Render fish
      fish.draw(p, true);
    }

    // Update cursor
    if (isHoveringAnyFish) {
      p.cursor("pointer");
    } else {
      p.cursor("crosshair");
    }
  }

  /**
   * Syncs the aquarium with updated fish data from storage.
   * Maintains existing fish positions while adding new ones smoothly.
   * Respects maxAnimatedFish limit for silky 60fps performance.
   */
  syncFishData(fishDataArray) {
    this.allFishData = fishDataArray || [];

    // Check if tank is completely empty
    if (typeof this.onEmptyStateChange === "function") {
      this.onEmptyStateChange(this.allFishData.length === 0);
    }

    const p = this.p;
    const canvasW = p ? p.width : 800;
    const canvasH = p ? p.height : 500;

    // Pick up to maxAnimatedFish to animate simultaneously
    const subsetData = this.allFishData.slice(0, this.maxAnimatedFish);

    // Map existing active fish by ID to preserve their swim positions
    const existingMap = new Map();
    for (const fish of this.activeFish) {
      existingMap.set(fish.id, fish);
    }

    const nextActiveFish = [];
    for (const data of subsetData) {
      if (existingMap.has(data.id)) {
        // Reuse instance
        const fish = existingMap.get(data.id);
        // Update any metadata changes if necessary
        fish.name = data.name;
        fish.personality = data.personality;
        nextActiveFish.push(fish);
      } else {
        // Spawn newly added fish with a gentle entry
        const startX = 60 + Math.random() * (canvasW - 120);
        const startY = 80 + Math.random() * (canvasH - 180);
        const newFish = new Fish(data, startX, startY);
        nextActiveFish.push(newFish);
      }
    }

    this.activeFish = nextActiveFish;
  }

  /**
   * Selects a fish by ID to highlight in the tank.
   */
  selectFish(fishId) {
    this.selectedFishId = fishId;
  }

  /**
   * Deselects any highlighted fish.
   */
  clearSelection() {
    this.selectedFishId = null;
  }

  /**
   * Spawns a celebratory splash of bubbles at a specific location when a new fish joins.
   */
  celebrateNewFish(fishId) {
    this.selectFish(fishId);
    const p = this.p;
    if (!p) return;

    for (let i = 0; i < 12; i++) {
      this.ambientBubbles.push({
        x: p.width * 0.5 + (Math.random() - 0.5) * 80,
        y: 80 + Math.random() * 60,
        size: 5 + Math.random() * 8,
        speedY: 1.8 + Math.random() * 1.5,
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.05
      });
    }
  }
}

// Make available globally
window.AquariumEngine = AquariumEngine;

