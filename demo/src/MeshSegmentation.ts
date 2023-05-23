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

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ) {
    this.raycaster = new THREE.Raycaster();
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.screenRenderer = new ScreenRenderer(renderer, scene, camera)
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
      ((pixelCoordinate[0] / pixelRatio) / window.innerWidth) * 2 - 1,
      -((pixelCoordinate[1] / pixelRatio) / window.innerHeight) * 2 + 1,
      0.5
    )

    this.raycaster.setFromCamera(vec, this.camera);

    var intersects = this.raycaster.intersectObjects(this.scene.children, true)

    if(intersects.length > 0) {
      return intersects[0].point
    }

    // vec.unproject(this.camera);
    // vec.sub( this.camera.position ).normalize();
    // const distance = - this.camera.position.z / vec.z;
    // pos.copy( this.camera.position ).add( vec.multiplyScalar( distance ) );

    return pos
  }
}
