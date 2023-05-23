export class ScreenRenderer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  async takeScreenshot() {
    const strMime = "image/png";
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    const imgUrl = this.renderer.domElement.toDataURL(strMime);

    return imgUrl
  }

  saveFile (strData, filename) {
    const link = document.createElement("a");
    if (typeof link.download === "string") {
      document.body.appendChild(link)
      link.download = filename;
      link.href = strData;
      link.click();
      document.body.removeChild(link)
    } else {
      location.replace(uri);
    }
  };
}
