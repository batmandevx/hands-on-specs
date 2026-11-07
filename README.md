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
8. **Handover.** Press **Help arrived** to see a summary of total time, cycles and shocks given for the paramedics.

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
- **Testing:** **LEAF** scenarios cover each done criterion in the brief and run in the Lens Studio preview.
- **Screenshots** from the preview are in [`devpost/screenshots/`](devpost/screenshots/).

## Run it

1. Open `HandsOn.esproj` in Lens Studio 5.24 or later.
2. In the Preview panel, choose **Interactive Preview** with the Spectacles device.
3. Move with WASD, use Q and E to go down and up, and right-drag to look around. Clicking acts as a pinch.

## Repo layout

- `Assets/`: the Lens (scene, scripts, materials, sounds, LEAF scenarios)
- `devpost/`: design brief and screenshots
- `docs/`: planning notes
- `Packages/`: Lens Studio packages used by the project

`Cache/`, `Workspaces/`, `PluginsUserPreferences/` and local MCP configs (such as `.mcp.json`, which holds a local token) are generated or private and are not committed.
