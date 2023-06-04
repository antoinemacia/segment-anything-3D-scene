import {
  AmbientLight,
  AnimationMixer,
  AxesHelper,
  Box3,
  Cache,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  LoaderUtils,
  LoadingManager,
  PMREMGenerator,
  PerspectiveCamera,
  REVISION,
  Scene,
  SkeletonHelper,
  Vector3,
  WebGLRenderer,
  sRGBEncoding,
  LinearToneMapping,
} from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GUI } from "dat.gui";
import { environments } from "./environments.js";

// ADDED
import { MeshSegmentation } from "../lib/three/MeshSegmentation";
import { DepthMapRenderer } from "../lib/three/DepthMapRenderer";
import { ScreenRenderer } from "../lib/three/ScreenRenderer";

const DEFAULT_CAMERA = "[default]";

const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;
const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(
  `${THREE_PATH}/examples/jsm/libs/draco/gltf/`
);
const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(
  `${THREE_PATH}/examples/jsm/libs/basis/`
);

const IS_IOS = isIOS();

const Preset = { ASSET_GENERATOR: "assetgenerator" };

Cache.enabled = true;

export class Viewer {
  constructor(el, options) {
    this.el = el;
    this.options = options;

    this.lights = [];
    this.content = null;
    this.mixer = null;
    this.clips = [];
    this.gui = null;

    this.state = {
      environment:
        options.preset === Preset.ASSET_GENERATOR
          ? environments.find((e) => e.id === "footprint-court").name
          : environments[1].name,
      background: false,
      playbackSpeed: 1.0,
      actionStates: {},
      camera: DEFAULT_CAMERA,
      wireframe: false,
      skeleton: false,
      grid: false,

      // Lights
      punctualLights: true,
      exposure: 0.0,
      toneMapping: LinearToneMapping,
      ambientIntensity: 0.3,
      ambientColor: 0xffffff,
      directIntensity: 0.8 * Math.PI, // TODO(#116)
      directColor: 0xffffff,
      bgColor: 0x191919,
    };

    this.prevTime = 0;

    this.stats = new Stats();
    this.stats.dom.height = "48px";
    [].forEach.call(
      this.stats.dom.children,
      (child) => (child.style.display = "")
    );

    this.backgroundColor = new Color(this.state.bgColor);

    this.scene = new Scene();
    this.scene.background = this.backgroundColor;

    const fov =
      options.preset === Preset.ASSET_GENERATOR ? (0.8 * 180) / Math.PI : 60;
    this.defaultCamera = new PerspectiveCamera(
      fov,
      el.clientWidth / el.clientHeight,
      0.01,
      1000
    );
    this.activeCamera = this.defaultCamera;
    this.scene.add(this.defaultCamera);

    this.renderer = window.renderer = new WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.useLegacyLights = false;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.setClearColor(0xcccccc);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(el.clientWidth, el.clientHeight);

    this.pmremGenerator = new PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();

    this.neutralEnvironment = this.pmremGenerator.fromScene(
      new RoomEnvironment()
    ).texture;

    this.controls = new OrbitControls(
      this.defaultCamera,
      this.renderer.domElement
    );
    this.controls.screenSpacePanning = true;

    this.el.appendChild(this.renderer.domElement);

    this.skeletonHelpers = [];
    this.gridHelper = null;
    this.axesHelper = null;

    this.addAxesHelper();
    this.addGUI();
    if (options.kiosk) this.gui.close();

    this.setupSegmentAnythingTHREE(
      this.renderer,
      this.defaultCamera,
      this.scene
    );

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    window.addEventListener("resize", this.resize.bind(this), false);
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    const dt = (time - this.prevTime) / 1000;

    this.controls.update();
    this.stats.update();
    this.mixer && this.mixer.update(dt);
    this.render();

    this.prevTime = time;
  }

  render() {
    this.renderer.render(this.scene, this.activeCamera);
    if (this.state.grid) {
      this.axesCamera.position.copy(this.defaultCamera.position);
      this.axesCamera.lookAt(this.axesScene.position);
      this.axesRenderer.render(this.axesScene, this.axesCamera);
    }
  }

  resize() {
    const { clientHeight, clientWidth } = this.el.parentElement;

    this.defaultCamera.aspect = clientWidth / clientHeight;
    this.defaultCamera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);

    this.axesCamera.aspect =
      this.axesDiv.clientWidth / this.axesDiv.clientHeight;
    this.axesCamera.updateProjectionMatrix();
    this.axesRenderer.setSize(
      this.axesDiv.clientWidth,
      this.axesDiv.clientHeight
    );
  }

  load(url, rootPath, assetMap) {
    const baseURL = LoaderUtils.extractUrlBase(url);

    // Load.
    return new Promise((resolve, reject) => {
      // Intercept and override relative URLs.
      MANAGER.setURLModifier((url, path) => {
        // URIs in a glTF file may be escaped, or not. Assume that assetMap is
        // from an un-escaped source, and decode all URIs before lookups.
        // See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
        const normalizedURL =
          rootPath +
          decodeURI(url)
            .replace(baseURL, "")
            .replace(/^(\.?\/)/, "");

        if (assetMap.has(normalizedURL)) {
          const blob = assetMap.get(normalizedURL);
          const blobURL = URL.createObjectURL(blob);
          blobURLs.push(blobURL);
          return blobURL;
        }

        return (path || "") + url;
      });

      const loader = new GLTFLoader(MANAGER)
        .setCrossOrigin("anonymous")
        .setDRACOLoader(DRACO_LOADER)
        .setKTX2Loader(KTX2_LOADER.detectSupport(this.renderer))
        .setMeshoptDecoder(MeshoptDecoder);

      const blobURLs = [];

      loader.load(
        url,
        (gltf) => {
          window.VIEWER.json = gltf;

          const scene = gltf.scene || gltf.scenes[0];
          const clips = gltf.animations || [];

          if (!scene) {
            // Valid, but not supported by this viewer.
            throw new Error(
              "This model contains no scene, and cannot be viewed here. However," +
                " it may contain individual 3D resources."
            );
          }

          this.setContent(scene, clips);

          blobURLs.forEach(URL.revokeObjectURL);

          // See: https://github.com/google/draco/issues/349
          // DRACOLoader.releaseDecoderModule();

          resolve(gltf);
        },
        undefined,
        reject
      );
    });
  }

  /**
   * @param {THREE.Object3D} object
   * @param {Array<THREE.AnimationClip} clips
   */
  setContent(object, clips) {
    this.clear();

    object.updateMatrixWorld(); // donmccurdy/three-gltf-viewer#330

    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());

    this.controls.reset();

    object.position.x += object.position.x - center.x;
    object.position.y += object.position.y - center.y;
    object.position.z += object.position.z - center.z;
    this.controls.maxDistance = size * 10;
    this.defaultCamera.near = size / 100;
    this.defaultCamera.far = size * 100;
    this.defaultCamera.updateProjectionMatrix();

    if (this.options.cameraPosition) {
      this.defaultCamera.position.fromArray(this.options.cameraPosition);
      this.defaultCamera.lookAt(new Vector3());
    } else {
      this.defaultCamera.position.copy(center);
      this.defaultCamera.position.x += size / 2.0;
      this.defaultCamera.position.y += size / 5.0;
      this.defaultCamera.position.z += size / 2.0;
      this.defaultCamera.lookAt(center);
    }

    this.controls.addEventListener("change", () => {
      console.log(this.defaultCamera.position.toArray());
    })

    this.setCamera(DEFAULT_CAMERA);

    this.axesCamera.position.copy(this.defaultCamera.position);
    this.axesCamera.lookAt(this.axesScene.position);
    this.axesCamera.near = size / 100;
    this.axesCamera.far = size * 100;
    this.axesCamera.updateProjectionMatrix();
    this.axesCorner.scale.set(size, size, size);

    this.controls.saveState();

    this.scene.add(object);
    this.content = object;

    this.state.punctualLights = true;

    this.content.traverse((node) => {
      if (node.isLight) {
        this.state.punctualLights = false;
      } else if (node.isMesh) {
        // TODO(https://github.com/mrdoob/three.js/pull/18235): Clean up.
        node.material.depthWrite = !node.material.transparent;
      }
    });

    this.setClips(clips);

    this.updateDisplay();

    window.VIEWER.scene = this.content;

    this.printGraph(this.content);
  }

  printGraph(node) {
    console.group(" <" + node.type + "> " + node.name);
    node.children.forEach((child) => this.printGraph(child));
    console.groupEnd();
  }

  /**
   * @param {Array<THREE.AnimationClip} clips
   */
  setClips(clips) {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.uncacheRoot(this.mixer.getRoot());
      this.mixer = null;
    }

    this.clips = clips;
    if (!clips.length) return;

    this.mixer = new AnimationMixer(this.content);
  }

  playAllClips() {
    this.clips.forEach((clip) => {
      this.mixer.clipAction(clip).reset().play();
      this.state.actionStates[clip.name] = true;
    });
  }

  /**
   * @param {string} name
   */
  setCamera(name) {
    if (name === DEFAULT_CAMERA) {
      this.controls.enabled = true;
      this.activeCamera = this.defaultCamera;
    } else {
      this.controls.enabled = false;
      this.content.traverse((node) => {
        if (node.isCamera && node.name === name) {
          this.activeCamera = node;
        }
      });
    }
  }

  updateLights() {
    const state = this.state;
    const lights = this.lights;

    if (state.punctualLights && !lights.length) {
      this.addLights();
    } else if (!state.punctualLights && lights.length) {
      this.removeLights();
    }

    this.renderer.toneMapping = Number(state.toneMapping);
    this.renderer.toneMappingExposure = Math.pow(2, state.exposure);

    if (lights.length === 2) {
      lights[0].intensity = state.ambientIntensity;
      lights[0].color.setHex(state.ambientColor);
      lights[1].intensity = state.directIntensity;
      lights[1].color.setHex(state.directColor);
    }
  }

  addLights() {
    const state = this.state;

    if (this.options.preset === Preset.ASSET_GENERATOR) {
      const hemiLight = new HemisphereLight();
      hemiLight.name = "hemi_light";
      this.scene.add(hemiLight);
      this.lights.push(hemiLight);
      return;
    }

    const light1 = new AmbientLight(state.ambientColor, state.ambientIntensity);
    light1.name = "ambient_light";
    this.defaultCamera.add(light1);

    const light2 = new DirectionalLight(
      state.directColor,
      state.directIntensity
    );
    light2.position.set(0.5, 0, 0.866); // ~60º
    light2.name = "main_light";
    this.defaultCamera.add(light2);

    this.lights.push(light1, light2);
  }

  removeLights() {
    this.lights.forEach((light) => light.parent.remove(light));
    this.lights.length = 0;
  }

  updateDisplay() {
    if (this.skeletonHelpers.length) {
      this.skeletonHelpers.forEach((helper) => this.scene.remove(helper));
    }

    traverseMaterials(this.content, (material) => {
      material.wireframe = this.state.wireframe;
    });

    this.content.traverse((node) => {
      if (node.isMesh && node.skeleton && this.state.skeleton) {
        const helper = new SkeletonHelper(node.skeleton.bones[0].parent);
        helper.material.linewidth = 3;
        this.scene.add(helper);
        this.skeletonHelpers.push(helper);
      }
    });

    if (this.state.grid !== Boolean(this.gridHelper)) {
      if (this.state.grid) {
        this.gridHelper = new GridHelper();
        this.axesHelper = new AxesHelper();
        this.axesHelper.renderOrder = 999;
        this.axesHelper.onBeforeRender = (renderer) => renderer.clearDepth();
        this.scene.add(this.gridHelper);
        this.scene.add(this.axesHelper);
      } else {
        this.scene.remove(this.gridHelper);
        this.scene.remove(this.axesHelper);
        this.gridHelper = null;
        this.axesHelper = null;
        this.axesRenderer.clear();
      }
    }
  }

  updateBackground() {
    this.backgroundColor.setHex(this.state.bgColor);
  }

  /**
   * Adds AxesHelper.
   *
   * See: https://stackoverflow.com/q/16226693/1314762
   */
  addAxesHelper() {
    this.axesDiv = document.createElement("div");
    this.el.appendChild(this.axesDiv);
    this.axesDiv.classList.add("axes");

    const { clientWidth, clientHeight } = this.axesDiv;

    this.axesScene = new Scene();
    this.axesCamera = new PerspectiveCamera(
      50,
      clientWidth / clientHeight,
      0.1,
      10
    );
    this.axesScene.add(this.axesCamera);

    this.axesRenderer = new WebGLRenderer({ alpha: true });
    this.axesRenderer.setPixelRatio(window.devicePixelRatio);
    this.axesRenderer.setSize(
      this.axesDiv.clientWidth,
      this.axesDiv.clientHeight
    );

    this.axesCamera.up = this.defaultCamera.up;

    this.axesCorner = new AxesHelper(5);
    this.axesScene.add(this.axesCorner);
    this.axesDiv.appendChild(this.axesRenderer.domElement);
  }

  addGUI() {
    const gui = (this.gui = new GUI({
      autoPlace: false,
      width: 260,
      hideable: true,
    }));

    // Stats.
    const perfFolder = gui.addFolder("Performance");
    const perfLi = document.createElement("li");
    this.stats.dom.style.position = "static";
    perfLi.appendChild(this.stats.dom);
    perfLi.classList.add("gui-stats");
    perfFolder.__ul.appendChild(perfLi);
    perfFolder.open();

    const guiWrap = document.createElement("div");
    this.el.appendChild(guiWrap);
    guiWrap.classList.add("gui-wrap");
    guiWrap.appendChild(gui.domElement);

    gui.open();
  }

  clear() {
    if (!this.content) return;

    this.scene.remove(this.content);

    // dispose geometry
    this.content.traverse((node) => {
      if (!node.isMesh) return;

      node.geometry.dispose();
    });

    // dispose textures
    traverseMaterials(this.content, (material) => {
      for (const key in material) {
        if (key !== "envMap" && material[key] && material[key].isTexture) {
          material[key].dispose();
        }
      }
    });
  }

  // ADDED CODE
  pointerCoord(mouseEvent) {
    const pixelRatio = window.devicePixelRatio;
    const width = (mouseEvent.offsetX) * pixelRatio;
    const height = (mouseEvent.offsetY)* pixelRatio;

    return { x: width, y: height };
  }

  setupSegmentAnythingTHREE(renderer, camera, scene) {
    this.depthRenderer = new DepthMapRenderer(renderer, scene, camera);
    this.screenRenderer = new ScreenRenderer(renderer, scene, camera);
    this.meshSegmentation = new MeshSegmentation(renderer, scene, camera, this.el);

    this.state = {
      ...this.state,
      segmentByPixelCoord: () => {
        document.querySelector('canvas').style.cursor = 'crosshair'
        this.segmentByPixelCoord(this.meshSegmentation)
    }};

    // Segmentation controls.
    this.gui.add(this.state, "segmentByPixelCoord").name("Segment by click");
  }

  segmentByPixelCoord(module) {
    const cb = async (event) => {
      window.removeEventListener("pointerup", cb);

      const canvas = document.querySelector('canvas')
      const spinner = document.querySelector('.spinner')
      const overlay = document.querySelector('.overlay')

      spinner.style.display = 'block'
      overlay.style.height = '100%'
      overlay.style.cursor = 'wait'

      await module.segmentMeshViaRaycast({
        pointerCoord: this.pointerCoord(event),
        targetMesh: window.VIEWER.scene.children[0],
      });

      canvas.style.cursor = 'auto'
      spinner.style.display = 'none'
      overlay.style.height = '0%'
      overlay.style.cursor = 'auto'
    };
    window.addEventListener("pointerup", cb);
  }
}

function traverseMaterials(object, callback) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    const materials = Array.isArray(node.material)
      ? node.material
      : [node.material];
    materials.forEach(callback);
  });
}

// https://stackoverflow.com/a/9039885/1314762
function isIOS() {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}
