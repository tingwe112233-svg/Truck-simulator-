const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7dd3fc);
scene.fog = new THREE.FogExp2(0xbae6fd, 0.0052);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 320);

const hemiLight = new THREE.HemisphereLight(0xf0f9ff, 0x334155, 1.05);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.05);
dirLight.position.set(30, 55, 25);
scene.add(dirLight);

// Langit Gradasi Atmosfer
function createSkyTexture(isNight) {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  if (isNight) {
    g.addColorStop(0, '#020617');
    g.addColorStop(0.55, '#0f172a');
    g.addColorStop(1, '#1e293b');
  } else {
    g.addColorStop(0, '#0284c7');
    g.addColorStop(0.5, '#7dd3fc');
    g.addColorStop(1, '#e0f2fe');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 256);
  return new THREE.CanvasTexture(c);
}
const skyMat = new THREE.MeshBasicMaterial({ map: createSkyTexture(false), side: THREE.BackSide, fog: false });
const skyDome = new THREE.Mesh(new THREE.SphereGeometry(280, 20, 14), skyMat);
scene.add(skyDome);

// Tekstur Aspal & Marka Jalan Realistis
function createRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#272a30';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  // Bahu jalan & garis kuning ganda
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 24, 512);
  ctx.fillRect(488, 0, 24, 512);

  ctx.fillStyle = '#eab308';
  ctx.fillRect(28, 0, 8, 512);
  ctx.fillRect(476, 0, 8, 512);

  // Marka tengah jalan putih putus-putus
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(251, 24, 10, 180);
  ctx.fillRect(251, 280, 10, 180);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 36);
  tex.anisotropy = 4;
  return tex;
}

const roadTex = createRoadTexture();
const roadMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 720),
  new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.82 })
);
roadMesh.rotation.x = -Math.PI / 2;
scene.add(roadMesh);

const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 720),
  new THREE.MeshStandardMaterial({ color: 0x2d4a2b, roughness: 0.95 })
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.06;
scene.add(groundMesh);

// Pembatas Jalan Beton (Jersey Barrier) & Lingkungan Modular
const barrierShape = new THREE.Shape();
barrierShape.moveTo(-0.32, 0);
barrierShape.lineTo(0.32, 0);
barrierShape.lineTo(0.16, 0.35);
barrierShape.lineTo(0.1, 0.85);
barrierShape.lineTo(-0.1, 0.85);
barrierShape.lineTo(-0.16, 0.35);
barrierShape.closePath();

const barrierGeo = new THREE.ExtrudeGeometry(barrierShape, { depth: 24, bevelEnabled: false });
const barrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.8 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5 });
const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
const bldgMats = [0x94a3b8, 0xcbd5e1, 0x78716c, 0xa8a29e].map(col => new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }));

const envSegments = [];
for (let i = 0; i < 18; i++) {
  const seg = new THREE.Group();
  const zPos = 48 - i * 24;
  seg.position.z = zPos;

  [-1, 1].forEach(side => {
    const barrier = new THREE.Mesh(barrierGeo, barrierMat);
    barrier.position.set(side * 8.2, 0, -12);
    seg.add(barrier);

    if (i % 2 === 0) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.8, 8), poleMat);
      pole.position.set(side * 8.9, 3.4, 0);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.08), poleMat);
      arm.position.set(side * 8.1, 6.7, 0);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.22), lampBulbMat);
      bulb.position.set(side * 7.4, 6.62, 0);
      seg.add(pole, arm, bulb);
    }

    if ((i + (side > 0 ? 1 : 0)) % 3 !== 0) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.8, 8), trunkMat);
      trunk.position.set(side * (12.5 + (i % 4) * 1.4), 1.4, 2);
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), leafMat);
      c1.position.set(trunk.position.x, 3.5, 2);
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.3, 10, 8), leafMat);
      c2.position.set(trunk.position.x + 0.7, 4.3, 2.5);
      seg.add(trunk, c1, c2);
    } else {
      const h = 4.5 + (i % 3) * 2.2;
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(6.5, h, 10), bldgMats[i % bldgMats.length]);
      bldg.position.set(side * 15.5, h / 2, 0);
      seg.add(bldg);
    }
  });

  scene.add(seg);
  envSegments.push(seg);
}

// ==========================================
// MODEL 3D TRUK BOX AERODINAMIS & RHD KOKPIT
// ==========================================
const truckRoot = new THREE.Group();
scene.add(truckRoot);

const exteriorGroup = new THREE.Group();
truckRoot.add(exteriorGroup);

// Profil Kabin Truk Melengkung (ExtrudeGeometry)
const cabShape = new THREE.Shape();
cabShape.moveTo(-1.85, 0.65);
cabShape.lineTo(0.25, 0.65);
cabShape.lineTo(0.25, 2.65);
cabShape.lineTo(-1.15, 2.65);
cabShape.quadraticCurveTo(-1.55, 2.62, -1.78, 1.65);
cabShape.quadraticCurveTo(-1.92, 1.25, -1.85, 0.65);

const cabGeo = new THREE.ExtrudeGeometry(cabShape, {
  depth: 2.04, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.08, bevelThickness: 0.08
});
cabGeo.rotateY(Math.PI / 2);
const cabMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.25 });
const cabMesh = new THREE.Mesh(cabGeo, cabMat);
cabMesh.position.set(-1.02, 0.1, -1.55);

// Topi Aerodinamis (Wind Deflector) di atas kabin
const deflector = new THREE.Mesh(
  new THREE.ConeGeometry(1.15, 0.85, 4),
  cabMat
);
deflector.rotation.y = Math.PI / 4;
deflector.scale.set(1.3, 0.85, 0.9);
deflector.position.set(0, 3.05, -1.85);

// Kaca Depan & Samping Eksterior
const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.85 });
const extWindshield = new THREE.Mesh(new THREE.PlaneGeometry(1.94, 0.86), glassMat);
extWindshield.position.set(0, 2.24, -2.97);
extWindshield.rotation.x = -0.24;

// Gril Depan & Bumper Truk
const grille = new THREE.Mesh(
  new THREE.BoxGeometry(1.65, 0.45, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 })
);
grille.position.set(0, 1.25, -3.46);

const frontBumper = new THREE.Mesh(
  new THREE.BoxGeometry(2.26, 0.34, 0.28),
  new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
);
frontBumper.position.set(0, 0.78, -3.42);

// Box Kargo Aluminium Bergelombang
function createBoxTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#cbd5e1';
  for (let x = 0; x < 256; x += 14) ctx.fillRect(x, 0, 5, 256);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 175, 256, 28);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const cargoBox = new THREE.Mesh(
  new THREE.BoxGeometry(2.36, 2.48, 4.65),
  new THREE.MeshStandardMaterial({ map: createBoxTexture(), roughness: 0.4, metalness: 0.35 })
);
cargoBox.position.set(0, 2.18, 1.15);

const chassis = new THREE.Mesh(
  new THREE.BoxGeometry(1.12, 0.32, 6.7),
  new THREE.MeshStandardMaterial({ color: 0x1e293b })
);
chassis.position.set(0, 0.72, 0.1);

// 6 Roda dengan Velg Baja & Hub Tengah
const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 22);
tireGeo.rotateZ(Math.PI / 2);
const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.34, 14);
rimGeo.rotateZ(Math.PI / 2);
const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.3 });

const wheels = [];
[
  [-1.06, 0.48, -2.35], [1.06, 0.48, -2.35],
  [-1.06, 0.48, 2.05],  [1.06, 0.48, 2.05],
  [-1.06, 0.48, 3.12],  [1.06, 0.48, 3.12]
].forEach(p => {
  const wGrp = new THREE.Group();
  wGrp.position.set(...p);
  wGrp.add(new THREE.Mesh(tireGeo, tireMat), new THREE.Mesh(rimGeo, rimMat));
  exteriorGroup.add(wGrp);
  wheels.push(wGrp);
});

const headLightMatL = new THREE.MeshBasicMaterial({ color: 0x475569 });
const headLightMatR = new THREE.MeshBasicMaterial({ color: 0x475569 });
const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.08), headLightMatL);
hlLeft.position.set(-0.82, 0.82, -3.54);
const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.08), headLightMatR);
hlRight.position.set(0.82, 0.82, -3.54);

const tailLeftMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
const tailRightMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.08), tailLeftMat);
tailL.position.set(-0.86, 0.84, 3.48);
const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.08), tailRightMat);
tailR.position.set(0.86, 0.84, 3.48);

exteriorGroup.add(cabMesh, deflector, extWindshield, grille, frontBumper, cargoBox, chassis, hlLeft, hlRight, tailL, tailR);

const headSpot = new THREE.SpotLight(0xfffbeb, 0, 75, Math.PI / 4, 0.45, 1);
headSpot.position.set(0, 1.2, -3.4);
headSpot.target.position.set(0, 0.2, -26);
truckRoot.add(headSpot, headSpot.target);

// ==========================================
// KOKPIT SETIR KANAN (RHD) & PANEL INSTRUMEN HIDUP
// ==========================================
const cockpitGroup = new THREE.Group();
truckRoot.add(cockpitGroup);

const dashMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 });

const mainDash = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.52, 0.68), dashMat);
mainDash.position.set(0, 1.74, -2.56);

const rhdHood = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.24, 0.48), trimMat);
rhdHood.position.set(0.46, 2.08, -2.48);

// Layar Kluster Jarum Analog RPM & KM/H di Depan Setir Kanan
const dashCanvas = document.createElement('canvas');
dashCanvas.width = 256; dashCanvas.height = 128;
const dashCtx = dashCanvas.getContext('2d');
const dashTex = new THREE.CanvasTexture(dashCanvas);

const gaugeScreen = new THREE.Mesh(
  new THREE.PlaneGeometry(0.54, 0.19),
  new THREE.MeshBasicMaterial({ map: dashTex })
);
gaugeScreen.position.set(0.46, 2.06, -2.23);
gaugeScreen.rotation.x = -0.22;

function updateDashCluster(speedKmh, rpm, gear, leftOn, rightOn, brakeOn) {
  dashCtx.fillStyle = '#090d16';
  dashCtx.fillRect(0, 0, 256, 128);

  // Dial Kiri (RPM) & Dial Kanan (KM/H)
  const dials = [
    { cx: 68, cy: 68, val: Math.min(1, rpm / 3500), col: '#f59e0b', lbl: 'RPM' },
    { cx: 188, cy: 68, val: Math.min(1, speedKmh / 100), col: '#38bdf8', lbl: 'KM/H' }
  ];
  dials.forEach(d => {
    dashCtx.strokeStyle = '#334155';
    dashCtx.lineWidth = 5;
    dashCtx.beginPath();
    dashCtx.arc(d.cx, d.cy, 44, Math.PI * 0.75, Math.PI * 2.25);
    dashCtx.stroke();

    const ang = Math.PI * 0.75 + d.val * Math.PI * 1.5;
    dashCtx.strokeStyle = d.col;
    dashCtx.lineWidth = 3;
    dashCtx.beginPath();
    dashCtx.moveTo(d.cx, d.cy);
    dashCtx.lineTo(d.cx + Math.cos(ang) * 38, d.cy + Math.sin(ang) * 38);
    dashCtx.stroke();

    dashCtx.fillStyle = '#94a3b8';
    dashCtx.font = 'bold 11px sans-serif';
    dashCtx.textAlign = 'center';
    dashCtx.fillText(d.lbl, d.cx, d.cy + 26);
  });

  // Indikator Gigi & Sein di Tengah Kluster
  dashCtx.fillStyle = '#fbbf24';
  dashCtx.font = 'bold 22px monospace';
  dashCtx.textAlign = 'center';
  dashCtx.fillText(gear === 0 ? 'N' : (gear === -1 ? 'R' : gear), 128, 76);

  if (leftOn) { dashCtx.fillStyle = '#22c55e'; dashCtx.fillRect(104, 22, 14, 10); }
  if (rightOn) { dashCtx.fillStyle = '#22c55e'; dashCtx.fillRect(138, 22, 14, 10); }
  if (brakeOn) { dashCtx.fillStyle = '#ef4444'; dashCtx.fillRect(121, 96, 14, 10); }
  dashTex.needsUpdate = true;
}
updateDashCluster(0, 800, 0, false, false, true);

const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.06, 10), trimMat);
pillarL.position.set(-1.01, 2.42, -2.64);
pillarL.rotation.x = -0.2;

const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.06, 10), trimMat);
pillarR.position.set(1.01, 2.42, -2.64);
pillarR.rotation.x = -0.2;

const roofHeader = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.42), trimMat);
roofHeader.position.set(0, 2.9, -2.54);

// Setir Kanan 3D
const steering3D = new THREE.Group();
steering3D.position.set(0.46, 1.95, -2.14);
steering3D.rotation.x = -0.58;

const rim3D = new THREE.Mesh(
  new THREE.TorusGeometry(0.22, 0.024, 12, 32),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 })
);
const hub3D = new THREE.Mesh(
  new THREE.CylinderGeometry(0.075, 0.075, 0.04, 18),
  new THREE.MeshStandardMaterial({ color: 0x334155 })
);
hub3D.rotation.x = Math.PI / 2;
const spoke3D = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.02), trimMat);
steering3D.add(rim3D, hub3D, spoke3D);

// Kaca Depan & Wiper Ganda
const rainCanvas = document.createElement('canvas');
rainCanvas.width = 512; rainCanvas.height = 256;
const rainCtx = rainCanvas.getContext('2d');
const rainTex = new THREE.CanvasTexture(rainCanvas);

const windshieldRainPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(1.96, 0.92),
  new THREE.MeshBasicMaterial({ map: rainTex, transparent: true, opacity: 0.85, depthWrite: false })
);
windshieldRainPlane.position.set(0, 2.42, -2.68);
windshieldRainPlane.rotation.x = -0.2;

function createWiper(xPos) {
  const pivot = new THREE.Group();
  pivot.position.set(xPos, 1.99, -2.74);
  pivot.rotation.x = -0.2;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.68, 0.02), new THREE.MeshBasicMaterial({ color: 0x090d16 }));
  arm.position.y = 0.34;
  pivot.add(arm);
  return pivot;
}
const wiperL = createWiper(-0.42);
const wiperR = createWiper(0.35);

// Spion Kiri & Kanan Real-Time
const mirrorRTL = new THREE.WebGLRenderTarget(128, 192);
const mirrorRTR = new THREE.WebGLRenderTarget(128, 192);

const mirrorCamL = new THREE.PerspectiveCamera(54, 128 / 192, 0.2, 180);
mirrorCamL.position.set(-1.2, 2.35, -2.4);
mirrorCamL.rotation.y = Math.PI - 0.12;

const mirrorCamR = new THREE.PerspectiveCamera(54, 128 / 192, 0.2, 180);
mirrorCamR.position.set(1.2, 2.35, -2.4);
mirrorCamR.rotation.y = Math.PI + 0.12;
truckRoot.add(mirrorCamL, mirrorCamR);

function createSideMirror(side, renderTarget) {
  const grp = new THREE.Group();
  grp.position.set(side * 1.18, 2.35, -2.52);
  grp.rotation.y = side * -0.22;

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 8), trimMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(-side * 0.12, 0.12, 0);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.37, 0.06), trimMat);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.19, 0.33),
    new THREE.MeshBasicMaterial({ map: renderTarget.texture })
  );
  glass.position.z = 0.032;
  glass.scale.x = -1;
  grp.add(arm, housing, glass);
  return grp;
}
const mirrorMeshL = createSideMirror(-1, mirrorRTL);
const mirrorMeshR = createSideMirror(1, mirrorRTR);

cockpitGroup.add(
  mainDash, rhdHood, gaugeScreen, pillarL, pillarR, roofHeader,
  steering3D, windshieldRainPlane, wiperL, wiperR, mirrorMeshL, mirrorMeshR
);

// ==========================================
// LALU LINTAS AI BENTUK SEDAN & TRUK REALISTIS
// ==========================================
const trafficCars = [];
const carColors = [0xdc2626, 0x2563eb, 0xf8fafc, 0x059669, 0x475569, 0xd97706];

const sedanShape = new THREE.Shape();
sedanShape.moveTo(-2.1, 0.35);
sedanShape.lineTo(2.1, 0.35);
sedanShape.lineTo(2.05, 0.88);
sedanShape.lineTo(1.35, 0.95);
sedanShape.lineTo(0.85, 1.48);
sedanShape.lineTo(-0.75, 1.48);
sedanShape.lineTo(-1.35, 0.95);
sedanShape.lineTo(-2.08, 0.85);
sedanShape.closePath();

const sedanGeo = new THREE.ExtrudeGeometry(sedanShape, {
  depth: 1.72, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.06, bevelThickness: 0.06
});
sedanGeo.rotateY(Math.PI / 2);

for (let i = 0; i < 6; i++) {
  const car = new THREE.Group();
  const isOpposite = i % 2 === 1;
  const laneX = isOpposite ? -2.4 : 2.4;

  const body = new THREE.Mesh(
    sedanGeo,
    new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], roughness: 0.32, metalness: 0.3 })
  );
  body.position.set(-0.86, 0, 0);

  const winShield = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 0.56), glassMat);
  winShield.position.set(0, 1.22, -1.12);
  winShield.rotation.x = -0.68;

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.54, 0.52), glassMat);
  rearGlass.position.set(0, 1.22, 1.08);
  rearGlass.rotation.x = 0.72;
  rearGlass.rotation.y = Math.PI;

  const hlBar = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xfef9c3 }));
  hlBar.position.set(0, 0.68, -2.16);

  const tlBar = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  tlBar.position.set(0, 0.72, 2.16);

  car.add(body, winShield, rearGlass, hlBar, tlBar);

  [[-0.84, 0.36, -1.32], [0.84, 0.36, -1.32], [-0.84, 0.36, 1.32], [0.84, 0.36, 1.32]].forEach(wp => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 16), tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(...wp);
    car.add(w);
  });

  // Jarak awal aman minimal 55m antar mobil di depan truk
  car.position.set(laneX, 0, -85 - i * 55);
  if (isOpposite) car.rotation.y = Math.PI;
  scene.add(car);

  trafficCars.push({
    mesh: car,
    baseSpeed: isOpposite ? 12.5 : 10.5,
    speed: isOpposite ? 12.5 : 10.5,
    dir: isOpposite ? 1 : -1,
    laneX,
    halfW: 0.94,
    halfL: 2.18
  });
  }
