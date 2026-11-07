/**
 * Criterion 1: pinching the mannequin chest places the hand target on the
 * lower breastbone. Real SIK pinches: StartOrb -> CallCard_DoneButton ->
 * MannequinChest (box collider; hit point -> markChest).
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CprLeafInteractor, CprStep, controller, goToReady, obj, worldPos} from "./CprLeafHelpers"

@component
export class CprChestMarkScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()

    expect(obj("HandTarget").enabled).toBe(false)
    await goToReady(i)

    expect(c.step).toBe(CprStep.Ready)
    expect(c.chestMarked).toBe(true)
    expect(obj("HandTarget").enabled).toBe(true)
    expect(obj("ChestPrompt").enabled).toBe(false)
    expect(obj("StartButton").enabled).toBe(true)

    // Hand target sits on the lower-sternum anchor (offset clamped to markToleranceCm in XZ, lifted 0.4 cm).
    const anchor = worldPos("ChestAnchor")
    const target = worldPos("HandTarget")
    const d = anchor.distance(target)
    print("[LEAF] HandTarget-to-ChestAnchor distance = " + d.toFixed(2) + " cm")
    expect(d < c.markToleranceCm * 1.5 + 1).toBe(true)
    expect(c.markedChestWorldPos.distance(anchor) <= c.markToleranceCm * 1.5 + 0.01).toBe(true)
  }
}
