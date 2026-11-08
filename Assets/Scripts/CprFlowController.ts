/**
 * CprFlowController — single owner of the Hands On CPR flow.
 *
 * Owns: the step state machine, the 110 bpm pacer clock, the 1..30 counter,
 *       elapsed time, swap cue timing, AED pad progress, stand-clear analysis,
 *       shock count, cycles, the 2-minute AED re-analysis loop once pads are
 *       on, and all audio cues.
 * Expects (@input): the CprUI view module, the two CprPad components, the
 *       ChestAnchor SceneObject (lower sternum), and the three audio tracks.
 * Must NOT: build or style UI (CprUI does that) or detect real compressions.
 *
 * Public, readable state (for LEAF): step, beatCount, counterValue,
 * elapsedSeconds, shockCount, cycles, pad1Placed, pad2Placed, swapCueVisible,
 * aedPresent, analyseSecondsLeft, chestMarked, reanalysisCount, plus the
 * handover data flowSeconds, handsOffSeconds, compressionFraction,
 * firstPushSeconds, longestHandsOffSeconds, events, runCount.
 * Public methods (buttons/pinches call these): startFlow, callDone,
 * markChest(worldPos), startCompressions, skipTwoMinutes, aedHere, shock,
 * helpArrived, resetFlow, plus padPlaced(index) used by the pads.
 */
import {CprUI} from "./CprUI"
import {CprPad} from "./CprPad"
import {CprStep} from "./CprTypes"
import {CprVoiceCoach, VoiceLine} from "./CprVoiceCoach"

/** One handover-timeline entry: seconds since the flow started + label. */
export interface CprEvent {
  time: number
  label: string
}

export {CprStep}

@component
export class CprFlowController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CprFlowController – CPR coach flow + pacer</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("View module that renders every step (passive view)")
  ui!: CprUI

  @input
  @hint("Pad 1 (upper right chest) drag component")
  pad1!: CprPad

  @input
  @hint("Pad 2 (lower left side) drag component")
  pad2!: CprPad

  @input
  @hint("Lower-sternum anchor on the mannequin chest; pacer content is parented here")
  chestAnchor!: SceneObject

  @input
  @hint("Metronome click played on every beat (spatial, from the chest)")
  clickTrack!: AudioTrackAsset

  @input
  @hint("Chime played when it is time to swap rescuers")
  chimeTrack!: AudioTrackAsset

  @input
  @hint("Zap played when the shock is delivered")
  zapTrack!: AudioTrackAsset

  @input
  @hint("Spoken coaching lines (own AudioComponent, separate from the click)")
  @allowUndefined
  voice: CprVoiceCoach
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Compression rate in beats per minute (guidance: 100-120)")
  @widget(new SliderWidget(100, 120, 1))
  bpm: number = 110

  @input
  @hint("Counter loops from 1 up to this value (30 compressions per set)")
  @widget(new SliderWidget(10, 30, 1))
  counterMax: number = 30

  @input
  @hint("Seconds of elapsed time between 'switch rescuers' cues")
  @widget(new SliderWidget(30, 240, 10))
  swapIntervalSeconds: number = 120

  @input
  @hint("How long the swap cue stays up before clearing itself")
  @widget(new SliderWidget(1, 10, 0.5))
  swapCueSeconds: number = 5

  @input
  @hint("Length of the AED 'analysing' countdown before Shock appears")
  @widget(new SliderWidget(1, 6, 1))
  analyseSeconds: number = 3

  @input
  @hint("How far (cm) the hand target may follow the pinch away from the lower sternum")
  @widget(new SliderWidget(0, 6, 0.5))
  markToleranceCm: number = 3

  @input
  @hint("Click volume")
  @widget(new SliderWidget(0, 1, 0.05))
  clickVolume: number = 0.8

  @input
  @hint("Speak a coaching line on each step (hands are busy, so audio leads)")
  voiceEnabled: boolean = true

  @input
  @hint("Click volume multiplier while a voice line plays (0.5 = duck by half)")
  @widget(new SliderWidget(0, 1, 0.05))
  voiceDuck: number = 0.5

  @input
  @hint("Seconds of compressing between 'keep going' encouragements")
  @widget(new SliderWidget(10, 90, 5))
  keepGoingSeconds: number = 30
  @ui.group_end

  // ---------- public readable state ----------
  public step: CprStep = CprStep.Idle
  public beatCount: number = 0
  public counterValue: number = 0
  public elapsedSeconds: number = 0
  public shockCount: number = 0
  public cycles: number = 0
  public swapCount: number = 0
  public pad1Placed: boolean = false
  public pad2Placed: boolean = false
  public swapCueVisible: boolean = false
  public aedPresent: boolean = false
  public chestMarked: boolean = false
  public analyseSecondsLeft: number = 0
  public markedChestWorldPos: vec3 = vec3.zero()
  /** Seconds since startFlow (handover timeline clock). */
  public flowSeconds: number = 0
  /** Seconds without compressions after CPR started (stand clear / shock pauses). */
  public handsOffSeconds: number = 0
  /** Seconds the pacer actually ran (compressing). */
  public compressingSeconds: number = 0
  /** Seconds from flow start to the first compression (clinical key metric). -1 before the first push. */
  public firstPushSeconds: number = -1
  /** Longest single stretch without compressions after CPR started. */
  public longestHandsOffSeconds: number = 0
  /** Number of AED re-analysis pauses triggered at 2-minute boundaries with pads on. */
  public reanalysisCount: number = 0
  /** Number of completed runs that reached the summary (restart counter). */
  public runCount: number = 0
  private _events: CprEvent[] = []

  /** Handover timeline (copy), oldest first. */
  public get events(): CprEvent[] {
    return this._events.slice()
  }

  /** Share of CPR time spent compressing, 0..1 (1 before any pause). */
  public get compressionFraction(): number {
    const total = this.compressingSeconds + this.handsOffSeconds
    return total > 0 ? this.compressingSeconds / total : 1
  }

  /** Seconds between beats: 60 / bpm (0.5454… s at 110 bpm). */
  public get beatInterval(): number {
    return 60 / this.bpm
  }

  // ---------- private timing ----------
  private pacerTime: number = 0 // seconds of running pacer since (re)start
  private nextBeatAt: number = 0
  private lastBeatTime: number = -10
  private swapCueTimeLeft: number = 0
  private nextSwapAt: number = 120
  private resumeCueTimeLeft: number = 0
  private clickAudio!: AudioComponent
  private chimeAudio!: AudioComponent
  private zapAudio!: AudioComponent
  private keepGoingTimer: number = 0
  private handsOffStreak: number = 0 // current stretch without compressions

  onAwake(): void {
    if (!this.ui || !this.pad1 || !this.pad2 || !this.chestAnchor) {
      print("[CprFlow] ERROR: missing @input wiring (ui / pad1 / pad2 / chestAnchor)")
      return
    }
    this.clickAudio = this.makeAudio(this.chestAnchor, this.clickTrack, true)
    this.chimeAudio = this.makeAudio(this.sceneObject, this.chimeTrack, false)
    this.zapAudio = this.makeAudio(this.sceneObject, this.zapTrack, false)

    // Sibling scripts (CprUI, CprPad) sit lower in the hierarchy and are not
    // awake yet here, so subscribe on OnStart when every component is awake.
    this.createEvent("OnStartEvent").bind(() => this.subscribe())
    // Initial visibility is applied on the first frame AFTER every component's
    // OnStart (UIKit Buttons / SIK manipulation initialise on OnStart and must
    // not be disabled before that).
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private subscribe(): void {
    this.ui.onOrbPinched.add(() => this.startFlow())
    this.ui.onDone.add(() => this.callDone())
    this.ui.onChestPinched.add((p: vec3) => this.markChest(p))
    this.ui.onStart.add(() => this.startCompressions())
    this.ui.onSkip.add(() => this.skipTwoMinutes())
    this.ui.onAedHere.add(() => this.aedHere())
    this.ui.onShock.add(() => this.shock())
    this.ui.onHelpArrived.add(() => this.helpArrived())
    this.ui.onRestart.add(() => this.restart())

    this.pad1.padIndex = 1
    this.pad2.padIndex = 2
    this.pad1.onPlaced.add(() => this.padPlaced(1))
    this.pad2.onPlaced.add(() => this.padPlaced(2))
    this.pad1.onMissed.add((hint: string) => this.padMissed(hint))
    this.pad2.onMissed.add((hint: string) => this.padMissed(hint))
  }

  // ======================= public API =======================

  /** Back to idle: only the "Someone collapsed?" orb shows. */
  public resetFlow(): void {
    this.step = CprStep.Idle
    this.beatCount = 0
    this.counterValue = 0
    this.elapsedSeconds = 0
    this.shockCount = 0
    this.cycles = 0
    this.swapCount = 0
    this.pad1Placed = false
    this.pad2Placed = false
    this.swapCueVisible = false
    this.aedPresent = false
    this.chestMarked = false
    this.analyseSecondsLeft = 0
    this.pacerTime = 0
    this.nextBeatAt = 0
    this.swapCueTimeLeft = 0
    this.resumeCueTimeLeft = 0
    this.nextSwapAt = this.swapIntervalSeconds
    this.flowSeconds = 0
    this.handsOffSeconds = 0
    this.compressingSeconds = 0
    this.firstPushSeconds = -1
    this.longestHandsOffSeconds = 0
    this.reanalysisCount = 0
    this.handsOffStreak = 0
    this.keepGoingTimer = 0
    this._events = []
    this.lastBeatTime = -10
    if (this.voice) this.voice.stopAll()
    this.pad1.resetPad()
    this.pad2.resetPad()
    this.ui.setHandTargetOffset(vec3.zero(), true)
    this.ui.setCounter(0)
    this.ui.setTimer(0)
    this.ui.setCue(CprUI.DEFAULT_CUE, false)
    this.ui.setSwapCue(false)
    this.ui.setPadHint("", false)
    this.ui.setPulse(10, this.beatInterval)
    this.refreshView()
    this.log("reset")
  }

  /** "Start again" on the summary: full reset back to Idle (demo re-record). */
  public restart(): void {
    if (this.step !== CprStep.Summary) return
    this.resetFlow()
    this.log("restart (run " + (this.runCount + 1) + ")")
  }

  /** Pinch on the "Someone collapsed?" orb. */
  public startFlow(): void {
    if (this.step !== CprStep.Idle) return
    this.step = CprStep.Call
    this.flowSeconds = 0
    this._events = []
    this.refreshView()
    this.speak(VoiceLine.Start)
    this.speak(VoiceLine.Call, true)
    this.log("startFlow")
  }

  /** Done on the call card. */
  public callDone(): void {
    if (this.step !== CprStep.Call) return
    this.step = CprStep.MarkChest
    this.addEvent("Called 112/911")
    this.refreshView()
    this.speak(VoiceLine.MarkChest, true) // queue: never cut off the "Call emergency services" line
    this.log("callDone")
  }

  /** Pinch on the chest: anchors the hand target on the lower breastbone near worldPos. */
  public markChest(worldPos: vec3): void {
    if (this.step !== CprStep.MarkChest && this.step !== CprStep.Ready) return
    const anchorT = this.chestAnchor.getTransform()
    const local = anchorT.getInvertedWorldTransform().multiplyPoint(worldPos)
    const tol = this.markToleranceCm
    const ox = Math.max(-tol, Math.min(tol, local.x))
    const oz = Math.max(-tol, Math.min(tol, local.z))
    const offset = new vec3(ox, 0, oz)
    this.ui.setHandTargetOffset(offset)
    this.markedChestWorldPos = anchorT.getWorldTransform().multiplyPoint(offset)
    const firstMark = this.step === CprStep.MarkChest
    this.chestMarked = true
    this.step = CprStep.Ready
    this.refreshView()
    if (firstMark) this.speak(VoiceLine.Ready)
    this.log("markChest offset=(" + ox.toFixed(1) + "," + oz.toFixed(1) + ")")
  }

  /** Start: pacer begins at 110/min, counter 1..30, timer counts up. */
  public startCompressions(): void {
    if (this.step !== CprStep.Ready) return
    this.step = CprStep.Compressing
    this.pacerTime = 0
    this.nextBeatAt = 0
    this.elapsedSeconds = 0
    this.nextSwapAt = this.swapIntervalSeconds
    this.handsOffSeconds = 0
    this.compressingSeconds = 0
    this.keepGoingTimer = 0
    this.handsOffStreak = 0
    if (this.firstPushSeconds < 0) this.firstPushSeconds = this.flowSeconds
    this.addEvent("CPR started")
    this.ui.setCue(CprUI.DEFAULT_CUE, false)
    this.refreshView()
    this.speak(VoiceLine.Compress)
    this.log("startCompressions bpm=" + this.bpm + " interval=" + this.beatInterval.toFixed(4))
  }

  /** Dev/demo: jump the clock forward to the next rescuer swap (2:00). */
  public skipTwoMinutes(): void {
    if (this.step !== CprStep.Compressing) return
    const target = this.nextSwapAt
    const delta = Math.max(0, target - this.elapsedSeconds)
    const skippedBeats = Math.floor(delta / this.beatInterval)
    for (let i = 0; i < skippedBeats; i++) this.advanceCounter()
    this.beatCount += skippedBeats
    this.elapsedSeconds = target
    this.flowSeconds += delta
    this.compressingSeconds += delta
    this.pacerTime += delta
    this.nextBeatAt = this.pacerTime + this.beatInterval
    this.ui.setCounter(this.counterValue)
    this.ui.setTimer(this.elapsedSeconds)
    this.log("skipTwoMinutes +" + delta.toFixed(1) + "s, +" + skippedBeats + " beats")
    this.checkSwap()
  }

  /** AED arrived: show the tray with two pads and the ghost outlines on the body. */
  public aedHere(): void {
    if (this.step !== CprStep.Compressing || this.aedPresent) return
    this.aedPresent = true
    this.pad1.setActive(true)
    this.pad2.setActive(true)
    this.ui.setPadHint("Drag each pad onto its glowing outline", false)
    this.addEvent("AED arrived")
    this.refreshView()
    this.speak(VoiceLine.AED)
    this.log("aedHere")
  }

  /** Called by a pad when it snaps onto its own ghost. */
  public padPlaced(index: number): void {
    if (index === 1) this.pad1Placed = true
    if (index === 2) this.pad2Placed = true
    this.ui.setPadHint(index === 1 ? "Pad 1 placed" : "Pad 2 placed", false)
    this.log("padPlaced " + index)
    if (this.pad1Placed && this.pad2Placed && this.step === CprStep.Compressing) {
      this.addEvent("AED pads on")
      this.speak(VoiceLine.StandClear)
      this.step = CprStep.StandClear
      this.analyseSecondsLeft = this.analyseSeconds
      this.ui.setStandClearCountdown(Math.ceil(this.analyseSecondsLeft))
      this.refreshView()
      this.log("standClear")
    } else {
      this.refreshView()
    }
  }

  /** Big red Shock: flash, zap, resume the pacer from 1. */
  public shock(): void {
    if (this.step !== CprStep.ShockReady) return
    this.shockCount += 1
    this.addEvent("Shock " + this.shockCount)
    this.speak(VoiceLine.Resume)
    this.playAudio(this.zapAudio)
    this.ui.flashShock()
    this.step = CprStep.Compressing
    this.counterValue = 0
    this.nextBeatAt = this.pacerTime + 0.6
    this.resumeCueTimeLeft = 4
    this.ui.setCue("Resume compressions now", true)
    this.ui.setCounter(this.counterValue)
    this.refreshView()
    this.log("shock #" + this.shockCount)
  }

  /** Help arrived: stop and show the handover summary. */
  public helpArrived(): void {
    if (
      this.step !== CprStep.Compressing &&
      this.step !== CprStep.StandClear &&
      this.step !== CprStep.ShockReady &&
      this.step !== CprStep.Ready
    )
      return
    this.step = CprStep.Summary
    this.runCount += 1
    this.addEvent("Help arrived")
    this.swapCueVisible = false
    this.ui.setSwapCue(false)
    this.ui.setSummary(this.elapsedSeconds, this.cycles, this.shockCount)
    this.ui.setSummaryDetails(
      this.handsOffSeconds,
      this.compressionFraction,
      this.firstPushSeconds,
      this.longestHandsOffSeconds,
      this._events
    )
    this.speak(VoiceLine.Summary)
    this.refreshView()
    this.log("helpArrived total=" + this.elapsedSeconds.toFixed(1) + " cycles=" + this.cycles + " shocks=" + this.shockCount)
  }

  // ======================= internals =======================

  private booted: boolean = false

  private onUpdate(): void {
    if (!this.booted) {
      this.booted = true
      this.resetFlow()
      return
    }
    const dt = getDeltaTime()
    const pacerRunning = this.step === CprStep.Compressing
    const clockRunning =
      pacerRunning || this.step === CprStep.StandClear || this.step === CprStep.ShockReady

    const flowRunning = this.step !== CprStep.Idle && this.step !== CprStep.Summary
    if (flowRunning) this.flowSeconds += dt
    if (pacerRunning) {
      this.compressingSeconds += dt
      this.handsOffStreak = 0
    } else if (clockRunning) {
      this.handsOffSeconds += dt
      this.handsOffStreak += dt
      if (this.handsOffStreak > this.longestHandsOffSeconds) this.longestHandsOffSeconds = this.handsOffStreak
    }

    if (clockRunning) {
      this.elapsedSeconds += dt
      this.ui.setTimer(this.elapsedSeconds)
      this.checkSwap()
    }

    if (pacerRunning) {
      this.pacerTime += dt
      // Fixed-grid scheduling (no drift): beats at nextBeatAt, nextBeatAt + interval, ...
      let guard = 0
      while (this.pacerTime >= this.nextBeatAt && guard < 4) {
        this.onBeat()
        this.nextBeatAt += this.beatInterval
        guard++
      }
      this.ui.setPulse(this.pacerTime - this.lastBeatTime, this.beatInterval)

      // Periodic "keep going" encouragement, only when no other line is playing.
      this.keepGoingTimer += dt
      if (this.keepGoingTimer >= this.keepGoingSeconds && !this.swapCueVisible) {
        if (!this.voiceEnabled || !this.voice) this.keepGoingTimer = 0
        else if (this.voice.sayIfIdle(VoiceLine.KeepGoing)) this.keepGoingTimer = 0
      }
    }

    if (this.swapCueVisible) {
      this.swapCueTimeLeft -= dt
      if (this.swapCueTimeLeft <= 0) {
        this.swapCueVisible = false
        this.ui.setSwapCue(false)
        this.log("swapCue cleared")
      }
    }

    if (this.resumeCueTimeLeft > 0) {
      this.resumeCueTimeLeft -= dt
      if (this.resumeCueTimeLeft <= 0) this.ui.setCue(CprUI.DEFAULT_CUE, false)
    }

    if (this.step === CprStep.StandClear) {
      this.analyseSecondsLeft -= dt
      this.ui.setStandClearCountdown(Math.max(0, Math.ceil(this.analyseSecondsLeft)))
      if (this.analyseSecondsLeft <= 0) {
        this.analyseSecondsLeft = 0
        this.step = CprStep.ShockReady
        this.refreshView()
        this.speak(VoiceLine.ShockReady)
        this.log("shockReady")
      }
    }
  }

  private onBeat(): void {
    this.beatCount += 1
    this.advanceCounter()
    this.lastBeatTime = this.pacerTime
    this.ui.setCounter(this.counterValue)
    this.playAudio(this.clickAudio)
  }

  private advanceCounter(): void {
    this.counterValue = this.counterValue >= this.counterMax ? 1 : this.counterValue + 1
    if (this.counterValue === this.counterMax) this.cycles += 1
  }

  /**
   * 2-minute boundary handler. Without pads: "switch rescuers" cue. With both
   * pads on, a real AED re-analyses the rhythm every ~2 minutes, so the pacer
   * pauses for Stand clear -> analysing -> Shock advised instead. If a boundary
   * lands while a pause is already in progress it is skipped silently.
   */
  private checkSwap(): void {
    if (this.elapsedSeconds + 1e-4 >= this.nextSwapAt) {
      this.nextSwapAt += this.swapIntervalSeconds
      const padsOn = this.aedPresent && this.pad1Placed && this.pad2Placed
      if (padsOn) {
        if (this.step !== CprStep.Compressing) return
        this.reanalysisCount += 1
        this.addEvent("AED re-analysis")
        this.speak(VoiceLine.StandClear)
        this.playAudio(this.chimeAudio)
        this.step = CprStep.StandClear
        this.analyseSecondsLeft = this.analyseSeconds
        this.ui.setStandClearCountdown(Math.ceil(this.analyseSecondsLeft))
        this.refreshView()
        this.log("reanalysis #" + this.reanalysisCount + " at " + this.elapsedSeconds.toFixed(1) + "s")
        return
      }
      this.swapCount += 1
      this.swapCueVisible = true
      this.swapCueTimeLeft = this.swapCueSeconds
      this.addEvent("Rescuer swap")
      this.ui.setSwapCue(true)
      this.playAudio(this.chimeAudio)
      this.speak(VoiceLine.Swap)
      this.log("swapCue at " + this.elapsedSeconds.toFixed(1) + "s")
    }
  }

  private refreshView(): void {
    this.ui.applyStep(this.step, this.aedPresent, this.pad1Placed && this.pad2Placed)
  }

  private makeAudio(host: SceneObject, track: AudioTrackAsset, spatial: boolean): AudioComponent {
    const a = host.createComponent("Component.AudioComponent") as AudioComponent
    if (track) a.audioTrack = track
    a.playbackMode = Audio.PlaybackMode.LowLatency
    if (spatial) {
      try {
        a.spatialAudio.enabled = true
      } catch (e) {
        print("[CprFlow] spatial audio unavailable: " + e)
      }
    }
    return a
  }

  private playAudio(a: AudioComponent): void {
    if (!a || !a.audioTrack) return
    if (a === this.clickAudio) {
      const ducked = this.voiceEnabled && this.voice && this.voice.isSpeaking
      a.volume = this.clickVolume * (ducked ? this.voiceDuck : 1)
    }
    if (a.isPlaying()) a.stop(false)
    a.play(1)
  }

  private padMissed(hint: string): void {
    this.ui.setPadHint(hint, true)
    this.speak(VoiceLine.PadWrong)
  }

  private addEvent(label: string): void {
    this._events.push({time: this.flowSeconds, label: label})
  }

  /** Speak a coaching line (interrupts, or queues after the current line). */
  private speak(line: VoiceLine, queue: boolean = false): void {
    if (!this.voiceEnabled || !this.voice) return
    if (queue) this.voice.enqueue(line)
    else this.voice.say(line)
    this.keepGoingTimer = 0
  }

  private log(msg: string): void {
    print("[CprFlow] " + msg + " | step=" + this.step)
  }
}
