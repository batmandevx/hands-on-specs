/**
 * Criterion 2: pinching Start makes the ring pulse at 110/min with a click;
 * the counter loops 1-30 and the timer counts up. Real SIK pinch on StartButton.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CprLeafInteractor, CprStep, controller, goToReady, obj, textOf} from "./CprLeafHelpers"

@component
export class CprPacerScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    await goToReady(i)
    expect(obj("PacerRing").enabled).toBe(false)

    await i.tap("StartButton")
    expect(c.step).toBe(CprStep.Compressing)
    expect(obj("PacerRing").enabled).toBe(true)
    expect(obj("CounterText").enabled).toBe(true)
    expect(obj("TimerText").enabled).toBe(true)
    expect(obj("StartButton").enabled).toBe(false)
    expect(c.beatInterval).toBeCloseTo(60 / 110, 3)

    // Sample for ~17 s: beat rate, counter wrap 30 -> 1, ring pulse, click audio, timer text.
    const clickAudio = obj("ChestAnchor").getComponent("Component.AudioComponent") as AudioComponent
    expect(!!clickAudio && !!clickAudio.audioTrack).toBe(true)

    // Short LowLatency clips can finish between frames, so also count finished plays.
    let clickFinished = 0
    clickAudio.setOnFinish(() => {
      clickFinished++
    })
    const b0 = c.beatCount
    const e0 = c.elapsedSeconds
    const timer0 = textOf("TimerText")
    const ringT = obj("PacerRing_Visual").getTransform()
    let minS = 1e9
    let maxS = -1e9
    let prevCounter = c.counterValue
    let sawWrap = false
    let counterOutOfRange = false
    let counterTextMismatch = false
    let clickHeard = false
    const end = getTime() + 17.5
    while (getTime() < end) {
      await nextFrame()
      const s = ringT.getLocalScale().x
      minS = Math.min(minS, s)
      maxS = Math.max(maxS, s)
      const v = c.counterValue
      if (v < 1 || v > 30) counterOutOfRange = true
      if (prevCounter === 30 && v === 1) sawWrap = true
      if (textOf("CounterText") !== "" + v) counterTextMismatch = true
      if (clickAudio.isPlaying()) clickHeard = true
      prevCounter = v
    }
    const beats = c.beatCount - b0
    const secs = c.elapsedSeconds - e0
    const bpm = (beats / secs) * 60
    print(
      "[LEAF] pacer: beats=" + beats + " in " + secs.toFixed(2) + "s -> " + bpm.toFixed(1) +
        " bpm; ring scale " + minS.toFixed(3) + ".." + maxS.toFixed(3) + "; wrap=" + sawWrap +
        "; clickPlaying=" + clickHeard + "; clickFinished=" + clickFinished + "; timer " + timer0 + " -> " + textOf("TimerText")
    )
    expect(bpm > 104 && bpm < 116).toBe(true)
    expect(sawWrap).toBe(true)
    expect(counterOutOfRange).toBe(false)
    expect(counterTextMismatch).toBe(false)
    expect(maxS > minS * 1.05).toBe(true) // ring pulses
    expect(secs > 17).toBe(true)
    expect(textOf("TimerText") !== timer0).toBe(true)
    expect(textOf("TimerText").startsWith("00:1") || textOf("TimerText").startsWith("00:2")).toBe(true)
    expect(clickHeard || clickFinished > 0).toBe(true)
  }
}
