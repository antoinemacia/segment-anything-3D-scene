import * as THREE from "three";

export class ScreenRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  async takeScreenshot() {
    const strMime = "image/png";
    this.renderer.render(this.scene, this.camera);
    const imgUrl = this.renderer.domElement.toDataURL(strMime);

    return imgUrl
  }

  saveFile (strData, filename) {
    const link = document.createElement("a");

    document.body.appendChild(link)
    link.download = filename;
    link.href = strData;
    link.click();
    document.body.removeChild(link)
  };
}
