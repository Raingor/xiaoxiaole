import * as THREE from 'three';

/** Small folded woven label sewn into the bear's positive-X hip seam. */
export class BearLabel {
  readonly root = new THREE.Group();
  private geometries: THREE.PlaneGeometry[] = [];
  private materials: THREE.MeshStandardMaterial[] = [];
  private textures: THREE.Texture[] = [];
  private flutter = 0;

  constructor() {
    this.root.name = 'ClothLabel';
    // Chest-local position: below the arm, at the lower side seam.
    this.root.position.set(0.365, -0.165, -0.015);
    this.root.rotation.set(0, -0.32, 0.48);
    for (const back of [false, true]) {
      const geometry = new THREE.PlaneGeometry(0.17, 0.30, 3, 16);
      if (back) {
        const uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
      }
      const texture = this.printTexture(back);
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, map: texture, roughness: 1, metalness: 0,
        side: back ? THREE.BackSide : THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = back ? 'LabelBack' : 'LabelFront';
      mesh.castShadow = true;
      this.root.add(mesh);
      this.geometries.push(geometry);
      this.materials.push(material);
      this.textures.push(texture);
    }
    this.update(0, 0, false);
  }

  private printTexture(back: boolean): THREE.Texture {
    // Geometry can still be constructed by headless unit tests.
    if (typeof document === 'undefined') {
      const texture = new THREE.DataTexture(new Uint8Array([244, 243, 236, 255]), 1, 1);
      texture.needsUpdate = true;
      return texture;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f6f6f3';
    ctx.fillRect(0, 0, 256, 512);
    // Fine woven threads and a dark folded hem, matching the photo's silhouette.
    ctx.strokeStyle = '#deded6';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < 512; y += 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }
    ctx.fillStyle = '#18212a';
    ctx.fillRect(0, 0, 6, 512);
    ctx.fillRect(250, 0, 6, 512);
    ctx.fillRect(0, 500, 256, 12);
    ctx.strokeStyle = '#8d9293';
    ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(12, 24); ctx.lineTo(244, 24); ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(128, 282);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${back ? 64 : 112}px "Apple SD Gothic Neo", sans-serif`;
    ctx.font = `bold ${ctx.font}`;
    ctx.fillText(back ? '누리토이즈' : '당곰', 0, -30, 410);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(back ? 'MADE IN CHINA' : 'JOKE BEAR', 0, 44, 410);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  update(dt: number, phase: number, running: boolean): void {
    this.flutter = THREE.MathUtils.damp(this.flutter, running ? 1 : 0, 7, dt);
    this.root.rotation.x = Math.sin(phase - 0.6) * 0.12 * this.flutter;
    this.root.rotation.z = 0.48 + Math.sin(phase - 0.4) * 0.07 * this.flutter;
    for (let side = 0; side < this.geometries.length; side++) {
      const geometry = this.geometries[side];
      const uv = geometry.attributes.uv;
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const u = side ? 1 - uv.getX(i) : uv.getX(i);
        const t = 1 - uv.getY(i);
        const curl = 0.04 * Math.sin(t * Math.PI * 1.3) + 0.018 * t * Math.sin(u * Math.PI);
        const wave = this.flutter * 0.022 * t * t * Math.sin(phase * 2 - t * 4);
        position.setXYZ(i, (u - 0.5) * 0.17 * (1 - t * 0.04), -t * 0.30,
          curl + wave + (side ? -0.0015 : 0.0015));
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
  }
}
