/**
 * cpr-7: reach the summary (real taps + pad drags), pinch "Start again"
 * (RestartButton), check a full reset, then run a second time to Ready and
 * place a pad again.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  CprLeafInteractor,
  CprStep,
  controller,
  goToCompressing,
  goToReady,
  obj,
  pad,
  placeBothPads,
  waitFor,
  worldPos
} from "./CprLeafHelpers"

@component
export class CprRestartScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    const home1 = worldPos("Pad1")
    const home2 = worldPos("Pad2")
    const runs0 = c.runCount

    await goToCompressing(i)
    await placeBothPads(i)
    await waitFor(() => c.step === CprStep.ShockReady, (c.analyseSeconds + 2) * 1000, "ShockReady")
    await i.tap("ShockButton")
    await sleep(800)
    await i.tap("HelpArrivedButton")
    await waitFor(() => c.step === CprStep.Summary, 1000, "Summary")
    expect(c.runCount).toBe(runs0 + 1)
    expect(c.events.length > 0).toBe(true)
    expect(obj("RestartButton").enabled).toBe(true)

    await i.tap("RestartButton")
    await waitFor(() => c.step === CprStep.Idle, 1000, "Idle after restart")
    await sleep(300)
    expect(c.shockCount).toBe(0)
    expect(c.beatCount).toBe(0)
    expect(c.elapsedSeconds).toBe(0)
    expect(c.flowSeconds).toBe(0)
    expect(c.handsOffSeconds).toBe(0)
    expect(c.events.length).toBe(0)
    expect(c.aedPresent).toBe(false)
    expect(c.chestMarked).toBe(false)
    expect(c.pad1Placed).toBe(false)
    expect(c.pad2Placed).toBe(false)
    expect(pad("Pad1").placed).toBe(false)
    expect(pad("Pad2").placed).toBe(false)
    const d1 = worldPos("Pad1").distance(home1)
    const d2 = worldPos("Pad2").distance(home2)
    print("[LEAF] pads after restart: " + d1.toFixed(2) + " / " + d2.toFixed(2) + " cm from tray home")
    expect(d1 < 0.5 && d2 < 0.5).toBe(true)
    expect(obj("StartOrb").enabled).toBe(true)
    expect(obj("SummaryCard").enabled).toBe(false)
    expect(obj("RestartButton").enabled).toBe(false)
    expect(obj("Pad1").enabled).toBe(false)
    expect(c.runCount).toBe(runs0 + 1)

    // Second run works end-to-end through the real interactables.
    await goToReady(i)
    expect(c.chestMarked).toBe(true)
    await i.tap("StartButton")
    await waitFor(() => c.step === CprStep.Compressing, 1000, "Compressing (run 2)")
    await sleep(1200)
    expect(c.beatCount >= 1).toBe(true)
    await i.tap("AEDHereButton")
    await i.dragTo("Pad1", pad("Pad1").getGhostWorldPosition())
    await waitFor(() => pad("Pad1").placed, 1500, "Pad1 placed (run 2)")
    expect(c.pad1Placed).toBe(true)
  }
}
