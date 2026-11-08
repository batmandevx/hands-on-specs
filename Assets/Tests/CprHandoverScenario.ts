/**
 * cpr-6: full flow via real taps (orb, Done, chest, Start, >> 2 min, AED here,
 * pad drags, Shock, Help arrived). Checks the handover summary: hands-off time,
 * compression fraction and the ordered event timeline.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  CprLeafInteractor,
  CprStep,
  controller,
  goToCompressing,
  obj,
  placeBothPads,
  textOf,
  waitFor
} from "./CprLeafHelpers"

@component
export class CprHandoverScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    await goToCompressing(i)
    await i.tap("SkipButton")
    await waitFor(() => c.swapCount >= 1, 1000, "rescuer swap")
    await sleep(800)
    await placeBothPads(i)
    await waitFor(() => c.step === CprStep.ShockReady, (c.analyseSeconds + 2) * 1000, "ShockReady")
    await i.tap("ShockButton")
    await sleep(1500)
    await i.tap("HelpArrivedButton")
    await waitFor(() => c.step === CprStep.Summary, 1000, "Summary")

    expect(obj("SummaryCard").enabled).toBe(true)
    const labels = c.events.map((e) => e.label)
    print("[LEAF] events: " + labels.join(" > "))
    const timeline = textOf("SummaryCard_Timeline")
    const summary = textOf("SummaryCard_Text")
    print("[LEAF] timeline: " + timeline.split("\n").join(" | "))
    print("[LEAF] summary: " + summary.split("\n").join(" | "))
    print("[LEAF] handsOff=" + c.handsOffSeconds.toFixed(2) + "s compressing=" + c.compressingSeconds.toFixed(2) +
      "s fraction=" + c.compressionFraction.toFixed(3))

    // Ordered timeline entries.
    const expected = ["Called 112/911", "CPR started", "Rescuer swap", "AED pads on", "Shock 1", "Help arrived"]
    let last = -1
    for (const label of expected) {
      const idx = timeline.indexOf(label)
      print("[LEAF] timeline '" + label + "' at " + idx)
      expect(idx > last).toBe(true)
      last = idx
    }
    expect(timeline.includes("AED arrived")).toBe(true)
    // Each line is "MM:SS  label".
    for (const line of timeline.split("\n")) expect(/^\d\d:\d\d  \S/.test(line)).toBe(true)

    expect(c.handsOffSeconds > 0).toBe(true)
    expect(c.compressionFraction >= 0.5 && c.compressionFraction <= 1).toBe(true)
    expect(summary.includes("Hands-off time")).toBe(true)
    const pct = Math.round(c.compressionFraction * 100)
    expect(summary.includes("Compression fraction  " + pct + "%")).toBe(true)
    expect(summary.includes("Shocks given  1")).toBe(true)
  }
}
