# 🌌 NEURAL//CORE — Solar System 3D Explorer

> *"Eight worlds. One star. Infinite discovery."*

![NEURAL//CORE Solar System](assets/images/preview.png)

A **premium interactive 3D solar system** built for a college technical event. Powered by **Three.js + GSAP ScrollTrigger** — the entire experience lives inside a WebGL viewport with no page reloads or traditional sections.

---

## 🚀 Live Features

| Feature | Description |
|---|---|
| 🌞 **Glowing Sun** | Pulsing emissive star with two corona glow layers and dynamic point lighting |
| 🪐 **All 8 Planets** | Mercury → Neptune with accurate relative sizes, colors, axial tilts, and orbital speeds |
| 💍 **Saturn's Rings** | Authentic double-sided torus ring system |
| 🌕 **Earth's Moon** | Orbits Earth on its own pivot with independent rotation |
| ☄️ **Asteroid Belt** | 1,000 particles in a ring between Mars and Jupiter |
| ⭐ **5,000 Stars** | Full spherical star field that drifts with mouse movement |
| 🖱️ **Mouse Repulsion** | All planets and the Sun float away from your cursor — spring back when it leaves |
| 🖱️ **Click to Inspect** | Click any planet, the Moon, or the Sun to reveal real mission data & stats |
| 📡 **Hover Glow** | Objects brighten and scale up on hover with cursor feedback |
| 📜 **Scroll-Driven Camera** | GSAP ScrollTrigger animates the camera through the entire solar system |
| ☀️ **Fly Into The Sun** | Final scroll sequence flies the camera directly into the Sun's surface |
| 📱 **Responsive** | Reduced particle count and geometry on mobile — full experience on desktop |

---

## 🎬 Scroll Journey

```
BOOT SEQUENCE  →  System initialisation with animated log lines
HERO           →  Grand top-down overview of the full solar system
SECTION 01     →  Camera dips into inner planets (Mercury → Mars)
SECTION 02     →  Camera sweeps sideways through the asteroid belt
SECTION 03     →  Camera pushes out to Jupiter & Saturn
SECTION 04     →  Overhead view — click any planet to inspect
SECTION 05     →  Push to Uranus & Neptune (ice giants sector)
SECTION 06     →  Grand final deep-space pull-back overview
FINALE         →  🔥 Camera flies INTO the Sun — corona swells, screen ignites
```

---

## 🎨 Design System

```
Background    →  #000005  (Deep space black)
Secondary     →  #0b0712  (Dark purple-black)
Accent        →  #ff6600  (Solar orange)
Orbit lines   →  #ff4400  (Dim red-orange)
Typography    →  Orbitron / JetBrains Mono / Inter
```

---

## 🛠️ Tech Stack

| Tool | Purpose |
|---|---|
| **Three.js r128** | WebGL 3D rendering — planets, orbits, stars, particles |
| **GSAP 3.12** | Scroll-driven camera animation |
| **ScrollTrigger** | Maps scroll position to 3D camera position & scene state |
| **Web Audio API** | (available for SFX extension) |
| **Pure HTML/CSS/JS** | No build tools, no frameworks |

> Zero dependencies beyond CDN-loaded Three.js and GSAP. Runs with Python's built-in HTTP server.

---

## 📁 Project Structure

```
neural_core/
├── index.html          ← Page structure, overlays, HUD, sections
├── style.css           ← Full design system (dark + solar orange theme)
├── script.js           ← 3D scene, physics, scroll animation, interactions
└── assets/
    └── textures/       ← (reserved for future planet texture maps)
```

---

## ▶️ Run Locally

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/neural-core-solar.git
cd neural-core-solar

# Option 1 — Python (built-in, no install needed)
python -m http.server 8081

# Option 2 — Node.js
npx serve .

# Then open:
http://localhost:8081
```

> ⚠️ Must be served via HTTP — do **not** open `index.html` directly from the file system (WebGL + CDN scripts require a server).

---

## 🖱️ Interactions

| Action | Result |
|---|---|
| Move mouse near a planet | Planet floats away (repulsion physics) |
| Move mouse near the Sun | Sun drifts away with spring damping |
| Hover any planet | Object glows + scales up, HUD updates |
| Click any planet | Mission data panel slides up |
| Click the Sun | Solar stats panel (diameter, temp, age) |
| Click Earth's Moon | Lunar mission data |
| Scroll to bottom | Camera flies into the Sun |
| Click ✕ on panel | Dismiss inspection panel |

---

## 📊 Planet Data Included

Each planet panel shows:
- Diameter
- Orbital period
- Distance from Sun
- Surface temperature
- Number of moons
- Mission status (e.g. Cassini, Voyager 2, Apollo)

---

## 🎓 Submission Info

- **Event:** College Technical Event — TECHFEST 2026
- **Category:** Web Design / Interactive Frontend / 3D Graphics
- **Concept:** NEURAL//CORE Solar Atlas v2.4

---

## 📜 License

```
© 2026 NEURAL//CORE LABS. Built for TECHFEST 2026.
```

---

<div align="center">

**Built with Three.js, GSAP, and a love for the cosmos.**

`SYSTEM: ONLINE` · `PLANETS: 8` · `ORBIT SYNC: 99.7%` · `STATUS: ☀ ACTIVE`

</div>
