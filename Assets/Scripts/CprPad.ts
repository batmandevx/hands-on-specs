/**
 * CprPad — one draggable AED pad.
 *
 * Owns: its SIK collider + Interactable + InteractableManipulation, the
 *       snap-or-return decision on release, and its own colour feedback.
 * Expects (@input): its ghost outline SceneObject, the pad visual (for colour),
 *       the ghost visual (glows green once placed), and the wrong-drop hint.
 * Must NOT: change flow state directly — it emits onPlaced / onMissed and the
 *       CprFlowController decides what happens next.
 */
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"

@component
export class CprPad extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CprPad – drag-to-snap AED pad</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("The glowing outline on the body this pad belongs on")
  ghost!: SceneObject

  @input
  @hint("Child with the pad mesh (tinted for hover / placed feedback)")
  padVisual!: SceneObject

  @input
  @hint("Child with the ghost mesh (turns green when this pad is placed)")
  ghostVisual!: SceneObject
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Placement label shown on the body outline, and as the hint when the pad is dropped in the wrong place")
  wrongDropHint: string = "Upper right chest"

  @input
  @hint("Camera the outline label turns to face (optional)")
  @allowUndefined
  cameraObject: SceneObject

  @input("vec3", "{0, 1, 7.5}")
  @hint("Where the outline label floats, in the ghost's local space (cm)")
  labelOffset: vec3 = new vec3(0, 1, 7.5)

  @input
  @hint("Outline size W x D (cm) -- matches the pad")
  outlineSize: vec2 = new vec2(12, 8)

  @input
  @hint("Outline band width (cm)")
  @widget(new SliderWidget(0.2, 2, 0.1))
  outlineWidthCm: number = 0.7

  @input
  @hint("Glow pulse speed (pulses per second)")
  @widget(new SliderWidget(0, 3, 0.1))
  glowPulseHz: number = 0.9

  @input
  @hint("Snap if released within this distance (cm) of its own ghost")
  @widget(new SliderWidget(2, 15, 0.5))
  snapDistanceCm: number = 8

  @input("vec4", "{0.95, 0.95, 0.95, 1}")
  @hint("Pad colour while waiting on the tray")
  @widget(new ColorWidget())
  idleColor: vec4 = new vec4(0.95, 0.95, 0.95, 1)

  @input("vec4", "{0.45, 1.0, 1.0, 1}")
  @hint("Pad colour while aimed at / held")
  @widget(new ColorWidget())
  hoverColor: vec4 = new vec4(0.45, 1.0, 1.0, 1)

  @input("vec4", "{0.35, 1.0, 0.45, 1}")
  @hint("Pad + ghost colour once correctly placed")
  @widget(new ColorWidget())
  placedColor: vec4 = new vec4(0.35, 1.0, 0.45, 1)
  @ui.group_end

  /** 1 or 2, assigned by the controller. */
  public padIndex: number = 0
  public placed: boolean = false

  private _onPlaced = new Event<number>()
  private _onMissed = new Event<string>()
  public get onPlaced(): PublicApi<number> {
    return this._onPlaced.publicApi()
  }
  public get onMissed(): PublicApi<string> {
    return this._onMissed.publicApi()
  }

  private interactable!: Interactable
  private manipulation!: InteractableManipulation
  private homeLocalPos: vec3 = vec3.zero()
  private homeLocalRot: quat = quat.quatIdentity()
  private padMat: Material | null = null
  private ghostMat: Material | null = null
  private ghostBaseColor: vec4 = new vec4(1, 0.75, 0.2, 0.55)
  private glowMat: Material | null = null
  private labelObj: SceneObject | null = null
  private glowT: number = 0
  private returnAnim: number = -1
  private returnFrom: vec3 = vec3.zero()

  onAwake(): void {
    const t = this.sceneObject.getTransform()
    this.homeLocalPos = t.getLocalPosition()
    this.homeLocalRot = t.getLocalRotation()

    this.padMat = this.cloneMat(this.padVisual)
    this.ghostMat = this.cloneMat(this.ghostVisual)
    if (this.ghostMat) this.ghostBaseColor = this.ghostMat.mainPass.baseColor
    this.buildGhostOutline()

    // Unit-scale wrapper owns the collider (visual child carries the scale).
    const collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(13, 3, 9)
    collider.shape = shape
    collider.fitVisual = false

    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    this.manipulation = this.sceneObject.createComponent(
      InteractableManipulation.getTypeName()
    ) as InteractableManipulation
    this.manipulation.setCanRotate(false)
    this.manipulation.setCanScale(false)

    this.interactable.onHoverEnter.add(() => {
      if (!this.placed) this.setPadColor(this.hoverColor)
    })
    this.interactable.onHoverExit.add(() => {
      if (!this.placed) this.setPadColor(this.idleColor)
    })
    this.manipulation.onManipulationStart.add(() => {
      this.returnAnim = -1
      if (!this.placed) this.setPadColor(this.hoverColor)
    })
    this.manipulation.onManipulationEnd.add(() => this.evaluateDrop())

    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  /** Show/hide the pad + its ghost (tray phase). */
  public setActive(on: boolean): void {
    this.sceneObject.enabled = on
    if (this.ghost) this.ghost.enabled = on
  }

  /** Put the pad back on the tray, un-placed and hidden. */
  public resetPad(): void {
    this.placed = false
    this.returnAnim = -1
    const t = this.sceneObject.getTransform()
    t.setLocalPosition(this.homeLocalPos)
    t.setLocalRotation(this.homeLocalRot)
    if (this.manipulation) this.manipulation.setCanTranslate(true)
    if (this.interactable) this.interactable.enabled = true
    this.setPadColor(this.idleColor)
    if (this.ghostMat) this.ghostMat.mainPass.baseColor = this.ghostBaseColor
    this.setActive(false)
  }

  /** Test hook (LEAF / demo): move the pad to worldPos and run the release logic. */
  public simulateDropAt(worldPos: vec3): void {
    if (this.placed) return
    this.sceneObject.getTransform().setWorldPosition(worldPos)
    this.evaluateDrop()
  }

  /** World position of this pad's own ghost (handy for tests). */
  public getGhostWorldPosition(): vec3 {
    return this.ghost.getTransform().getWorldPosition()
  }

  /** Distance (cm) from the pad to its ghost. */
  public distanceToGhost(): number {
    return this.sceneObject.getTransform().getWorldPosition().distance(this.getGhostWorldPosition())
  }

  private evaluateDrop(): void {
    if (this.placed) return
    const d = this.distanceToGhost()
    if (d <= this.snapDistanceCm) {
      const gt = this.ghost.getTransform()
      const t = this.sceneObject.getTransform()
      t.setWorldPosition(gt.getWorldPosition().add(new vec3(0, 0.3, 0)))
      t.setWorldRotation(gt.getWorldRotation())
      this.placed = true
      this.manipulation.setCanTranslate(false)
      this.interactable.enabled = false
      this.setPadColor(this.placedColor)
      if (this.ghostMat) this.ghostMat.mainPass.baseColor = this.placedColor
      if (this.glowMat) this.glowMat.mainPass.baseColor = new vec4(this.placedColor.x, this.placedColor.y, this.placedColor.z, 0.3)
      print("[CprPad] pad " + this.padIndex + " snapped (d=" + d.toFixed(1) + "cm)")
      this._onPlaced.invoke(this.padIndex)
    } else {
      print("[CprPad] pad " + this.padIndex + " missed (d=" + d.toFixed(1) + "cm) -> back to tray")
      this.returnFrom = this.sceneObject.getTransform().getLocalPosition()
      this.returnAnim = 0
      this.setPadColor(this.idleColor)
      this._onMissed.invoke(this.wrongDropHint)
    }
  }

  private onUpdate(): void {
    this.updateGhostGlow()
    if (this.returnAnim < 0) return
    this.returnAnim += getDeltaTime() / 0.35
    const k = Math.min(1, this.returnAnim)
    const e = 1 - Math.pow(1 - k, 3)
    const t = this.sceneObject.getTransform()
    // small hop so the bounce-back reads as a bounce
    const hop = new vec3(0, Math.sin(k * Math.PI) * 4, 0)
    t.setLocalPosition(vec3.lerp(this.returnFrom, this.homeLocalPos, e).add(hop))
    t.setLocalRotation(this.homeLocalRot)
    if (k >= 1) this.returnAnim = -1
  }

  /** Pad-shaped (rounded-rect) outline + soft glow fill + number + label on the body. */
  private buildGhostOutline(): void {
    if (!this.ghostVisual || !this.ghost) return
    const w = this.outlineSize.x
    const d = this.outlineSize.y
    const r = Math.min(w, d) * 0.28
    const rmv = this.ghostVisual.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (rmv) rmv.mesh = CprPad.roundedRectMesh(w, d, r, this.outlineWidthCm, false)
    this.ghostVisual.getTransform().setLocalScale(vec3.one())
    this.ghostVisual.getTransform().setLocalPosition(new vec3(0, 0.15, 0))

    // Soft glow: a filled rounded rect slightly larger than the pad, very transparent.
    if (this.ghostMat) {
      const glow = global.scene.createSceneObject(this.ghost.name + "_Glow")
      glow.setParent(this.ghost)
      glow.getTransform().setLocalPosition(new vec3(0, 0.05, 0))
      const g = glow.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      g.mesh = CprPad.roundedRectMesh(w + 1.6, d + 1.6, r + 0.8, 0, true)
      this.glowMat = this.ghostMat.clone()
      g.mainMaterial = this.glowMat
    }

    // Big number in the middle of the outline, lying on the body.
    const num = global.scene.createSceneObject(this.ghost.name + "_Number")
    num.setParent(this.ghost)
    num.getTransform().setLocalPosition(new vec3(0, 0.3, 0))
    num.getTransform().setLocalRotation(quat.fromEulerAngles(-Math.PI / 2, 0, 0))
    const nt = num.createComponent("Component.Text") as Text
    const digits = this.sceneObject.name.replace(/[^0-9]/g, "")
    nt.text = digits.length > 0 ? digits : "?"
    nt.size = 150
    nt.textFill.color = new vec4(1.0, 0.8, 0.3, 1)
    nt.horizontalAlignment = HorizontalAlignment.Center
    nt.verticalAlignment = VerticalAlignment.Center
    nt.depthTest = true

    // Short placement label floating beside the outline, turned to the user.
    this.labelObj = global.scene.createSceneObject(this.ghost.name + "_Label")
    this.labelObj.setParent(this.ghost)
    this.labelObj.getTransform().setLocalPosition(this.labelOffset)
    const lt = this.labelObj.createComponent("Component.Text") as Text
    lt.text = this.wrongDropHint
    lt.size = 40
    lt.textFill.color = new vec4(1.0, 0.8, 0.3, 1)
    lt.horizontalAlignment = HorizontalAlignment.Center
    lt.verticalAlignment = VerticalAlignment.Center
    lt.horizontalOverflow = HorizontalOverflow.Overflow
    lt.depthTest = true
  }

  private updateGhostGlow(): void {
    if (!this.ghost || !this.ghost.isEnabledInHierarchy) return
    this.glowT += getDeltaTime()
    if (this.labelObj && this.cameraObject) {
      const t = this.labelObj.getTransform()
      const dir = this.cameraObject.getTransform().getWorldPosition().sub(t.getWorldPosition())
      if (dir.length > 0.001) t.setWorldRotation(quat.lookAt(dir.normalize(), vec3.up()))
    }
    if (this.placed) return
    const k = 0.5 + 0.5 * Math.sin(this.glowT * Math.PI * 2 * this.glowPulseHz)
    const c = this.ghostBaseColor
    if (this.ghostMat) this.ghostMat.mainPass.baseColor = new vec4(c.x, c.y, c.z, 0.65 + 0.35 * k)
    if (this.glowMat) this.glowMat.mainPass.baseColor = new vec4(c.x, c.y, c.z, 0.08 + 0.22 * k)
  }

  /**
   * Flat rounded rectangle in the XZ plane (centred, both faces).
   * filled=true -> solid fill; otherwise an outline band of the given width.
   */
  public static roundedRectMesh(w: number, d: number, r: number, band: number, filled: boolean): RenderMesh {
    const perCorner = 8
    const outline = (hw: number, hd: number, rr: number): vec3[] => {
      const pts: vec3[] = []
      const corners = [
        [hw - rr, hd - rr, 0],
        [-(hw - rr), hd - rr, Math.PI / 2],
        [-(hw - rr), -(hd - rr), Math.PI],
        [hw - rr, -(hd - rr), Math.PI * 1.5]
      ]
      for (const c of corners) {
        for (let i = 0; i <= perCorner; i++) {
          const a = c[2] + (i / perCorner) * (Math.PI / 2)
          pts.push(new vec3(c[0] + Math.cos(a) * rr, 0, c[1] + Math.sin(a) * rr))
        }
      }
      return pts
    }
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2}
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    const verts: number[] = []
    const idx: number[] = []
    const outer = outline(w / 2, d / 2, r)
    const n = outer.length
    if (filled) {
      verts.push(0, 0, 0, 0, 1, 0, 0.5, 0.5)
      for (const p of outer) verts.push(p.x, 0, p.z, 0, 1, 0, 0, 0)
      for (let i = 0; i < n; i++) {
        const a = 1 + i
        const b = 1 + ((i + 1) % n)
        idx.push(0, a, b, 0, b, a)
      }
    } else {
      const inner = outline(w / 2 - band, d / 2 - band, Math.max(0.1, r - band))
      for (let i = 0; i < n; i++) {
        verts.push(outer[i].x, 0, outer[i].z, 0, 1, 0, 0, 1)
        verts.push(inner[i].x, 0, inner[i].z, 0, 1, 0, 0, 0)
      }
      for (let i = 0; i < n; i++) {
        const o0 = i * 2
        const i0 = o0 + 1
        const o1 = ((i + 1) % n) * 2
        const i1 = o1 + 1
        idx.push(o0, i0, o1, i0, i1, o1, o0, o1, i0, i0, o1, i1)
      }
    }
    mb.appendVerticesInterleaved(verts)
    mb.appendIndices(idx)
    mb.updateMesh()
    return mb.getMesh()
  }

  private cloneMat(so: SceneObject): Material | null {
    if (!so) return null
    const rmv = so.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (!rmv || !rmv.mainMaterial) return null
    const m = rmv.mainMaterial.clone()
    rmv.mainMaterial = m
    return m
  }

  private setPadColor(c: vec4): void {
    if (this.padMat) this.padMat.mainPass.baseColor = c
  }
}
