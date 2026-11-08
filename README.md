# Hands On

**Hands on the chest. Eyes on the patient. The coach is in your glasses.**

Hands On is a SPECS Lens that walks a bystander through hands-only CPR and an AED, one step at a time. The guidance is drawn on the person in front of them. It was made for the Devpost hackathon *Learn AR with SPECS*.

> **Disclaimer.** Hands On is a training and just-in-time coaching concept based on public hands-only CPR guidance. It is **not a medical device**, it does not detect anything about the patient, and it must not replace professional training or emergency services. In a real emergency, call your local emergency number.

## What it does

1. **Start.** Pinch the "Someone collapsed?" orb.
2. **Call.** A card beside the patient says: "Call 112/911 on speaker. Shout for an AED." Press **Done**.
3. **Mark the chest.** Pinch the centre of the chest. A two-hands target appears on the lower breastbone.
4. **Compress.** Press **Start**. A ring on the chest pulses at **110 beats per minute** with a click. A counter loops 1–30 and an elapsed timer runs next to your hands.
5. **Swap rescuers.** At 2:00 a chime plays and an amber cue says "Switch rescuers now". It clears itself after 5 seconds. A **⏩ 2 min** demo button skips ahead.
6. **AED.** Press **AED here**. Ghost outlines show where the pads go: upper right chest and lower left side. Grab each pad and drag it onto its ghost. A correct drop snaps into place; a wrong drop bounces back with a hint.
7. **Shock.** The Lens says "Stand clear", counts down while the AED analyses, then shows **Shock**. Pressing it resumes the pacer.
8. **Handover.** Press **Help arrived** to see a summary for the paramedics: total time, cycles, shocks given, **hands-off time**, **compression fraction**, and a timestamped event timeline (call, CPR start, rescuer swap, AED pads on, each shock). **Start again** resets everything for another run.

### What makes it work on glasses
- **Spoken coaching.** Your hands are on the chest, so audio carries the guidance. A calm voice speaks each step ("Push hard and fast", "Stand clear. Don't touch the patient", "Shock delivered. Resume compressions now") and says "Keep going" every 30 s. The 110 bpm click never stops; it just gets quieter while the voice speaks.
- **Push / rise bar.** A slim bar beside your hands drops on every beat and refills, labelled PUSH and RISE. It teaches full chest recoil as well as rate. The hand target pulses with the beat.
- **Everything lives on the patient.** The ring, count, timer, pad outlines and cards all sit on or beside the chest, in light colours that read on an additive display. Only the current step shows, with at most 3 buttons on screen.
- **Never lose the patient.** If you look away during CPR, a small arrow points you back to the chest.

## Who it's for

Anyone who isn't a medic. Most cardiac arrests happen at home, in front of family or strangers who freeze, push too slowly, lose count, or don't know where the AED pads go.

## Why glasses

- **Both hands are on the chest.** You can't hold a phone during CPR.
- **Your eyes must stay on the patient.** The beat, the count and the pad positions are drawn on the body at real size, so you never look away.
- **Only the current step shows.** Everything sits on or beside the chest, in light colours that read well on an additive display.

The preview has no body detection, so the Lens can't find the chest by itself. Instead you mark the chest with one pinch on a training mannequin. On real glasses, body detection would replace that step.

## How it was built

- **Planning:** Devpost Learn's [`plan-lens`](https://learn-specs.devpost.com/resources) skill interviewed me and checked the idea against AR design rules and what the preview can do. The approved brief is [`devpost/design-brief.md`](devpost/design-brief.md).
- **Building:** Snap's **CLAD** agents (`ls-clad`) built the brief in **Lens Studio 5.24** through the **Lens Studio MCP**. The project started from SPECS › Base Template and uses Spectacles Interaction Kit and UI Kit.
- **Testing:** **LEAF** scenarios (`Assets/Tests/`) cover each done criterion in the brief, plus the handover timeline, restart, voice coaching and push bar. They run in the Lens Studio preview and drive the real SIK pinches and pad drags, not shortcuts into the logic.
- **Audio:** the click, chime and shock sounds were synthesised with CLAD's `build-sfx`. The voice lines were generated offline with macOS text-to-speech.
- **Screenshots** from the preview are in [`devpost/screenshots/`](devpost/screenshots/).

## Run it

1. Open `HandsOn.esproj` in Lens Studio 5.24 or later.
2. In the Preview panel, choose **Interactive Preview** with the Spectacles device.
3. The preview starts in a kneeling view over the patient's chest. Clicking acts as a pinch. Move with WASD, use Q and E to go down and up, and right-drag to look around. To start from a standing view instead, untick `kneelCamera` on the `CprDemoDriver` object.
4. To watch a scripted walkthrough, tick `runDemo` on `CprDemoDriver`.

## Repo layout

- `Assets/`: the Lens (scene, scripts, materials, sounds, LEAF scenarios)
- `devpost/`: design brief and screenshots
- `docs/`: planning notes
- `Packages/`: Lens Studio packages used by the project

`Cache/`, `Workspaces/`, `PluginsUserPreferences/` and local MCP configs (such as `.mcp.json`, which holds a local token) are generated or private and are not committed.
