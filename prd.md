# Voyager Flight System — Product Requirements Document

> **Version:** 1.0.4 · **Codename:** Procedural Universe  
> **Stack:** React 18 · Three.js r160 · Vite 5 · Vanilla CSS-in-JS  
> **Platform:** Browser (Desktop + Mobile Touch)

---

## 1. Product Overview

**Voyager Flight System** is a real-time, browser-based 3D space simulation built on Three.js. The player pilots a modular deep-space vessel through a scientifically-grounded procedural universe containing a full-fidelity solar system, procedurally generated stars of nine spectral classes, and an infinite interstellar void. The experience emphasizes cinematic immersion, realistic orbital mechanics, and free-roaming exploration rather than combat or scoring.

### 1.1 Core Pillars

| Pillar | Description |
|---|---|
| **Procedural Infinity** | Deterministic, seed-based universe generation — identical coordinates always produce identical star fields |
| **Scientific Grounding** | Real solar system data (orbital periods, eccentricities, axial tilts), HR-diagram star classification, Keplerian orbital mechanics |
| **Cinematic Immersion** | Custom GLSL star shaders, adaptive multi-zone lighting, procedural audio, and a sci-fi HUD |
| **Persistent Exploration** | LocalStorage auto-save with offline trajectory extrapolation — the ship keeps flying while the browser is closed |

---

## 2. Game Mechanics

### 2.1 Ship Propulsion & Physics

The ship operates on a **thrust-vs-drag equilibrium model** (not Newtonian impulse). All physics are computed in real km/s and then translated into visual-space coordinates.

| Parameter | Config Key | Default | Description |
|---|---|---|---|
| Base Cruise Speed | `ships.json → baseSpeedKms` | 50.0 km/s | Terminal velocity at 100% thrust (drag = thrust) |
| Acceleration Time | `accelTimeSecs` | 30s | Real-seconds from 0 → cruise at full throttle |
| Brake Drag Multiplier | `brakeDragMultiplier` | 5× | Additional drag when solar panel airbrakes are deployed |
| Thrust Step | `thrustStepPercent` | 5% | Granularity of throttle adjustment per keypress |
| Time Warp | `timeWarp` | 30,000× | Multiplier applied to orbital simulation time (not ship speed) |

**Physics Loop (per frame):**
```
thrustAccel = thrustFraction × (baseSpeed / ACCEL_TIME)
dragAccel   = (baseSpeed / ACCEL_TIME) × (v / baseSpeed)² × dragMultiplier
netAccel    = thrustAccel − dragAccel
velocity   += netAccel × Δt
```

- Ship velocity is decoupled from time warp — warp only affects orbital mechanics.
- At terminal velocity: `thrustAccel == dragAccel`, net force = 0.
- At 0% thrust with no brakes, the ship decelerates via quadratic drag alone.

### 2.2 Steering — RCS Thruster System

Steering uses a **Reaction Control System (RCS)** model with angular velocity accumulation:

| Parameter | Value |
|---|---|
| Max Angular Speed | 8°/s |
| Angular Acceleration | 18°/s² |
| Damping Factor | 0.85 per frame (when no key held) |

- **Yaw:** Arrow Left / Right
- **Pitch:** Arrow Up / Down
- Rotations are applied in the ship's **local quaternion space** so it always turns relative to its own nose.
- When keys are released, angular velocity smoothly decays to zero.

### 2.3 Solar Panel Airbrake System

The ship's three solar panel arrays serve dual purpose:

1. **Sun-tracking mode** (default) — panels track the nearest star's position, rotating on their local X-axis to face the light source.
2. **Airbrake mode** (toggled with `B`) — panels rotate 90° on local Y-axis to face forward, dramatically increasing drag. Each panel staggers its tilt angle to avoid shadowing (Left: 0°, Middle: -90°, Right: -45° on X).

Transition between modes uses exponential lerp at configurable speed (`solarPanelSpeed: 0.15`). Panel textures dynamically swap between deployed (solar cell) and retracted (non-sun-side) faces.

### 2.4 Orbital Mechanics

Celestial bodies follow **Keplerian orbit calculations** with:
- True anomaly derived from mean anomaly via 2nd-order eccentricity approximation
- Orbital inclination applied as 3D rotation
- Moon orbits with minimum-distance clamping to prevent parent-body clipping
- Axial rotation (including retrograde for Venus, Uranus, Pluto)

All orbit calculations run at `timeWarp` speed (default 30,000×), making Earth complete one orbit in ~17 minutes of real time.

### 2.5 Procedural Star Generation

Stars are deterministically generated in an infinite 3D grid using:

| Step | Algorithm |
|---|---|
| **Coordinate Hashing** | 64-bit mixing hash (BigInt) combining `(x, y, z, universeSeed)` |
| **PCG RNG** | 32-bit Permuted Congruential Generator for all derived random values |
| **Existence Check** | `randF32(seed) ≤ 0.0002` (guaranteed star at origin `0,0,0`) |
| **Classification** | Weighted random across 9 spectral types following astronomical ratios |
| **Color Tinting** | ±5% per-channel tinting for visual variety |

**Star Type Distribution:**

| Type | Class | Frequency | Size Range | Color (RGB) |
|---|---|---|---|---|
| M Red Dwarf | M | 74% | 10–25 | (1.0, 0.2, 0.02) |
| K Orange Dwarf | K | 12% | 30–50 | (1.0, 0.45, 0.1) |
| G Yellow Dwarf | G | 7% | 40–60 | (1.5, 0.62, 0.0) |
| F Yellow-White | F | 3.5% | 60–90 | (1.0, 1.0, 0.9) |
| A White | A | 1.5% | 100–150 | (0.9, 0.95, 1.0) |
| B Blue-White | B | 1% | 250–400 | (0.7, 0.8, 2.0) |
| O Blue Giant | O | 0.5% | 500–1000 | (0.05, 0.35, 1.0) |
| Neutron Star | — | 0.3% | 15–25 | (0.3, 0.6, 1.0) |
| Black Hole | — | 0.2% | 60–120 | (0.0, 0.0, 0.0) |

Each type's visual properties (convection, plasma flow, corona, flares) are defined in `star.yaml` and hot-reloadable at runtime via Vite HMR.

### 2.6 Continuity of Time (Offline Progression)

When the game is reopened after the browser was closed:
1. Elapsed real time is computed from `savedAt` timestamp.
2. Simulation time is advanced: `simTime += elapsedReal × timeWarp`.
3. Ship velocity is numerically integrated over the offline period (capped at 300s of real-time integration using 1-second Euler steps).
4. Ship position is displaced forward along its saved heading quaternion.
5. Traveled distance odometer is updated.

### 2.7 Command Terminal

An in-game terminal console (`C` key) provides debug/cheat commands:

| Command | Syntax | Effect |
|---|---|---|
| `spawn [planet]` | `spawn mars` | Teleport near a named solar system body |
| `spawn [x] [y] [z]` | `spawn 0 0 100` | Teleport to exact visual coordinates |
| `spawn star [type]` | `spawn star pulsar` | Spawn a typed procedural star ahead of the ship |
| `spawn star [x] [y] [z]` | `spawn star 0 0 0` | Teleport to a procedural star at sector coordinates |
| `speed [kms]` | `speed 120` | Override cruise velocity |
| `warp [n]` | `warp 200000` | Change orbital time warp multiplier |
| `clear` | — | Clear terminal history |
| `close` | — | Close terminal |

---

## 3. Assets & Models

### 3.1 Ship Models

The game supports three ship loader types: `gltf`, `obj`, and `modular`. Only one ship is enabled at a time.

#### Currently Enabled: **Hermes** (`hermes_modular`)

A modular OBJ assembly composed of 14 independently loaded components:

| Component | File | Texture | Special Behavior |
|---|---|---|---|
| Command Module | `CmdModule.obj` | `panels_grey.JPG` | 2× forward-facing SpotLight headlights |
| Habitat Wheel | `HabWheel.obj` | `AFRAM_BrushedMetal.jpg` | Continuous X-axis rotation (0.31416 rad/s ≈ 3 RPM), 4× outward-facing rotating SpotLight headlights |
| Ion Drive | `IonDrive.obj` | `MLI_new5.jpg` | — |
| Fuel Module | `FuelModule.obj` | `FuelTankGrid.jpg` | 2× outward-facing SpotLight headlights |
| Solar Panels (L/M/R) | `SolarPanels_Left/Middle/Right.obj` | `SolarPanel.jpg` / `SA_NonSunside.jpg` | Sun-tracking + airbrake rotation, texture-swapping |
| Habitation Corridor | `Modules1.obj` | `Hull3.jpg` | — |
| Spine Truss | `Modules2.obj` | `Hull3.jpg` | — |
| Aft Corridor | `Modules3.obj` | `Hull3.jpg` | — |
| Truss Node A/B | `Modules4/5.obj` | `Hull.jpg` | — |
| Solar Mounts | `SolarModules.obj` | `SolarPanel.jpg` | — |
| High Gain Antenna | `DishAnt.obj` | `Hull.jpg` | — |

**Ship Physics:** 50 km/s base speed, 250,000 kg mass, 100 N max thrust

**Ion Exhaust:** Procedural cone mesh with additive blending, inner core glow, cyan point light. Scale/opacity/flicker modulated by thrust fraction.

#### Disabled Ships (Available in Config)

| Ship | Type | Base Speed | Mass |
|---|---|---|---|
| NASA Warp Ship | OBJ | 22 km/s | 150,000 kg |
| Space Rocket | GLTF (.glb) | 11.2 km/s | 100,000 kg |
| Mars2 Explorer | OBJ | 25 km/s | 200,000 kg |

### 3.2 Solar System Bodies

Defined in `starmap.csv` — real astronomical data for 12 bodies:

| Body | Type | Parent | Semi-Major Axis (AU) | Period (days) | Radius (km) |
|---|---|---|---|---|---|
| Sun | Star | — | 0 | — | 696,340 |
| Mercury | Planet | Sun | 0.387 | 87.97 | 2,439.7 |
| Venus | Planet | Sun | 0.723 | 224.7 | 6,051.8 |
| Earth | Planet | Sun | 1.0 | 365.26 | 6,371.0 |
| Moon | Moon | Earth | 0.00257 | 27.32 | 1,737.4 |
| Mars | Planet | Sun | 1.524 | 686.98 | 3,389.5 |
| Jupiter | Planet | Sun | 5.203 | 4,332.59 | 69,911.0 |
| Saturn | Planet | Sun | 9.582 | 10,759.22 | 58,232.0 |
| Uranus | Planet | Sun | 19.218 | 30,688.5 | 25,362.0 |
| Neptune | Planet | Sun | 30.047 | 60,182.0 | 24,622.0 |
| Pluto | Planet | Sun | 39.482 | 90,560.0 | 1,188.3 |

Each body is rendered using one of:
- **OBJ model + diffuse texture + optional bump map** (Mercury, Venus, Earth, Moon, Mars, Saturn, Uranus, Neptune, Pluto, Sun)
- **Textured sphere** (Jupiter)
- **Procedural fallback sphere** (if model loading fails)

Saturn includes a separate `RingGeometry` with alpha-transparent ring texture.

### 3.3 Visual Size Mapping

Bodies are rendered at categorical visual scales (not to astronomical scale):

| Category | Condition | Visual Radius |
|---|---|---|
| Star | `objectType === 'Star'` | 25.0 |
| Gas Giant | `radiusKm > 20,000` | 9.0 |
| Terrestrial | `radiusKm > 3,000` | 3.5 |
| Small Body | Default | 1.8 |
| Moon | `objectType === 'Moon'` | 1.0 |

### 3.4 Background Starfield

15,000 point sprites distributed on a spherical shell (radius 3,000–5,000 visual units) with 5 spectral color tints. The shell is position-locked to the camera (infinite parallax) with slow Y-axis rotation. Performance mode reduces to 3,000 stars.

---

## 4. Rendering Specification

### 4.1 Renderer Configuration

| Setting | Value |
|---|---|
| Engine | `THREE.WebGLRenderer` |
| Antialiasing | `true` |
| Preserve Drawing Buffer | `true` (for screen recording) |
| Pixel Ratio | `min(devicePixelRatio, 2)` / `1.0` in perf mode |
| FOV | 60° |
| Near Clip | 0.1 |
| Far Clip | 10,000 |

### 4.2 Scene Environment

| Property | Config Key | Value |
|---|---|---|
| Background Color | `skyboxColor` | `0x000510` (deep space navy) |
| Fog Type | Exponential² | — |
| Fog Color | `fogColor` | `0x000510` |
| Fog Density | `fogDensity` | `0.00015` |

### 4.3 Lighting System — Dual-Zone Architecture

The lighting system smoothly transitions between two regimes based on `deepSpaceFactor` (0.0 = near star, 1.0 = deep space):

#### Near-Star Lighting (deepSpaceFactor → 0.0)

| Light | Type | Color | Intensity | Notes |
|---|---|---|---|---|
| Ambient | `AmbientLight` | `0x1a2030` (cosmic indigo) | 0.2 | Tinted by nearest star's emission color |
| Viewport (Sun) | `DirectionalLight` | `0xebf3ff` | 3.0 | Attached to camera, direction tracks star position |
| Sun PointLight | `PointLight` | `0xfffaed` | 3.0 | Attached to Sun's group, infinite range, no decay |

#### Deep-Space Lighting (deepSpaceFactor → 1.0)

| Light | Type | Color | Intensity | Notes |
|---|---|---|---|---|
| Ambient | `AmbientLight` | `0x3d0f6e` (nebula violet) | 0.8 | Fades from solar ambient |
| Viewport Fill | `DirectionalLight` | `0x2e3b5e` (slate indigo) | 0.6 | Provides ambient backing |
| Flashlight | `SpotLight` | `0xffffff` | 2.2 | Camera-mounted, toggleable (`F`), cone 12.5°, penumbra 0.45 |
| Ship Fill Light | Point or Directional | `0xffffff` | 10.0 (point) | Attached to ship, configurable type/position/decay |

#### Component Headlights (deep-space only, toggleable with `H`)

| Component | Light Count | Type | Max Intensity |
|---|---|---|---|
| Command Module | 2 | SpotLight | 12.0 |
| Habitation Wheel | 4 | SpotLight (rotating) | 8.0 |
| Fuel Module | 2 | SpotLight | 6.0 |

All light transitions use exponential lerp (`dsLightLerpRate: 0.05`) for smooth fading.

#### Solar System Culling

| Parameter | Config Key | Value |
|---|---|---|
| Cull Distance | `solarCullAu` | 3.0 AU |
| Fade Start | `dsFadeStartAu` | 1.0 AU |
| Fade End | `dsFadeEndAu` | 3.0 AU |

Beyond 3.0 AU from origin, the entire `solarSystem` THREE.Group is hidden.

### 4.4 Procedural Star Shader (GLSL)

Stars are rendered as billboard `PlaneGeometry` quads using a custom `ShaderMaterial` with full ray-sphere intersection:

**Vertex Shader:**
- Computes `vLocalPos` and `vLocalCameraPos` for ray setup.
- Camera distance calculated from `modelMatrix` for proper perspective.

**Fragment Shader — Core Rendering:**
1. Ray-sphere intersection determines hit point on the stellar surface.
2. **Convection cells:** Voronoi noise warped by FBM creates granular surface texture.
3. **Plasma turbulence:** Layered simplex FBM at varying scales.
4. **Hot spots:** Thresholded FBM creates bright active regions.
5. **Limb darkening:** Fresnel rim effect with configurable `uRimPower`.

**Fragment Shader — Flare/Corona System:**
Three flare modes controlled by `uFlareMode`:

| Mode | Value | Behavior |
|---|---|---|
| Uniform Halo | 0 | Evenly distributed flare strands |
| Random Eruptions | 1 | Spotty, localized solar flares |
| Magnetar Bursts | 2 | Polar-biased pulsing loops with magnetic flux tube bending |

Flares use:
- Simplex FBM for strand noise
- Radial falloff with `pow(..., 0.8)` for long reach
- Surface mask pinning strands to the silhouette
- Additive blending with `depthWrite: false`
- Bias modes: None (0), Polar (1), Equatorial (2)

**Shader Uniforms (19 total):** `uColor`, `uSeed`, `uConvectionScale`, `uConvectionSpeed`, `uWarpIntensity`, `uPlasmaSpeed`, `uHotSpotIntensity`, `uCoronaIntensity`, `uRimPower`, `uIntensity`, `uFlareScale`, `uFlareSpeed`, `uFlareIntensity`, `uFlareHeight`, `uFlareMode`, `uFlareEnabled`, `uFlareBias`, `uTime`

All uniforms are live-updatable via Vite HMR when `star.yaml` is edited.

### 4.5 Camera System

| Feature | Implementation |
|---|---|
| Type | Third-person orbit camera |
| Orbit Controls | WASD keys + mouse drag + touch drag |
| Zoom | Scroll wheel (exponential factor, range 2–150 units) |
| Follow Lerp | `1 - pow(0.96, Δt × 60)` for smooth position tracking |
| Angle Lerp | `1 - pow(0.85, Δt × 60)` for smooth angle interpolation |
| Reset | `R` key snaps to default orbit position |

### 4.6 Animation Loop

The `requestAnimationFrame` loop handles (in order):
1. Delta time computation with frame-smoothing (exponential moving average, α=0.1)
2. Simulation time advancement (`simTime += Δt × timeWarp`)
3. Ship velocity integration (thrust/drag physics)
4. Habitat wheel rotation
5. Celestial body orbit + axial rotation updates
6. Solar panel animation (sun-tracking or airbrake)
7. Ion exhaust pulsing/flickering
8. Ship movement (forward along nose quaternion)
9. Deep-space lighting transitions
10. Solar system culling check
11. Camera orbit calculation + smooth follow
12. Starfield position locking + slow rotation
13. Star billboard orientation + uTime update
14. Auto-save to LocalStorage (every 60s)
15. HUD text updates (speed, thrust, coordinates)
16. Radar marker computation
17. Nearest object scanning
18. `renderer.render(scene, camera)`

---

## 5. Audio System

### 5.1 Architecture

All audio is synthesized at runtime using the **Web Audio API** — no audio files are loaded. A master gain node controls global mute/unmute with smooth 150ms fading.

### 5.2 Sound Layers

| Layer | Oscillator | Base Freq | Behavior |
|---|---|---|---|
| **Ambient Drone** | Triangle | 55 Hz (A1) | Low-pass filtered at 120 Hz, LFO modulation at 0.2 Hz |
| **Engine Hum** | Sawtooth | 50–110 Hz | Pitch and volume scale with thrust fraction |
| **RCS Thruster** | White Noise | — | Bandpass filtered (800–2000 Hz), activates during steering input |
| **Sonar Ping** | Sine | 1200 Hz → 800 Hz | Triggered when a new celestial body enters scanner range |
| **UI Click** | Sine | 800 Hz | 40ms burst on button interactions |
| **Procedural Music** | Multi-oscillator | Varies | Ambient chord progression (volume: 0.02) |

### 5.3 Controls

| Action | Key | UI |
|---|---|---|
| Mute/Unmute | `M` | 🔇/🔊 button (top-right) |

Audio defaults to **muted** on load.

---

## 6. User Interface / HUD

### 6.1 Boot Sequence

A cinematic loading screen with:
- Progress bar (0–100%) with randomized 4–8% increments
- Terminal-style log messages simulating system initialization
- "ENTER FLIGHT DECK" button appears at 100%
- Returning users auto-boot (skip button click)
- First-time visitors see the Flight Manual automatically

### 6.2 In-Flight HUD Elements

| Element | Position | Content |
|---|---|---|
| Ship Name Badge | Top-left | Ship name + "VOYAGER FLIGHT SYSTEM" header |
| Speed Readout | Left panel | Current velocity in km/s (direct DOM update, not React state) |
| Thrust Readout | Left panel | Current throttle percentage |
| Coordinate Readout | Left panel | Ship XYZ position in visual units |
| Distance Traveled | Left panel | Odometer in AU |
| Solar Panel Status | Left panel | DEPLOYED/RETRACTED with color-coded indicator |
| Flashlight Status | Left panel | ON/OFF indicator |
| Headlights Status | Left panel | ON/OFF indicator |
| Scanner Readout | Left panel | Nearest celestial body name + type + distance (AU) |
| Nav Radar | Bottom-right | Circular mini-map (160px diameter) showing solar system body positions relative to ship |
| Radar Sweep | Bottom-right | Animated rotating sweep line |
| Radar Markers | Bottom-right | Colored dots for each body, clamped to radar edge when out of range |
| HUD Notification | Bottom-center | Toast-style messages for state changes (auto-dismiss 2.2s) |
| Recording Badge | Top-right | REC indicator with elapsed time when recording |
| Performance Toggle | Top-right | ⚡ PERF MODE / ✨ HIGH-RES button |
| Audio Toggle | Top-right | 🔇/🔊 circle button |
| Help Button | Top-right | ? circle button |

### 6.3 Star Map Overlay

Accessible by clicking the radar, opens a full-screen overlay showing:
- All solar system bodies with orbital positions at current simulation time
- Zoomable/pannable view
- Body selection for navigation targeting

### 6.4 Command Terminal Overlay

Opened with `C` key — a retro-styled terminal with:
- Scrollable command history
- Input field with form submission
- Auto-close after successful command execution (1.2s delay)

### 6.5 Flight Manual Modal

Opened with `I` key or ? button — two-column grid showing all keyboard shortcuts and instrument descriptions.

### 6.6 Mobile Touch Controls

Detected at runtime via `ontouchstart` / `navigator.maxTouchPoints`:

| Control | Type | Position |
|---|---|---|
| Steering Joystick | Virtual analog stick (120px) | Bottom-left |
| Thrust +/− Buttons | Two 48px buttons | Bottom-right area |
| Brake Toggle | 48px button | Bottom-right area |
| Camera Reset | 48px button | Bottom-right area |

Touch-drag anywhere else orbits the camera.

### 6.7 Typography

Fonts: `Orbitron` (primary HUD), `Rajdhani` (secondary), `Share Tech Mono` (terminal logs), system `monospace` fallback.

All loaded from Google Fonts.

---

## 7. Persistence & State Management

### 7.1 Save System

State is serialized to `localStorage` under key `caslino_spacesim_save` at configurable intervals (default: 60s).

**Saved Fields:**

| Field | Type | Description |
|---|---|---|
| `universeSeed` | number | Current procedural universe seed |
| `distance` | number | Total traveled distance (AU) |
| `traveledDistanceKm` | number | Odometer (km) — monotonically increasing |
| `currentShipId` | string | Active ship identifier |
| `shipVelocityKms` | number | Current velocity |
| `thrustPercent` | number | Throttle setting (0–100) |
| `brakesActive` | boolean | Solar panel airbrake state |
| `brakeFactor` | number | Current brake deployment fraction (0–1) |
| `simulationTime` | number | Accumulated simulation seconds |
| `shipPosition` | {x, y, z} | World-space position |
| `shipQuaternion` | {x, y, z, w} | Orientation quaternion |
| `flashlightEnabled` | boolean | Flashlight toggle |
| `headlightsEnabled` | boolean | Headlights toggle |
| `forcedStar` | object | Currently spawned procedural star parameters |
| `savedAt` | timestamp | Unix epoch for offline progression |

### 7.2 Additional Persisted Keys

| Key | Purpose |
|---|---|
| `caslino_spacesim_launched` | Marks first launch (enables auto-boot) |
| `caslino_spacesim_perf` | Performance mode preference (`"low"` / `"high"`) |
| `caslino_spacesim_help_seen` | Prevents auto-opening Flight Manual on repeat visits |

---

## 8. Configuration Architecture

### 8.1 Config Files

| File | Format | Purpose | Hot-Reload |
|---|---|---|---|
| `config.yaml` | YAML (raw import) | Physics, lighting, environment, controls | ✗ |
| `star.yaml` | YAML (raw import) | Star preset visual parameters (9 types × 18 properties) | ✓ (Vite HMR) |
| `ships.json` | JSON | Ship definitions, components, textures, physics | ✗ |
| `starmap.csv` | CSV (raw import) | Solar system body orbital data | ✗ |
| `universe_seeds.json` | JSON | Pool of 1,000 pre-generated seed values | ✗ |

### 8.2 Visual Scale Factor

All astronomical distances are converted to visual-space coordinates using:

```
visualPosition = realDistanceKm × 0.00000072
```

This factor (`visualScaleFactor`) makes 1 AU ≈ 107.7 visual units.

---

## 9. Input Reference

### 9.1 Keyboard Controls

| Key | Action |
|---|---|
| `← → ↑ ↓` | RCS steering (yaw/pitch) |
| `+ / =` | Increase thrust |
| `-` | Decrease thrust |
| `B` | Toggle solar panel airbrakes |
| `W A S D` | Orbit camera |
| `Scroll` | Camera zoom |
| `R` | Reset camera position |
| `F` | Toggle flashlight |
| `H` | Toggle ship headlights |
| `M` | Toggle audio mute |
| `C` | Open command terminal |
| `I` | Toggle flight manual |
| `L` | Toggle screen recording |
| `Escape` | Close overlays |

### 9.2 Mouse Controls

| Action | Behavior |
|---|---|
| Left-click drag | Orbit camera |
| Scroll wheel | Zoom camera (exponential, range 2–150) |

---

## 10. Performance Considerations

| Concern | Mitigation |
|---|---|
| Starfield particle count | 15,000 (high) / 3,000 (perf mode) via `setDrawRange` |
| Pixel ratio | Capped at 2× (high) / 1× (perf mode) |
| OBJ sanitization | Line/point primitives stripped before parsing to prevent mesh errors |
| Texture loading | Deferred assignment — textures only bound to materials after `image.complete` to avoid WebGL2 immutable texture warnings |
| Solar system culling | Entire `solarSystem` Group hidden beyond 3 AU |
| HUD updates | Speed/thrust/coords use direct DOM manipulation (`innerText`) instead of React state to avoid re-renders |
| Radar markers | Throttled to 100ms update interval |
| Frame smoothing | Exponential moving average on delta time prevents physics spikes |
| Star flares | Toggleable per-type via `flare_enabled` config |
| Auto-save | 60s interval prevents storage thrashing |
