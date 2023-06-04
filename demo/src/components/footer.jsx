import vhtml from 'vhtml';
import { REVISION } from 'three';

/** @jsx vhtml */

export function Footer () {
  return (
    <footer>
      <a class="item" target="_blank" href="https://threejs.org/">
        three.js r{REVISION}
      </a>

      <span class="separator" aria-hidden="true">|</span>

      <a class="item" target="_blank" href="https://sketchfab.com/3d-models/bathroom-interior-7609ef43ffc04cc280f1525ffdc6d89a">
        Default "Bathroom interior" model from <a href="https://sketchfab.com/Akshaykhedkar97" target="_blank">Akshaykhedkar97</a>
      </a>

      <span class="separator" aria-hidden="true">|</span>

      <a class="item" target="_blank" href="https://github.com/antoinemc/segment-anything-3D-mesh">
        github
      </a>
    </footer>
  );
}
