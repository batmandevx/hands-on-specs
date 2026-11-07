/**
 * Criterion 5: with both pads placed, Shock appears after "Stand clear";
 * pressing it resumes the pacer and the shock count rises in the handover summary.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CprLeafInteractor, CprStep, controller, goToCompressing, obj, placeBothPads, textOf, waitFor} from "./CprLeafHelpers"

@component
export class CprShockScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    await goToCompressing(i)
    await placeBothPads(i)

    expect(c.step).toBe(CprStep.StandClear)
    expect(obj("StandClearCard").enabled).toBe(true)
    expect(obj("ShockButton").enabled).toBe(false)
    expect(obj("PacerRing").enabled).toBe(false)

    await waitFor(() => c.step === CprStep.ShockReady, (c.analyseSeconds + 2) * 1000, "step ShockReady")
    expect(obj("ShockButton").enabled).toBe(true)
    expect(obj("StandClearCard").enabled).toBe(true)

    const shocks0 = c.shockCount
    await i.tap("ShockButton")
    expect(c.step).toBe(CprStep.Compressing)
    expect(c.shockCount).toBe(shocks0 + 1)
    expect(obj("PacerRing").enabled).toBe(true)
    expect(obj("ShockButton").enabled).toBe(false)
    const b0 = c.beatCount
    await sleep(2000)
    expect(c.beatCount - b0 >= 3).toBe(true) // pacer resumed

    await i.tap("HelpArrivedButton")
    expect(c.step).toBe(CprStep.Summary)
    expect(obj("SummaryCard").enabled).toBe(true)
    const summary = textOf("SummaryCard_Text")
    print("[LEAF] summary: " + summary.split("\n").join(" | "))
    expect(summary.includes("Shocks given  " + c.shockCount)).toBe(true)
    expect(summary.includes("Shocks given  " + (shocks0 + 1))).toBe(true)
  }
}
