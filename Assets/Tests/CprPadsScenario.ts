/**
 * Criterion 4: after AED here, each pad can be grabbed and dragged (real SIK
 * InteractableManipulation); it snaps only onto its correct spot and a wrong
 * drop returns it to the tray.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CprLeafInteractor, CprStep, controller, goToCompressing, obj, pad, waitFor, worldPos} from "./CprLeafHelpers"

@component
export class CprPadsScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    await goToCompressing(i)
    expect(obj("Pad1").enabled).toBe(false)

    await i.tap("AEDHereButton")
    expect(c.aedPresent).toBe(true)
    expect(obj("Pad1").enabled).toBe(true)
    expect(obj("Pad2").enabled).toBe(true)
    expect(obj("AEDTray").enabled).toBe(true)
    expect(obj("Pad1Ghost").enabled).toBe(true)
    expect(obj("Pad2Ghost").enabled).toBe(true)

    const p1 = pad("Pad1")
    const p2 = pad("Pad2")
    const home1 = worldPos("Pad1")

    // Wrong drop: Pad 1 dragged onto Pad 2's outline -> must not snap, returns to tray.
    await i.dragTo("Pad1", p2.getGhostWorldPosition())
    expect(p1.placed).toBe(false)
    expect(c.pad1Placed).toBe(false)
    await sleep(700) // 0.35 s return animation
    const backDist = worldPos("Pad1").distance(home1)
    print("[LEAF] Pad1 after wrong drop is " + backDist.toFixed(2) + " cm from tray home")
    expect(backDist < 1.0).toBe(true)

    // Correct drops.
    await i.dragTo("Pad1", p1.getGhostWorldPosition())
    await waitFor(() => p1.placed, 1500, "Pad1 placed")
    expect(c.pad1Placed).toBe(true)
    expect(p1.distanceToGhost() < 1.0).toBe(true)
    expect(c.step).toBe(CprStep.Compressing)

    await i.dragTo("Pad2", p2.getGhostWorldPosition())
    await waitFor(() => p2.placed, 1500, "Pad2 placed")
    expect(c.pad2Placed).toBe(true)
    expect(p2.distanceToGhost() < 1.0).toBe(true)
    expect(c.step).toBe(CprStep.StandClear)
  }
}
