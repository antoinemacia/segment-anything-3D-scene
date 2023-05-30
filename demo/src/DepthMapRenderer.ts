import * as THREE from "three";
import { ScreenRenderer } from "./ScreenRenderer.js";

export class DepthMapRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  renderer: THREE.WebGLRenderer;
  screenRenderer: ScreenRenderer;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.screenRenderer = new ScreenRenderer(renderer, scene, camera);
  }

  render() {
    this.renderDepth();
  }

  async renderDepth() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const target = new THREE.WebGLRenderTarget(width, height);
    target.texture.format = THREE.RGBAFormat;
    target.texture.minFilter = THREE.NearestFilter;
    target.texture.magFilter = THREE.NearestFilter;
    target.stencilBuffer = false;
    target.depthBuffer = true;
    target.depthTexture = new THREE.DepthTexture();
    target.depthTexture.type = THREE.UnsignedShortType;

    const depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    depthMat.blending = THREE.NoBlending;

    // Render
    this.renderer.setClearColor(0xffffff, 1);
    this.scene.overrideMaterial = depthMat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);

    setTimeout(() => {
      this.screenRenderer.takeScreenshot();
      this.cleanup();
      this.screenRenderer.takeScreenshot();
    }, 1000);
  }

  // Unused
  depthShaderMaterial(target) {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
              void main() {
                  vUv = uv;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }`,
      fragmentShader: `
        #include <packing>
              varying vec2 vUv;
              uniform sampler2D tDiffuse;
              uniform sampler2D tDepth;
              uniform float cameraNear;
              uniform float cameraFar;
              float readDepth (sampler2D depthSampler, vec2 coord) {
                  float fragCoordZ = texture2D(depthSampler, coord).x;
                  float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
                  return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
              }
              void main() {
                  vec3 diffuse = texture2D(tDiffuse, vUv).rgb;
                  float depth = readDepth(tDepth, vUv);
                  gl_FragColor.rgb = vec3(depth);
                  gl_FragColor.a = 1.0;
              }`,
      uniforms: {
        cameraNear: { value: this.camera.near },
        cameraFar: { value: this.camera.far },
        tDiffuse: { value: target.texture },
        tDepth: { value: target.depthTexture },
      },
    });
  }

  // Fill the array with data from the pixels
  cleanup() {
    this.scene.overrideMaterial = null;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}
