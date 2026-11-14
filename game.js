window.addEventListener('pointerdown', () => audio.init());

function bindPedal(elId, stateKey, onReleaseCallback = null) {
  const el = document.getElementById(elId);
  let activePid = null;

  el.addEventListener('pointerdown', e => {
    e.stopPropagation();
    el.setPointerCapture(e.pointerId);
    activePid = e.pointerId;
    state[stateKey] = 1;
    el.classList.add('pressed');
  });

  const release = e => {
    if (e.pointerId !== activePid) return;
    activePid = null;
    state[stateKey] = 0;
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
  if (state.engineOn) state.rpm = 800;
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

  headSpot.intensity = state.lightMode === 0 ? 0 : (state.lightMode === 1 ? 1.8 : 3.2);
  headSpot.distance = state.lightMode === 2 ? 95 : 55;
  const hlColor = state.lightMode > 0 ? 0xfef9c3 : 0x334155;
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

  if (state.timeOfDay === 'night') {
    scene.background.setHex(0x090d16);
    scene.fog.color.setHex(0x090d16);
    hemiLight.intensity = 0.22;
    dirLight.intensity = 0.12;
  } else {
    scene.background.setHex(0x87ceeb);
    scene.fog.color.setHex(0x87ceeb);
    hemiLight.intensity = 0.95;
    dirLight.intensity = 0.9;
  }
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

let lastTime = performance.now();
let frameCount = 0;

function updatePhysics(dt) {
  const ratio = gearRatios[state.gear];
  const coupling = Math.max(0, 1 - state.clutch);

  if (!state.engineOn) {
    state.rpm = Math.max(0, state.rpm - 900 * dt);
  } else {
    const freeRpm = 780 + state.throttle * 2420;
    if (state.gear === 0 || coupling < 0.1) {
      state.rpm += (freeRpm - state.rpm) * Math.min(1, dt * 8);
    } else {
      const wheelRpm = Math.abs(state.speedMS) * 60 / (2 * Math.PI * 0.48) * 4.8 * Math.abs(ratio);
      const blendedRpm = freeRpm * (1 - coupling) + Math.max(400, wheelRpm) * coupling;
      state.rpm += (blendedRpm - state.rpm) * Math.min(1, dt * 10);

      if (coupling > 0.7 && state.rpm < 510 && Math.abs(state.speedMS) < 1.3) {
        state.engineOn = false;
        swEngine.textContent = 'MESIN: OFF';
        swEngine.classList.remove('on');
        showToast('MESIN MATI! (Lepas kopling pelan sambil digas)');
      }
    }
  }

  let driveForce = 0;
  if (state.engineOn && state.gear !== 0 && coupling > 0.15) {
    const torque = (state.throttle * 1.15 + 0.18) * (state.rpm / 1800 + 0.55);
    driveForce = torque * ratio * coupling * 4.8;
  }

  if (state.gear !== 0 && coupling > 0.3 && state.throttle < 0.05) {
    driveForce -= Math.sign(state.speedMS) * Math.abs(ratio) * coupling * 1.4;
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

  if (steerPid === null && Math.abs(state.speedMS) > 0.4) {
    state.wheelDeg *= Math.pow(0.25, dt);
  }
  const maxSteerRad = 0.56;
  const steerAngle = -(state.wheelDeg / 540) * maxSteerRad;

  if (Math.abs(state.speedMS) > 0.05) {
    const turnRate = (state.speedMS / 4.2) * Math.sin(steerAngle);
    state.heading += turnRate * dt;
  }

  state.posX -= Math.sin(state.heading) * state.speedMS * dt;
  state.posZ -= Math.cos(state.heading) * state.speedMS * dt;

  if (state.posX > 6.6) { state.posX = 6.6; state.heading *= 0.5; state.speedMS *= 0.85; }
  if (state.posX < -6.6) { state.posX = -6.6; state.heading *= 0.5; state.speedMS *= 0.85; }

  if (state.posZ < -250) {
    state.posZ += 220;
    trafficCars.forEach(c => c.mesh.position.z += 220);
  } else if (state.posZ > 250) {
    state.posZ -= 220;
    trafficCars.forEach(c => c.mesh.position.z -= 220);
  }

  truckRoot.position.set(state.posX, 0, state.posZ);
  truckRoot.rotation.y = state.heading;

  wheels.forEach(w => w.rotation.x -= state.speedMS * dt * 2.1);
  steering3D.rotation.z = -(state.wheelDeg * Math.PI / 180);
  wheelVisual.style.transform = `rotate(${state.wheelDeg}deg)`;

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
      const rx = Math.random() * 512;
      const ry = Math.random() * 256;
      rainCtx.beginPath();
      rainCtx.arc(rx, ry, 2.2, 0, Math.PI * 2);
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

  trafficCars.forEach(c => {
    c.mesh.position.z += c.dir * c.speed * dt;
    if (c.mesh.position.z - state.posZ > 180) c.mesh.position.z = state.posZ - 320;
    if (c.mesh.position.z - state.posZ < -340) c.mesh.position.z = state.posZ + 160;

    const dx = Math.abs(c.mesh.position.x - state.posX);
    const dz = Math.abs(c.mesh.position.z - state.posZ);
    if (dx < 1.95 && dz < 5.1) {
      state.speedMS = -state.speedMS * 0.3;
      c.mesh.position.z += c.dir * 8;
      showToast('AWAS TABRAKAN! JAGA JARAK AMAN');
    }
  });

  if (state.cameraMode === 'cockpit') {
    cockpitGroup.visible = true;
    exteriorGroup.visible = false;
    const eyeOffset = new THREE.Vector3(0.46, 2.48, -2.02);
    eyeOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
    camera.position.set(state.posX + eyeOffset.x, eyeOffset.y, state.posZ + eyeOffset.z);
    camera.rotation.set(-0.04, state.heading, 0);
  } else {
    cockpitGroup.visible = false;
    exteriorGroup.visible = true;
    const chaseOffset = new THREE.Vector3(0, 4.4, 9.2);
    chaseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);
    camera.position.set(state.posX + chaseOffset.x, chaseOffset.y, state.posZ + chaseOffset.z);
    camera.lookAt(state.posX, 1.8, state.posZ - 6);
  }

  audio.updateEngine(state.rpm, state.throttle, state.engineOn);

  document.getElementById('speedDisp').textContent = Math.round(Math.abs(state.speedMS) * 3.6);
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
