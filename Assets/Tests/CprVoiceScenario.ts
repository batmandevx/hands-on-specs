/**
 * cpr-8: the voice coach speaks the expected line at each step (sampled from
 * CprVoiceCoach.currentLine every frame while real taps drive the flow), and
 * the metronome click keeps beating (ducked) while a line plays.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  CprLeafInteractor,
  CprStep,
  VoiceLine,
  controller,
  obj,
  placeBothPads,
  voiceCoach,
  waitFor
} from "./CprLeafHelpers"

@component
export class CprVoiceScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    const v = voiceCoach()
    const click = obj("ChestAnchor").getComponent("Component.AudioComponent") as AudioComponent

    // Background sampler: record every line heard, and beats/duck while speaking.
    const heard: string[] = []
    let sampling = true
    let beatsWhileSpeaking = 0
    let duckOk = 0
    let duckBad = 0
    let lastBeat = c.beatCount
    const sampler = (async () => {
      while (sampling) {
        const line = v.currentLine
        if (line !== null && heard[heard.length - 1] !== line) heard.push(line)
        if (c.beatCount > lastBeat) {
          if (v.isSpeaking) {
            beatsWhileSpeaking += c.beatCount - lastBeat
            const want = c.clickVolume * c.voiceDuck
            if (Math.abs(click.volume - want) < 0.01) duckOk++
            else duckBad++
          }
          lastBeat = c.beatCount
        }
        await nextFrame()
      }
    })()

    await waitFor(() => c.step === CprStep.Idle, 3000, "Idle")
    await i.tap("StartOrb")
    // Call is queued after Start. Done no longer cuts it off: MarkChest is queued after the Call line finishes.
    await waitFor(() => heard.indexOf(VoiceLine.Call) >= 0, 12000, "voice line Call")
    await i.tap("CallCard_DoneButton")
    await waitFor(() => heard.indexOf(VoiceLine.MarkChest) >= 0, 7000, "voice line MarkChest (after Call finishes)")
    await i.tap("MannequinChest")
    await waitFor(() => heard.indexOf(VoiceLine.Ready) >= 0, 2000, "voice line Ready")
    await i.tap("StartButton")
    await waitFor(() => heard.indexOf(VoiceLine.Compress) >= 0, 2000, "voice line Compress")
    // Let the Compress line play out with the pacer running.
    await waitFor(() => !v.isSpeaking, 10000, "Compress line to finish")
    await sleep(600)
    await i.tap("SkipButton")
    await waitFor(() => heard.indexOf(VoiceLine.Swap) >= 0, 2000, "voice line Swap")
    await placeBothPads(i)
    await waitFor(() => heard.indexOf(VoiceLine.StandClear) >= 0, 2000, "voice line StandClear")
    await waitFor(() => c.step === CprStep.ShockReady, (c.analyseSeconds + 2) * 1000, "ShockReady")
    await waitFor(() => heard.indexOf(VoiceLine.ShockReady) >= 0, 2000, "voice line ShockReady")
    await i.tap("ShockButton")
    await waitFor(() => heard.indexOf(VoiceLine.Resume) >= 0, 2000, "voice line Resume")
    await sleep(1500)
    await i.tap("HelpArrivedButton")
    await waitFor(() => heard.indexOf(VoiceLine.Summary) >= 0, 2000, "voice line Summary")
    sampling = false
    await sampler

    print("[LEAF] voice lines heard: " + heard.join(" > "))
    print("[LEAF] beats while speaking=" + beatsWhileSpeaking + " duckOk=" + duckOk + " duckBad=" + duckBad)
    const order = [
      VoiceLine.Start, VoiceLine.Call, VoiceLine.MarkChest, VoiceLine.Ready, VoiceLine.Compress,
      VoiceLine.Swap, VoiceLine.AED, VoiceLine.StandClear, VoiceLine.ShockReady, VoiceLine.Resume, VoiceLine.Summary
    ]
    let last = -1
    for (const line of order) {
      const idx = heard.indexOf(line)
      expect(idx > last).toBe(true)
      last = idx
    }
    expect(beatsWhileSpeaking >= 3).toBe(true) // click keeps beating under the voice
    // Volume is set at play time; a beat landing exactly on a line boundary may read either way.
    expect(duckOk >= 2).toBe(true)
    expect(duckBad <= 1).toBe(true)
  }
}
