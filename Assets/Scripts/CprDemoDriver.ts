/**
 * CprDemoDriver — DEV/TEST ONLY. Disabled by default (runDemo = false).
 *
 * Owns: an optional scripted walk-through of the whole flow that calls the
 *       controller's public API exactly like the buttons do, stopping at a
 *       chosen stage (used to capture preview screenshots), plus an optional
 *       editor-only "kneeling" camera pose (ON by default; Lens Studio editor/preview only, never on device) so the floor-level mannequin is in
 *       frame without manual WASD/Q navigation.
 * Expects (@input): the CprFlowController, both CprPad components, the camera.
 * Must NOT: run on device (kneel pose is editor-only) or hold flow state.
 *
 * Stages: 0 idle | 1 orb pinched (call card) | 2 Done + chest marked + Start
 *         (pacer) | 3 >> 2 min (swap cue) | 4 AED here | 5 pads dragged
 *         (one wrong drop first) -> stand clear -> Shock appears | 6 Shock
 *         (pacer resumes) | 7 Help arrived (summary) | 8 Start again
 *         (back to idle, everything reset) | 9..16 repeat 1..8 (second run,
 *         used to verify Start again leaves a clean state)
 */
import {CprFlowController} from "./CprFlowController"
import {CprPad} from "./CprPad"
import {CprStep} from "./CprTypes"

@component
export class CprDemoDriver extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CprDemoDriver – dev-only scripted walkthrough</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("Flow controller to drive") controller!: CprFlowController
  @input @hint("Pad 1 component") pad1!: CprPad
  @input @hint("Pad 2 component") pad2!: CprPad
  @input @hint("Camera object (for the editor-only kneeling pose)") cameraObject!: SceneObject
  @input @hint("Chest anchor (camera looks here when kneeling)") chestAnchor!: SceneObject
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input @hint("Run the scripted walkthrough on lens start (dev/demo only)") runDemo: boolean = false

  @input
  @hint("Stop after this stage (0 idle ... 7 summary, 8 start again, 9-16 = second run)")
  @widget(new SliderWidget(0, 16, 1))
  stopAtStage: number = 7

  @input
  @hint("Seconds between stages")
  @widget(new SliderWidget(0.5, 5, 0.1))
  stageDelay: number = 1.5

  @input
  @hint("Lens Studio editor/preview only (never on device): pose the camera as a rescuer kneeling beside the patient, ~0.8 m from the chest, from the first frame. Turn off to use WASD/QE navigation in Interactive Preview.")
  kneelCamera: boolean = true

  @input
  @hint("Editor only: keep Device Tracking ON and apply the kneel pose as an offset rig, so WASD / right-drag still move the view afterwards (movement is relative to the kneel pose). Off = fixed kneel pose.")
  kneelThenFree: boolean = true

  @input
  @hint("Dev check: turn the kneel pose away from the chest by this many degrees (yaw) to see the out-of-view arrow. Keep 0 for normal use.")
  @widget(new SliderWidget(-90, 90, 5))
  testLookAwayDeg: number = 0
  @ui.group_end

  private stage: number = 0
  private timer: number = 0
  private subTimer: number = -1
  private subStep: number = 0
  private trackingDisabled: boolean = false
  private rig: SceneObject | null = null
  private rigFrames: number = 0
  private rigFailed: boolean = false

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick())
    this.createEvent("LateUpdateEvent").bind(() => this.poseCamera())
  }

  private tick(): void {
    if (!this.runDemo || !this.controller) return
    const dt = getDeltaTime()
    if (this.subTimer >= 0) {
      this.subTimer += dt
      this.runPadSequence()
      return
    }
    if (this.stage >= this.stopAtStage) return
    this.timer += dt
    if (this.timer < this.stageDelay) return
    this.timer = 0
    this.stage += 1
    print("[CprDemo] stage " + this.stage)
    const c = this.controller
    const step = ((this.stage - 1) % 8) + 1
    switch (step) {
      case 1:
        c.startFlow()
        break
      case 2: {
        c.callDone()
        const chestTop = this.chestAnchor.getTransform().getWorldPosition().add(new vec3(1.5, 0, -1))
        c.markChest(chestTop)
        c.startCompressions()
        break
      }
      case 3:
        c.skipTwoMinutes()
        break
      case 4:
        c.aedHere()
        break
      case 5:
        this.subTimer = 0
        this.subStep = 0
        break
      case 6:
        c.shock()
        break
      case 7:
        c.helpArrived()
        break
      case 8:
        c.restart()
        break
    }
  }

  /** Stage 5: wrong drop, then both correct drops, then wait for Shock to appear. */
  private runPadSequence(): void {
    const t = this.subTimer
    if (this.subStep === 0 && t > 0.2) {
      // Wrong: pad 1 dropped on pad 2's outline -> must bounce back with a hint
      this.pad1.simulateDropAt(this.pad2.getGhostWorldPosition().add(new vec3(0, 1, 0)))
      this.subStep = 1
    } else if (this.subStep === 1 && t > 1.0) {
      this.pad1.simulateDropAt(this.pad1.getGhostWorldPosition().add(new vec3(2, 1.5, 1)))
      this.subStep = 2
    } else if (this.subStep === 2 && t > 1.6) {
      this.pad2.simulateDropAt(this.pad2.getGhostWorldPosition().add(new vec3(-1.5, 1.5, 2)))
      this.subStep = 3
    } else if (this.subStep === 3 && this.controller.step === CprStep.ShockReady) {
      this.subTimer = -1
      this.timer = 0
    }
  }

  /** Kneel pose (world): eye ~0.8 m from the chest on the patient's right, looking down at it. */
  private kneelPose(): {pos: vec3; rot: quat} {
    const a = this.chestAnchor.getTransform().getWorldPosition()
    const target = a.add(new vec3(-12, 0, 6))
    const eye = a.add(new vec3(-6, 80, 92))
    let rot = quat.lookAt(eye.sub(target).normalize(), vec3.up())
    if (this.testLookAwayDeg !== 0) rot = quat.angleAxis((this.testLookAwayDeg * Math.PI) / 180, vec3.up()).multiply(rot)
    return {pos: eye, rot: rot}
  }

  private poseCamera(): void {
    if (!this.kneelCamera || !this.cameraObject || !global.deviceInfoSystem.isEditor()) return
    if (this.kneelThenFree && !this.rigFailed) {
      this.poseWithRig()
      return
    }
    if (!this.trackingDisabled) {
      const dtc = this.cameraObject.getComponent("Component.DeviceTracking")
      if (dtc) dtc.enabled = false
      this.trackingDisabled = true
    }
    const pose = this.kneelPose()
    const t = this.cameraObject.getTransform()
    t.setWorldPosition(pose.pos)
    t.setWorldRotation(pose.rot)
  }

  /**
   * Device Tracking stays on and keeps writing the camera's LOCAL pose; a parent
   * rig maps that tracked pose onto the kneel pose (rig = kneel * tracked^-1),
   * so preview navigation keeps working relative to the kneel position.
   * If tracking turns out to write world space, fall back to the fixed pose.
   */
  private poseWithRig(): void {
    this.rigFrames++
    const cam = this.cameraObject.getTransform()
    if (!this.rig) {
      if (this.rigFrames < 2) return // let tracking write its first pose
      const pose = this.kneelPose()
      const tPos = cam.getLocalPosition()
      const tRot = cam.getLocalRotation()
      const rigRot = pose.rot.multiply(tRot.invert())
      const rigPos = pose.pos.sub(rigRot.multiplyVec3(tPos))
      this.rig = global.scene.createSceneObject("KneelCameraRig (editor only)")
      this.rig.getTransform().setWorldPosition(rigPos)
      this.rig.getTransform().setWorldRotation(rigRot)
      const parent = this.cameraObject.getParent()
      if (parent) this.rig.setParent(parent)
      this.cameraObject.setParent(this.rig)
      cam.setLocalPosition(tPos)
      cam.setLocalRotation(tRot)
      print("[CprDemo] kneel rig applied (tracking stays on)")
      return
    }
    if (this.rigFrames === 8) {
      const d = cam.getWorldPosition().distance(this.kneelPose().pos)
      if (d > 30) {
        print("[CprDemo] tracking ignores the rig (d=" + d.toFixed(1) + " cm) -> fixed kneel pose")
        this.rigFailed = true
      }
    }
  }
}
