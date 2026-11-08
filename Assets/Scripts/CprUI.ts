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
 *       onAedHere, onShock, onHelpArrived, onRestart). Also renders the
 *       push/rise bar, the handover timeline and the out-of-view arrow.
 */
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {CprStep} from "./CprTypes"
import {CprPad} from "./CprPad"

/** Minimal shape of a handover-timeline entry (matches CprFlowController.CprEvent). */
export interface CprTimelineEntry {
  time: number
  label: string
}

const LABEL_Z = 0.6 // content lift in front of a BackPlate / button face

@component
export class CprUI extends BaseScriptComponent {
  public static readonly DEFAULT_CUE: string = "Push hard, 5-6 cm.\nLet it rise."
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
  @input @hint("'Start again' button shown on the summary") @allowUndefined restartButton: SceneObject
  @input @hint("Push / rise depth-rhythm bar root (beside the hand target, opposite the counter)") @allowUndefined pushBar: SceneObject
  @input @hint("Out-of-view arrow root (child of the camera)") @allowUndefined viewArrow: SceneObject
  @input @hint("Transparent-capable material cloned for the push bar track and the arrow") @allowUndefined overlayMaterial: Material
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

  @input
  @hint("Push / rise bar height (cm)")
  @widget(new SliderWidget(4, 14, 0.5))
  pushBarHeightCm: number = 8

  @input
  @hint("Share of each beat spent on 'push' (rest is 'let it rise')")
  @widget(new SliderWidget(0.2, 0.7, 0.01))
  pushShare: number = 0.45

  @input
  @hint("Show the arrow when the chest is more than this many degrees off the view centre")
  @widget(new SliderWidget(10, 40, 1))
  offViewDegrees: number = 22
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
  private _onRestart = new Event<void>()
  public get onOrbPinched(): PublicApi<void> { return this._onOrbPinched.publicApi() }
  public get onDone(): PublicApi<void> { return this._onDone.publicApi() }
  public get onChestPinched(): PublicApi<vec3> { return this._onChestPinched.publicApi() }
  public get onStart(): PublicApi<void> { return this._onStart.publicApi() }
  public get onSkip(): PublicApi<void> { return this._onSkip.publicApi() }
  public get onAedHere(): PublicApi<void> { return this._onAedHere.publicApi() }
  public get onShock(): PublicApi<void> { return this._onShock.publicApi() }
  public get onHelpArrived(): PublicApi<void> { return this._onHelpArrived.publicApi() }
  public get onRestart(): PublicApi<void> { return this._onRestart.publicApi() }

  // ---------- view internals ----------
  private counterT!: Text
  private timerT!: Text
  private cueT!: Text
  private swapT!: Text
  private countdownT!: Text
  private padHintT!: Text
  private summaryT!: Text
  private timelineT: Text | null = null
  private barFill: SceneObject | null = null
  private barFillMat: Material | null = null
  private barLabelT: Text | null = null
  private barLabelObj: SceneObject | null = null
  private arrowVisual: SceneObject | null = null
  private arrowMat: Material | null = null
  private arrowT: number = 0
  private lastPushPhase: number = -1
  private ringMat: Material | null = null
  private chestMat: Material | null = null
  private chestBaseColor: vec4 = new vec4(0.86, 0.8, 0.74, 1)
  private handMats: Material[] = []
  private ringBaseScale: vec3 = new vec3(20, 3, 20)
  private faceList: SceneObject[] = []
  private swapOn: boolean = false
  private padPhase: boolean = false
  private flashT: number = -1
  private orbT: number = 0
  private currentStep: CprStep = CprStep.Idle
  private glowObj: SceneObject | null = null
  private glowMat: Material | null = null
  private cueCard: SceneObject | null = null
  private cueCardVisual: SceneObject | null = null
  private cueCardFill: RenderMeshVisual | null = null
  private cueCardEdge: RenderMeshVisual | null = null
  private cueCardFillMat: Material | null = null
  private cueCardEdgeMat: Material | null = null
  private cueCardKey: string = ""
  private iconSrcMat: Material | null = null
  private helpRow1Pos: vec3 = new vec3(6, 5, 16)
  private helpRow2Pos: vec3 = new vec3(0, 2, 23)

  onAwake(): void {
    this.buildOrb()
    this.buildCallCard()
    this.buildChest()
    this.buildPacer()
    this.buildGlow()
    this.buildCueCard()
    this.buildButtons()
    this.buildAed()
    this.buildCards()
    this.buildPushBar()
    this.buildArrow()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    this.createEvent("LateUpdateEvent").bind(() => {
      this.updateCueCard()
      this.faceUser()
      this.updateArrow()
    })
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
    // Hands off during stand clear / shock: the hand target hides with the pacer.
    this.show(this.handTarget, step === CprStep.Ready || compressing)
    this.show(this.pacerRing, compressing)
    this.show(this.pushBar, compressing)
    this.show(this.restartButton, step === CprStep.Summary)
    this.show(this.counterText, compressing)
    // The swap cue / pad hint replace the coaching cue in the same spot just above the ring.
    this.padPhase = padPhase
    this.updateCueSlot()
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
    this.updateCueSlot()
    this.setRingColor(on ? this.attentionColor : this.accentColor)
  }

  /** One text slot above the ring: swap cue > pad hint > coaching cue. */
  private updateCueSlot(): void {
    const s = this.currentStep
    const compressing = s === CprStep.Compressing
    const swap = compressing && this.swapOn
    const pad = !swap && compressing && this.padPhase
    this.show(this.swapCue, swap)
    this.show(this.padHint, pad)
    this.show(this.cueText, (s === CprStep.Ready || compressing) && !swap && !pad)
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
    if (this.glowObj) {
      const gs = 1 + 0.22 * k
      this.glowObj.getTransform().setLocalScale(new vec3(gs, 1, gs))
    }
    if (this.glowMat) this.glowMat.mainPass.baseColor = new vec4(base.x, base.y, base.z, 0.05 + 0.1 * k)
    const hb = 0.7 + 0.3 * k
    for (const m of this.handMats) m.mainPass.baseColor = new vec4(hb * 0.85 + 0.15 * k, hb, hb, 1)
    // Hand target: brief scale "thump" on each beat.
    const hs = 1 + 0.12 * k
    this.handTarget.getTransform().setLocalScale(new vec3(hs, 1, hs))
    this.setPushPhase(sinceBeat, interval)
  }

  /** Push / rise bar: fill drops during the push share of the beat, refills while the chest rises. */
  private setPushPhase(sinceBeat: number, interval: number): void {
    if (!this.barFill) return
    const ph = interval > 0 ? Math.max(0, sinceBeat) / interval : 1
    let level = 1
    const push = ph < this.pushShare
    if (ph < this.pushShare) {
      const u = ph / this.pushShare
      level = 1 - (1 - Math.pow(1 - u, 2)) * 0.85 // ease-out down to 15%
    } else if (ph < 1) {
      const u = (ph - this.pushShare) / (1 - this.pushShare)
      level = 0.15 + 0.85 * (u * u * (3 - 2 * u))
    }
    const h = Math.max(0.05, this.pushBarHeightCm * level)
    const t = this.barFill.getTransform()
    t.setLocalScale(new vec3(1, h, 1))
    t.setLocalPosition(new vec3(0, -this.pushBarHeightCm / 2 + h / 2, 0.05))
    const phase = push ? 0 : 1
    if (phase !== this.lastPushPhase && this.barLabelT) {
      this.lastPushPhase = phase
      this.barLabelT.text = push ? "PUSH" : "RISE"
      this.barLabelT.textFill.color = push ? this.accentColor : this.textColor
    }
    if (this.barFillMat) {
      const c = push ? this.accentColor : new vec4(0.85, 1, 1, 1)
      this.barFillMat.mainPass.baseColor = c
    }
  }

  public flashShock(): void {
    this.flashT = 0
    this.show(this.shockFlash, true)
  }

  public setSummary(totalSeconds: number, cycles: number, shocks: number): void {
    this.summaryT.text =
      "Total time  " +
      CprUI.formatTime(totalSeconds) +
      "\nCycles (30)  " +
      cycles +
      "\nShocks given  " +
      shocks
  }

  /** Adds hands-off time, compression fraction and the event timeline to the summary card. */
  public setSummaryDetails(handsOffSeconds: number, fraction: number, events: CprTimelineEntry[]): void {
    const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100)
    const base = this.summaryT.text.split("\nHands-off")[0]
    this.summaryT.text =
      base + "\nHands-off time  " + CprUI.formatTime(handsOffSeconds) + "\nCompression fraction  " + pct + "%"
    if (this.timelineT) {
      const shown = events.slice(-8)
      const lines: string[] = []
      for (const e of shown) lines.push(CprUI.formatTime(e.time) + "  " + e.label)
      this.timelineT.text = lines.length > 0 ? lines.join("\n") : "-"
    }
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
    this.makeButton(this.doneButton, "Done", 10, 3.8, "Primary", () => this._onDone.invoke(), false, "call")
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
    this.makeButton(this.skipButton, "2 min", 9, 3.4, "PrimaryNeutral", () => this._onSkip.invoke(), true, "fast_forward")
    this.makeButton(this.aedHereButton, "AED here", 11, 3.4, "Primary", () => this._onAedHere.invoke(), true, "medical_services")
    this.makeButton(
      this.helpArrivedButton,
      "Help arrived",
      13,
      3.4,
      "PrimaryNeutral",
      () => this._onHelpArrived.invoke(),
      true,
      "check"
    )
    // Shock: outline-style button over a red plate -- red is reserved for Shock only.
    this.makeButton(this.shockButton, "SHOCK", 12, 4.6, "Ghost", () => this._onShock.invoke(), true, "bolt")
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
    bp.size = new vec2(22, 10)
    const title = global.scene.createSceneObject("StandClearCard_Title")
    title.setParent(this.standClearCard)
    title.getTransform().setLocalPosition(new vec3(0, 1.9, LABEL_Z))
    this.makeText(title, "Stand clear. Don't touch.", 54, this.attentionColor)
    this.liftZ(this.standClearCountdown, LABEL_Z)
    this.countdownT = this.makeText(this.standClearCountdown, "Analysing...", 48, this.textColor)
    this.faceList.push(this.standClearCard)

    this.summaryCard.createComponent("Component.Canvas")
    const sbp = this.summaryCard.createComponent(BackPlate.getTypeName()) as BackPlate
    const W = 32
    const H = 16
    sbp.size = new vec2(W, H)
    const sTitle = global.scene.createSceneObject("SummaryCard_Title")
    sTitle.setParent(this.summaryCard)
    sTitle.getTransform().setLocalPosition(new vec3(0, H / 2 - 2.1, LABEL_Z))
    this.makeText(sTitle, "Handover summary - tell the paramedics", 46, this.accentColor)

    // Left column: key numbers (LEAF reads this object's text).
    const body = global.scene.createSceneObject("SummaryCard_Text")
    body.setParent(this.summaryCard)
    body.getTransform().setLocalPosition(new vec3(-W / 2 + 1.6, -0.9, LABEL_Z))
    this.summaryT = this.makeText(body, "Total time  00:00", 42, this.textColor)
    this.summaryT.horizontalAlignment = HorizontalAlignment.Left
    this.summaryT.layoutRect = Rect.create(0, W / 2 - 2.4, -(H - 6) / 2, (H - 6) / 2)

    // Right column: event timeline.
    const tl = global.scene.createSceneObject("SummaryCard_Timeline")
    tl.setParent(this.summaryCard)
    tl.getTransform().setLocalPosition(new vec3(1.6, -0.9, LABEL_Z))
    this.timelineT = this.makeText(tl, "-", 37, new vec4(0.85, 0.95, 1, 1))
    this.timelineT.horizontalAlignment = HorizontalAlignment.Left
    this.timelineT.layoutRect = Rect.create(0, W / 2 - 2.4, -(H - 6) / 2, (H - 6) / 2)

    const div = global.scene.createSceneObject("SummaryCard_Divider")
    div.setParent(this.summaryCard)
    div.getTransform().setLocalPosition(new vec3(0.6, -0.9, LABEL_Z * 0.5))
    if (this.overlayMaterial) {
      const rmv = div.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = CprUI.quadMesh(0.12, H - 6)
      const m = this.overlayMaterial.clone()
      m.mainPass.baseColor = new vec4(1, 1, 1, 0.35)
      rmv.mainMaterial = m
    }
    this.faceList.push(this.summaryCard)

    if (this.restartButton) {
      this.makeButton(this.restartButton, "Start again", 13, 3.8, "Primary", () => this._onRestart.invoke(), true)
    }
  }

  private buildPushBar(): void {
    if (!this.pushBar) return
    const H = this.pushBarHeightCm
    const W = 1.8
    const track = global.scene.createSceneObject("PushBar_Track")
    track.setParent(this.pushBar)
    const trv = track.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    trv.mesh = CprUI.quadMesh(W + 0.5, H + 0.5)
    if (this.overlayMaterial) {
      const m = this.overlayMaterial.clone()
      m.mainPass.baseColor = new vec4(1, 1, 1, 0.22)
      trv.mainMaterial = m
    }
    this.barFill = global.scene.createSceneObject("PushBar_Fill")
    this.barFill.setParent(this.pushBar)
    const frv = this.barFill.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    frv.mesh = CprUI.quadMesh(W, 1)
    if (this.ringMat) {
      this.barFillMat = this.ringMat.clone()
      frv.mainMaterial = this.barFillMat
    }
    this.barLabelObj = global.scene.createSceneObject("PushBar_Label")
    this.barLabelObj.setParent(this.pushBar)
    this.barLabelObj.getTransform().setLocalPosition(new vec3(0, H / 2 + 1.4, 0.1))
    this.barLabelT = this.makeText(this.barLabelObj, "PUSH", 40, this.accentColor)
    this.faceList.push(this.pushBar)
    this.setPushPhase(10, 0.55)
  }

  private buildArrow(): void {
    if (!this.viewArrow) return
    const vis = global.scene.createSceneObject("OutOfViewArrow_Visual")
    vis.setParent(this.viewArrow)
    const rmv = vis.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = CprUI.arrowMesh(3.2, 2.6, 1.0, 2.2)
    const src = this.overlayMaterial ? this.overlayMaterial : this.ringMat
    if (src) {
      this.arrowMat = src.clone()
      this.arrowMat.mainPass.baseColor = new vec4(0.4, 1, 1, 0.95)
      rmv.mainMaterial = this.arrowMat
    }
    this.arrowVisual = vis
    this.show(this.viewArrow, false)
  }

  /** Show a cyan arrow at the view edge pointing at the chest when it is out of view. */
  private updateArrow(): void {
    if (!this.viewArrow || !this.cameraObject) return
    const s = this.currentStep
    const relevant = s === CprStep.Compressing || s === CprStep.StandClear || s === CprStep.ShockReady
    if (!relevant) {
      this.show(this.viewArrow, false)
      return
    }
    const camT = this.cameraObject.getTransform()
    const target = this.handTarget.getTransform().getWorldPosition()
    const local = camT.getInvertedWorldTransform().multiplyPoint(target)
    const dist = local.length
    if (dist < 0.001) return
    const fwdCos = -local.z / dist // camera looks down local -Z
    const angle = (Math.acos(Math.max(-1, Math.min(1, fwdCos))) * 180) / Math.PI
    const out = angle > this.offViewDegrees
    this.show(this.viewArrow, out)
    if (!out) return
    let dx = local.x
    let dy = local.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 0.001) {
      dx = 0
      dy = -1
    } else {
      dx /= len
      dy /= len
    }
    this.arrowT += getDeltaTime()
    const r = 14 + 0.8 * Math.sin(this.arrowT * 6)
    const t = this.viewArrow.getTransform()
    t.setLocalPosition(new vec3(dx * r, dy * r - 2, -55))
    t.setLocalRotation(quat.fromEulerAngles(0, 0, Math.atan2(-dx, dy)))
    t.setLocalScale(vec3.one())
  }

  /** Flat quad in the XY plane (faces +Z and -Z), centred. */
  public static quadMesh(w: number, h: number): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2}
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    const x = w / 2
    const y = h / 2
    mb.appendVerticesInterleaved([-x, -y, 0, 0, 0, 1, 0, 0, x, -y, 0, 0, 0, 1, 1, 0, x, y, 0, 0, 0, 1, 1, 1, -x, y, 0, 0, 0, 1, 0, 1])
    mb.appendIndices([0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2])
    mb.updateMesh()
    return mb.getMesh()
  }

  /** Flat arrow in the XY plane pointing +Y (head + stem), both faces. */
  public static arrowMesh(headW: number, headH: number, stemW: number, stemH: number): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
      {name: "texture0", components: 2}
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    const top = (headH + stemH) / 2
    const neck = top - headH
    const bottom = -top
    const p = [
      [0, top], [-headW / 2, neck], [headW / 2, neck],
      [-stemW / 2, neck], [stemW / 2, neck], [stemW / 2, bottom], [-stemW / 2, bottom]
    ]
    const v: number[] = []
    for (const q of p) v.push(q[0], q[1], 0, 0, 0, 1, 0, 0)
    mb.appendVerticesInterleaved(v)
    mb.appendIndices([0, 1, 2, 0, 2, 1, 3, 4, 5, 3, 5, 4, 3, 5, 6, 3, 6, 5])
    mb.updateMesh()
    return mb.getMesh()
  }

  // ======================= glow, cue card, icons =======================

  /** Soft additive-looking halo behind the pacer ring: stacked translucent annuli (brightest on the ring). */
  private buildGlow(): void {
    if (!this.overlayMaterial) return
    const R = this.ringDiameterCm / 2
    const inner = R - this.ringWidthCm
    this.glowObj = global.scene.createSceneObject("PacerRing_Glow")
    this.glowObj.setParent(this.pacerRing)
    this.glowObj.getTransform().setLocalPosition(new vec3(0, -0.05, 0))
    this.glowMat = this.overlayMaterial.clone()
    this.glowMat.mainPass.baseColor = new vec4(this.accentColor.x, this.accentColor.y, this.accentColor.z, 0.05)
    for (let i = 1; i <= 6; i++) {
      const band = global.scene.createSceneObject("PacerRing_Glow_" + i)
      band.setParent(this.glowObj)
      const r = band.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      r.mesh = CprUI.buildRingMesh(R + i * 0.75, Math.max(0.5, inner - i * 0.55), 72)
      r.mainMaterial = this.glowMat
    }
  }

  /** Small rounded, light-translucent card just above the chest that carries the cue / pad hint / swap text. */
  private buildCueCard(): void {
    if (!this.overlayMaterial) return
    this.cueCard = global.scene.createSceneObject("CueCard")
    this.cueCard.setParent(this.cueText.getParent())
    this.cueCard.getTransform().setLocalPosition(new vec3(0, 4.2, -13))
    this.cueCardVisual = global.scene.createSceneObject("CueCard_Visual")
    this.cueCardVisual.setParent(this.cueCard)
    this.cueCardVisual.getTransform().setLocalRotation(quat.fromEulerAngles(Math.PI / 2, 0, 0))
    this.cueCardFill = this.cueCardVisual.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.cueCardFillMat = this.overlayMaterial.clone()
    this.cueCardFillMat.mainPass.baseColor = new vec4(0.6, 0.85, 1, 0.2)
    this.cueCardFill.mainMaterial = this.cueCardFillMat
    const edge = global.scene.createSceneObject("CueCard_Edge")
    edge.setParent(this.cueCardVisual)
    edge.getTransform().setLocalPosition(new vec3(0, 0.02, 0))
    this.cueCardEdge = edge.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    this.cueCardEdgeMat = this.overlayMaterial.clone()
    this.cueCardEdgeMat.mainPass.baseColor = new vec4(0.75, 0.95, 1, 0.55)
    this.cueCardEdge.mainMaterial = this.cueCardEdgeMat
    this.faceList.push(this.cueCard)
    this.cueCard.enabled = false
  }

  /** Keep the card sized to the visible cue text and the text sitting on its face. */
  private updateCueCard(): void {
    if (!this.cueCard || !this.cameraObject) return
    let active: SceneObject | null = null
    let t: Text | null = null
    if (this.swapCue.isEnabledInHierarchy) {
      active = this.swapCue
      t = this.swapT
    } else if (this.padHint.isEnabledInHierarchy) {
      active = this.padHint
      t = this.padHintT
    } else if (this.cueText.isEnabledInHierarchy) {
      active = this.cueText
      t = this.cueT
    }
    const on = active !== null && t !== null && t.text.length > 0
    if (this.cueCard.enabled !== on) this.cueCard.enabled = on
    if (!on || !t || !active) return
    const lines = t.text.split("\n")
    let maxChars = 0
    for (const l of lines) maxChars = Math.max(maxChars, l.length)
    const w = Math.max(10, maxChars * t.size * 0.0105 + 2.6)
    const h = lines.length * t.size * 0.034 + 1.6
    const key = w.toFixed(1) + "x" + h.toFixed(1)
    if (key !== this.cueCardKey) {
      this.cueCardKey = key
      const r = Math.min(1.6, h * 0.35)
      if (this.cueCardFill) this.cueCardFill.mesh = CprPad.roundedRectMesh(w, h, r, 0, true)
      if (this.cueCardEdge) this.cueCardEdge.mesh = CprPad.roundedRectMesh(w, h, r, 0.18, false)
    }
    // Text floats just in front of the card, toward the user.
    const cardPos = this.cueCard.getTransform().getWorldPosition()
    const toCam = this.cameraObject.getTransform().getWorldPosition().sub(cardPos)
    if (toCam.length < 0.001) return
    const p = cardPos.add(toCam.normalize().uniformScale(0.5))
    for (const so of [this.cueText, this.padHint, this.swapCue]) so.getTransform().setWorldPosition(p)
  }

  private iconTexture(name: string): Texture | null {
    switch (name) {
      case "call": return requireAsset("../Icons/call.png") as Texture
      case "bolt": return requireAsset("../Icons/bolt.png") as Texture
      case "medical_services": return requireAsset("../Icons/medical_services.png") as Texture
      case "fast_forward": return requireAsset("../Icons/fast_forward.png") as Texture
      case "check": return requireAsset("../Icons/check.png") as Texture
    }
    return null
  }

  private iconMaterial(): Material | null {
    if (!this.iconSrcMat) this.iconSrcMat = requireAsset("../Materials/Cpr_HandTarget.mat") as Material
    return this.iconSrcMat
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
    standalone: boolean,
    icon: string = ""
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
    if (icon.length > 0) {
      const tex = this.iconTexture(icon)
      const src = this.iconMaterial()
      if (tex && src) {
        const iconSize = h * 0.58
        labelObj.getTransform().setLocalPosition(new vec3(h * 0.34, 0, LABEL_Z))
        const io = global.scene.createSceneObject(so.name + "_Icon")
        io.setParent(so)
        io.getTransform().setLocalPosition(new vec3(-w / 2 + h * 0.62, 0, LABEL_Z))
        const ir = io.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
        ir.mesh = CprUI.quadMesh(iconSize, iconSize)
        const m = src.clone()
        m.mainPass.baseTex = tex
        m.mainPass.baseColor = new vec4(1, 1, 1, 1)
        ir.mainMaterial = m
      }
    }
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
