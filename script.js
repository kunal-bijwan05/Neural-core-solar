/**
 * NEURAL//CORE — Solar System 3D Experience
 * Fixed: Planet click-inspect panel + floating physics + fly-into-sun
 */

/* ================================================================
   GLOBALS
   ================================================================ */
const IS_MOBILE  = window.innerWidth < 768;
const DPR        = Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2);
const STAR_COUNT = IS_MOBILE ? 1500 : 5000;
const BELT_COUNT = IS_MOBILE ? 300  : 1000;

/* ================================================================
   WEBGL CHECK
   ================================================================ */
function isWebGLAvailable() {
    try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext &&
            (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
}
if (!isWebGLAvailable()) {
    document.getElementById('webgl-fallback').style.display = 'flex';
    document.getElementById('boot-overlay').style.display   = 'none';
    throw new Error('WebGL not supported');
}

/* ================================================================
   BOOT SEQUENCE
   ================================================================ */
function runBootSequence(onComplete) {
    const logLines = document.querySelectorAll('.boot-log-line');
    const steps = [
        { id: 'log-nn',   delay: 400,  text: 'GENERATING',  final: 'LOADED',  cls: 'online' },
        { id: 'log-core', delay: 900,  text: 'CALCULATING', final: 'LOCKED',  cls: 'online' },
        { id: 'log-sys',  delay: 1400, text: 'COMPUTING',   final: 'ACTIVE',  cls: 'online' },
        { id: 'log-pe',   delay: 2200, text: `${BELT_COUNT}`, final: 'SEEDED', cls: 'online' },
        { id: 'log-rend', delay: 2700, text: 'WEBGL 2.0',   final: 'ACTIVE',  cls: 'online' },
    ];
    logLines.forEach(l =>
        setTimeout(() => l.classList.add('visible'), parseInt(l.dataset.delay))
    );
    steps.forEach(s => {
        setTimeout(() => {
            const el = document.getElementById(s.id);
            if (el) { el.textContent = s.text; el.className = 'log-val'; }
        }, s.delay);
        setTimeout(() => {
            const el = document.getElementById(s.id);
            if (el) { el.textContent = s.final; el.className = `log-val ${s.cls}`; }
        }, s.delay + 500);
    });
    let p = 0;
    const iv = setInterval(() => {
        p += 2 + Math.random() * 3;
        if (p >= 100) { p = 100; clearInterval(iv); }
        document.getElementById('bootProgress').style.width = p + '%';
    }, 80);
    setTimeout(() => { document.getElementById('bootStatus').textContent = 'SYSTEM ONLINE'; }, 3200);
    setTimeout(() => {
        document.getElementById('boot-overlay').classList.add('hidden');
        if (onComplete) onComplete();
    }, 4000);
}

/* ================================================================
   THREE.JS SETUP
   ================================================================ */
const canvas   = document.getElementById('neural-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_MOBILE, alpha: false });
renderer.setPixelRatio(DPR);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000005, 1);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 60, 150);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ================================================================
   LIGHTING
   ================================================================ */
const sunLight = new THREE.PointLight(0xfff4e0, 3.5, 600);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

const ambLight = new THREE.AmbientLight(0x111133, 1.0);
scene.add(ambLight);

const rimLight = new THREE.DirectionalLight(0x3344ff, 0.3);
rimLight.position.set(-100, 50, -100);
scene.add(rimLight);

/* ================================================================
   STAR FIELD
   ================================================================ */
const starPositions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
    const r     = 400 + Math.random() * 800;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos((Math.random() * 2) - 1);
    starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: IS_MOBILE ? 0.7 : 0.5,
    transparent: true, opacity: 0.9, sizeAttenuation: true,
});
const starField = new THREE.Points(starGeo, starMat);
scene.add(starField);

/* ================================================================
   SUN
   ================================================================ */
const sunGeo  = new THREE.SphereGeometry(8, IS_MOBILE ? 24 : 48, IS_MOBILE ? 24 : 48);
const sunMat  = new THREE.MeshStandardMaterial({
    color: 0xffaa00, emissive: new THREE.Color(0xff6600),
    emissiveIntensity: 2.0, roughness: 0.9, metalness: 0,
});
const sunMesh = new THREE.Mesh(sunGeo, sunMat);
scene.add(sunMesh);

// Corona glow layers
[{ r: 11, o: 0.10, c: 0xff6600 }, { r: 14, o: 0.04, c: 0xff3300 }].forEach(cfg => {
    const g = new THREE.SphereGeometry(cfg.r, 24, 24);
    const m = new THREE.MeshBasicMaterial({ color: cfg.c, transparent: true, opacity: cfg.o, side: THREE.BackSide });
    scene.add(new THREE.Mesh(g, m));
});

const sunFloat = { vx: 0, vy: 0, ox: 0, oy: 0 };

/* ================================================================
   PLANET DEFINITIONS
   ================================================================ */
const planetDefs = [
    {
        name: 'MERCURY', tag: 'PLANET-01',
        color: 0x888888, emissive: 0x222222, emissiveInt: 0.1,
        radius: 1.0, orbitRadius: 16, orbitSpeed: 4.15, tilt: 0.03, segments: 16,
        desc: 'The smallest and fastest planet. Orbiting closest to the Sun, Mercury endures extreme temperature swings from -180°C to 430°C with no atmosphere to moderate them.',
        stats: [
            { lbl: 'DIAMETER',    val: '4,879 KM'  },
            { lbl: 'ORBIT PERIOD',val: '88 DAYS'   },
            { lbl: 'SUN DISTANCE',val: '57.9M KM'  },
            { lbl: 'SURFACE TEMP',val: '-180/430°C' },
            { lbl: 'MOONS',       val: '0'          },
            { lbl: 'STATUS',      val: '✓ TRACKED'  },
        ],
    },
    {
        name: 'VENUS', tag: 'PLANET-02',
        color: 0xe8c56e, emissive: 0xaa7700, emissiveInt: 0.2,
        radius: 1.9, orbitRadius: 23, orbitSpeed: 1.62, tilt: 3.09, segments: 20,
        desc: 'The hottest planet in the solar system. A thick CO₂ atmosphere creates a runaway greenhouse effect. Surface temperatures reach 465°C — hot enough to melt lead.',
        stats: [
            { lbl: 'DIAMETER',    val: '12,104 KM'  },
            { lbl: 'ORBIT PERIOD',val: '225 DAYS'   },
            { lbl: 'SUN DISTANCE',val: '108.2M KM'  },
            { lbl: 'SURFACE TEMP',val: '465°C'       },
            { lbl: 'MOONS',       val: '0'           },
            { lbl: 'STATUS',      val: '✓ TRACKED'   },
        ],
    },
    {
        name: 'EARTH', tag: 'PLANET-03',
        color: 0x2266cc, emissive: 0x003366, emissiveInt: 0.15,
        radius: 2.0, orbitRadius: 31, orbitSpeed: 1.0, tilt: 0.41, segments: 24,
        hasMoon: true,
        desc: 'Our home world. The only known planet harboring life, with vast liquid water oceans, a breathable nitrogen-oxygen atmosphere, and a protective magnetic field.',
        stats: [
            { lbl: 'DIAMETER',    val: '12,742 KM'  },
            { lbl: 'ORBIT PERIOD',val: '365.25 DAYS' },
            { lbl: 'SUN DISTANCE',val: '149.6M KM'  },
            { lbl: 'SURFACE TEMP',val: '15°C AVG'   },
            { lbl: 'MOONS',       val: '1 — LUNA'   },
            { lbl: 'STATUS',      val: '⊙ HOME BASE' },
        ],
    },
    {
        name: 'MARS', tag: 'PLANET-04',
        color: 0xcc4422, emissive: 0x881100, emissiveInt: 0.15,
        radius: 1.4, orbitRadius: 42, orbitSpeed: 0.53, tilt: 0.44, segments: 20,
        desc: 'The Red Planet. Iron oxide covers its dusty surface. Home to Olympus Mons — the tallest volcano in the solar system at 21 km high — and Valles Marineris canyon system.',
        stats: [
            { lbl: 'DIAMETER',    val: '6,779 KM'   },
            { lbl: 'ORBIT PERIOD',val: '687 DAYS'    },
            { lbl: 'SUN DISTANCE',val: '227.9M KM'   },
            { lbl: 'SURFACE TEMP',val: '-60°C AVG'   },
            { lbl: 'MOONS',       val: '2 (PHOBOS + DEIMOS)' },
            { lbl: 'STATUS',      val: '⚑ MISSION TARGET'    },
        ],
    },
    {
        name: 'JUPITER', tag: 'PLANET-05',
        color: 0xcc9944, emissive: 0x553300, emissiveInt: 0.1,
        radius: 7.0, orbitRadius: 72, orbitSpeed: 0.084, tilt: 0.05, segments: 32,
        desc: 'The largest planet — so big it could fit all other planets inside twice over. Its Great Red Spot is a storm twice the size of Earth that has raged for over 350 years.',
        stats: [
            { lbl: 'DIAMETER',    val: '139,820 KM' },
            { lbl: 'ORBIT PERIOD',val: '11.9 YEARS'  },
            { lbl: 'SUN DISTANCE',val: '778.5M KM'   },
            { lbl: 'CLOUD TEMP',  val: '-145°C'       },
            { lbl: 'MOONS',       val: '95'           },
            { lbl: 'STATUS',      val: '✓ GALILEO PROBE' },
        ],
    },
    {
        name: 'SATURN', tag: 'PLANET-06',
        color: 0xddcc88, emissive: 0x664400, emissiveInt: 0.1,
        radius: 5.8, orbitRadius: 102, orbitSpeed: 0.034, tilt: 0.47, segments: 32,
        hasRings: true,
        desc: 'The ringed jewel of the solar system. Saturn\'s iconic ring system spans 282,000 km yet is only ~10 metres thick. Saturn is the least dense planet — it would float on water.',
        stats: [
            { lbl: 'DIAMETER',    val: '116,460 KM' },
            { lbl: 'ORBIT PERIOD',val: '29.5 YEARS'  },
            { lbl: 'SUN DISTANCE',val: '1.43B KM'    },
            { lbl: 'RING SPAN',   val: '282,000 KM'  },
            { lbl: 'MOONS',       val: '146'          },
            { lbl: 'STATUS',      val: '✓ CASSINI PROBE' },
        ],
    },
    {
        name: 'URANUS', tag: 'PLANET-07',
        color: 0x66ddee, emissive: 0x003344, emissiveInt: 0.2,
        radius: 3.5, orbitRadius: 133, orbitSpeed: 0.012, tilt: 1.71, segments: 24,
        desc: 'The tilted ice giant. Uranus rotates on its side — its extreme 98° axial tilt means its poles face the Sun directly for decades. Composed mainly of icy materials.',
        stats: [
            { lbl: 'DIAMETER',    val: '50,724 KM'  },
            { lbl: 'ORBIT PERIOD',val: '84 YEARS'    },
            { lbl: 'SUN DISTANCE',val: '2.87B KM'    },
            { lbl: 'WIND SPEED',  val: '250 KM/H'    },
            { lbl: 'MOONS',       val: '27'           },
            { lbl: 'STATUS',      val: '✓ VOYAGER 2'  },
        ],
    },
    {
        name: 'NEPTUNE', tag: 'PLANET-08',
        color: 0x2244cc, emissive: 0x001166, emissiveInt: 0.25,
        radius: 3.3, orbitRadius: 162, orbitSpeed: 0.006, tilt: 0.49, segments: 24,
        desc: 'The windiest world in the solar system. Neptune\'s supersonic winds reach 2,100 km/h. At 4.5 billion km from the Sun, it takes 165 years to complete a single orbit.',
        stats: [
            { lbl: 'DIAMETER',    val: '49,244 KM'  },
            { lbl: 'ORBIT PERIOD',val: '165 YEARS'   },
            { lbl: 'SUN DISTANCE',val: '4.50B KM'    },
            { lbl: 'WIND SPEED',  val: '2,100 KM/H'  },
            { lbl: 'MOONS',       val: '16'           },
            { lbl: 'STATUS',      val: '✓ VOYAGER 2'  },
        ],
    },
];

/* ================================================================
   BUILD SOLAR SYSTEM
   ================================================================ */
const solarGroup = new THREE.Group();
scene.add(solarGroup);

// hitZones: { mesh: THREE.Mesh (invisible large sphere), data: userData object }
const hitZones = [];
const planets  = [];

// Invisible hit-zone material (shared, large clickable area per planet)
const hitMat = new THREE.MeshBasicMaterial({ visible: false });

planetDefs.forEach((def, idx) => {
    // Orbit ring
    const pts = [];
    for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(
            Math.cos(a) * def.orbitRadius, 0, Math.sin(a) * def.orbitRadius
        ));
    }
    solarGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.12 })
    ));

    // Pivot (orbit parent)
    const pivot = new THREE.Group();
    solarGroup.add(pivot);

    // Visual planet mesh
    const geo = new THREE.SphereGeometry(def.radius, def.segments, def.segments);
    const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: new THREE.Color(def.emissive),
        emissiveIntensity: def.emissiveInt,
        roughness: 0.75, metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = def.orbitRadius;
    mesh.rotation.z = def.tilt;
    pivot.add(mesh);

    // LARGE INVISIBLE HIT ZONE — makes clicking easy
    const hitRadius = Math.max(def.radius * 2.5, 4);
    const hitGeo    = new THREE.SphereGeometry(hitRadius, 8, 8);
    const hitMesh   = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.x = def.orbitRadius;
    pivot.add(hitMesh);
    hitZones.push({ mesh: hitMesh, data: { ...def, emissiveInt: def.emissiveInt }, visualMesh: mesh });

    // Saturn rings
    if (def.hasRings) {
        const ringGeo = new THREE.TorusGeometry(def.radius * 1.85, def.radius * 0.55, 2, IS_MOBILE ? 60 : 120);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xddbb88, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
    }

    // Earth's Moon
    if (def.hasMoon) {
        const moonPivot = new THREE.Group();
        const moonGeo   = new THREE.SphereGeometry(0.5, 12, 12);
        const moonMat   = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, emissive: 0x222222, emissiveIntensity: 0.1, roughness: 0.9,
        });
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.position.x = 3.5;
        moonPivot.add(moon);
        mesh.add(moonPivot);
        mesh._moonPivot = moonPivot;

        // Moon hit zone
        const mhGeo  = new THREE.SphereGeometry(2.5, 8, 8);
        const mhMesh = new THREE.Mesh(mhGeo, hitMat);
        mhMesh.position.x = 3.5;
        moonPivot.add(mhMesh);
        hitZones.push({
            mesh: mhMesh,
            data: {
                name: 'LUNA — EARTH\'S MOON', tag: 'SATELLITE',
                desc: 'Earth\'s only natural satellite. The Moon stabilises our axial tilt and drives tidal patterns. First visited by humans on 20 July 1969 (Apollo 11).',
                stats: [
                    { lbl: 'DIAMETER',    val: '3,474 KM'    },
                    { lbl: 'ORBIT PERIOD',val: '27.3 DAYS'   },
                    { lbl: 'DISTANCE',    val: '384,400 KM'  },
                    { lbl: 'SURFACE TEMP',val: '-20°C AVG'   },
                    { lbl: 'MISSIONS',    val: '6 LANDINGS'  },
                    { lbl: 'STATUS',      val: '⊙ EXPLORED'  },
                ],
                emissiveInt: 0.1,
            },
            visualMesh: moon,
        });
    }

    const startAngle = (idx / planetDefs.length) * Math.PI * 2;
    pivot.rotation.y = startAngle;

    planets.push({
        mesh, pivot, def,
        angle: startAngle,
        floatVx: 0, floatVy: 0,
        floatOffX: 0, floatOffY: 0,
    });
});

// Sun hit zone
const sunHitGeo  = new THREE.SphereGeometry(14, 8, 8);
const sunHitMesh = new THREE.Mesh(sunHitGeo, hitMat);
scene.add(sunHitMesh);
hitZones.push({
    mesh: sunHitMesh,
    data: {
        name: 'SOL — THE SUN', tag: 'STAR · CLASS G2V',
        desc: 'Our star — a G-type main-sequence yellow dwarf producing energy via hydrogen nuclear fusion in its core. It contains 99.86% of all mass in the solar system.',
        stats: [
            { lbl: 'DIAMETER',    val: '1,392,700 KM'  },
            { lbl: 'MASS',        val: '2×10³⁰ KG'     },
            { lbl: 'SURFACE TEMP',val: '5,500°C'        },
            { lbl: 'CORE TEMP',   val: '15,000,000°C'  },
            { lbl: 'AGE',         val: '4.6 BILLION YRS' },
            { lbl: 'STATUS',      val: '☀ ACTIVE STAR'  },
        ],
        emissiveInt: 2.0,
    },
    visualMesh: sunMesh,
});

/* ================================================================
   ASTEROID BELT
   ================================================================ */
const beltPositions = new Float32Array(BELT_COUNT * 3);
for (let i = 0; i < BELT_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 52 + Math.random() * 14;
    beltPositions[i * 3]     = Math.cos(angle) * r;
    beltPositions[i * 3 + 1] = (Math.random() - 0.5) * 3;
    beltPositions[i * 3 + 2] = Math.sin(angle) * r;
}
const beltGeo = new THREE.BufferGeometry();
beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPositions, 3));
const beltMat = new THREE.PointsMaterial({
    color: 0x886644, size: IS_MOBILE ? 0.5 : 0.35,
    transparent: true, opacity: 0.7, sizeAttenuation: true,
});
const asteroidBelt = new THREE.Points(beltGeo, beltMat);
solarGroup.add(asteroidBelt);

/* ================================================================
   MOUSE
   ================================================================ */
const mouse    = new THREE.Vector2();
const mouseWorld = new THREE.Vector3();
const raycaster  = new THREE.Raycaster();
raycaster.params.Points.threshold = 2; // more forgiving point detection
let targetCamRotX = 0, targetCamRotY = 0;

window.addEventListener('mousemove', (e) => {
    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    targetCamRotY = mouse.x * 0.15;
    targetCamRotX = mouse.y * 0.10;

    // Approximate 3D mouse world pos at z=0 plane
    raycaster.setFromCamera(mouse, camera);
    const dir = raycaster.ray.direction;
    const t   = -camera.position.z / dir.z;
    mouseWorld.copy(camera.position).addScaledVector(dir, Math.max(t, 10));
});

window.addEventListener('touchmove', (e) => {
    const t  = e.touches[0];
    mouse.x  =  (t.clientX / window.innerWidth)  * 2 - 1;
    mouse.y  = -(t.clientY / window.innerHeight) * 2 + 1;
    targetCamRotY = mouse.x * 0.08;
    targetCamRotX = mouse.y * 0.05;
}, { passive: true });

/* ================================================================
   INSPECT PANEL (always available — any section, any click)
   ================================================================ */
const inspectPanel = document.getElementById('inspect-panel');
const panelTitle   = document.getElementById('panelTitle');
const panelDesc    = document.getElementById('panelDesc');
const panelTag     = document.getElementById('panelTag');
const panelStats   = document.getElementById('panelStats');
const panelClose   = document.getElementById('panelClose');

let lastHoveredZone = null;

function openPanel(data) {
    panelTag.textContent   = data.tag  || 'BODY';
    panelTitle.textContent = data.name || '—';
    panelDesc.textContent  = data.desc || '';
    panelStats.innerHTML   = (data.stats || []).map(s =>
        `<div class="panel-stat">
            <span class="lbl">${s.lbl}:</span>
            <span class="val">${s.val}</span>
        </div>`
    ).join('');
    inspectPanel.classList.remove('panel-hidden');
    inspectPanel.classList.add('panel-visible');
}

function closePanel() {
    inspectPanel.classList.remove('panel-visible');
    inspectPanel.classList.add('panel-hidden');
}

panelClose.addEventListener('click', closePanel);

// Click detection using hit zones
canvas.addEventListener('click', () => {
    raycaster.setFromCamera(mouse, camera);
    const hitMeshes = hitZones.map(hz => hz.mesh);
    const hits = raycaster.intersectObjects(hitMeshes, false);

    if (hits.length > 0) {
        // Find matching hit zone
        const hitMesh  = hits[0].object;
        const zone     = hitZones.find(hz => hz.mesh === hitMesh);
        if (zone) {
            openPanel(zone.data);
            // Pulse the visual mesh for feedback
            if (zone.visualMesh) {
                gsap.to(zone.visualMesh.scale, {
                    x: 1.4, y: 1.4, z: 1.4, duration: 0.2, yoyo: true, repeat: 1,
                });
            }
        }
    } else {
        closePanel();
    }
});

// Touch support for mobile
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const t  = e.changedTouches[0];
    mouse.x  =  (t.clientX / window.innerWidth)  * 2 - 1;
    mouse.y  = -(t.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hitMeshes = hitZones.map(hz => hz.mesh);
    const hits = raycaster.intersectObjects(hitMeshes, false);

    if (hits.length > 0) {
        const zone = hitZones.find(hz => hz.mesh === hits[0].object);
        if (zone) openPanel(zone.data);
    } else {
        closePanel();
    }
}, { passive: false });

/* ================================================================
   HOVER DETECTION — visual glow feedback
   ================================================================ */
function checkHover() {
    raycaster.setFromCamera(mouse, camera);
    const hitMeshes = hitZones.map(hz => hz.mesh);
    const hits = raycaster.intersectObjects(hitMeshes, false);

    if (hits.length > 0) {
        const zone = hitZones.find(hz => hz.mesh === hits[0].object);
        if (zone && zone !== lastHoveredZone) {
            // Un-hover previous
            if (lastHoveredZone?.visualMesh) {
                gsap.to(lastHoveredZone.visualMesh.material, {
                    emissiveIntensity: lastHoveredZone.data.emissiveInt, duration: 0.4,
                });
                gsap.to(lastHoveredZone.visualMesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
            }
            // Hover new
            if (zone.visualMesh) {
                gsap.to(zone.visualMesh.material, { emissiveIntensity: 1.2, duration: 0.3 });
                gsap.to(zone.visualMesh.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.3 });
            }
            lastHoveredZone = zone;
            canvas.style.cursor = 'pointer';

            // Update HUD label on hover
            if (zone.data.name) {
                document.getElementById('hudSync').textContent = zone.data.name;
            }
        }
    } else {
        if (lastHoveredZone?.visualMesh) {
            gsap.to(lastHoveredZone.visualMesh.material, {
                emissiveIntensity: lastHoveredZone.data.emissiveInt, duration: 0.4,
            });
            gsap.to(lastHoveredZone.visualMesh.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
            lastHoveredZone = null;
            canvas.style.cursor = 'default';
            document.getElementById('hudSync').textContent = 'ORBIT SYNC';
        }
    }
}

/* ================================================================
   CAMERA STATE
   ================================================================ */
const cam = {
    posX: 0, posY: 60, posZ: 150,
    tarX: 0, tarY: 0,  tarZ: 0,
    fov: 55,
    sunApproach: 0,
};
let orbitSpeedMult = 1;
let currentSection = 0;

const hudOverlay    = document.getElementById('hud-overlay');
const mainNav       = document.getElementById('main-nav');
const navIndicator  = document.getElementById('navIndicator');
const navItems      = document.querySelectorAll('.nav-item');
const siteFooter    = document.getElementById('site-footer');
const hudSectionLbl = document.getElementById('hudSectionLabel');
const sunOverlay    = document.getElementById('sun-overlay');
const sunText       = document.getElementById('sun-text');
const allSections   = ['sec-hero','sec-01','sec-02','sec-03','sec-04','sec-05','sec-06'];

function showSection(id) {
    allSections.forEach(s => document.getElementById(s)?.classList.remove('visible'));
    document.getElementById(id)?.classList.add('visible');
}
function setNavActive(idx) {
    navItems.forEach((n, i) => n.classList.toggle('active', i === idx));
    const li = document.querySelectorAll('#main-nav li');
    if (li[idx]) navIndicator.style.top = (li[idx].offsetTop + 6) + 'px';
}

/* ================================================================
   START EXPERIENCE
   ================================================================ */
function startExperience() {
    hudOverlay.classList.remove('hud-hidden');
    mainNav.classList.remove('nav-hidden');
    siteFooter.classList.add('visible');
    showSection('sec-hero');
    setupScroll();
}

document.getElementById('enterBtn').addEventListener('click', () => {
    gsap.to(cam, { posY: 30, posZ: 100, duration: 1.5, ease: 'power2.inOut' });
});
document.getElementById('restartBtn').addEventListener('click', () => {
    gsap.to(document.documentElement, { scrollTop: 0, duration: 1.5, ease: 'power3.inOut' });
});
navItems.forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const idx  = parseInt(item.dataset.section);
        const total = document.body.scrollHeight - window.innerHeight;
        const tgts  = [0, 0.14, 0.28, 0.42, 0.56, 0.70, 0.84];
        gsap.to(document.documentElement, {
            scrollTop: (tgts[idx] || 0) * total, duration: 1.2, ease: 'power3.inOut',
        });
    });
});

/* ================================================================
   GSAP SCROLL TRIGGER
   ================================================================ */
function setupScroll() {
    gsap.registerPlugin(ScrollTrigger);

    // SEC 01 — Inner Planets 14–28%
    ScrollTrigger.create({ start: '14% top', end: '28% top', scrub: 1.2,
        onUpdate(self) {
            const p = self.progress;
            cam.posY = gsap.utils.interpolate(60, 15, p);
            cam.posZ = gsap.utils.interpolate(150, 75, p);
            if (p > 0.08 && currentSection !== 1) {
                currentSection = 1; showSection('sec-01'); setNavActive(0);
                hudSectionLbl.textContent = 'SECTOR: INNER';
            }
        }
    });

    // SEC 02 — Asteroid Belt 28–42%
    ScrollTrigger.create({ start: '28% top', end: '42% top', scrub: 1.2,
        onUpdate(self) {
            const p = self.progress;
            cam.posX = gsap.utils.interpolate(0,  -35, p);
            cam.posY = gsap.utils.interpolate(15,  20, p);
            cam.posZ = gsap.utils.interpolate(75,  90, p);
            cam.tarX = gsap.utils.interpolate(0,  -10, p);
            cam.fov  = gsap.utils.interpolate(55,  68, p);
            if (p > 0.08 && currentSection !== 2) {
                currentSection = 2; showSection('sec-02'); setNavActive(1);
                hudSectionLbl.textContent = 'SECTOR: BELT';
            }
        }
    });

    // SEC 03 — Gas Giants 42–56%
    ScrollTrigger.create({ start: '42% top', end: '56% top', scrub: 1.2,
        onUpdate(self) {
            const p = self.progress;
            cam.posX = gsap.utils.interpolate(-35,  25, p);
            cam.posY = gsap.utils.interpolate(20,   35, p);
            cam.posZ = gsap.utils.interpolate(90,  130, p);
            cam.tarX = gsap.utils.interpolate(-10,  10, p);
            cam.fov  = gsap.utils.interpolate(68,   60, p);
            if (p > 0.08 && currentSection !== 3) {
                currentSection = 3; showSection('sec-03'); setNavActive(2);
                hudSectionLbl.textContent = 'SECTOR: GAS GIANTS';
            }
        }
    });

    // SEC 04 — Inspect 56–70%
    ScrollTrigger.create({ start: '56% top', end: '70% top', scrub: 1,
        onUpdate(self) {
            const p = self.progress;
            cam.posX = gsap.utils.interpolate(25,    0, p);
            cam.posY = gsap.utils.interpolate(35,   60, p);
            cam.posZ = gsap.utils.interpolate(130, 110, p);
            cam.tarX = gsap.utils.interpolate(10,    0, p);
            cam.fov  = gsap.utils.interpolate(60,   55, p);
            if (p > 0.08 && currentSection !== 4) {
                currentSection = 4; showSection('sec-04');
                hudSectionLbl.textContent = 'SECTOR: EXPLORE';
            }
        }
    });

    // SEC 05 — Ice Giants 70–82%
    ScrollTrigger.create({ start: '70% top', end: '82% top', scrub: 1,
        onUpdate(self) {
            const p = self.progress;
            cam.posY = gsap.utils.interpolate(60,   20, p);
            cam.posZ = gsap.utils.interpolate(110, 220, p);
            cam.fov  = gsap.utils.interpolate(55,   70, p);
            orbitSpeedMult = gsap.utils.interpolate(1, 3.5, p);
            const warn = document.getElementById('overloadWarning');
            if (p > 0.4) warn.classList.add('visible'); else warn.classList.remove('visible');
            if (p > 0.08 && currentSection !== 5) {
                currentSection = 5; showSection('sec-05'); setNavActive(3);
                hudSectionLbl.textContent = 'SECTOR: ICE GIANTS'; closePanel();
            }
        }
    });

    // SEC 06 — Overview 82–92%
    ScrollTrigger.create({ start: '82% top', end: '92% top', scrub: 1,
        onUpdate(self) {
            const p = self.progress;
            cam.posX = gsap.utils.interpolate(0,     0, p);
            cam.posY = gsap.utils.interpolate(20,  100, p);
            cam.posZ = gsap.utils.interpolate(220, 280, p);
            cam.fov  = gsap.utils.interpolate(70,   55, p);
            orbitSpeedMult = gsap.utils.interpolate(3.5, 0.5, p);
            if (p > 0.08 && currentSection !== 6) {
                currentSection = 6; showSection('sec-06');
                hudSectionLbl.textContent = 'SECTOR: OVERVIEW';
            }
        }
    });

    // FLY INTO THE SUN 92–100%
    ScrollTrigger.create({ start: '92% top', end: '100% top', scrub: 0.8,
        onUpdate(self) {
            const p = self.progress;
            cam.posX = 0; cam.posY = gsap.utils.interpolate(100, 0, p);
            cam.posZ = gsap.utils.interpolate(280, 10, p);
            cam.tarX = 0; cam.tarY = 0; cam.tarZ = 0;
            cam.fov  = gsap.utils.interpolate(55, 100, p);
            cam.sunApproach = p;

            sunMesh.scale.setScalar(gsap.utils.interpolate(1, 3.5, p));
            sunLight.intensity        = gsap.utils.interpolate(3.5, 30, p);
            sunOverlay.style.opacity  = gsap.utils.interpolate(0, 0.95, p);
            sunText.style.opacity     = p > 0.6 ? gsap.utils.interpolate(0, 1, (p - 0.6) / 0.4) : '0';
            hudOverlay.style.opacity  = gsap.utils.interpolate(1, 0, Math.min(p * 2, 1));
            orbitSpeedMult = gsap.utils.interpolate(0.5, 5, p);

            if (p > 0.05 && currentSection !== 7) {
                currentSection = 7;
                allSections.forEach(s => document.getElementById(s)?.classList.remove('visible'));
                closePanel();
            }
        },
        onLeaveBack() {
            sunMesh.scale.setScalar(1);
            sunLight.intensity       = 3.5;
            sunOverlay.style.opacity = '0';
            sunText.style.opacity    = '0';
            hudOverlay.style.opacity = '1';
            cam.sunApproach = 0;
        }
    });
}

/* ================================================================
   FLOATING PHYSICS — mouse repulsion + spring return
   ================================================================ */
const REPEL_RADIUS = 30;
const REPEL_FORCE  = 0.07;
const SPRING_K     = 0.04;
const DAMPEN       = 0.88;

function updateFloatingPhysics() {
    planets.forEach(p => {
        // Get planet world position
        const wp = new THREE.Vector3();
        p.mesh.getWorldPosition(wp);

        const dx   = wp.x - mouseWorld.x;
        const dy   = wp.y - mouseWorld.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0.1) {
            const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_FORCE;
            p.floatVx += (dx / dist) * force;
            p.floatVy += (dy / dist) * force;
        }

        // Spring back
        p.floatVx += -p.floatOffX * SPRING_K;
        p.floatVy += -p.floatOffY * SPRING_K;
        p.floatVx *= DAMPEN;
        p.floatVy *= DAMPEN;
        p.floatOffX += p.floatVx;
        p.floatOffY += p.floatVy;

        p.pivot.position.x = p.floatOffX;
        p.pivot.position.y = p.floatOffY;
    });

    // Sun float
    const sdx  = sunMesh.position.x - mouseWorld.x;
    const sdy  = sunMesh.position.y - mouseWorld.y;
    const sd   = Math.sqrt(sdx * sdx + sdy * sdy);
    if (sd < 40 && sd > 0.1) {
        const force = ((40 - sd) / 40) * 0.035;
        sunFloat.vx += (sdx / sd) * force;
        sunFloat.vy += (sdy / sd) * force;
    }
    sunFloat.vx += -sunFloat.ox * 0.025;
    sunFloat.vy += -sunFloat.oy * 0.025;
    sunFloat.vx *= 0.90;
    sunFloat.vy *= 0.90;
    sunFloat.ox += sunFloat.vx;
    sunFloat.oy += sunFloat.vy;
    sunMesh.position.x = sunFloat.ox;
    sunMesh.position.y = sunFloat.oy;
}

/* ================================================================
   ANIMATION LOOP
   ================================================================ */
let time = 0;

function animate() {
    requestAnimationFrame(animate);
    time += 0.005;

    // Camera lerp
    camera.position.x += (cam.posX + targetCamRotY * 6 - camera.position.x) * 0.04;
    camera.position.y += (cam.posY + targetCamRotX * 4 - camera.position.y) * 0.04;
    camera.position.z += (cam.posZ                     - camera.position.z) * 0.04;
    camera.fov        += (cam.fov - camera.fov) * 0.05;
    camera.updateProjectionMatrix();
    camera.lookAt(cam.tarX, cam.tarY, cam.tarZ);

    // Sun
    sunMesh.rotation.y += 0.002;
    if (cam.sunApproach < 0.05) {
        sunMesh.material.emissiveIntensity = 1.8 + Math.sin(time * 3) * 0.3;
        sunLight.intensity = 2.8 + Math.sin(time * 2) * 0.5;
    }

    // Planets
    planets.forEach(p => {
        p.angle += p.def.orbitSpeed * 0.0008 * orbitSpeedMult;
        p.pivot.rotation.y = p.angle;
        p.mesh.rotation.y += 0.008 + p.def.orbitSpeed * 0.001;
        if (p.mesh._moonPivot) p.mesh._moonPivot.rotation.y += 0.04 * orbitSpeedMult;
        // Gentle sine bob
        p.mesh.position.y = Math.sin(time * 0.8 + p.def.orbitRadius) * 0.25;
    });

    asteroidBelt.rotation.y += 0.0004 * orbitSpeedMult;

    // Star drift with mouse
    starField.rotation.y += (mouse.x * 0.001 - starField.rotation.y * 0.001);
    starField.rotation.x += (mouse.y * 0.0005 - starField.rotation.x * 0.0005);

    updateFloatingPhysics();
    checkHover();

    renderer.render(scene, camera);
}

/* ================================================================
   INIT
   ================================================================ */
runBootSequence(() => {
    animate();
    startExperience();
});
