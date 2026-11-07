/**
 * CprUI — passive view for the Hands On CPR coach.
 *
 * Owns: decorating the authored SceneObjects with UIKit Buttons / BackPlates,
 *       Text components, SIK Interactables for the orb and the mannequin chest,
 *       per-step visibility, the ring pulse and the shock flash, and keeping
 *       labels/buttons facing the user.
 * Expects (@input): the authored scene objects listed under References.
 * Must NOT: hold flow state or make flow decisions. It renders what
 *       CprFlowController pushes in (setters) and reports user intent through
 *       Event emitters (onOrbPinched, onDone, onChestPinched, onStart, onSkip,
 *       onAedHere, onShock, onHelpArrived).
 */
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {CprStep} from "./CprTypes"

const LABEL_Z = 0.6 // content lift in front of a BackPlate / button face

@component
export class CprUI extends BaseScriptComponent {
  public static readonly DEFAULT_CUE: string = "Push hard, 5-6 cm. Let it rise."
  public static readonly READY_CUE: string = "Hands on the target. Pinch Start."

  @ui.label('<span style="color: #60A5FA;">CprUI – passive view for the CPR coach</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("User camera (labels and buttons turn to face it)") cameraObject!: SceneObject
  @input @hint("'Someone collapsed?' orb (collider + Interactable added here)") startOrb!: SceneObject
  @input @hint("Orb sphere mesh") startOrbVisual!: SceneObject
  @input @hint("Label above the orb") startOrbLabel!: SceneObject
  @input @hint("Call card root (BackPlate)") callCard!: SceneObject
  @input @hint("Call card text") callCardText!: SceneObject
  @input @hint("Call card Done button") doneButton!: SceneObject
  @input @hint("'Pinch the centre of the chest' prompt") chestPrompt!: SceneObject
  @input @hint("Mannequin chest wrapper (collider + Interactable added here)") mannequinChest!: SceneObject
  @input @hint("Mannequin chest mesh (hover tint)") mannequinChestVisual!: SceneObject
  @input @hint("Hand target (two stacked hands)") handTarget!: SceneObject
  @input @hint("Pacer ring root") pacerRing!: SceneObject
  @input @hint("Pacer ring mesh") pacerRingVisual!: SceneObject
  @input @hint("Counter text (1-30)") counterText!: SceneObject
  @input @hint("Elapsed timer text") timerText!: SceneObject
  @input @hint("Coaching cue text") cueText!: SceneObject
  @input @hint("Swap-rescuers cue") swapCue!: SceneObject
  @input @hint("Stand clear card root (BackPlate)") standClearCard!: SceneObject
  @input @hint("Analyse countdown text inside the stand clear card") standClearCountdown!: SceneObject
  @input @hint("Shock flash sphere") shockFlash!: SceneObject
  @input @hint("Start button") startButton!: SceneObject
  @input @hint("Skip 2 minutes (dev/demo) button") skipButton!: SceneObject
  @input @hint("AED here button") aedHereButton!: SceneObject
  @input @hint("Help arrived button") helpArrivedButton!: SceneObject
  @input @hint("Shock button") shockButton!: SceneObject
  @input @hint("AED tray") aedTray!: SceneObject
  @input @hint("Pad hint text") padHint!: SceneObject
  @input @hint("Pad 1") pad1!: SceneObject
  @input @hint("Pad 2") pad2!: SceneObject
  @input @hint("Pad 1 ghost outline") pad1Ghost!: SceneObject
  @input @hint("Pad 2 ghost outline") pad2Ghost!: SceneObject
  @input @hint("Label on pad 1") pad1Label!: SceneObject
  @input @hint("Label on pad 2") pad2Label!: SceneObject
  @input @hint("Handover summary card root (BackPlate)") summaryCard!: SceneObject
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input("vec4", "{0.4, 1.0, 1.0, 1}")
  @hint("Primary accent (ring, counter)")
  @widget(new ColorWidget())
  accentColor: vec4 = new vec4(0.4, 1.0, 1.0, 1)

  @input("vec4", "{1.0, 0.72, 0.15, 1}")
  @hint("Attention colour (swap cue, prompts)")
  @widget(new ColorWidget())
  attentionColor: vec4 = new vec4(1.0, 0.72, 0.15, 1)

  @input("vec4", "{1, 1, 1, 1}")
  @hint("Body text colour")
  @widget(new ColorWidget())
  textColor: vec4 = new vec4(1, 1, 1, 1)

  @input
  @hint("Call card message ('|' starts a new line)")
  callMessage: string = "Call 112 / 911 on speaker.|Shout for an AED."

  @input
  @hint("Pacer ring outer diameter (cm)")
  @widget(new SliderWidget(10, 30, 0.5))
  ringDiameterCm: number = 20

  @input
  @hint("Pacer ring band width (cm)")
  @widget(new SliderWidget(0.4, 4, 0.1))
  ringWidthCm: number = 1.4

  @input
  @hint("Extra pulse size on each beat (0.15 = ring grows 15%)")
  @widget(new SliderWidget(0, 0.4, 0.01))
  pulseAmount: number = 0.15
  @ui.group_end

  // ---------- events (UI -> controller) ----------
  private _onOrbPinched = new Event<void>()
  private _onDone = new Event<void>()
  private _onChestPinched = new Event<vec3>()
  private _onStart = new Event<void>()
  private _onSkip = new Event<void>()
  private _onAedHere = new Event<void>()
  private _onShock = new Event<void>()
  private _onHelpArrived = new Event<void>()
  public get onOrbPinched(): PublicApi<void> { return this._onOrbPinched.publicApi() }
  public get onDone(): PublicApi<void> { return this._onDone.publicApi() }
  public get onChestPinched(): PublicApi<vec3> { return this._onChestPinched.publicApi() }
  public get onStart(): PublicApi<void> { return this._onStart.publicApi() }
  public get onSkip(): PublicApi<void> { return this._onSkip.publicApi() }
  public get onAedHere(): PublicApi<void> { return this._onAedHere.publicApi() }
  public get onShock(): PublicApi<void> { return this._onShock.publicApi() }
  public get onHelpArrived(): PublicApi<void> { return this._onHelpArrived.publicApi() }

  // ---------- view internals ----------
  private counterT!: Text
  private timerT!: Text
  private cueT!: Text
  private swapT!: Text
  private countdownT!: Text
  private padHintT!: Text
  private summaryT!: Text
  private ringMat: Material | null = null
  private chestMat: Material | null = null
  private chestBaseColor: vec4 = new vec4(0.86, 0.8, 0.74, 1)
  private handMats: Material[] = []
  private ringBaseScale: vec3 = new vec3(20, 3, 20)
  private faceList: SceneObject[] = []
  private swapOn: boolean = false
  private flashT: number = -1
  private orbT: number = 0
  private currentStep: CprStep = CprStep.Idle
  private helpRow1Pos: vec3 = new vec3(7, 6, 15)
  private helpRow2Pos: vec3 = new vec3(0, 2, 23)

  onAwake(): void {
    this.buildOrb()
    this.buildCallCard()
    this.buildChest()
    this.buildPacer()
    this.buildButtons()
    this.buildAed()
    this.buildCards()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    this.createEvent("LateUpdateEvent").bind(() => this.faceUser())
  }

  // ======================= setters (controller -> view) =======================

  /** Show only what the current step needs. */
  public applyStep(step: CprStep, aedPresent: boolean, padsDone: boolean): void {
    this.currentStep = step
    const compressing = step === CprStep.Compressing
    const analysing = step === CprStep.StandClear || step === CprStep.ShockReady
    const active = step === CprStep.Ready || compressing || analysing
    const padPhase = compressing && aedPresent && !padsDone

    this.show(this.startOrb, step === CprStep.Idle)
    this.show(this.callCard, step === CprStep.Call)
    this.show(this.chestPrompt, step === CprStep.MarkChest)
    this.show(this.handTarget, active)
    this.show(this.pacerRing, compressing)
    this.show(this.counterText, compressing)
    // The swap cue replaces the coaching cue in the same spot just above the ring.
    this.show(this.cueText, (step === CprStep.Ready || compressing) && !this.swapOn)
    this.show(this.timerText, compressing || analysing)
    this.show(this.swapCue, compressing && this.swapOn)
    this.show(this.standClearCard, analysing)
    this.show(this.startButton, step === CprStep.Ready)
    this.show(this.skipButton, compressing && !padPhase) // keep the pad step uncluttered
    this.show(this.aedHereButton, compressing && !aedPresent)
    const helpVisible = compressing && !padPhase
    this.show(this.helpArrivedButton, helpVisible)
    if (helpVisible) {
      this.helpArrivedButton.getTransform().setLocalPosition(aedPresent ? this.helpRow1Pos : this.helpRow2Pos)
    }
    this.show(this.shockButton, step === CprStep.ShockReady)
    this.show(this.aedTray, padPhase)
    this.show(this.padHint, padPhase)
    this.show(this.pad1Ghost, padPhase)
    this.show(this.pad2Ghost, padPhase)
    const padsVisible = aedPresent && (compressing || analysing)
    this.show(this.pad1, padsVisible)
    this.show(this.pad2, padsVisible)
    this.show(this.summaryCard, step === CprStep.Summary)

    if (step === CprStep.Ready) this.setCue(CprUI.READY_CUE, false)
    if (step === CprStep.StandClear) this.countdownT.text = "Analysing..."
    if (step === CprStep.ShockReady) {
      this.countdownT.text = "Shock advised. Press SHOCK."
      this.countdownT.textFill.color = this.attentionColor
    } else {
      this.countdownT.textFill.color = this.textColor
    }
  }

  public setCounter(n: number): void {
    this.counterT.text = n > 0 ? "" + n : ""
  }

  public setTimer(seconds: number): void {
    this.timerT.text = CprUI.formatTime(seconds)
  }

  public setCue(text: string, attention: boolean): void {
    this.cueT.text = text
    this.cueT.textFill.color = attention ? this.attentionColor : this.textColor
  }

  public setSwapCue(on: boolean): void {
    this.swapOn = on
    this.show(this.swapCue, on && this.currentStep === CprStep.Compressing)
    const coaching = this.currentStep === CprStep.Ready || this.currentStep === CprStep.Compressing
    this.show(this.cueText, coaching && !on)
    this.setRingColor(on ? this.attentionColor : this.accentColor)
  }

  public setStandClearCountdown(n: number): void {
    if (this.currentStep === CprStep.StandClear) this.countdownT.text = "Analysing... " + n
  }

  public setPadHint(text: string, attention: boolean): void {
    this.padHintT.text = text
    this.padHintT.textFill.color = attention ? this.attentionColor : this.textColor
  }

  /** Move the hand target + ring to the pinched spot (local offset on the chest anchor). */
  public setHandTargetOffset(offset: vec3): void {
    this.handTarget.getTransform().setLocalPosition(new vec3(offset.x, 0.4, offset.z))
    this.pacerRing.getTransform().setLocalPosition(new vec3(offset.x, 0.3, offset.z))
  }

  /** Ring pulse: called every frame with time since the last beat. */
  public setPulse(sinceBeat: number, interval: number): void {
    const k = Math.exp(-Math.max(0, sinceBeat) * 9)
    const s = 1 + this.pulseAmount * k
    this.pacerRingVisual
      .getTransform()
      .setLocalScale(new vec3(this.ringBaseScale.x * s, this.ringBaseScale.y, this.ringBaseScale.z * s))
    const base = this.swapOn ? this.attentionColor : this.accentColor
    const c = new vec4(
      base.x + (1 - base.x) * k * 0.6,
      base.y + (1 - base.y) * k * 0.6,
      base.z + (1 - base.z) * k * 0.6,
      1
    )
    if (this.ringMat) this.ringMat.mainPass.baseColor = c
    const hb = 0.7 + 0.3 * k
    for (const m of this.handMats) m.mainPass.baseColor = new vec4(hb, hb, hb, 1)
  }

  public flashShock(): void {
    this.flashT = 0
    this.show(this.shockFlash, true)
  }

  public setSummary(totalSeconds: number, cycles: number, shocks: number): void {
    this.summaryT.text =
      "Handover summary\n\nTotal time  " +
      CprUI.formatTime(totalSeconds) +
      "\nCycles (30)  " +
      cycles +
      "\nShocks given  " +
      shocks +
      "\n\nTell the paramedics."
  }

  /** Flat annulus in the XZ plane, both faces, centred on the origin. */
  public static buildRingMesh(outerR: number, innerR: number, segments: number): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2}
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    const verts: number[] = []
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      const c = Math.cos(a)
      const sn = Math.sin(a)
      verts.push(c * outerR, 0, sn * outerR, 0, 1, 0, i / segments, 1)
      verts.push(c * innerR, 0, sn * innerR, 0, 1, 0, i / segments, 0)
    }
    mb.appendVerticesInterleaved(verts)
    const idx: number[] = []
    for (let i = 0; i < segments; i++) {
      const o0 = i * 2
      const i0 = o0 + 1
      const o1 = o0 + 2
      const i1 = o0 + 3
      idx.push(o0, i0, o1, i0, i1, o1) // one winding
      idx.push(o0, o1, i0, i0, o1, i1) // and the other, so it reads from any side
    }
    mb.appendIndices(idx)
    mb.updateMesh()
    return mb.getMesh()
  }

  public static formatTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds))
    const m = Math.floor(s / 60)
    const r = s % 60
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r
  }

  // ======================= builders =======================

  private buildOrb(): void {
    this.addSphereInteractable(this.startOrb, 7, () => this._onOrbPinched.invoke())
    const t = this.makeText(this.startOrbLabel, "Someone collapsed?\nPinch the orb", 60, this.textColor)
    t.lineSpacing = 1
    this.faceList.push(this.startOrbLabel)
  }

  private buildCallCard(): void {
    this.callCard.createComponent("Component.Canvas")
    const bp = this.callCard.createComponent(BackPlate.getTypeName()) as BackPlate
    bp.size = new vec2(30, 17)
    this.liftZ(this.callCardText, LABEL_Z)
    this.makeText(this.callCardText, this.callMessage.split("|").join("\n"), 56, this.textColor)
    this.liftZ(this.doneButton, LABEL_Z)
    this.makeButton(this.doneButton, "Done", 10, 3.8, "Primary", () => this._onDone.invoke(), false)
    this.faceList.push(this.callCard)

    this.makeText(this.chestPrompt, "Pinch the centre of the chest", 54, this.attentionColor)
    this.faceList.push(this.chestPrompt)
  }

  private buildChest(): void {
    const collider = this.mannequinChest.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(40, 22, 40)
    collider.shape = shape
    collider.fitVisual = false
    const it = this.mannequinChest.createComponent(Interactable.getTypeName()) as Interactable
    this.chestMat = this.cloneMat(this.mannequinChestVisual)
    if (this.chestMat) this.chestBaseColor = this.chestMat.mainPass.baseColor
    it.onHoverEnter.add(() => {
      if (this.chestMat && this.currentStep === CprStep.MarkChest)
        this.chestMat.mainPass.baseColor = new vec4(0.75, 1.0, 1.0, 1)
    })
    it.onHoverExit.add(() => {
      if (this.chestMat) this.chestMat.mainPass.baseColor = this.chestBaseColor
    })
    it.onTriggerStart.add((e: InteractorEvent) => {
      let p: vec3 | null = null
      const hit = e.interactor && e.interactor.targetHitInfo ? e.interactor.targetHitInfo.hit : null
      if (hit && hit.position) p = hit.position
      if (!p) p = this.mannequinChest.getTransform().getWorldPosition().add(new vec3(0, 11, 0))
      if (this.chestMat) this.chestMat.mainPass.baseColor = this.chestBaseColor
      this._onChestPinched.invoke(p)
    })
  }

  private buildPacer(): void {
    this.ringMat = this.cloneMat(this.pacerRingVisual)
    // Replace the placeholder torus with a crisp flat annulus sized in cm.
    const rmv = this.pacerRingVisual.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (rmv) rmv.mesh = CprUI.buildRingMesh(this.ringDiameterCm / 2, this.ringDiameterCm / 2 - this.ringWidthCm, 72)
    this.ringBaseScale = new vec3(1, 1, 1)
    this.pacerRingVisual.getTransform().setLocalScale(this.ringBaseScale)
    const kids = this.handTarget.getChildrenCount()
    for (let i = 0; i < kids; i++) {
      const m = this.cloneMat(this.handTarget.getChild(i))
      if (m) this.handMats.push(m)
    }
    this.counterT = this.makeText(this.counterText, "", 120, this.accentColor)
    this.timerT = this.makeText(this.timerText, "00:00", 64, this.textColor)
    this.cueT = this.makeText(this.cueText, CprUI.DEFAULT_CUE, 50, this.textColor)
    this.swapT = this.makeText(this.swapCue, "Switch rescuers now.\nKeep the beat.", 66, this.attentionColor)
    this.faceList.push(this.counterText, this.timerText, this.cueText, this.swapCue)
  }

  private buildButtons(): void {
    this.makeButton(this.startButton, "Start", 10, 3.8, "Primary", () => this._onStart.invoke(), true)
    this.makeButton(this.skipButton, ">> 2 min", 9, 3.4, "PrimaryNeutral", () => this._onSkip.invoke(), true)
    this.makeButton(this.aedHereButton, "AED here", 10, 3.4, "Primary", () => this._onAedHere.invoke(), true)
    this.makeButton(
      this.helpArrivedButton,
      "Help arrived",
      12,
      3.4,
      "PrimaryNeutral",
      () => this._onHelpArrived.invoke(),
      true
    )
    // Shock: outline-style button over a red plate -- red is reserved for Shock only.
    this.makeButton(this.shockButton, "SHOCK", 12, 4.6, "Ghost", () => this._onShock.invoke(), true)
  }

  private buildAed(): void {
    this.padHintT = this.makeText(this.padHint, "", 42, this.textColor)
    this.faceList.push(this.padHint)
    this.flatLabel(this.pad1Label, "1")
    this.flatLabel(this.pad2Label, "2")
  }

  private buildCards(): void {
    this.standClearCard.createComponent("Component.Canvas")
    const bp = this.standClearCard.createComponent(BackPlate.getTypeName()) as BackPlate
    bp.size = new vec2(30, 12)
    const title = global.scene.createSceneObject("StandClearCard_Title")
    title.setParent(this.standClearCard)
    title.getTransform().setLocalPosition(new vec3(0, 2.2, LABEL_Z))
    this.makeText(title, "Stand clear. Don't touch.", 58, this.attentionColor)
    this.liftZ(this.standClearCountdown, LABEL_Z)
    this.countdownT = this.makeText(this.standClearCountdown, "Analysing...", 48, this.textColor)
    this.faceList.push(this.standClearCard)

    this.summaryCard.createComponent("Component.Canvas")
    const sbp = this.summaryCard.createComponent(BackPlate.getTypeName()) as BackPlate
    sbp.size = new vec2(28, 24)
    const body = global.scene.createSceneObject("SummaryCard_Text")
    body.setParent(this.summaryCard)
    body.getTransform().setLocalPosition(new vec3(0, 0, LABEL_Z))
    this.summaryT = this.makeText(body, "Handover summary", 46, this.textColor)
    this.faceList.push(this.summaryCard)
  }

  // ======================= helpers =======================

  private makeText(so: SceneObject, txt: string, size: number, color: vec4): Text {
    const t = so.createComponent("Component.Text") as Text
    t.text = txt
    t.size = size
    t.textFill.color = color
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.depthTest = true
    return t
  }

  private flatLabel(so: SceneObject, txt: string): void {
    so.getTransform().setLocalRotation(quat.fromEulerAngles(-Math.PI / 2, 0, 0))
    this.makeText(so, txt, 60, new vec4(0.1, 0.45, 0.6, 1))
  }

  private makeButton(
    so: SceneObject,
    label: string,
    w: number,
    h: number,
    style: string,
    onTap: () => void,
    standalone: boolean
  ): Button {
    if (standalone) so.createComponent("Component.Canvas")
    const b = so.createComponent(Button.getTypeName()) as Button
    b.setVariant({theme: "SnapOS2", shape: "Capsule", style: style})
    b.size = new vec3(w, h, 1)
    b.onInitialized.add(() => {
      b.size = new vec3(w, h, 1)
    })
    b.onTriggerUp.add(() => onTap())
    const labelObj = global.scene.createSceneObject(so.name + "_Label")
    labelObj.setParent(so)
    labelObj.getTransform().setLocalPosition(new vec3(0, 0, LABEL_Z))
    this.makeText(labelObj, label, 42, this.textColor)
    if (standalone) this.faceList.push(so)
    return b
  }

  private addSphereInteractable(so: SceneObject, radius: number, onTap: () => void): void {
    const collider = so.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createSphereShape()
    shape.radius = radius
    collider.shape = shape
    collider.fitVisual = false
    const it = so.createComponent(Interactable.getTypeName()) as Interactable
    it.onHoverEnter.add(() => this.startOrbVisual.getTransform().setLocalScale(new vec3(12, 12, 12)))
    it.onHoverExit.add(() => this.startOrbVisual.getTransform().setLocalScale(new vec3(10, 10, 10)))
    it.onTriggerEnd.add(() => onTap())
  }

  private cloneMat(so: SceneObject): Material | null {
    if (!so) return null
    const rmv = so.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (!rmv || !rmv.mainMaterial) return null
    const m = rmv.mainMaterial.clone()
    rmv.mainMaterial = m
    return m
  }

  private setRingColor(c: vec4): void {
    if (this.ringMat) this.ringMat.mainPass.baseColor = c
  }

  private liftZ(so: SceneObject, dz: number): void {
    const t = so.getTransform()
    const p = t.getLocalPosition()
    t.setLocalPosition(new vec3(p.x, p.y, dz))
  }

  private show(so: SceneObject, on: boolean): void {
    if (so && so.enabled !== on) so.enabled = on
  }

  private onUpdate(): void {
    const dt = getDeltaTime()
    if (this.startOrb.enabled) {
      this.orbT += dt
      const y = Math.sin(this.orbT * 2.0) * 1.0
      this.startOrbVisual.getTransform().setLocalPosition(new vec3(0, y, 0))
    }
    if (this.flashT >= 0) {
      this.flashT += dt
      const k = Math.min(1, this.flashT / 0.45)
      const s = 20 + 40 * k
      this.shockFlash.getTransform().setLocalScale(new vec3(s, s, s))
      if (k >= 1) {
        this.flashT = -1
        this.show(this.shockFlash, false)
      }
    } else if (this.shockFlash.enabled) {
      this.show(this.shockFlash, false)
    }
  }

  /** Keep labels, cards and buttons turned toward the user (yaw + pitch). */
  private faceUser(): void {
    if (!this.cameraObject) return
    const cam = this.cameraObject.getTransform().getWorldPosition()
    for (const so of this.faceList) {
      if (!so.isEnabledInHierarchy) continue
      const t = so.getTransform()
      const dir = cam.sub(t.getWorldPosition())
      if (dir.length < 0.001) continue
      t.setWorldRotation(quat.lookAt(dir.normalize(), vec3.up()))
    }
  }
}
