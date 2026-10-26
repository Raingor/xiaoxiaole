import * as THREE from 'three';
import { JokeBear } from './characters/player/JokeBear';
import { SKINS } from './characters/core/Config';

import { FRIENDS } from './friends';

export async function makePortraits(): Promise<Record<string, string>> {
  const cache: Record<string, string> = {};
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(384, 384); renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb6b6a1, 2.4));
  const key = new THREE.DirectionalLight(0xfff4df, 3.2); key.position.set(-3, 5, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xe1f4ff, 1.3); fill.position.set(4, 2, 3); scene.add(fill);
  for (const friend of FRIENDS) {
    const bear = new JokeBear(SKINS.find(s => s.id === ('skinId' in friend ? friend.skinId : friend.id))!);
    bear.update(0, { speedNorm: 0, lateralVel: 0, rollProgress: 0 });
    bear.root.rotation.y = -0.08;
    scene.add(bear.root); scene.updateMatrixWorld(true);
    const head = (bear as unknown as { head: THREE.Group }).head;
    const bounds = new THREE.Box3();
    head.traverseVisible(node => {
      if (node instanceof THREE.Mesh) {
        node.geometry.computeBoundingBox();
        bounds.union(node.geometry.boundingBox!.clone().applyMatrix4(node.matrixWorld));
      }
    });
    const center = bounds.getCenter(new THREE.Vector3());
    const dimensions = bounds.getSize(new THREE.Vector3());
    const span = Math.max(dimensions.x, dimensions.y) * 1.10;
    const camera = new THREE.OrthographicCamera(-span / 2, span / 2, span / 2, -span / 2, 0.01, 30);
    camera.position.set(center.x, center.y, 8); camera.lookAt(center.x, center.y, 0);
    // Render the original head model as a transparent, legible game piece.
    const oldParent = head.parent!;
    const headWorld = head.matrixWorld.clone();
    oldParent.remove(head); scene.add(head); head.matrixAutoUpdate = false; head.matrix.copy(headWorld);
    bear.root.visible = false;
    renderer.render(scene, camera); cache[friend.id] = renderer.domElement.toDataURL('image/png');
    scene.remove(head); oldParent.add(head); head.matrixAutoUpdate = true; bear.root.visible = true;
    bear.root.rotation.y = friend.id === 'usagi' ? 0.12 : -0.18;
    bear.playAnimation('victory'); bear.setExpression('laugh');
    bear.update(0.28, { speedNorm: 0, lateralVel: 0, rollProgress: 0 }); scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    bear.root.traverseVisible(node => {
      if (node instanceof THREE.Mesh) {
        if (node instanceof THREE.SkinnedMesh) { node.computeBoundingBox(); if (node.boundingBox) box.union(node.boundingBox.clone().applyMatrix4(node.matrixWorld)); }
        else { node.geometry.computeBoundingBox(); box.union(node.geometry.boundingBox!.clone().applyMatrix4(node.matrixWorld)); }
      }
    });
    const mid = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3());
    const fullSpan = Math.max(size.x, size.y) * 1.10;
    camera.left = -fullSpan / 2; camera.right = fullSpan / 2; camera.top = fullSpan / 2; camera.bottom = -fullSpan / 2;
    camera.position.set(mid.x, mid.y + 0.04, 8); camera.lookAt(mid); camera.updateProjectionMatrix();
    renderer.render(scene, camera); cache[friend.id + '-full'] = renderer.domElement.toDataURL('image/png');
    scene.remove(bear.root); bear.dispose();
    await new Promise(requestAnimationFrame);
  }
  renderer.dispose(); renderer.forceContextLoss();
  return cache;
}
