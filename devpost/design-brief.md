---
status: approved
---

# Design brief: Hands On

<!-- Filled in by plan-lens from the learner's answers (prepared in docs/HANDS-ON-playbook.md §2–3). Values the learner didn't choose are marked (default). -->

## The one spatial moment
Kneeling over someone who collapsed, both hands on their chest, I see a ring pulsing on the breastbone at 110/min and a count next to my hands. When the AED arrives, I drag the pads onto glowing spots on the body.

## Why it belongs on glasses
- Uses: draws in the world (target on the chest, pads on the body, real size) and leaves your body free (both hands on the chest, eyes on the patient).
- Why it's better than the phone or laptop version: both my hands are on the chest, so I can't hold a phone, and I must keep my eyes on the patient. People freeze, push too slowly, lose count, and don't know where the AED pads go. The coach lives where the work is.

## Product or overlay
- Type: overlay. It coaches a bystander on a real person. The Lens is the pacer and choreographer, not a sensor.
- What the real version would sense: the person's body and chest position (body detection).
- Stand-in for the preview: a life-size adult training mannequin lies on the floor about 1 m in front of the start position (a simple capsule body is fine) (default: simple primitive body). **"Mark the chest":** the user pinches the centre of the mannequin's chest, and everything anchors there. The Lens never claims to detect compressions.

## Where things live
- Where the user is looking during the main task: down at the chest, at their hands, 0.5–0.7 m from the kneeling eye and a little below eye level.
- Start orb ("Someone collapsed?"): hovers 1 m ahead at chest height, about 10 cm across (default).
- Call card: beside the patient, not in your face. "Call 112/911 on speaker. Shout for an AED." Big **Done** button.
- Hand target: a 9 cm outline of two stacked hands on the lower half of the breastbone, where the chest was pinched.
- Pacer ring: 20 cm across, centred on the hand target, pulsing at 110 bpm.
- Counter (1–30) and cue text ("Push hard, 5–6 cm. Let it rise."): right beside the hands.
- Elapsed timer `00:00`: 12 cm to the right of the hands.
- All pacer content stays within a ~23×38 cm zone around the chest (what's visible at ~55 cm).
- AED tray with two pads: beside the patient. Pad ghost outlines on the body: Pad 1 upper right chest, below the collarbone; Pad 2 lower left side, below the armpit. Pads about 12×8 cm (default).
- Buttons (Start, ⏩ 2 min, AED here, Shock, Help arrived): beside the chest, at least 8 cm wide, 1–3 on screen at once.
- Colours: light and high-contrast (white, cyan, green). Amber means "attention". Red only for **Shock**.

## Hands and input
- Start: pinch the "Someone collapsed?" orb.
- Done (call card): pinch the button.
- Mark the chest: pinch the centre of the mannequin's chest.
- Start compressions: pinch **Start**.
- ⏩ 2 min (dev/demo): pinch to skip time to the swap.
- AED here: pinch the button.
- Pads: grab a pad and drag it onto its ghost. It snaps and glows green if right. Dropped wrong, it bounces back with a hint ("Upper right chest" / "Lower left side").
- Shock: pinch the big red button.
- Help arrived: pinch the button.
- Targets are big and highlight when aimed at.
- Voice (if any) and the button that does the same job: voice "done" only if the preview supports it; the **Done** button always works.

## When things show
- Only the current step shows.
- Start orb: shows at idle, hides once pinched.
- Call card: shows after the orb, hides on **Done**.
- "Pinch the centre of the chest" prompt: shows after Done, hides once the hand target is placed.
- Pacer (ring, click, counter, timer, cue): runs from **Start** until "Stand clear", then resumes after **Shock**.
- Swap cue: at 2:00 a chime plays, the ring turns amber and shows "Switch rescuers now. Keep the beat." It clears itself after 5 s.
- AED tray and ghosts: show after **AED here**, hide once both pads are placed.
- Stand clear: the pacer pauses, "Stand clear. Don't touch." with a 3-second analyse countdown, then the **Shock** button. Pinch → flash → "Resume compressions now", and the pacer restarts.
- Handover summary: shows after **Help arrived**: total time, cycles, shocks given. "Tell the paramedics."
- If something needs attention out of view: sound (the chime for the swap; the click comes from the chest as spatial sound).

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Pinching the chest of the mannequin places the hand target on the lower breastbone.
2. Pinching **Start** makes the ring pulse at 110/min with a click; the counter loops 1–30 and the timer counts up.
3. At 2:00 (or after **⏩ 2 min**), a chime plays and the amber "Switch rescuers" cue shows, then clears.
4. After **AED here**, each pad can be grabbed and dragged; it snaps only onto its correct spot, and a wrong drop returns it.
5. With both pads placed, **Shock** appears after "Stand clear"; pressing it resumes the pacer and the shock count rises in the handover summary.

## Out of scope
- Real body or compression detection, rescue breaths, child and infant CPR, calling the phone, multi-user, saving data.

## Risks and open questions
- Real glasses would need body detection to replace the "mark the chest" stand-in. Feel unproven.
- Readability while moving up and down during compressions. Feel unproven.
- Medical framing: it follows public hands-only CPR guidance and is a training and just-in-time coach, not a medical device.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
