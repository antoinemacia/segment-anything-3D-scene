import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DepthMapRenderer } from "./src/DepthMapRenderer.js";
import { ScreenRenderer } from "./src/ScreenRenderer.js";
const container = document.getElementsByTagName("canvas")[0];

let renderer, scene, camera;
let mesh;
let raycaster;
let controls;
let screenRenderer;
let depthRenderer;

const intersection = {
  intersects: false,
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(),
  mesh: null,
};
const mouse = new THREE.Vector2();
const intersects = [];

init();
animate();

function init() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: container,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );

  depthRenderer = new DepthMapRenderer(renderer, scene, camera);
  screenRenderer = new ScreenRenderer(renderer, scene, camera);

  controls = new OrbitControls(camera, renderer.domElement);

  scene.add(new THREE.AmbientLight(0x443333));

  const dirLight1 = new THREE.DirectionalLight(0xffddcc, 1);
  dirLight1.position.set(1, 0.75, 0.5);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xccccff, 1);
  dirLight2.position.set(-1, 0.75, -0.5);
  scene.add(dirLight2);

  loadGLTF();

  raycaster = new THREE.Raycaster();

  window.addEventListener("resize", onWindowResize);

  let moved = false;

  controls.addEventListener("change", function () {
    moved = true;
  });

  window.addEventListener("pointerdown", function () {
    moved = false;
  });

  window.addEventListener("pointerup", function (event) {
    if (moved === false) {
      checkIntersection(event.clientX, event.clientY);

      if (intersection.intersects) shoot();

      console.log(intersection.point);
    }
  });

  window.addEventListener("pointermove", onPointerMove);

  function onPointerMove(event) {
    if (event.isPrimary) {
      checkIntersection(event.clientX, event.clientY);
    }
  }

  function checkIntersection(x, y) {
    if (mesh === undefined) return;

    mouse.x = (x / window.innerWidth) * 2 - 1;
    mouse.y = -(y / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    raycaster.intersectObject(mesh, true, intersects);

    if (intersects.length > 0) {
      const p = intersects[0].point;
      intersection.point.copy(p);

      intersection.mesh = intersects[0].object;

      const n = intersects[0].face.normal.clone();
      n.transformDirection(mesh.matrixWorld);
      n.multiplyScalar(10);
      n.add(intersects[0].point);

      intersection.normal.copy(intersects[0].face.normal);

      intersection.intersects = true;

      intersects.length = 0;
    } else {
      intersection.intersects = false;
    }
  }
}

function loadGLTF() {
  const loader = new GLTFLoader();

  loader.load("./assets/bathroom_interior.glb", function (gltf) {
    mesh = gltf.scene.children[0];

    scene.add(mesh);
    mesh.scale.set(10, 10, 10);

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());

    mesh.position.x += mesh.position.x - center.x;
    mesh.position.y += mesh.position.y - center.y;
    mesh.position.z += mesh.position.z - center.z;
    camera.position.set(
      4.674592791622768,
      -2.6023053862991436,
      49.48678612054921
    );
    camera.lookAt(
      new THREE.Vector3(
        1.8901312896094327,
        -1.0033038384070259,
        -8.669876793626505
      )
    );
  });
}

function shoot() {
  depthRenderer.render();
  // var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 ).unproject( camera );

  
  // var raycaster = new THREE.Raycaster( camera.position, vector );

  // const point = new THREE.Mesh( 
  //   new THREE.BoxGeometry( 0.1, 0.1, 0.1 ),
  //   new THREE.MeshBasicMaterial( {color: 0xffff00} )
  // )

  // point.position.copy(vector)
  // scene.add( point );
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}
