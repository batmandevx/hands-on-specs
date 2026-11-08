/**
 * cpr-9: during Compressing (real Start pinch) the push/rise bar beside the hand
 * target alternates PUSH / RISE and its fill drops and recovers each beat.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {CprLeafInteractor, controller, goToReady, obj, textOf} from "./CprLeafHelpers"

@component
export class CprPushBarScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const i = new CprLeafInteractor()
    const c = controller()
    await goToReady(i)
    expect(obj("PushBar").enabled).toBe(false)
    await i.tap("StartButton")
    expect(obj("PushBar").enabled).toBe(true)
    await sleep(300)

    const fillT = obj("PushBar_Fill").getTransform()
    let push = 0
    let rise = 0
    let other = 0
    let minH = 1e9
    let maxH = -1e9
    let switches = 0
    let prev = ""
    const b0 = c.beatCount
    const end = getTime() + 3.3
    while (getTime() < end) {
      await nextFrame()
      const label = textOf("PushBar_Label")
      if (label === "PUSH") push++
      else if (label === "RISE") rise++
      else other++
      if (prev !== "" && label !== prev) switches++
      prev = label
      const h = fillT.getLocalScale().y
      minH = Math.min(minH, h)
      maxH = Math.max(maxH, h)
    }
    const beats = c.beatCount - b0
    const pushShare = push / (push + rise)
    print("[LEAF] pushbar: PUSH=" + push + " RISE=" + rise + " other=" + other + " switches=" + switches +
      " beats=" + beats + " pushShare=" + pushShare.toFixed(2) + " fill " + minH.toFixed(2) + ".." + maxH.toFixed(2))
    expect(push > 0 && rise > 0).toBe(true)
    expect(other).toBe(0)
    expect(switches >= beats).toBe(true) // at least one PUSH<->RISE flip per beat
    expect(pushShare > 0.3 && pushShare < 0.6).toBe(true) // ~45% of each beat
    expect(maxH > minH * 2).toBe(true) // fill drops and recovers
  }
}
