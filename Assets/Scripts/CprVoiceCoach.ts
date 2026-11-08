/**
 * CprVoiceCoach — spoken coaching lines for the Hands On CPR coach.
 *
 * Owns: one dedicated, non-spatial voice AudioComponent (separate from the
 *       metronome click so the 110 bpm click is never interrupted), the
 *       line -> clip table, a tiny FIFO queue, and "is a line playing" state
 *       that the controller uses to duck the click.
 * Expects (@input): the 13 voice clips in Assets/GeneratedSFX/Voice.
 * Must NOT: decide WHEN a line plays (CprFlowController owns flow state and
 *       calls say / enqueue / sayIfIdle) or touch the click / chime / zap audio.
 */

export enum VoiceLine {
  Start = "Start",
  Call = "Call",
  MarkChest = "MarkChest",
  Ready = "Ready",
  Compress = "Compress",
  KeepGoing = "KeepGoing",
  Swap = "Swap",
  AED = "AED",
  PadWrong = "PadWrong",
  StandClear = "StandClear",
  ShockReady = "ShockReady",
  Resume = "Resume",
  Summary = "Summary"
}

@component
export class CprVoiceCoach extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">CprVoiceCoach – spoken coaching lines</span>')
  @ui.separator
  @ui.group_start("Voice clips")
  @input @hint("'Someone collapsed' opener (flow start)") voStart!: AudioTrackAsset
  @input @hint("Call 112/911 and shout for an AED") voCall!: AudioTrackAsset
  @input @hint("Pinch the centre of the chest") voMarkChest!: AudioTrackAsset
  @input @hint("Hands on the target, pinch Start") voReady!: AudioTrackAsset
  @input @hint("Compressions started: push hard and fast") voCompress!: AudioTrackAsset
  @input @hint("Periodic encouragement while compressing") voKeepGoing!: AudioTrackAsset
  @input @hint("Switch rescuers now") voSwap!: AudioTrackAsset
  @input @hint("AED arrived: place the pads") voAED!: AudioTrackAsset
  @input @hint("Pad dropped in the wrong place") voPadWrong!: AudioTrackAsset
  @input @hint("Stand clear, analysing") voStandClear!: AudioTrackAsset
  @input @hint("Shock advised, press Shock") voShockReady!: AudioTrackAsset
  @input @hint("Resume compressions after the shock") voResume!: AudioTrackAsset
  @input @hint("Help arrived: hand over the summary") voSummary!: AudioTrackAsset
  @ui.group_end

  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Voice volume")
  @widget(new SliderWidget(0, 1, 0.05))
  volume: number = 1
  @ui.group_end

  private audio!: AudioComponent
  private queue: VoiceLine[] = []
  private speakingUntil: number = 0
  private current: VoiceLine | null = null

  /** Line that is playing right now (null when silent). */
  public get currentLine(): VoiceLine | null {
    return this.isSpeaking ? this.current : null
  }

  /** True while a voice line is audible. */
  public get isSpeaking(): boolean {
    if (!this.audio) return false
    return this.audio.isPlaying() || getTime() < this.speakingUntil
  }

  onAwake(): void {
    this.audio = this.sceneObject.createComponent("Component.AudioComponent") as AudioComponent
    this.audio.playbackMode = Audio.PlaybackMode.LowLatency
    this.createEvent("UpdateEvent").bind(() => this.pump())
  }

  /** Play a line now, interrupting any line (and queued lines). */
  public say(line: VoiceLine): void {
    this.queue = []
    this.play(line)
  }

  /** Play after the current line (and anything already queued) finishes. */
  public enqueue(line: VoiceLine): void {
    if (!this.isSpeaking && this.queue.length === 0) this.play(line)
    else this.queue.push(line)
  }

  /** Play only if nothing is playing or queued. Returns true if it played. */
  public sayIfIdle(line: VoiceLine): boolean {
    if (this.isSpeaking || this.queue.length > 0) return false
    this.play(line)
    return true
  }

  /** Silence the voice and drop queued lines. */
  public stopAll(): void {
    this.queue = []
    this.speakingUntil = 0
    this.current = null
    if (this.audio && this.audio.isPlaying()) this.audio.stop(false)
  }

  private pump(): void {
    if (this.queue.length > 0 && !this.isSpeaking) this.play(this.queue.shift() as VoiceLine)
  }

  private play(line: VoiceLine): void {
    const track = this.trackFor(line)
    if (!this.audio || !track) {
      print("[CprVoice] no clip for " + line)
      return
    }
    if (this.audio.isPlaying()) this.audio.stop(false)
    this.audio.audioTrack = track
    this.audio.volume = this.volume
    this.audio.play(1)
    let dur = 2
    try {
      dur = this.audio.duration > 0 ? this.audio.duration : 2
    } catch (e) {
      dur = 2
    }
    this.speakingUntil = getTime() + dur + 0.1
    this.current = line
    print("[CprVoice] " + line + " (" + dur.toFixed(2) + "s)")
  }

  private trackFor(line: VoiceLine): AudioTrackAsset | null {
    switch (line) {
      case VoiceLine.Start: return this.voStart
      case VoiceLine.Call: return this.voCall
      case VoiceLine.MarkChest: return this.voMarkChest
      case VoiceLine.Ready: return this.voReady
      case VoiceLine.Compress: return this.voCompress
      case VoiceLine.KeepGoing: return this.voKeepGoing
      case VoiceLine.Swap: return this.voSwap
      case VoiceLine.AED: return this.voAED
      case VoiceLine.PadWrong: return this.voPadWrong
      case VoiceLine.StandClear: return this.voStandClear
      case VoiceLine.ShockReady: return this.voShockReady
      case VoiceLine.Resume: return this.voResume
      case VoiceLine.Summary: return this.voSummary
    }
    return null
  }
}
