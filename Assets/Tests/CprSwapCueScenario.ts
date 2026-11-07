/**
 * Criterion 3: at 2:00 (via the real ">> 2 min" UIKit button) a chime plays
 * and the amber "Switch rescuers" cue shows, then clears after ~5 s.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CprLeafInteractor, controller, goToCompressing, obj, textOf, waitFor} from "./CprLeafHelpers"

@component
export class CprSwapCueScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    await goToCompressing(i)
    expect(obj("SwapCue").enabled).toBe(false)
    const swaps0 = c.swapCount

    // Chime AudioComponent is the first AudioComponent created on CprLogic.
    const chime = obj("CprLogic").getComponents("Component.AudioComponent")[0] as AudioComponent
    let chimeHeard = false
    if (chime) chime.setOnFinish(() => {
      chimeHeard = true
    })
    const watch = async () => {
      const end = getTime() + 4
      while (getTime() < end) {
        if (chime && chime.isPlaying()) chimeHeard = true
        await nextFrame()
      }
    }
    const watcher = watch()
    await i.tap("SkipButton")
    await waitFor(() => c.swapCueVisible, 1000, "swapCueVisible")
    const shownAt = getTime()
    expect(c.swapCount).toBe(swaps0 + 1)
    expect(c.elapsedSeconds >= 120).toBe(true)
    expect(textOf("TimerText").startsWith("02:0")).toBe(true)
    expect(obj("SwapCue").enabled).toBe(true)
    expect(textOf("SwapCue").includes("Switch rescuers")).toBe(true)
    await watcher
    expect(!!chime && !!chime.audioTrack).toBe(true)
    print("[LEAF] chime isPlaying observed = " + chimeHeard)
    expect(chimeHeard).toBe(true)

    await waitFor(() => !obj("SwapCue").enabled, 8000, "SwapCue to clear")
    const shownFor = getTime() - shownAt
    print("[LEAF] swap cue visible for " + shownFor.toFixed(2) + "s")
    expect(c.swapCueVisible).toBe(false)
    expect(shownFor > 4.0 && shownFor < 6.5).toBe(true)
  }
}
