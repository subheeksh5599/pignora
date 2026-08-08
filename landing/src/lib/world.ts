import * as THREE from "three";

/**
 * The Pignora world: a repo rail rendered as a kinetic sculpture.
 *
 * - core: the IdentityRegistry, a faceted vault plated with the deployed
 *   RepoDesk address glyphs
 * - bead shell: verified identities orbiting the registry
 * - three tier rings: the lending caps (tier 50 / 20 / basic)
 * - six evidence nodes: the audit pack events
 * - floor: ledger paper
 *
 * Scroll progress is the only conductor. No orbit controls, no wheel
 * hijacking, native reversible scrolling.
 */

export type PresetName = "sage";

interface Preset {
  background: number;
  core: number;
  bead: number;
  beadAlt: number;
  ring: number;
  accent: number;
  floor: number;
  ambient: number;
  key: number;
  exposure: number;
}

const PRESETS: Record<PresetName, Preset> = {
  sage: {
    background: 0xedf0ee,
    core: 0x0c2128,
    bead: 0xe4e8e5,
    beadAlt: 0x48606a,
    ring: 0x0c2128,
    accent: 0xb4472c,
    floor: 0xe2e6e3,
    ambient: 2.4,
    key: 3.4,
    exposure: 1.05,
  },
};

export class PignoraWorld {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private world: THREE.Group | null = null;
  private core: THREE.Mesh | null = null;
  private beadMesh: THREE.InstancedMesh | null = null;
  private beadMaterial: THREE.MeshStandardMaterial | null = null;
  private coreMaterial: THREE.MeshStandardMaterial | null = null;
  private floorMaterial: THREE.MeshStandardMaterial | null = null;
  private ringMaterials: THREE.MeshStandardMaterial[] = [];
  private rings: THREE.Mesh[] = [];
  private nodes: THREE.Mesh[] = [];
  private ambientLight: THREE.HemisphereLight | null = null;
  private keyLight: THREE.DirectionalLight | null = null;
  private fillLight: THREE.DirectionalLight | null = null;
  private disposables: { dispose(): void }[] = [];
  private frame = 0;
  private active = true;
  private progress = 0;
  private reduced: boolean;
  private textures: Record<string, THREE.Texture> = {};
  private onFrame?: (t: number) => void;

  constructor(canvas: HTMLCanvasElement, reduced: boolean) {
    this.canvas = canvas;
    this.reduced = reduced;
  }

  /** Called by React once per animation frame so the UI can read progress. */
  setFrameHook(fn: (time: number) => void) {
    this.onFrame = fn;
  }

  getProgress() {
    return this.progress;
  }

  setProgress(p: number) {
    this.progress = p;
  }

  private register(...items: { dispose(): void }[]) {
    for (const item of items) this.disposables.push(item);
  }

  async init(): Promise<boolean> {
    if (this.reduced) return false;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      this.canvas.hidden = true;
      return false;
    }
    document.body.classList.add("is-webgl");

    // HD PNG textures: the art is the data (ledger rules, contract glyphs).
    const loader = new THREE.TextureLoader();
    const [ledger, glyphs, mosaic, closeout] = await Promise.all([
      loader.loadAsync("/textures/ledger-paper.png"),
      loader.loadAsync("/textures/vault-glyphs.png"),
      loader.loadAsync("/textures/mosaic-tiles.png"),
      loader.loadAsync("/textures/closeout-doc.png"),
    ]);
    ledger.colorSpace = THREE.SRGBColorSpace;
    glyphs.colorSpace = THREE.SRGBColorSpace;
    mosaic.colorSpace = THREE.SRGBColorSpace;
    closeout.colorSpace = THREE.SRGBColorSpace;
    ledger.wrapS = ledger.wrapT = THREE.RepeatWrapping;
    ledger.repeat.set(2, 2);
    this.textures = { ledger, glyphs, mosaic, closeout };

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // No shadow maps: the low-end target (2-core iGPU) pays dearly for them,
    // and the HD textures already carry the depth. Fake lighting via materials.

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 80);
    this.world = new THREE.Group();
    this.scene.add(this.world);

    this.buildCore();
    this.buildBeadShell();
    this.buildRings();
    this.buildFloor();
    this.buildLights();

    this.resize();
    this.renderer.setClearColor(PRESETS.sage.background, 1);
    this.renderer.toneMappingExposure = PRESETS.sage.exposure;
    this.animate(0);
    return true;
  }

  private buildCore() {
    if (!this.world || !this.textures.glyphs) return;
    this.coreMaterial = new THREE.MeshStandardMaterial({
      color: PRESETS.sage.core,
      roughness: 0.34,
      metalness: 0.22,
      map: this.textures.glyphs,
      flatShading: true,
    });
    this.register(this.coreMaterial);
    const geometry = new THREE.IcosahedronGeometry(0.82, 1);
    this.register(geometry);
    this.core = new THREE.Mesh(geometry, this.coreMaterial);
    this.world.add(this.core);

    // the closeout document stands at the proof node
    const docMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0,
      map: this.textures.closeout,
    });
    this.register(docMaterial);
    const doc = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.44), docMaterial);
    doc.position.set(2.05, 0.62, 0.9);
    doc.rotation.y = -0.85;
    doc.rotation.x = 0.12;
    this.world.add(doc);
    this.ringMaterials.push(docMaterial);
  }

  private buildBeadShell() {
    if (!this.world) return;
    const strandCount = 12;
    const pointsPerStrand = 30;
    const count = strandCount * pointsPerStrand;
    const geometry = new THREE.SphereGeometry(0.052, 12, 9);
    this.beadMaterial = new THREE.MeshStandardMaterial({
      color: PRESETS.sage.bead,
      roughness: 0.26,
      metalness: 0.14,
      vertexColors: true,
    });
    this.register(geometry, this.beadMaterial);
    this.beadMesh = new THREE.InstancedMesh(geometry, this.beadMaterial, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let cursor = 0;
    for (let strand = 0; strand < strandCount; strand += 1) {
      for (let point = 0; point < pointsPerStrand; point += 1) {
        const t = point / (pointsPerStrand - 1);
        const y = (t - 0.5) * 3.1;
        const pulse = 0.8 + Math.sin(t * Math.PI) * 0.72 + Math.sin(t * Math.PI * 3 + strand) * 0.05;
        const angle = t * Math.PI * 2.6 + (strand / strandCount) * Math.PI * 2;
        dummy.position.set(Math.cos(angle) * pulse, y, Math.sin(angle) * pulse * 0.72);
        const scale = 0.66 + 0.34 * Math.sin((point + strand) * 1.7) ** 2;
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        this.beadMesh.setMatrixAt(cursor, dummy.matrix);
        color.setHex(cursor % 17 === 0 ? PRESETS.sage.beadAlt : PRESETS.sage.bead);
        this.beadMesh.setColorAt(cursor, color);
        cursor += 1;
      }
    }
    this.beadMesh.instanceMatrix.needsUpdate = true;
    if (this.beadMesh.instanceColor) this.beadMesh.instanceColor.needsUpdate = true;
    this.world.add(this.beadMesh);
  }

  private buildRings() {
    const world = this.world;
    if (!world) return;
    // three tier rings + a spine: the repo rail itself
    const ringSpecs: [number, number, number, number][] = [
      [1.3, 0.014, -0.42, 0.1],
      [1.78, 0.02, 0.48, 0.72],
      [2.12, 0.01, 1.04, -0.26],
    ];
    ringSpecs.forEach((spec, index) => {
      const geometry = new THREE.TorusGeometry(spec[0], spec[1], 8, 220);
      const material = new THREE.MeshStandardMaterial({
        color: index === 2 ? PRESETS.sage.accent : PRESETS.sage.ring,
        roughness: 0.36,
        metalness: 0.4,
      });
      this.register(geometry, material);
      this.ringMaterials.push(material);
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.set(spec[2], spec[3], index * 0.62);
      this.rings.push(ring);
      world.add(ring);
    });

    const spineGeometry = new THREE.TorusKnotGeometry(1.1, 0.02, 260, 6, 2, 3);
    const spineMaterial = new THREE.MeshStandardMaterial({
      color: PRESETS.sage.ring,
      roughness: 0.3,
      metalness: 0.5,
    });
    this.register(spineGeometry, spineMaterial);
    const spine = new THREE.Mesh(spineGeometry, spineMaterial);
    spine.scale.set(0.94, 1.2, 0.94);
    spine.rotation.z = 0.42;
    this.ringMaterials.push(spineMaterial);
    world.add(spine);

    // six evidence nodes (audit events)
    const nodeGeometry = new THREE.SphereGeometry(0.1, 18, 12);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: PRESETS.sage.accent,
      roughness: 0.26,
      metalness: 0.18,
    });
    this.register(nodeGeometry, nodeMaterial);
    this.ringMaterials.push(nodeMaterial);
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
      node.position.set(Math.cos(angle) * 1.78, Math.sin(angle * 2) * 0.28, Math.sin(angle) * 1.22);
      this.nodes.push(node);
      world.add(node);
    }
  }

  private buildFloor() {
    if (!this.scene || !this.textures.ledger) return;
    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: PRESETS.sage.floor,
      roughness: 0.88,
      metalness: 0,
      map: this.textures.ledger,
    });
    this.register(this.floorMaterial);
    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    this.register(floorGeometry);
    const floor = new THREE.Mesh(floorGeometry, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.15;
    this.scene.add(floor);
  }

  private buildLights() {
    if (!this.scene) return;
    this.ambientLight = new THREE.HemisphereLight(0xffffff, 0x8b877f, PRESETS.sage.ambient);
    this.keyLight = new THREE.DirectionalLight(0xffffff, PRESETS.sage.key);
    this.keyLight.position.set(-4.5, 8, 7);
    this.fillLight = new THREE.DirectionalLight(0xb4472c, 1.25);
    this.fillLight.position.set(5, 1, -4);
    this.scene.add(this.ambientLight, this.keyLight, this.fillLight);
  }

  updateScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.progress = Math.min(1, Math.max(0, window.scrollY / max));
    document.documentElement.style.setProperty("--progress", this.progress.toFixed(4));
    if (!this.frame && this.renderer && !this.reduced) this.frame = requestAnimationFrame(this.animate);
  }

  private updateWorld(time: number) {
    if (!this.world || !this.camera || !this.core || !this.beadMesh) return;
    const mobile = window.innerWidth <= 680;
    const anchorX = mobile ? 0 : 2.55;
    const anchorY = mobile ? 1.15 : 0.08;
    const p = this.progress;

    this.world.position.x = anchorX;
    this.world.position.y = anchorY + Math.sin(p * Math.PI * 2) * 0.14;
    this.world.rotation.y = -0.45 + p * 2.45 + time * 0.000025;
    this.world.rotation.x = -0.12 + p * 0.34;
    this.world.rotation.z = -0.08 + Math.sin(p * Math.PI) * 0.16;
    const emphasis = 0.94 + Math.sin(p * Math.PI) * 0.11;
    this.world.scale.setScalar(emphasis);

    this.core.rotation.x = p * 2.2;
    this.core.rotation.y = p * 3.1 + time * 0.00004;
    this.core.scale.setScalar(0.82 + p * 0.42);
    this.beadMesh.rotation.y = -p * 1.4;

    this.rings.forEach((ring, index) => {
      ring.rotation.z += 0.00018 * (index + 1);
      ring.scale.setScalar(0.86 + p * (0.08 + index * 0.045));
    });
    this.nodes.forEach((node, index) => {
      node.scale.setScalar(0.7 + Math.sin(time * 0.0012 + index * 1.1) * 0.18 + p * 0.5);
    });

    const theta = -0.12 + p * 0.55;
    const radius = 7.4 - p * 0.5;
    this.camera.position.set(
      anchorX + Math.sin(theta) * radius,
      anchorY + 0.45 - p * 0.52,
      Math.cos(theta) * radius,
    );
    // Look left of the sculpture so the rail sits in the right half of the
    // frame, leaving the left side for the chapter copy (desktop only;
    // on mobile the copy sits below the sculpture).
    this.camera.lookAt(anchorX - (mobile ? 0 : 1.15), anchorY, 0);
  }

  private renderOnce() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.updateWorld(performance.now());
    this.renderer.render(this.scene, this.camera);
  }

  private animate = (time: number) => {
    this.frame = 0;
    if (!this.renderer || !this.active || this.reduced) return;
    this.updateWorld(time);
    this.renderer.render(this.scene!, this.camera!);
    this.onFrame?.(time);
    this.frame = requestAnimationFrame(this.animate);
  };

  resize() {
    if (!this.renderer) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (this.camera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
    this.renderOnce();
  }

  setVisible(visible: boolean) {
    this.active = visible;
    if (visible && !this.frame && this.renderer) this.frame = requestAnimationFrame(this.animate);
    if (!visible) cancelAnimationFrame(this.frame);
  }

  teardown() {
    cancelAnimationFrame(this.frame);
    this.disposables.forEach((item) => item.dispose());
    if (this.renderer) this.renderer.dispose();
  }
}
