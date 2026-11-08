/**
 * CprManikin — builds the smooth CPR training-manikin stand-in at runtime.
 *
 * Owns: smooth MeshBuilder body parts (head, neck, shoulders, torso, arms at
 *       the sides, pelvis, legs, feet) lying face up on the floor (local y = 0,
 *       head toward local -X), matte skin + dark-blue shirt materials, and
 *       hiding the old primitive part visuals (the objects themselves stay).
 * Expects: to sit on Mannequin_StandIn, ABOVE CprView in the hierarchy, so the
 *       torso mesh/material is on MannequinChest_Visual before CprUI clones it
 *       for the hover tint. The MannequinChest collider (added by CprUI) and
 *       ChestAnchor are not touched.
 * Must NOT: hold flow state or move ChestAnchor / MannequinChest.
 */
@component
export class CprManikin extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CprManikin – smooth training manikin stand-in</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input("vec4", "{0.93, 0.80, 0.70, 1}")
  @hint("Skin colour (matte)")
  @widget(new ColorWidget())
  skinColor: vec4 = new vec4(0.93, 0.8, 0.7, 1)

  @input("vec4", "{0.5, 0.7, 1.0, 1}")
  @hint("Shirt colour (mid blue: the display is additive, so dark colours turn see-through)")
  @widget(new ColorWidget())
  shirtColor: vec4 = new vec4(0.5, 0.7, 1.0, 1)

  @input("vec4", "{0.55, 0.62, 0.78, 1}")
  @hint("Trousers colour")
  @widget(new ColorWidget())
  pantsColor: vec4 = new vec4(0.55, 0.62, 0.78, 1)
  @ui.group_end

  private skin!: Material
  private shirt!: Material
  private pants!: Material

  onAwake(): void {
    this.skin = this.mat(requireAsset("../Materials/Cpr_ManikinSkin.mat") as Material, this.skinColor)
    this.shirt = this.mat(requireAsset("../Materials/Cpr_ManikinSkin.mat") as Material, this.shirtColor)
    this.pants = this.mat(requireAsset("../Materials/Cpr_ManikinSkin.mat") as Material, this.pantsColor)

    // Hide the old primitive visuals (objects are kept).
    const root = this.sceneObject
    let chestVisual: SceneObject | null = null
    for (let i = 0; i < root.getChildrenCount(); i++) {
      const c = root.getChild(i)
      if (c.name === "MannequinChest") {
        if (c.getChildrenCount() > 0) chestVisual = c.getChild(0)
        continue
      }
      const r = c.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
      if (r) r.enabled = false
    }

    // Torso (shirt) lives on MannequinChest_Visual so CprUI's hover tint still works.
    const torso = CprManikin.superEllipsoid(25, 11, 19, 3, 2.5, 48, 24)
    if (chestVisual) {
      const rmv = chestVisual.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
      if (rmv) {
        rmv.mesh = torso
        rmv.mainMaterial = this.shirt
      }
      const chest = chestVisual.getParent()
      const cp = chest ? chest.getTransform().getLocalPosition() : vec3.zero()
      chestVisual.getTransform().setLocalScale(vec3.one())
      chestVisual.getTransform().setLocalPosition(new vec3(7 - cp.x, 11 - cp.y, 0 - cp.z))
    } else {
      this.part("Torso", torso, this.shirt, new vec3(7, 11, 0))
    }

    const S = (a: number, b: number, c: number, n: number = 2, m: number = 2) =>
      CprManikin.superEllipsoid(a, b, c, n, m, 32, 18)
    const C = (x0: number, x1: number, r0: number, r1: number) => CprManikin.capsuleX(x0, x1, r0, r1, 28, 8)

    // Head + face (face points up, +Y)
    this.part("Head", S(10.5, 9, 7.8), this.skin, new vec3(-38.5, 10, 0))
    this.part("Nose", S(2.2, 1.6, 1.4), this.skin, new vec3(-40, 18.6, 0))
    this.part("Chin", S(2.8, 2.2, 4.2), this.skin, new vec3(-31, 14.6, 0))
    this.part("EarR", S(2.4, 2.8, 1.0), this.skin, new vec3(-39, 9.5, 7.6))
    this.part("EarL", S(2.4, 2.8, 1.0), this.skin, new vec3(-39, 9.5, -7.6))
    this.part("Neck", C(-29, -19, 4.6, 5.2), this.skin, new vec3(0, 9.5, 0))
    // Shoulders
    this.part("ShoulderR", S(7, 7.6, 6.5), this.shirt, new vec3(-12.5, 10, 17.5))
    this.part("ShoulderL", S(7, 7.6, 6.5), this.shirt, new vec3(-12.5, 10, -17.5))
    // Arms at the sides
    this.part("UpperArmR", C(-12, 10, 4.4, 3.9), this.shirt, new vec3(0, 5, 23.5))
    this.part("UpperArmL", C(-12, 10, 4.4, 3.9), this.shirt, new vec3(0, 5, -23.5))
    this.part("ForearmR", C(10, 33, 3.6, 3.0), this.skin, new vec3(0, 4, 24.5))
    this.part("ForearmL", C(10, 33, 3.6, 3.0), this.skin, new vec3(0, 4, -24.5))
    this.part("HandR", S(5.6, 2.1, 3.8, 2.4, 2), this.skin, new vec3(39, 2.4, 25))
    this.part("HandL", S(5.6, 2.1, 3.8, 2.4, 2), this.skin, new vec3(39, 2.4, -25))
    // Pelvis + legs
    this.part("Pelvis", CprManikin.superEllipsoid(12, 10, 17.5, 3, 2.5, 40, 20), this.pants, new vec3(40, 10, 0))
    this.part("ThighR", C(46, 86, 8, 6), this.pants, new vec3(0, 8, 9.5))
    this.part("ThighL", C(46, 86, 8, 6), this.pants, new vec3(0, 8, -9.5))
    this.part("ShinR", C(86, 118, 5.8, 4.3), this.pants, new vec3(0, 6, 10))
    this.part("ShinL", C(86, 118, 5.8, 4.3), this.pants, new vec3(0, 6, -10))
    this.part("FootR", S(4.2, 9, 4.6, 2.2, 2.2), this.skin, new vec3(122, 9, 10.5))
    this.part("FootL", S(4.2, 9, 4.6, 2.2, 2.2), this.skin, new vec3(122, 9, -10.5))
  }

  private mat(src: Material, color: vec4): Material {
    const m = src.clone()
    m.mainPass.baseColor = color
    return m
  }

  private part(name: string, mesh: RenderMesh, m: Material, pos: vec3): SceneObject {
    const so = global.scene.createSceneObject("ManikinSmooth_" + name)
    so.setParent(this.sceneObject)
    so.getTransform().setLocalPosition(pos)
    const r = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    r.mesh = mesh
    r.mainMaterial = m
    return so
  }

  private static builder(): MeshBuilder {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2}
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    return mb
  }

  private static spow(v: number, e: number): number {
    return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), e)
  }

  /**
   * Superellipsoid centred on the origin with half sizes a (x), b (y), c (z).
   * n = horizontal (x/z) exponent, m = vertical exponent (2 = ellipsoid, higher = boxier).
   */
  public static superEllipsoid(a: number, b: number, c: number, n: number, m: number, seg: number, rings: number): RenderMesh {
    const mb = CprManikin.builder()
    const v: number[] = []
    const e1 = 2 / m
    const e2 = 2 / n
    for (let i = 0; i <= rings; i++) {
      const phi = -Math.PI / 2 + (i / rings) * Math.PI
      const cp = CprManikin.spow(Math.cos(phi), e1)
      const sp = CprManikin.spow(Math.sin(phi), e1)
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2
        const x = a * cp * CprManikin.spow(Math.cos(th), e2)
        const z = c * cp * CprManikin.spow(Math.sin(th), e2)
        const y = b * sp
        // Normal = gradient of |x/a|^n + |z/c|^n + |y/b|^m (guarded at zero)
        let nx = (n / a) * CprManikin.spow(x / a, n - 1)
        let nz = (n / c) * CprManikin.spow(z / c, n - 1)
        let ny = (m / b) * CprManikin.spow(y / b, m - 1)
        let len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        if (len < 1e-5) {
          nx = 0
          ny = phi > 0 ? 1 : -1
          nz = 0
          len = 1
        }
        v.push(x, y, z, nx / len, ny / len, nz / len, j / seg, i / rings)
      }
    }
    mb.appendVerticesInterleaved(v)
    const idx: number[] = []
    const row = seg + 1
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < seg; j++) {
        const p = i * row + j
        idx.push(p, p + row, p + 1, p + 1, p + row, p + row + 1)
      }
    }
    mb.appendIndices(idx)
    mb.updateMesh()
    return mb.getMesh()
  }

  /** Tapered capsule along X from x0 (radius r0) to x1 (radius r1), axis at y=z=0. */
  public static capsuleX(x0: number, x1: number, r0: number, r1: number, seg: number, capRings: number): RenderMesh {
    const mb = CprManikin.builder()
    // Profile: [x, radius, normal-x, normal-radial]
    const prof: number[][] = []
    for (let i = 0; i <= capRings; i++) {
      const a = Math.PI - (i / capRings) * (Math.PI / 2) // pi .. pi/2
      prof.push([x0 + Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a), Math.sin(a)])
    }
    for (let i = 0; i <= capRings; i++) {
      const a = Math.PI / 2 - (i / capRings) * (Math.PI / 2) // pi/2 .. 0
      prof.push([x1 + Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a), Math.sin(a)])
    }
    const v: number[] = []
    for (let i = 0; i < prof.length; i++) {
      const p = prof[i]
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2
        const cy = Math.cos(th)
        const cz = Math.sin(th)
        v.push(p[0], p[1] * cy, p[1] * cz, p[2], p[3] * cy, p[3] * cz, j / seg, i / (prof.length - 1))
      }
    }
    mb.appendVerticesInterleaved(v)
    const idx: number[] = []
    const row = seg + 1
    for (let i = 0; i < prof.length - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const p = i * row + j
        idx.push(p, p + 1, p + row, p + 1, p + row + 1, p + row)
      }
    }
    mb.appendIndices(idx)
    mb.updateMesh()
    return mb.getMesh()
  }
}
