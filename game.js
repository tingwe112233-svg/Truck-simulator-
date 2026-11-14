window.addEventListener('pointerdown', () => audio.init());

let clutchHeld = false;

function bindPedal(elId, stateKey, onReleaseCallback = null) {
  const el = document.getElementById(elId);
  let activePid = null;

  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    activePid = e.pointerId;
    if (stateKey === 'clutch') {
      clutchHeld = true;
    } else {
      state[stateKey] = 1;
    }
    el.classList.add('pressed');
  });

  const release = e => {
    if (e.pointerId !== activePid) return;
    activePid = null;
    if (stateKey === 'clutch') {
      clutchHeld = false;
    } else {
      state[stateKey] = 0;
    }
    el.classList.remove('pressed');
    if (onReleaseCallback) onReleaseCallback();
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}

bindPedal('pedalClutch', 'clutch');
bindPedal('pedalBrake', 'brake', () => {
  if (Math.abs(state.speedMS) < 1.5) audio.playAirBrake();
});
bindPedal('pedalGas', 'throttle');

const steerZone = document.getElementById('steerZone');
const wheelVisual = document.getElementById('wheelVisual');
const hornBtn = document.getElementById('hornBtn');

let steerPid = null;
let lastAngle = 0;

function getPointerAngle(e) {
  const rect = steerZone.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.atan2(e.clientY - cy, e.clientX - cx);
}

steerZone.addEventListener('pointerdown', e => {
  if (e.target === hornBtn || hornBtn.contains(e.target)) return;
  steerZone.setPointerCapture(e.pointerId);
  steerPid = e.pointerId;
  lastAngle = getPointerAngle(e);
});

steerZone.addEventListener('pointermove', e => {
  if (e.pointerId !== steerPid) return;
  const curAngle = getPointerAngle(e);
  let delta = curAngle - lastAngle;
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  lastAngle = curAngle;

  state.wheelDeg = Math.max(-540, Math.min(540, state.wheelDeg + (delta * 180 / Math.PI) * 1.35));
});

const endSteer = e => {
  if (e.pointerId === steerPid) steerPid = null;
};
steerZone.addEventListener('pointerup', endSteer);
steerZone.addEventListener('pointercancel', endSteer);

let hornPid = null;
hornBtn.addEventListener('pointerdown', e => {
  e.stopPropagation();
  hornBtn.setPointerCapture(e.pointerId);
  hornPid = e.pointerId;
  state.hornActive = true;
  hornBtn.classList.add('active');
  audio.setHorn(true);
});
const endHorn = e => {
  if (e.pointerId !== hornPid) return;
  hornPid = null;
  state.hornActive = false;
  hornBtn.classList.remove('active');
  audio.setHorn(false);
};
hornBtn.addEventListener('pointerup', endHorn);
hornBtn.addEventListener('pointercancel', endHorn);

document.querySelectorAll('.gear-btn').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const targetGear = parseInt(btn.dataset.gear, 10);
    if (targetGear === state.gear) return;

    if (state.engineOn && state.clutch < 0.65) {
      audio.playGearGrind();
      showToast('INJAK KOPLING PENUH UNTUK OPER GIGI!');
      return;
    }

    state.gear = targetGear;
    audio.playClick(true);
    document.querySelectorAll('.gear-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('gearDisp').textContent = targetGear === 0 ? 'N' : (targetGear === -1 ? 'R' : targetGear);
  });
});

const swEngine = document.getElementById('swEngine');
swEngine.addEventListener('pointerdown', () => {
  state.engineOn = !state.engineOn;
  audio.playClick(state.engineOn);
  swEngine.textContent = state.engineOn ? 'MESIN: ON' : 'MESIN: OFF';
  swEngine.classList.toggle('on', state.engineOn);
  if (state.engineOn) state.rpm = 850;
});

const swHandbrake = document.getElementById('swHandbrake');
swHandbrake.addEventListener('pointerdown', () => {
  state.handbrake = !state.handbrake;
  audio.playClick(!state.handbrake);
  swHandbrake.classList.toggle('warn', state.handbrake);
  document.getElementById('indBrake').classList.toggle('on-red', state.handbrake);
  showToast(state.handbrake ? 'REM TANGAN AKTIF' : 'REM TANGAN DILEPAS', state.handbrake);
});

const swLeft = document.getElementById('swLeft');
const swRight = document.getElementById('swRight');
const swHazard = document.getElementById('swHazard');

function updateBlinkerButtons() {
  swLeft.classList.toggle('amber', state.leftBlink && !state.hazard);
  swRight.classList.toggle('amber', state.rightBlink && !state.hazard);
  swHazard.classList.toggle('warn', state.hazard);
}

swLeft.addEventListener('pointerdown', () => {
  state.hazard = false;
  state.leftBlink = !state.leftBlink;
  state.rightBlink = false;
  updateBlinkerButtons();
});
swRight.addEventListener('pointerdown', () => {
  state.hazard = false;
  state.rightBlink = !state.rightBlink;
  state.leftBlink = false;
  updateBlinkerButtons();
});
swHazard.addEventListener('pointerdown', () => {
  state.hazard = !state.hazard;
  state.leftBlink = false;
  state.rightBlink = false;
  updateBlinkerButtons();
});

const swWiper = document.getElementById('swWiper');
const wiperLabels = ['WIPER: OFF', 'WIPER: PELAN', 'WIPER: CEPAT'];
swWiper.addEventListener('pointerdown', () => {
  state.wiperMode = (state.wiperMode + 1) % 3;
  audio.playClick(true);
  swWiper.textContent = wiperLabels[state.wiperMode];
  swWiper.classList.toggle('on', state.wiperMode > 0);
});

const swLight = document.getElementById('swLight');
const lightLabels = ['LAMPU: OFF', 'LAMPU: DEKAT', 'LAMPU: JAUH'];
swLight.addEventListener('pointerdown', () => {
  state.lightMode = (state.lightMode + 1) % 3;
  audio.playClick(true);
  swLight.textContent = lightLabels[state.lightMode];
  swLight.classList.toggle('on', state.lightMode > 0);
  document.getElementById('indBeam').classList.toggle('on-blue', state.lightMode > 0);

  headSpot.intensity = state.lightMode === 0 ? 0 : (state.lightMode === 1 ? 2.0 : 3.5);
  headSpot.distance = state.lightMode === 2 ? 105 : 65;
  const hlColor = state.lightMode > 0 ? 0xfef9c3 : 0x475569;
  headLightMatL.color.setHex(hlColor);
  headLightMatR.color.setHex(hlColor);
});

const btnCam = document.getElementById('btnCam');
btnCam.addEventListener('pointerdown', () => {
  state.cameraMode = state.cameraMode === 'cockpit' ? 'chase' : 'cockpit';
  btnCam.textContent = state.cameraMode === 'cockpit' ? 'KAMERA: KOKPIT (RHD)' : 'KAMERA: LUAR TRUK';
});

const btnWeather = document.getElementById('btnWeather');
btnWeather.addEventListener('pointerdown', () => {
  state.weather = state.weather === 'clear' ? 'rain' : 'clear';
  btnWeather.textContent = state.weather === 'clear' ? 'CUACA: CERAH' : 'CUACA: HUJAN';
  btnWeather.classList.toggle('active', state.weather === 'rain');
  if (state.weather === 'clear') rainCtx.clearRect(0, 0, 512, 256);
});

const btnTime = document.getElementById('btnTime');
btnTime.addEventListener('pointerdown', () => {
  state.timeOfDay = state.timeOfDay === 'day' ? 'night' : 'day';
  btnTime.textContent = state.timeOfDay === 'day' ? 'WAKTU: SIANG' : 'WAKTU: MALAM';
  btnTime.classList.toggle('active', state.timeOfDay === 'night');

  const isNight = state.timeOfDay === 'night';
  skyMat.map = createSkyTexture(isNight);
  skyMat.needsUpdate = true;
  scene.fog.color.setHex(isNight ? 0x090d16 : 0xbae6fd);
  hemiLight.intensity = isNight ? 0.25 : 1.05;
  dirLight.intensity = isNight ? 0.14 : 1.05;
});

const btnSound = document.getElementById('btnSound');
btnSound.addEventListener('pointerdown', () => {
  audio.enabled = !audio.enabled;
  btnSound.textContent = audio.enabled ? 'SUARA: ON' : 'SUARA: OFF';
  btnSound.classList.toggle('active', audio.enabled);
  if (!audio.enabled && audio.engineGain) audio.engineGain.gain.value = 0;
});

const btnFull = document.getElementById('btnFull');
btnFull.addEventListener('pointerdown', () => {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
});

// Cari titik spawn aman di ujung cakrawala depan (minimal 45m dari AI lain)
function getSafeSpawnZ(laneX) {
  let candidateZ = state.posZ - 265 - Math.random() * 75;
  for (let attempt = 0; attempt < 8; attempt++) {
    let conflict = false;
    for (let j = 0; j < trafficCars.length; j++) {
      const other = trafficCars[j];
      if (other.laneX === laneX && Math.abs(other.mesh.position.z - candidateZ) < 45) {
        conflict = true;
        break;
      }
    }
    if (!conflict) break;
    candidateZ -= 50;
  }
  return candidateZ;
}

let lastTime = performance.now();
let frameCount = 0;

function updatePhysics(dt) {
  // 1. Kopling Ramah Layar Sentuh:
  // Injak cepat (0.11 dtk), lepas bertahap halus (1.15 dtk) agar tidak langsung stall di HP
  if (clutchHeld) {
    state.clutch = Math.min(1, state.clutch + dt * 9.0);
  } else {
    state.clutch = Math.max(0, state.clutch - dt * 0.85);
  }
  const pedalClutchEl = document.getElementById('pedalClutch');
  if (!clutchHeld && state.clutch > 0.02) {
    pedalClutchEl.style.transform = `scale(${1 - state.clutch * 0.07}) translateY(${state.clutch * 5}px)`;
  } else if (!clutchHeld) {
    pedalClutchEl.style.transform = '';
  }

  const ratio = gearRatios[state.gear];
  const coupling = Math.max(0, 1 - state.clutch);

  // 2. Mesin Diesel & Torsi Idle Merayap (Anti-Stall di Gigi 1 & R)
  if (!state.engineOn) {
    state.rpm = Math.max(0, state.rpm - 900 * dt);
  } else {
    const freeRpm = 800 + state.throttle * 2400;
    if (state.gear === 0 || coupling < 0.1) {
      state.rpm += (freeRpm - state.rpm) * Math.min(1, dt * 8);
    } else {
      const wheelRpm = Math.abs(state.speedMS) * 60 / (2 * Math.PI * 0.48) * 4.6 * Math.abs(ratio);
      const isLowGear = Math.abs(state.gear) === 1;
      const idleAssistRpm = isLowGear && !state.handbrake ? 720 : 380;
      const blendedRpm = freeRpm * (1 - coupling) + Math.max(idleAssistRpm, wheelRpm) * coupling;
      state.rpm += (blendedRpm - state.rpm) * Math.min(1, dt * 9);

      // Mesin mati hanya jika rem tangan terkunci atau memaksa jalan dari diam di gigi tinggi (3/4/5)
      if (coupling > 0.85 && Math.abs(state.speedMS) < 0.8 && state.throttle < 0.1 && (state.handbrake || Math.abs(state.gear) >= 3)) {
        state.engineOn = false;
        swEngine.textContent = 'MESIN: OFF';
        swEngine.classList.remove('on');
        showToast(state.handbrake ? 'MESIN MATI! Lepas REM TANGAN dulu!' : 'MESIN MATI! Gunakan GIGI 1 untuk mulai jalan!');
      }
    }
  }

  // 3. Gaya Dorong, Merayap Diesel & Pengereman
  let driveForce = 0;
  if (state.engineOn && state.gear !== 0 && coupling > 0.12) {
    const isLowGear = Math.abs(state.gear) === 1;
    const baseDieselCreep = isLowGear ? 0.36 : 0.16;
    const torque = (state.throttle * 1.15 + baseDieselCreep) * (state.rpm / 1750 + 0.55);
    driveForce = torque * ratio * coupling * 4.9;
  }

  if (state.gear !== 0 && coupling > 0.35 && state.throttle < 0.05 && Math.abs(state.speedMS) > 2.6) {
    driveForce -= Math.sign(state.speedMS) * Math.abs(ratio) * coupling * 1.3;
  }

  const brakeDecel = state.brake * 16 + (state.handbrake ? 14 : 0);
  const drag = 0.25 * state.speedMS + 0.015 * state.speedMS * Math.abs(state.speedMS);

  state.speedMS += (driveForce - drag) * dt;
  if (brakeDecel > 0) {
    if (Math.abs(state.speedMS) <= brakeDecel * dt) {
      state.speedMS = 0;
    } else {
      state.speedMS -= Math.sign(state.speedMS) * brakeDecel * dt;
    }
  }

  state.speedMS = Math.max(-9, Math.min(26.4, state.speedMS));

  if (state.handbrake && Math.abs(state.speedMS) > 2.5 && frameCount % 90 === 0) {
    showToast('PERINGATAN: REM TANGAN MASIH AKTIF!');
  }

  // 4. Kemudi Setir Kanan & Pergerakan Truk Tanpa Reset Z Mendadak
  if (steerPid === null && Math.abs(state.speedMS) > 0.4) {
    state.wheelDeg *= Math.pow(0.25, dt);
  }
  const steerAngle = -(state.wheelDeg / 540) * 0.56;

  if (Math.abs(state.speedMS) > 0.05) {
    const turnRate = (state.speedMS / 4.2) * Math.sin(steerAngle);
    state.heading += turnRate * dt;
  }

  state.posX -= Math.sin(state.heading) * state.speedMS * dt;
  state.posZ -= Math.cos(state.heading) * state.speedMS * dt;

  if (state.posX > 6.4) { state.posX = 6.4; state.heading *= 0.4; state.speedMS *= 0.85; }
  if (state.posX < -6.4) { state.posX = -6.4; state.heading *= 0.4; state.speedMS *= 0.85; }

  // Recycle Jalan, Langit & Lingkungan secara mulus mengikuti truk
  roadMesh.position.z = state.posZ;
  groundMesh.position.z = state.posZ;
  skyDome.position.set(state.posX, 0, state.posZ);
  roadTex.offset.y = -state.posZ / 20;

  envSegments.forEach(seg => {
    if (seg.position.z - state.posZ > 60) seg.position.z -= 18 * 24;
    if (seg.position.z - state.posZ < -372) seg.position.z += 18 * 24;
  });

  // 5. Lalu Lintas AI & Fisika Tumbukan Solid (Anti-Teleport)
  trafficCars.forEach((c, idx) => {
    // Jaga jarak antar mobil AI di lajur yang sama
    let targetSpeed = c.baseSpeed;
    for (let j = 0; j < trafficCars.length; j++) {
      if (idx === j) continue;
      const other = trafficCars[j];
      if (other.laneX === c.laneX) {
        const gap = (c.mesh.position.z - other.mesh.position.z) * (-c.dir);
        if (gap > 0 && gap < 18) targetSpeed = Math.min(targetSpeed, other.speed * 0.85);
      }
    }
    c.speed += (targetSpeed - c.speed) * Math.min(1, dt * 4);
    c.mesh.position.z += c.dir * c.speed * dt;

    // Respawn hanya jika jauh di belakang (65m) atau jauh di luar kabut depan (380m)
    const relZ = c.mesh.position.z - state.posZ;
    if (relZ > 65 || relZ < -380) {
      c.mesh.position.z = getSafeSpawnZ(c.laneX);
      c.speed = c.baseSpeed;
    }

    // Deteksi & Resolusi Tabrakan Solid (Truk tertahan di depan bumper lawan, tidak mental ke belakangnya)
    const dx = state.posX - c.mesh.position.x;
    const dz = state.posZ - c.mesh.position.z;
    const minX = 1.15 + c.halfW;
    const minZ = 3.35 + c.halfL;

    if (Math.abs(dx) < minX && Math.abs(dz) < minZ) {
      const penX = minX - Math.abs(dx);
      const penZ = minZ - Math.abs(dz);

      if (penZ < penX) {
        const signZ = dz >= 0 ? 1 : -1;
        state.posZ += signZ * (penZ + 0.06);
        if (signZ > 0) {
          state.speedMS = Math.min(0, -Math.abs(state.speedMS) * 0.22);
        } else {
          state.speedMS = Math.max(0, Math.abs(state.speedMS) * 0.3);
        }
      } else {
        const signX = dx >= 0 ? 1 : -1;
        state.posX += signX * (penX + 0.05);
        state.heading *= 0.35;
        state.speedMS *= 0.85;
      }
      showToast('AWAS TABRAKAN! JAGA JARAK AMAN');
    }
  });

  truckRoot.position.set(state.posX, 0, state.posZ);
  truckRoot.rotation.y = state.heading;

  wheels.forEach(w => w.rotation.x -= state.speedMS * dt * 2.1);
  steering3D.rotation.z = -(state.wheelDeg * Math.PI / 180);
  wheelVisual.style.transform = `rotate(${state.wheelDeg}deg)`;

  // 6. Lampu Sein, Wiper & Kluster Dashboard 3D
  const anyBlink = state.leftBlink || state.rightBlink || state.hazard;
  if (anyBlink) {
    state.blinkTimer += dt;
    if (state.blinkTimer >= 0.42) {
      state.blinkTimer = 0;
      state.blinkState = !state.blinkState;
      audio.playClick(state.blinkState);
    }
  } else {
    state.blinkTimer = 0;
    state.blinkState = false;
  }

  const leftOn = state.blinkState && (state.leftBlink || state.hazard);
  const rightOn = state.blinkState && (state.rightBlink || state.hazard);
  document.getElementById('indLeft').classList.toggle('on-green', leftOn);
  document.getElementById('indRight').classList.toggle('on-green', rightOn);

  tailLeftMat.color.setHex(leftOn ? 0xf59e0b : (state.brake > 0 ? 0xff0000 : 0x7f1d1d));
  tailRightMat.color.setHex(rightOn ? 0xf59e0b : (state.brake > 0 ? 0xff0000 : 0x7f1d1d));

  if (state.weather === 'rain') {
    rainCtx.fillStyle = 'rgba(186, 230, 253, 0.55)';
    for (let i = 0; i < 14; i++) {
      rainCtx.beginPath();
      rainCtx.arc(Math.random() * 512, Math.random() * 256, 2.2, 0, Math.PI * 2);
      rainCtx.fill();
    }
    rainTex.needsUpdate = true;
  }

  if (state.wiperMode > 0) {
    const speedWiper = state.wiperMode === 1 ? 3.2 : 6.2;
    state.wiperPhase += dt * speedWiper;
    const sweep = Math.sin(state.wiperPhase) * 0.72;
    wiperL.rotation.z = sweep;
    wiperR.rotation.z = sweep;

    if (state.weather === 'rain') {
      rainCtx.save();
      rainCtx.globalCompositeOperation = 'destination-out';
      rainCtx.strokeStyle = 'rgba(0,0,0,1)';
      rainCtx.lineWidth = 34;
      [150, 355].forEach(px => {
        rainCtx.beginPath();
        rainCtx.moveTo(px, 250);
        rainCtx.lineTo(px - Math.sin(sweep) * 210, 250 - Math.cos(sweep) * 210);
        rainCtx.stroke();
      });
      rainCtx.restore();
      rainTex.needsUpdate = true;
    }
  } else {
    wiperL.rotation.z *= 0.85;
    wiperR.rotation.z *= 0.85;
  }

  const speedKmh = Math.round(Math.abs(state.speedMS) * 3.6);
  if (state.cameraMode === 'cockpit') {
    cockpitGroup.visible = true;
    exteriorGroup.visible = false;
    const eyeOffset = new THREE.Vector3(0.46, 2.48, -2.0);
    eyeOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
    camera.position.set(state.posX + eyeOffset.x, eyeOffset.y, state.posZ + eyeOffset.z);
    camera.rotation.set(-0.05, state.heading, 0);
    if (frameCount % 2 === 0) {
      updateDashCluster(speedKmh, state.rpm, state.gear, leftOn, rightOn, state.handbrake || state.brake > 0);
    }
  } else {
    cockpitGroup.visible = false;
    exteriorGroup.visible = true;
    const chaseOffset = new THREE.Vector3(0, 4.4, 9.2);
    chaseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
    camera.position.set(state.posX + chaseOffset.x, chaseOffset.y, state.posZ + chaseOffset.z);
    camera.lookAt(state.posX, 1.8, state.posZ - 6);
  }

  audio.updateEngine(state.rpm, state.throttle, state.engineOn);
  document.getElementById('speedDisp').textContent = speedKmh;
  document.getElementById('rpmDisp').textContent = Math.round(state.rpm);
}

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  frameCount++;

  updatePhysics(dt);

  if (state.cameraMode === 'cockpit' && frameCount % 3 === 0) {
    cockpitGroup.visible = false;
    exteriorGroup.visible = true;

    renderer.setRenderTarget(mirrorRTL);
    renderer.render(scene, mirrorCamL);

    renderer.setRenderTarget(mirrorRTR);
    renderer.render(scene, mirrorCamR);

    renderer.setRenderTarget(null);
    cockpitGroup.visible = true;
    exteriorGroup.visible = false;
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(animate);
