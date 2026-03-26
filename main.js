import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

/* =========================
   Scene
========================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071018);

/* =========================
   Camera
========================= */
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
camera.position.set(0, 25, 180);

/* =========================
   Renderer
========================= */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

/* =========================
   Controls
========================= */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 10, 0);

/* =========================
   Lights
========================= */
scene.add(new THREE.AmbientLight(0xffffff, 1.8));

const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(180, 220, 160);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xfff3cf, 1.2);
fillLight.position.set(-180, 80, 120);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xfff9e5, 1.2);
rimLight.position.set(0, 120, -180);
scene.add(rimLight);

/* =========================
   Ground plane
========================= */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(1200, 1200),
  new THREE.MeshStandardMaterial({
    color: 0x3f4b59,
    roughness: 1.0,
    metalness: 0.0
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -60;
scene.add(floor);

/* =========================
   Dragon group
========================= */
const dragonGroup = new THREE.Group();
scene.add(dragonGroup);

/* =========================
   STL Loader
========================= */
const loader = new STLLoader();

/* =========================
   Material factory
========================= */
function createDragonMaterial(partName) {
  // 默认：主体金色
  let baseColor = new THREE.Color(0xcfa11a);   // 主体金黄
  let bellyColor = new THREE.Color(0xfff0ad);  // 腹部浅金
  let accentColor = new THREE.Color(0xfffbe7); // 高光近白金

  // 头部：更亮、更偏贵气金
  if (partName === 'head') {
    baseColor = new THREE.Color(0xe0b52d);
    bellyColor = new THREE.Color(0xffefaa);
    accentColor = new THREE.Color(0xffffff);
  }

  // 腿部：更深一点，避免和身体混成一片
  if (partName === 'front_legs' || partName === 'back_legs') {
    baseColor = new THREE.Color(0xa97d0f);
    bellyColor = new THREE.Color(0xf3d05c);
    accentColor = new THREE.Color(0xffefbc);
  }

  const material = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.24,
    metalness: 0.22,
    clearcoat: 0.38,
    clearcoatRoughness: 0.18
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBaseColor = { value: baseColor };
    shader.uniforms.uBellyColor = { value: bellyColor };
    shader.uniforms.uAccentColor = { value: accentColor };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vPos;
      varying vec3 vNormalW;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vPos = position;
      vNormalW = normalize(normalMatrix * normal);
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform vec3 uBaseColor;
      uniform vec3 uBellyColor;
      uniform vec3 uAccentColor;
      varying vec3 vPos;
      varying vec3 vNormalW;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>

      // 朝下的面：更浅金，模拟腹部
      float downward = max(0.0, -vNormalW.y);
      float upward = max(0.0, vNormalW.y);

      float bellyMask = smoothstep(0.06, 0.75, downward);
      float ridgeMask = smoothstep(0.02, 0.62, upward);

      // 更明显的鳞片感
      float scalePattern1 =
        0.5 + 0.5 * sin(vPos.x * 1.8) * sin(vPos.z * 3.1);

      float scalePattern2 =
        0.5 + 0.5 * sin(vPos.x * 0.9 + vPos.y * 1.4);

      // 身体方向上的渐变，让颜色不死板
      float bodyGradient =
        0.5 + 0.5 * sin(vPos.x * 0.10);

      // 让头尾和身体有一点带状变化
      float banding =
        0.5 + 0.5 * sin(vPos.x * 0.22 + vPos.z * 0.12);

      vec3 dragonColor = mix(uBaseColor, uBellyColor, bellyMask * 0.98);
      dragonColor = mix(dragonColor, uAccentColor, ridgeMask * 0.42);

      // 鳞片对比加强
      dragonColor *= mix(0.78, 1.22, scalePattern1);
      dragonColor *= mix(0.88, 1.10, scalePattern2);

      // 整体层次变化
      dragonColor *= mix(0.92, 1.10, bodyGradient);
      dragonColor *= mix(0.94, 1.08, banding);

      diffuseColor.rgb *= dragonColor;
      `
    );
  };

  return material;
}

/* =========================
   Load one dragon part
========================= */
function loadPart(path, partName) {
  loader.load(
    path,
    (geometry) => {
      geometry.computeVertexNormals();

      const material = createDragonMaterial(partName);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.set(0.7, 0.7, 0.7);
      mesh.rotation.set(-180,-180,-180);
      mesh.position.set(60,60,60);

      dragonGroup.add(mesh);
      console.log('loaded:', partName, path);
    },
    undefined,
    (error) => {
      console.error('failed to load:', partName, path, error);
    }
  );
}

/* =========================
   Load separated parts
========================= */
loadPart('./models/dragon_body.stl', 'body');
loadPart('./models/dragon_head.stl', 'head');
loadPart('./models/dragon_front_legs.stl', 'front_legs');
loadPart('./models/dragon_back_legs.stl', 'back_legs');

/* =========================
   Resize handling
========================= */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =========================
   Animation loop
========================= */
const startTime = Date.now();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    render();
  }

  function render() {
  const timer = (Date.now() - startTime) * 0.001;
  const cycle = timer % 13.4;
  let radius;

  if (cycle < 6.8) {
    radius = 180 + Math.cos(timer) * 40;
    camera.position.y = 60;
  } else {
    radius = 120 + Math.cos(timer) * 40;
    camera.position.y = 30;
  }

  camera.position.x = Math.cos(timer) * radius;
  camera.position.z = Math.sin(timer) * radius;

  renderer.render(scene, camera);
  }

animate();