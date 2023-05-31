import * as THREE from "three";
import * as api from './api'
import { ScreenRenderer } from './ScreenRenderer'

interface SegmentMeshViaRaycast {
  pointerCoord: { x: number; y: number };
  targetMesh: THREE.Mesh;
}

export class MeshSegmentation {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  raycaster: THREE.Raycaster;
  renderer: THREE.WebGLRenderer;
  screenRenderer: ScreenRenderer;
  sceneEl: HTMLCanvasElement;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    sceneEl: HTMLCanvasElement
  ) {
    this.raycaster = new THREE.Raycaster();
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.screenRenderer = new ScreenRenderer(renderer, scene, camera)
    this.sceneEl = sceneEl
  }

  async segmentMeshViaRaycast(params: SegmentMeshViaRaycast) {
    const { pointerCoord } = params

    const imgUrl = await this.screenRenderer.takeScreenshot()

    const { mask } = await api.segment({
      sourceUrl: imgUrl,
      pixelCoordinates: [pointerCoord.x, pointerCoord.y]
    })

    const points = mask.map((pixelCoordinate) => {
      return this.pixelToWorldPosition(pixelCoordinate)
    })

    const box = new THREE.Box3().setFromPoints(points);
    const helper = new THREE.Box3Helper( box, 0xffff00 );
    this.scene.add( helper );
  }

  private pixelToWorldPosition(pixelCoordinate: [number, number]): THREE.Vector3 {
    const vec = new THREE.Vector3();
    const pos = new THREE.Vector3();
    const pixelRatio = window.devicePixelRatio;

    vec.set(
      ((pixelCoordinate[0] / pixelRatio) / this.sceneEl.clientWidth) * 2 - 1,
      -((pixelCoordinate[1] / pixelRatio) / this.sceneEl.clientHeight) * 2 + 1,
      0.5
    )

    this.raycaster.setFromCamera(vec, this.camera);

    var intersects = this.raycaster.intersectObjects(this.scene.children, true)

    if(intersects.length > 0) {
      return intersects[0].point
    }

    return pos
  }
}
