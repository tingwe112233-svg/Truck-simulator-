const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 45, 220);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 260);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.95);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.9);
dirLight.position.set(25, 45, 20);
scene.add(dirLight);

function createRoadTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#262930';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  ctx.fillStyle = '#eab308';
  ctx.fillRect(24, 0, 10, 512);
  ctx.fillRect(478, 0, 10, 512);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(251, 30, 10, 190);
  ctx.fillRect(251, 290, 10, 190);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 40);
  tex.anisotropy = 4;
  return tex;
}

const roadMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 1200),
  new THREE.MeshStandardMaterial({ map: createRoadTexture(), roughness: 0.85 })
);
roadMesh.rotation.x = -Math.PI / 2;
scene.add(roadMesh);

const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 1200),
  new THREE.MeshStandardMaterial({ color: 0x2d4c2b, roughness: 1 })
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.05;
scene.add(groundMesh);

const envGroup = new THREE.Group();
scene.add(envGroup);

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x1e4620 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
const buildingColors = [0x94a3b8, 0xcbd5e1, 0x78716c, 0xa8a29e, 0x64748b];

for (let z = -550; z <= 550; z += 22) {
  [-1, 1].forEach(side => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.55, 22),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5 })
    );
    rail.position.set(side * 8.3, 0.45, z);
    envGroup.add(rail);

    if (Math.abs(z) % 44 === 0) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6.5), poleMat);
      pole.position.set(side * 9.0, 3.25, z);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.08), poleMat);
      arm.position.set(side * 8.2, 6.4, z);
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.22), lampBulbMat);
      bulb.position.set(side * 7.6, 6.32, z);
      envGroup.add(pole, arm, bulb);
    }

    if (Math.random() > 0.35) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.6), trunkMat);
      trunk.position.set(side * (12 + Math.random() * 6), 1.3, z + 5);
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8 + Math.random()), leafMat);
      crown.position.set(trunk.position.x, 3.6, trunk.position.z);
      envGroup.add(trunk, crown);
    } else {
      const h = 4 + Math.random() * 6;
      const bMat = new THREE.MeshStandardMaterial({
        color: buildingColors[Math.floor(Math.random() * buildingColors.length)]
      });
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(6, h, 8), bMat);
      bldg.position.set(side * 15, h / 2, z);
      envGroup.add(bldg);
    }
  });
}

// Model 3D Truk Box & Kokpit Setir Kanan (RHD)
const truckRoot = new THREE.Group();
scene.add(truckRoot);

const exteriorGroup = new THREE.Group();
truckRoot.add(exteriorGroup);

const cabMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.2 });
const cabLower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.9), cabMat);
cabLower.position.set(0, 1.25, -2.3);
const cabUpper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.0, 1.5), cabMat);
cabUpper.position.set(0, 2.35, -2.1);

const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.8 });
const extWindshield = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.82, 0.08), glassMat);
extWindshield.position.set(0, 2.32, -2.85);
extWindshield.rotation.x = -0.15;

function createBoxTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#cbd5e1';
  for (let x = 0; x < 256; x += 16) ctx.fillRect(x, 0, 6, 256);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const cargoBox = new THREE.Mesh(
  new THREE.BoxGeometry(2.35, 2.45, 4.6),
  new THREE.MeshStandardMaterial({ map: createBoxTexture(), roughness: 0.45, metalness: 0.3 })
);
cargoBox.position.set(0, 2.15, 1.1);

const chassis = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.35, 6.6),
  new THREE.MeshStandardMaterial({ color: 0x1e293b })
);
chassis.position.set(0, 0.72, 0.1);

const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 18);
wheelGeo.rotateZ(Math.PI / 2);
const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
const wheels = [];
[
  [-1.05, 0.48, -2.3], [1.05, 0.48, -2.3],
  [-1.05, 0.48, 2.1],  [1.05, 0.48, 2.1],
  [-1.05, 0.48, 3.15], [1.05, 0.48, 3.15]
].forEach(p => {
  const w = new THREE.Mesh(wheelGeo, tireMat);
  w.position.set(...p);
  exteriorGroup.add(w);
  wheels.push(w);
});

const headLightMatL = new THREE.MeshBasicMaterial({ color: 0x334155 });
const headLightMatR = new THREE.MeshBasicMaterial({ color: 0x334155 });
const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), headLightMatL);
hlLeft.position.set(-0.78, 1.05, -3.26);
const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), headLightMatR);
hlRight.position.set(0.78, 1.05, -3.26);

const tailLeftMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
const tailRightMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.1), tailLeftMat);
tailL.position.set(-0.85, 0.85, 3.42);
const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.1), tailRightMat);
tailR.position.set(0.85, 0.85, 3.42);

exteriorGroup.add(cabLower, cabUpper, extWindshield, cargoBox, chassis, hlLeft, hlRight, tailL, tailR);

const headSpot = new THREE.SpotLight(0xfffbeb, 0, 65, Math.PI / 4, 0.4, 1);
headSpot.position.set(0, 1.3, -3.2);
headSpot.target.position.set(0, 0.2, -25);
truckRoot.add(headSpot, headSpot.target);

const cockpitGroup = new THREE.Group();
truckRoot.add(cockpitGroup);

const dashMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

const mainDash = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.55, 0.65), dashMat);
mainDash.position.set(0, 1.75, -2.55);

const rhdHood = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.48), trimMat);
rhdHood.position.set(0.46, 2.08, -2.5);

const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.12), trimMat);
pillarL.position.set(-1.02, 2.42, -2.65);
pillarL.rotation.x = -0.18;

const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.12), trimMat);
pillarR.position.set(1.02, 2.42, -2.65);
pillarR.rotation.x = -0.18;

const roofHeader = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.14, 0.4), trimMat);
roofHeader.position.set(0, 2.9, -2.55);

const steering3D = new THREE.Group();
steering3D.position.set(0.46, 1.96, -2.18);
steering3D.rotation.x = -0.55;

const rim3D = new THREE.Mesh(
  new THREE.TorusGeometry(0.22, 0.024, 10, 28),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
);
const hub3D = new THREE.Mesh(
  new THREE.CylinderGeometry(0.075, 0.075, 0.04, 16),
  new THREE.MeshStandardMaterial({ color: 0x334155 })
);
hub3D.rotation.x = Math.PI / 2;
const spoke3D = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.02), trimMat);
steering3D.add(rim3D, hub3D, spoke3D);

const rainCanvas = document.createElement('canvas');
rainCanvas.width = 512;
rainCanvas.height = 256;
const rainCtx = rainCanvas.getContext('2d');
const rainTex = new THREE.CanvasTexture(rainCanvas);

const windshieldRainPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(1.96, 0.92),
  new THREE.MeshBasicMaterial({ map: rainTex, transparent: true, opacity: 0.85, depthWrite: false })
);
windshieldRainPlane.position.set(0, 2.42, -2.68);
windshieldRainPlane.rotation.x = -0.18;

function createWiper(xPos) {
  const pivot = new THREE.Group();
  pivot.position.set(xPos, 1.99, -2.74);
  pivot.rotation.x = -0.18;
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.68, 0.02),
    new THREE.MeshBasicMaterial({ color: 0x090d16 })
  );
  arm.position.y = 0.34;
  pivot.add(arm);
  return pivot;
}
const wiperL = createWiper(-0.42);
const wiperR = createWiper(0.35);

const mirrorRTL = new THREE.WebGLRenderTarget(128, 192);
const mirrorRTR = new THREE.WebGLRenderTarget(128, 192);

const mirrorCamL = new THREE.PerspectiveCamera(55, 128 / 192, 0.2, 160);
mirrorCamL.position.set(-1.18, 2.35, -2.4);
mirrorCamL.rotation.y = Math.PI - 0.12;

const mirrorCamR = new THREE.PerspectiveCamera(55, 128 / 192, 0.2, 160);
mirrorCamR.position.set(1.18, 2.35, -2.4);
mirrorCamR.rotation.y = Math.PI + 0.12;
truckRoot.add(mirrorCamL, mirrorCamR);

function createSideMirror(side, renderTarget) {
  const grp = new THREE.Group();
  grp.position.set(side * 1.16, 2.35, -2.52);
  grp.rotation.y = side * -0.22;

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 0.06), trimMat);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.19, 0.33),
    new THREE.MeshBasicMaterial({ map: renderTarget.texture })
  );
  glass.position.z = 0.032;
  glass.scale.x = -1;
  grp.add(housing, glass);
  return grp;
}
const mirrorMeshL = createSideMirror(-1, mirrorRTL);
const mirrorMeshR = createSideMirror(1, mirrorRTR);

cockpitGroup.add(
  mainDash, rhdHood, pillarL, pillarR, roofHeader,
  steering3D, windshieldRainPlane, wiperL, wiperR,
  mirrorMeshL, mirrorMeshR
);

// Lalu Lintas AI
const trafficCars = [];
const carColors = [0xef4444, 0x3b82f6, 0xf8fafc, 0x10b981, 0x64748b];

for (let i = 0; i < 8; i++) {
  const car = new THREE.Group();
  const isOpposite = i % 2 === 0;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 1.35, 4.1),
    new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], roughness: 0.4 })
  );
  body.position.y = 0.85;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.75, 2.1),
    new THREE.MeshStandardMaterial({ color: 0x1e293b })
  );
  cabin.position.y = 1.75;
  car.add(body, cabin);

  car.position.set(isOpposite ? -2.3 : 2.3, 0, -60 - i * 55);
  if (isOpposite) car.rotation.y = Math.PI;
  scene.add(car);
  trafficCars.push({
    mesh: car,
    speed: isOpposite ? 13 : 11,
    dir: isOpposite ? 1 : -1
  });
                                                      }
