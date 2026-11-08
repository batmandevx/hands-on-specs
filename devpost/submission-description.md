# Hands On — Devpost submission description

> Draft for the "Describe your project" field on the submission form.
> One or two paragraphs plus the bullets below is the right length — the README carries the detail.

---

## What it does

**Hands On is a CPR and AED coach for Snap's SPECS glasses, drawn onto the person in front of you.**
When someone collapses, both your hands are on their chest and your eyes are on the patient — a phone
can't help at that moment. Hands On puts the coach where the work is: a beat ring pulsing at 110/min
right on the breastbone, a counter that keeps your sets of thirty, a push/rise bar that teaches full
recoil, and glowing outlines that show exactly where the AED pads go. One pinch starts the flow; from
then on your hands never leave the chest.

- **Pacer on the body** — 110 bpm ring, click, 1–30 counter, elapsed timer and a PUSH/RISE bar, all
  anchored where you pinched the chest, at real size.
- **AED that behaves like a real AED** — drag pads onto labelled body outlines (wrong spot: bounce
  back with a hint), stand clear while it analyses, one big Shock button, and a re-analysis pause at
  every 2-minute boundary with pads on.
- **A calm voice coach** — speaks each step and encouragement every 30 s, while the click ducks under
  it; rescuer-swap chime at 2:00.
- **A paramedic-grade handover** — time down, first push at, shocks, hands-off time, longest pause,
  compression fraction and a timestamped event timeline.
- **Honest by design** — it never claims to detect the patient; it coaches, paces and choreographs.

## Who it's for

Anyone who isn't a medic when someone collapses — family, coworkers, people who took a CPR course
years ago and froze. The same flow doubles as a practice drill on a training mannequin.

## How it was built

Planned with the Devpost Learn `plan-lens` skill (interview → `devpost/design-brief.md`), built by
Snap's **CLAD** agents through the **Lens Studio MCP** in Lens Studio 5.24 (SPECS Base Template,
Spectacles Interaction Kit + UI Kit), and verified with **LEAF** scenarios that drive the real SIK
pinches and pad drags in the preview. Audio synthesised with `build-sfx`; voice lines generated
offline with macOS text-to-speech.

## What I learned

1. **On glasses, the best UI sits on the thing you're touching.** Moving the beat onto the breastbone
   and the pads onto the body did more than any new feature.
2. **A stand-in is better than a gesture nobody can see.** One pinch to mark the chest is honest,
   testable and demoable; "detecting compressions" in the preview would have been a trick.
3. **Every glance has to earn its place.** One step at a time, at most 3 buttons — calm is the point
   when someone is panicking.
4. **Design notes beat code edits.** Telling the agent "the patient reads as a slab" and "move the cue
   next to the ring" was faster and better than opening the scripts.

---

*Hands On is a training and just-in-time coaching concept based on public hands-only CPR guidance. It
is not a medical device and does not replace professional training or emergency services.*
