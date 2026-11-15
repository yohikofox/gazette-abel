import * as THREE from 'three';
import { GLTFLoader } from './three/loaders/GLTFLoader.js';

// Rigged model (R-248): its authored clips provide all visible movement.
const MODEL_URL = './assets/sorting_hat/sorting_hat_rigged.glb';
const FADE = 0.4;
const THINK_HOLD_MS = 3500;

export async function createSortingHat(container) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  // Raking light (R-252): low ambient, side key to carve the folds, rim light to detach the silhouette from the paper.
  scene.add(new THREE.HemisphereLight(0xffe8bf, 0x4b3427, 0.9));
  const key = new THREE.DirectionalLight(0xffe2b8, 4.2);
  key.position.set(-2.0, 1.5, 1.1);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff3e0, 0.7);
  fill.position.set(1.6, 0.2, 1.2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xfff0d0, 3.0);
  rim.position.set(1.0, 1.4, -2.2);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 10);
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const hat = gltf.scene;
  scene.add(hat);
  hat.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(hat);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  // Clips: Idle by default, Talk while speaking, Think after an intermediate answer, Announce at the verdict.
  const mixer = new THREE.AnimationMixer(hat);
  const actions = Object.fromEntries(gltf.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  if (actions.Announce) {
    actions.Announce.setLoop(THREE.LoopOnce, 1);
    actions.Announce.clampWhenFinished = true;
  }
  let current = null, mood = 'idle', thinkUntil = 0;
  function play(name, restart = false) {
    const next = actions[name];
    if (!next || (next === current && !restart)) return;
    next.reset().setEffectiveWeight(1).fadeIn(next === current ? 0.15 : FADE).play();
    if (current && current !== next) current.fadeOut(FADE);
    current = next;
  }
  mixer.addEventListener('finished', event => { if (event.action === actions.Announce && mood === 'announce') mood = 'idle'; });

  let talking = false, visible = true, disposed = false;
  let frame = 0, last = performance.now();

  function wantedClip(now) {
    if (mood === 'announce') return 'Announce';
    if (mood === 'think') {
      if (talking || now < thinkUntil) return 'Think';
      mood = 'idle';
    }
    return talking ? 'Talk' : 'Idle';
  }
  play('Idle');

  function resize() {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const halfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const distance = Math.max(
      size.y / (2 * Math.tan(halfFov)),
      size.x / (2 * Math.tan(halfFov) * camera.aspect)
    ) * 1.3 + size.z / 2;
    camera.position.set(center.x, center.y, center.z + distance);
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; });
  visibilityObserver.observe(container);
  resize();

  function animate(now) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (!visible) return;
    play(wantedClip(now));
    mixer.update(dt);
    renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(animate);
  return {
    setTalking(value) {
      talking = Boolean(value);
      if (!talking && mood === 'think') thinkUntil = Math.max(thinkUntil, performance.now() + 1500);
    },
    // 'idle' | 'think' | 'announce'
    setMood(value) {
      if (value === 'announce') { mood = 'announce'; play('Announce', true); return; }
      if (value === 'think') { mood = 'think'; thinkUntil = performance.now() + THINK_HOLD_MS; return; }
      mood = 'idle';
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); visibilityObserver.disconnect();
      mixer.stopAllAction();
      renderer.dispose(); renderer.domElement.remove();
    }
  };
}
