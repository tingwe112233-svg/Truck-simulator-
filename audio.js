if (typeof THREE === 'undefined') {
  document.body.innerHTML = '<div style="padding:24px;color:#fff;text-align:center;"><h3>Gagal memuat engine 3D</h3><p>Pastikan koneksi internet aktif saat pertama kali membuka halaman ini, lalu refresh.</p></div>';
  throw new Error('Three.js gagal dimuat');
}

class TruckAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.started = false;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.hornOsc1 = null;
    this.hornOsc2 = null;
    this.hornGain = null;
  }

  init() {
    if (!this.enabled) return;
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineGain = this.ctx.createGain();

    this.engineOsc1.type = 'sawtooth';
    this.engineOsc2.type = 'triangle';
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 180;
    this.engineGain.gain.value = 0.0;

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();

    this.hornOsc1 = this.ctx.createOscillator();
    this.hornOsc2 = this.ctx.createOscillator();
    const hornFilter = this.ctx.createBiquadFilter();
    this.hornGain = this.ctx.createGain();

    this.hornOsc1.type = 'sawtooth';
    this.hornOsc2.type = 'sawtooth';
    this.hornOsc1.frequency.value = 370;
    this.hornOsc2.frequency.value = 466;
    hornFilter.type = 'lowpass';
    hornFilter.frequency.value = 1600;
    this.hornGain.gain.value = 0;

    this.hornOsc1.connect(hornFilter);
    this.hornOsc2.connect(hornFilter);
    hornFilter.connect(this.hornGain);
    this.hornGain.connect(this.ctx.destination);

    this.hornOsc1.start();
    this.hornOsc2.start();

    this.started = true;
  }

  updateEngine(rpm, throttle, engineOn) {
    if (!this.started || !this.enabled) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    if (!engineOn) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }
    const baseFreq = (rpm / 60) * 1.6;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(140 + (rpm / 3200) * 320 + throttle * 160, now, 0.05);
    this.engineGain.gain.setTargetAtTime(0.14 + throttle * 0.08, now, 0.05);
  }

  setHorn(active) {
    this.init();
    if (!this.started || !this.enabled) return;
    const now = this.ctx.currentTime;
    this.hornGain.gain.setTargetAtTime(active ? 0.22 : 0, now, 0.02);
  }

  playClick(high = true) {
    if (!this.started || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(high ? 900 : 650, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  playAirBrake() {
    if (!this.started || !this.enabled) return;
    const bufferSize = this.ctx.sampleRate * 0.28;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playGearGrind() {
    if (!this.started || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(65, now + 0.2);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }
}

const audio = new TruckAudio();

const state = {
  engineOn: true,
  handbrake: true,
  gear: 0,
  rpm: 800,
  speedMS: 0,
  clutch: 0,
  brake: 0,
  throttle: 0,
  wheelDeg: 0,
  posX: 2.2,
  posZ: 0,
  heading: 0,
  leftBlink: false,
  rightBlink: false,
  hazard: false,
  blinkTimer: 0,
  blinkState: false,
  wiperMode: 0,
  wiperPhase: 0,
  lightMode: 0,
  cameraMode: 'cockpit',
  weather: 'clear',
  timeOfDay: 'day',
  hornActive: false
};

const gearRatios = { '-1': -3.8, '0': 0, '1': 4.3, '2': 2.65, '3': 1.75, '4': 1.22, '5': 0.88 };

let toastTimer = null;
function showToast(msg, isWarn = true) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.background = isWarn ? 'rgba(220, 38, 38, 0.92)' : 'rgba(22, 163, 74, 0.92)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
        }
