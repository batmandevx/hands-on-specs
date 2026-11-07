# Hands On: winning playbook for Learn AR with SPECS

> **Hands on the chest. Eyes on the patient. The coach is in your glasses.**
> A SPECS Lens that guides a panicking bystander through hands-only CPR and an AED, step by step, drawn on the person in front of them.

Deadline: **10 Nov 2026, 3:30am IST** (Sun 9 Nov, 5pm ET). Submit by Sunday afternoon IST, not at 3am.

---

## 1. Why this idea (stress-tested)

I checked the shortlist against the hackathon's own rules, which are in the skill pack (`ar-design-rules.md`, `preview-limits.md`). Judges score with the same lens.

| Test from the skill pack | CPR coach | Ghost-hands knot tutor | Cooking coach | Breaker-box helper |
|---|---|---|---|---|
| Shares your view | ✅ you're looking at the patient | ✅ | ✅ | ✅ |
| Draws in the world, real size | ✅ target *on* the chest, pads *on* the body | ✅ | ✅ | ✅ |
| Leaves body free (essential, not nice-to-have) | ✅✅ **both hands are busy; a phone is impossible** | ✅ | ✅ | ⚠️ partly |
| Showable in preview with standard pinch/grab | ✅ pinch to mark, grab-drag AED pads | ⚠️ needs finger poses (can't show) | ✅ | ⚠️ needs recognition |
| Crowdedness (1,184 entrants) | Low | Low | **Very high** (it's the video's own example) | Low |
| Stakes and story for the video | **Life or death** | Hobby | Dinner | Chore |
| Scope: one spatial moment | ✅ | ✅ | ✅ | ⚠️ |

**What I changed after reading the preview limits.** The preview *cannot* show custom hand motions or hand speed, so the Lens must not claim to "detect compressions". That would be a gimmick judges can't see. Instead:

- **The Lens is the pacer and the choreographer, not a sensor.** It sets the beat, counts, keeps time, calls the rescuer swap, and walks you through the AED. Every part of that is real and demoable.
- **The stand-in** (the skill pack's term) is a single pinch: *"Mark the chest."* You pinch the centre of the chest and everything anchors there. On real glasses this becomes body detection, which goes under Risks.
- **The hero interaction** is grabbing two AED pads and dragging them onto the right spots on the body. Grab-and-drag is a standard SIK interaction, so it works with the mouse and LEAF can test it. It's also the most visual 10 seconds of the video.

**Honest limits.** No idea is guaranteed to win. CPR coaching has been explored in AR research (HoloLens studies), so the novelty is in *execution*: hands-free pacing plus AED choreography, drawn on the body. Frame it as a **training and just-in-time coach** that follows published hands-only CPR guidance, never as a medical device.

---

## 2. The design (what goes into the brief)

**Scene:** Lens Studio preview room. A life-size adult **training mannequin** lies on the floor ~1 m in front of the start position. (CLAD can generate one, or use a simple capsule body.) Its presence is the stand-in for "a real person collapsed".

**The one spatial moment:** you're kneeling over the patient, both hands on the chest. A soft ring on the breastbone pulses at 110/min with a click. A big count (1…30) and an elapsed timer sit right beside your hands. Nothing floats in your face.

### Flow (state machine)
1. **Idle.** A small "Someone collapsed?" orb hovers 1 m ahead at chest height. Pinch it → start.
2. **Call.** A card beside the patient (not in your face): *"Call 112/911 on speaker. Shout for an AED."* Big **Done** button. (Voice "done" if the preview supports it; the button always works.)
3. **Mark the chest (stand-in).** *"Pinch the centre of the chest."* A pinch on the mannequin's chest spawns a **hand target**: a 9 cm outline of two stacked hands on the lower half of the breastbone.
4. **Compress.** A pinch on **Start** begins the pacer:
   - A ring (20 cm) pulses at **110 bpm**, with a click on each beat and a spatial sound from the chest.
   - A counter shows **1–30**, looping for continuous hands-only CPR. Text cue: *"Push hard, 5–6 cm. Let it rise."*
   - The elapsed timer `00:00` sits 12 cm to the right of the hands.
   - All of it is in a ~23×38 cm zone around the chest, which is what's visible at ~55 cm.
5. **Swap at 2:00.** A chime plays and the ring turns amber: *"Switch rescuers now. Keep the beat."* It auto-clears after 5 s. For the demo, a dev **⏩ 2 min** button skips time.
6. **AED arrives.** Pinch **AED here**. A tray appears beside the patient with two pads. Ghost outlines show on the body:
   - Pad 1: upper right chest, below the collarbone.
   - Pad 2: lower left side, below the armpit.
   - Grab a pad and drag it onto its ghost. It snaps and glows green if right. If it's dropped wrong, it bounces back with *"Upper right chest"*.
7. **Shock.** Once both pads are on, the pacer pauses: *"Stand clear. Don't touch."* A 3-second analyse countdown, then a big **Shock** button. Pinch it → flash → *"Resume compressions now"*. The pacer restarts.
8. **Handover.** Pinch **Help arrived** → summary card: total time, cycles, shocks given. *"Tell the paramedics."*

### Placement numbers
- Main content sits on or beside the chest, 0.5–0.7 m from the kneeling eye, a little below eye level.
- Light, high-contrast colours (the display is additive, so black is invisible): white, cyan and green. Amber means "attention", red only for **Shock**.
- Buttons are at least 8 cm wide, 1–3 on screen at once, with a highlight on hover.

### Done criteria (each checkable in the preview)
1. Pinching the chest of the mannequin places the hand target on the lower breastbone.
2. Pinching **Start** makes the ring pulse at 110/min with a click; the counter loops 1–30 and the timer counts up.
3. At 2:00 (or after **⏩ 2 min**), a chime plays and the amber "Switch rescuers" cue shows, then clears.
4. After **AED here**, each pad can be grabbed and dragged; it snaps only onto its correct spot, and a wrong drop returns it.
5. With both pads placed, **Shock** appears after "Stand clear"; pressing it resumes the pacer and the shock count rises in the handover summary.

### Out of scope
Real body or compression detection, rescue breaths, child and infant CPR, calling the phone, multi-user, saving data.

### Risks (for the brief)
- Real glasses would need body detection to replace the "mark the chest" stand-in. *Feel unproven.*
- Readability while moving up and down during compressions: *feel unproven*.
- Medical framing: it follows public hands-only CPR guidance and is a coach, not a device.

---

## 3. Your plan-lens interview: cheat sheet

The skill asks one question at a time, and **you** must make the decisions (that's the rule). Use these as your notes, in your own words:

| Question | Your answer, in short |
|---|---|
| What do you want to make? | A coach for a bystander doing CPR on someone who collapsed. People freeze, push too slowly, lose count, and don't know where the AED pads go. |
| The moment it's at its best? | Kneeling, both hands on the chest, I see a ring pulsing on the breastbone at 110/min and a count next to my hands. When the AED arrives, I drag the pads onto glowing spots on the body. |
| Why not a phone? | Both my hands are on the chest. I can't hold a phone, and I must keep my eyes on the patient. |
| Product or overlay? | An overlay on a real person. The stand-in is that I pinch the centre of the chest to mark it, with a training mannequin in the scene. |
| Where do things live? | Everything on or beside the chest, within ~20 cm of my hands. The call card goes beside the patient. Nothing in my face. |
| Hands? | One pinch to mark the chest, big Start / AED here / Shock buttons, and grab-drag for the pads. Voice "done" optional, always with a button. |
| When does it show? | Only the current step. The swap cue appears at 2:00 with a chime and clears itself. The pacer pauses during "stand clear". |
| Done? | The 5 criteria in §2. |

---

## 4. Setup (you do 1–4, about 30 min)

1. **Install Lens Studio** from https://ar.snap.com/download and sign in. Use **5.23.2** if sign-in fails on 5.24.
2. In Lens Studio: **SPECS → Base Template → File › Save As** → e.g. `~/Downloads/HandsOn`. Keep Lens Studio open.
3. Install the Claude Code CLI if you want the official path: `curl -fsSL https://claude.ai/install.sh | bash`. Or open a new session in this desktop app with the folder set to `~/Downloads/HandsOn`.
4. In that new session (started **in the project folder**, so the Lens Studio MCP loads), approve the `lens-studio` MCP server, then:
   - `/plugin marketplace add https://github.com/lens-studio-devs/ls-extensions.git`
   - `/plugin install ls-clad@ls-extensions` then `/reload-plugins`
   - `npx skills add challengepost/learn-specs --all -y`
5. Say **`plan-lens`**. Answer using §3. Approve the brief.
6. `/clear`, then: *"Read devpost/design-brief.md and build it for SPECS. Follow the brief closely. Get the basic flow working first, then add detail. Write and run LEAF tests for each done criterion, and tell me which pass."*
7. Iterate with **design notes**, not code: "Move the counter 10 cm closer to the hands", "Make Shock twice as big".
8. `git init`, add a README, and push a public GitHub repo with the project and `devpost/`.

---

## 5. Video script (≈2:30, screen recording plus your voiceover)

| Time | Shot | Voiceover |
|---|---|---|
| 0:00–0:15 | Black screen, a heartbeat, then a flatline | "When someone's heart stops, the next few minutes decide if they live. The person beside them is usually a stranger who's never done CPR." |
| 0:15–0:30 | Phone-with-CPR-video mockup → crossed out | "A phone can't help. Your hands are on their chest. Your eyes need to be on them." |
| 0:30–0:40 | Title: **Hands On**, a CPR coach for SPECS | "So I designed the coach to live where the work is: on the patient." |
| 0:40–1:00 | Preview: walk to the mannequin, pinch the orb, the Call card | "It starts with the step people forget: call, and send someone for the AED." |
| 1:00–1:30 | Pinch chest → hand target → pulsing ring, count, timer | "One pinch marks the chest. Then a ring beats at 110 a minute, right under your hands. No menus, nothing in your face." |
| 1:30–1:45 | ⏩ → amber swap cue + chime | "At two minutes, compressions get weak. It tells you to switch." |
| 1:45–2:10 | AED tray → drag pads, one wrong (bounces) → snap → Stand clear → Shock → resume | "When the AED arrives, the pads show exactly where they go. Drop one wrong and it tells you." |
| 2:10–2:30 | The brief in `devpost/`, LEAF test results | "I planned it with the Devpost skill pack. The interview cut my idea down to one moment and made me fake sensing honestly. CLAD built it, and LEAF tests check every step. What I learned: on glasses, the best UI is the one on the thing you're touching." |

---

## 6. Devpost description (draft)

**Hands On: a CPR coach that lives on the patient, not on a screen.**

**What it does.** When someone collapses, Hands On guides a bystander through hands-only CPR on SPECS. It prompts the call, anchors a hand target on the chest, and pulses the beat at 110/min right under your hands. It counts and times, calls the 2-minute rescuer swap, and turns the AED into a drag-the-pads-onto-the-glowing-spots task.

**Who it's for.** Anyone who isn't a medic. Most cardiac arrests happen at home, in front of family who freeze.

**Why glasses.** Both hands are on the chest and your eyes must stay on the patient. That's exactly what a phone can't do. Everything is drawn on the body at real size, and only the current step shows.

**How I built it.** I planned it with the Devpost Learn `plan-lens` skill (brief in `/devpost`), and Snap's CLAD agents built it in Lens Studio through the Lens Studio MCP. LEAF tests cover all five done criteria.

**What I learned.** Faking sensing honestly (one pinch to mark the chest) is better design than a gesture judges can't see. Put information on the thing it's about. Every glance has to earn its place.

*Hands On is a training and just-in-time coaching concept based on public hands-only CPR guidance, not a medical device.*
