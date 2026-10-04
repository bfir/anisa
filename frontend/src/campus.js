import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function createCampus(host, markers, onSelect) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-22, 22, 18, -18, 0.1, 150);
  const cameraStart = new THREE.Vector3(27, 29, 35);
  camera.position.copy(cameraStart);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI / 2.7;
  controls.rotateSpeed = 0.5;
  controls.update();
  // Vertical touch gestures remain available for scrolling the page.
  renderer.domElement.style.touchAction = "pan-y";

  scene.add(new THREE.HemisphereLight(0xffffff, 0xa3b0c6, 2.8));
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(-14, 27, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0001;
  sun.shadow.radius = 4;
  scene.add(sun);

  const materials = new Map();
  const geometries = new Map();
  const pickables = [];
  const sections = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
    return materials.get(color);
  }
  function box(parent, width, height, depth, x, y, z, color, rounded = false) {
    const key = `${width}:${height}:${depth}:${rounded}`;
    if (!geometries.has(key)) geometries.set(key, rounded
      ? new RoundedBoxGeometry(width, height, depth, 2, Math.min(0.1, height / 3))
      : new THREE.BoxGeometry(width, height, depth));
    const mesh = new THREE.Mesh(geometries.get(key), material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cylinder(parent, radius, height, x, y, z, color) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 12);
    geometries.set(geometry.uuid, geometry);
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function section(id, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.userData.section = id;
    scene.add(group);
    sections.set(id, group);
    return group;
  }
  function cross(parent, x, y, z, size, color) {
    box(parent, size, size * 0.28, 0.05, x, y, z, color);
    box(parent, size * 0.28, size, 0.05, x, y, z + 0.01, color);
  }
  function windows(parent, width, levels, depth, x = 0, z = 0) {
    for (let level = 0; level < levels; level++) {
      const y = 1.05 + level * 1.2;
      box(parent, width - 0.5, 0.7, 0.06, x, y, z + depth / 2 + 0.025, "#9dbbd9");
      box(parent, 0.06, 0.7, depth - 0.5, x + width / 2 + 0.025, y, z, "#83a6cc");
      for (let index = 1; index < width; index++) {
        box(parent, 0.09, 0.75, 0.08, x - width / 2 + index, y, z + depth / 2 + 0.075, "#dce6f4");
      }
      for (let index = 1; index < depth; index++) {
        box(parent, 0.08, 0.75, 0.09, x + width / 2 + 0.075, y, z - depth / 2 + index, "#dce6f4");
      }
    }
  }
  function tree(x, z, scale = 1) {
    const trunk = cylinder(scene, 0.09 * scale, 1.3 * scale, x, 0.9 * scale, z, "#8f8172");
    trunk.castShadow = false;
    const geometry = new THREE.IcosahedronGeometry(0.8 * scale, 1);
    geometries.set(geometry.uuid, geometry);
    const crown = new THREE.Mesh(geometry, material("#91b394"));
    crown.position.set(x, 1.8 * scale, z);
    crown.scale.set(0.9, 1.25, 0.9);
    crown.castShadow = true;
    scene.add(crown);
    cylinder(scene, 0.65 * scale, 0.12, x, 0.38, z, "#c8d8c9");
  }
  function car(x, z, color, ambulance = false) {
    const group = new THREE.Group();
    box(group, 0.95, 0.4, 1.9, 0, 0.65, 0, color, true);
    box(group, 0.8, 0.38, 1.1, 0, 1, -0.1, ambulance ? "#ffffff" : "#b1c6dc", true);
    box(group, 0.72, 0.25, 0.04, 0, 1.03, 0.48, "#6580a1");
    for (const side of [-0.45, 0.45]) {
      for (const axle of [-0.55, 0.55]) {
        const wheel = cylinder(group, 0.18, 0.12, side, 0.48, axle, "#415069");
        wheel.rotation.z = Math.PI / 2;
      }
    }
    if (ambulance) {
      box(group, 0.65, 0.15, 0.18, 0, 1.29, -0.1, "#3970d3");
      cross(group, 0, 0.67, 0.97, 0.3, "#3970d3");
    }
    group.position.set(x, 0, z);
    scene.add(group);
  }

  box(scene, 30, 0.48, 22, 0, -0.06, 0, "#dde5ee", true);
  box(scene, 28.9, 0.14, 20.9, 0, 0.25, 0, "#f9fafc", true);
  box(scene, 26.6, 0.04, 3.4, 0, 0.34, 7.9, "#cbd5e2", true);
  box(scene, 3.2, 0.04, 17.7, 11.6, 0.34, -0.2, "#cbd5e2", true);
  for (let x = -12; x < 12; x += 2.1) box(scene, 0.9, 0.02, 0.05, x, 0.37, 7.9, "#f9fafc");
  for (let z = -8; z < 7; z += 2.1) box(scene, 0.05, 0.02, 0.9, 11.6, 0.37, z, "#f9fafc");
  for (let index = 0; index < 7; index++) box(scene, 0.14, 0.02, 2.8, 7.1 + index * 0.33, 0.38, 7.9, "#f9fafc");

  const hospital = section("appointments", 0.8, -2.2);
  box(hospital, 10.8, 4.8, 6.4, 0, 2.8, 0, "#3b6acc", true);
  box(hospital, 11.1, 0.55, 6.6, 0, 0.62, 0, "#f9fafc", true);
  windows(hospital, 10.8, 3, 6.4);
  box(hospital, 11.5, 0.32, 7, 0, 5.35, 0, "#eef3fa", true);
  box(hospital, 3.6, 0.55, 3, -2.9, 5.8, -0.7, "#dbe4ef", true);
  for (let index = 0; index < 4; index++) {
    box(hospital, 1.1, 0.12, 2.4, 0.6 + index * 1.25, 5.57, -0.7, "#8aa4c6");
  }
  box(hospital, 2.1, 4.7, 0.11, -3.9, 2.92, 3.32, "#f4f7fc");
  cross(hospital, -3.9, 4.45, 3.41, 1.25, "#3970d3");
  box(hospital, 3.4, 0.22, 1.8, -0.7, 1.73, 3.7, "#f9fafc", true);
  box(hospital, 2.6, 1.3, 0.09, -0.7, 1.03, 3.43, "#537cac");
  for (const x of [-2.2, 0.8]) cylinder(hospital, 0.055, 1.4, x, 1, 4.25, "#c4d3e5");

  const reception = section("patients", -7.5, 2.5);
  box(reception, 5.6, 2.5, 4.8, 0, 1.68, 0, "#eef3fa", true);
  windows(reception, 5.6, 1, 4.8);
  box(reception, 6, 0.26, 5.2, 0, 3.03, 0, "#b5cbe8", true);
  box(reception, 3.6, 0.13, 3, 0, 3.23, 0, "#f4f7fc", true);
  box(reception, 1.5, 1.55, 0.12, 0, 1.14, 2.55, "#658dbd");
  cross(reception, -1.95, 2.15, 2.55, 0.6, "#3970d3");
  box(reception, 5.1, 0.06, 0.7, 0, 0.45, 3.05, "#c1d0e4", true);

  const finance = section("payments", 7.4, 2.5);
  box(finance, 3.6, 2.2, 4.4, 0, 1.53, 0, "#c1d9d5", true);
  windows(finance, 3.6, 1, 4.4);
  box(finance, 4, 0.24, 4.8, 0, 2.77, 0, "#f7fafc", true);
  box(finance, 1.1, 1.4, 0.1, -0.4, 1.04, 2.31, "#6f91a7");
  const assistant = section("assistant", -7.8, -4.5);
  box(assistant, 4.4, 3.6, 4.6, 0, 2.17, 0, "#7b98d3", true);
  windows(assistant, 4.4, 2, 4.6);
  box(assistant, 4.8, 0.24, 5, 0, 4.11, 0, "#f6f8fc", true);
  box(assistant, 2.5, 0.3, 2.5, 0, 4.42, 0, "#d5e1f3", true);

  for (const [x, z, scale] of [
    [-12, -8, 1.2], [-9.7, -8.3, 0.85], [-12.3, -5.8, 1], [-12.1, -2.5, 1.1],
    [-12.3, 1, 0.9], [-12.4, 4.8, 1.1], [-7.8, -8.5, 0.95], [1, -8, 1.05],
    [4, -8, 1.2], [8.2, -7.7, 1], [8.6, -4.8, 0.85], [6.3, 5.5, 0.8],
    [-4.1, 4.8, 0.85], [-3.7, 2.5, 0.7], [-11.2, 9.7, 0.8], [12.7, 9.5, 0.9],
  ]) tree(x, z, scale);
  box(scene, 4.5, 0.15, 2, 2, 0.4, 4.2, "#cfdfd5", true);
  box(scene, 3.3, 0.09, 1, 2, 0.51, 4.2, "#b9cebe", true);
  box(scene, 2.7, 0.16, 0.4, 2, 0.74, 5.4, "#c6b6a1", true);
  for (const x of [0.9, 3.1]) box(scene, 0.12, 0.35, 0.3, x, 0.56, 5.4, "#8a9caf");
  for (let index = 0; index < 6; index++) {
    box(scene, 2.1, 0.02, 0.06, -6 + index * 2.4, 0.39, -7.5, "#bac9db");
  }
  car(-7.1, -7.4, "#ffffff");
  car(-2.3, -7.4, "#506c91");
  car(2.5, -7.4, "#c6d4e3");
  car(11.6, 2.5, "#ffffff", true);
  car(-8, 7.9, "#ffffff");
  car(2, 7.9, "#7c9bbf");
  for (const [x, z, color] of [[-1, 3.8, "#355c9f"], [-5, 5.4, "#e6b477"], [4.5, 2.1, "#455575"], [-2, 5.8, "#79999a"]]) {
    cylinder(scene, 0.11, 0.55, x, 0.73, z, color);
    cylinder(scene, 0.115, 0.18, x, 1.12, z, "#d6b9a2");
  }
  for (const group of sections.values()) {
    group.traverse((object) => { if (object.isMesh) pickables.push(object); });
  }

  const anchors = {
    appointments: new THREE.Vector3(1, 6.4, -1.5),
    patients: new THREE.Vector3(-7.5, 3.6, 3.7),
    payments: new THREE.Vector3(7.4, 3.3, 3.2),
    assistant: new THREE.Vector3(-8, 4.9, -5.2),
  };
  const selectorGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(11.2, 4.95, 6.8));
  const selectorMaterial = new THREE.LineBasicMaterial({ color: "#3972e6", transparent: true, opacity: 0.7 });
  const selector = new THREE.LineSegments(selectorGeometry, selectorMaterial);
  scene.add(selector);
  function select(id) {
    const group = sections.get(id);
    const dimensions = { appointments: [11.2, 4.95, 6.8], patients: [6, 2.7, 5.2], payments: [4, 2.4, 4.8], assistant: [4.8, 3.8, 5] }[id];
    if (!group || !dimensions) return;
    selector.position.set(group.position.x, dimensions[1] / 2 + 0.4, group.position.z);
    selector.scale.set(dimensions[0] / 11.2, dimensions[1] / 4.95, dimensions[2] / 6.8);
    render();
  }
  function render() {
    renderer.render(scene, camera);
    const { width, height } = host.getBoundingClientRect();
    const gap = 7;
    const placed = [];
    const pins = Object.entries(anchors).map(([id, position]) => {
      const projected = position.clone().project(camera);
      const marker = markers[id];
      if (!marker) return null;
      const pinWidth = marker.offsetWidth;
      const pinHeight = marker.offsetHeight;
      return {
        marker, width: pinWidth, height: pinHeight,
        left: THREE.MathUtils.clamp((projected.x + 1) * width / 2 - pinWidth / 2, 10, width - pinWidth - 10),
        top: THREE.MathUtils.clamp((1 - projected.y) * height / 2 - pinHeight - 16, 10, height - pinHeight - 70),
      };
    }).filter(Boolean).sort((a, b) => a.top - b.top);
    for (const pin of pins) {
      const candidates = [
        pin.top,
        ...placed.flatMap((other) => [other.top - pin.height - gap, other.top + other.height + gap]),
      ].filter((top) => top >= 10 && top <= height - pin.height - 70)
        .sort((a, b) => Math.abs(a - pin.top) - Math.abs(b - pin.top));
      const top = candidates.find((candidate) => placed.every((other) =>
        pin.left + pin.width + gap <= other.left || pin.left >= other.left + other.width + gap
        || candidate + pin.height + gap <= other.top || candidate >= other.top + other.height + gap));
      pin.top = top ?? pin.top;
      placed.push(pin);
      pin.marker.style.left = `${pin.left + pin.width / 2}px`;
      pin.marker.style.top = `${pin.top + pin.height}px`;
    }
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const halfWidth = width < 450 ? 20 : 19;
    const halfHeight = halfWidth * height / width;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  }
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart = null;
  function down(event) { pointerStart = [event.clientX, event.clientY]; }
  function up(event) {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
    pointerStart = null;
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables)[0];
    if (hit) onSelect(hit.object.parent.userData.section);
  }
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointerup", up);
  controls.addEventListener("change", render);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    select,
    layout: render,
    zoom(amount) {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom + amount, 0.75, 1.5);
      camera.updateProjectionMatrix();
      render();
      return camera.zoom;
    },
    rotate() {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    reset() {
      camera.position.copy(cameraStart);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controls.target.set(0, 1, 0);
      controls.update();
      render();
    },
    dispose() {
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      for (const geometry of geometries.values()) geometry.dispose();
      for (const meshMaterial of materials.values()) meshMaterial.dispose();
      selectorGeometry.dispose();
      selectorMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
