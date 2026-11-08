/**
 * Shared helpers for the Hands On CPR LEAF scenarios.
 *
 * Every user action goes through a real SIK Interactable (orb, chest collider,
 * UIKit buttons, pad manipulation) via a LEAF interactor -- the controller is
 * only READ for assertions, never driven directly.
 */
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {CprFlowController} from "../Scripts/CprFlowController"
import {CprPad} from "../Scripts/CprPad"
import {CprStep} from "../Scripts/CprTypes"
import {CprVoiceCoach, VoiceLine} from "../Scripts/CprVoiceCoach"

export {CprStep, VoiceLine}

export function voiceCoach(): CprVoiceCoach {
  const so = findSceneObjectByName("CprVoice")
  if (!so) throw new Error("CprVoice SceneObject not found")
  const v = so.getComponent(CprVoiceCoach.getTypeName()) as CprVoiceCoach
  if (!v) throw new Error("CprVoiceCoach not found on CprVoice")
  return v
}

export function controller(): CprFlowController {
  const so = findSceneObjectByName("CprLogic")
  if (!so) throw new Error("CprLogic SceneObject not found")
  const c = so.getComponent(CprFlowController.getTypeName()) as CprFlowController
  if (!c) throw new Error("CprFlowController not found on CprLogic")
  return c
}

export function pad(name: "Pad1" | "Pad2"): CprPad {
  const so = findSceneObjectByName(name)
  if (!so) throw new Error(name + " SceneObject not found")
  const p = so.getComponent(CprPad.getTypeName()) as CprPad
  if (!p) throw new Error("CprPad not found on " + name)
  return p
}

export function obj(name: string): SceneObject {
  const so = findSceneObjectByName(name)
  if (!so) throw new Error("SceneObject " + name + " not found")
  return so
}

export function textOf(name: string): string {
  const t = obj(name).getComponent("Component.Text") as Text
  return t ? t.text : ""
}

export function worldPos(name: string): vec3 {
  return obj(name).getTransform().getWorldPosition()
}

/** Poll every frame until predicate() is true or the timeout elapses. */
export async function waitFor(predicate: () => boolean, timeoutMs: number, what: string): Promise<void> {
  const end = getTime() + timeoutMs / 1000
  while (!predicate()) {
    if (getTime() > end) throw new Error("Timed out after " + timeoutMs + "ms waiting for: " + what)
    await nextFrame()
  }
}

/** Leaf 2.0.2 has no per-event timeout; fail fast instead of hanging the scenario. */
export async function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let done = false
  const timer = sleep(ms).then(() => {
    if (!done) throw new Error("Timed out after " + ms + "ms: " + what)
  }) as Promise<never>
  try {
    return await Promise.race([p, timer])
  } finally {
    done = true
  }
}

/**
 * LEAF interactor for the CPR coach. trigger() / drag() are the real SIK paths
 * (hover -> select -> release through the InteractionManager).
 */
export class CprLeafInteractor extends DefaultLeafInteractor {
  constructor() {
    super("CprLeafInteractor")
  }

  /** Wait until the named Interactable is enabled in the hierarchy, then pinch it. */
  async tap(name: string): Promise<void> {
    let target: Interactable | undefined
    await waitFor(
      () => {
        target = findInteractablesByName(name, undefined, true)[0]
        return target !== undefined
      },
      3000,
      "interactable '" + name + "' enabled"
    )
    await withTimeout(this.trigger(target!), 5000, "trigger '" + name + "'")
    await sleep(250)
  }

  /**
   * Grab the named Interactable and drag it (real SIK InteractableManipulation)
   * so that its SceneObject ends up at goalWorld, then release.
   * The ray is translated each drag frame toward the goal using the object's
   * actual position as feedback, so manipulation smoothing does not matter.
   */
  async dragTo(name: string, goalWorld: vec3, durationMs: number = 2500): Promise<void> {
    let target: Interactable | undefined
    await waitFor(
      () => {
        target = findInteractablesByName(name, undefined, true)[0]
        return target !== undefined
      },
      3000,
      "interactable '" + name + "' enabled"
    )
    const so = target!.getSceneObject()
    const unsub = target!.onDragUpdate.add(() => {
      const rem = goalWorld.sub(so.getTransform().getWorldPosition())
      const step = rem.uniformScale(rem.length > 2 ? 0.2 : 0.5)
      this.startPoint = this.startPoint.add(step)
      this.endPoint = this.endPoint.add(step)
    })
    try {
      // Tiny non-zero drag vector so SIK registers a drag; the feedback above does the steering.
      await withTimeout(this.drag(target!, new vec3(0, 0.0001, 0), durationMs), durationMs + 5000, "drag '" + name + "'")
    } finally {
      unsub()
    }
    await sleep(250)
  }
}

/** Idle -> Call -> MarkChest -> Ready using real pinches. */
export async function goToReady(i: CprLeafInteractor): Promise<void> {
  const c = controller()
  await waitFor(() => c.step === CprStep.Idle, 3000, "step Idle after reset")
  await i.tap("StartOrb")
  await waitFor(() => c.step === CprStep.Call, 2000, "step Call")
  await i.tap("CallCard_DoneButton")
  await waitFor(() => c.step === CprStep.MarkChest, 2000, "step MarkChest")
  await i.tap("MannequinChest")
  await waitFor(() => c.step === CprStep.Ready, 2000, "step Ready")
}

/** ... -> Compressing via the real Start button. */
export async function goToCompressing(i: CprLeafInteractor): Promise<void> {
  await goToReady(i)
  await i.tap("StartButton")
  const c = controller()
  await waitFor(() => c.step === CprStep.Compressing, 2000, "step Compressing")
}

/** ... -> AED here -> both pads dragged onto their ghosts -> StandClear. */
export async function placeBothPads(i: CprLeafInteractor): Promise<void> {
  const c = controller()
  await i.tap("AEDHereButton")
  await waitFor(() => c.aedPresent, 2000, "aedPresent")
  await i.dragTo("Pad1", pad("Pad1").getGhostWorldPosition())
  await waitFor(() => pad("Pad1").placed, 1500, "Pad1 placed")
  await i.dragTo("Pad2", pad("Pad2").getGhostWorldPosition())
  await waitFor(() => pad("Pad2").placed, 1500, "Pad2 placed")
}
