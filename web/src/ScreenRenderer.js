export class ScreenRenderer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  async takeScreenshot({ name }) {
    const strMime = "image/png";
    const strDownloadMime = "image/octet-stream";

    const imgData = this.renderer.domElement.toDataURL(strMime);

    this.saveFile(imgData.replace(strMime, strDownloadMime), `${name}.png`);
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
