/**
 * cpr-10: AED re-analysis loop. With both pads on, a real AED re-analyses the
 * rhythm every ~2 minutes, so at the next 2-minute boundary the pacer pauses
 * for Stand clear -> analysing -> Shock advised again, and a second shock can
 * be delivered. Verified end-to-end with real taps (AED here, pad drags,
 * Shock, >> 2 min, Shock again).
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CprLeafInteractor, CprStep, controller, goToCompressing, obj, placeBothPads, textOf, waitFor} from "./CprLeafHelpers"

@component
export class CprReanalysisScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    await goToCompressing(i)
    await placeBothPads(i)

    // First analysis + shock.
    await waitFor(() => c.step === CprStep.ShockReady, (c.analyseSeconds + 2) * 1000, "first ShockReady")
    await i.tap("ShockButton")
    await waitFor(() => c.step === CprStep.Compressing, 1000, "compressing after shock 1")
    expect(c.shockCount).toBe(1)
    expect(c.reanalysisCount).toBe(0) // no boundary crossed yet

    // Jump to the next 2-minute boundary: with pads on, the AED re-analyses.
    await i.tap("SkipButton")
    await waitFor(() => c.step === CprStep.StandClear, 2000, "re-analysis StandClear")
    expect(c.reanalysisCount).toBe(1)
    expect(obj("PacerRing").enabled).toBe(false) // pacer paused: hands off
    expect(obj("StandClearCard").enabled).toBe(true)
    expect(obj("ShockButton").enabled).toBe(false) // only after analysing

    await waitFor(() => c.step === CprStep.ShockReady, (c.analyseSeconds + 2) * 1000, "second ShockReady")
    expect(obj("ShockButton").enabled).toBe(true)
    await i.tap("ShockButton")
    await waitFor(() => c.step === CprStep.Compressing, 1000, "compressing after shock 2")
    expect(c.shockCount).toBe(2)

    // The handover timeline records the re-analysis and both shocks, in order.
    await i.tap("HelpArrivedButton")
    await waitFor(() => c.step === CprStep.Summary, 1000, "Summary")
    const timeline = textOf("SummaryCard_Timeline")
    print("[LEAF] timeline: " + timeline.split("\n").join(" | "))
    expect(timeline.includes("AED re-analysis")).toBe(true)
    expect(timeline.includes("Shock 2")).toBe(true)
    expect(timeline.indexOf("AED re-analysis") > timeline.indexOf("Shock 1")).toBe(true)
    const summary = textOf("SummaryCard_Text")
    expect(summary.includes("Shocks given  2")).toBe(true)
  }
}
