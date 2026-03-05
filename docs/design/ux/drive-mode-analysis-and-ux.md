# Drive Mode: Chat Mode vs Original Journey & UX Principles

## Purpose

Analyze whether **Drive as a chat mode** (like Agent mode) simplifies our design, compare to the original user journey, and define UX principles so Drive **blends into Cursor**—easy to identify, not flashy or overwhelming.

---

## 1. Drive as a Chat Mode (Like Agent)

### 1.1 What It Means

Cursor has **modes** in the chat/agent UI: Ask, Plan, Debug, **Agent**. Each mode changes behavior.

**Drive as a mode** would mean:
- Drive appears in the **same mode selector** as Agent, Ask, Plan, Debug
- User selects "Drive" instead of "Agent" when they want pair-programming driver behavior
- No separate @drive participant; Drive is a **mode of the main chat**
- Voice could be **optional enhancement** when Drive mode is active (mic works in any mode; Drive mode + mic = voice-first Drive)

### 1.2 Pros

| Benefit | Why |
|---------|-----|
| **Simpler mental model** | One place to pick behavior: Ask / Plan / Debug / Agent / **Drive** |
| **Blends in** | Uses existing Cursor UI; no new surfaces |
| **Discoverable** | Mode selector is prominent; users already look there |
| **Consistent** | Same pattern as other modes; no "special" extension surface |
| **Less fragmentation** | No @drive vs @codebase vs Agent—just "I'm in Drive mode" |

### 1.3 Cons

| Concern | Why |
|---------|-----|
| **Voice not obvious** | "Drive" doesn't signal "voice-first" to new users. Agent mode isn't voice-specific either—Cursor's voice is separate (mic icon). |
| **Mode overload** | Adding another mode could dilute the selector. Cursor may limit how many modes extensions can add. |
| **Extension vs native** | If Drive is a mode, does Cursor expose a "register mode" API for extensions? Or do we still need @drive as a participant that *behaves* like a mode? |

### 1.4 Opinion: Drive as Mode vs Original Journey

**Recommendation: Pursue Drive as a mode, with voice as an optional layer.**

**Rationale:**

1. **Original journey** (mic dropdown: Single vs Drive) assumed voice-first entry. But Cursor's voice is **already separate**—the mic exists regardless of mode. So: **mode = behavior** (Drive = pair-programming driver), **mic = input method** (voice or type). They're orthogonal.

2. **"Drive" as mode name** is strong—action-oriented, memorable. It doesn't need to scream "voice." Voice is an **enhancement** when you're in Drive mode: "Drive mode + mic = voice-first pair programming." Text works too: "Drive mode + keyboard = same driver behavior, typed input."

3. **Discoverability**: Mode selector is more discoverable than right-click mic. Users see Ask, Plan, Debug, Agent—and **Drive**. One click.

4. **Blend-in**: Mode selector is where users change behavior. No new UI.

5. **Voice discoverability**: Solved by:
   - **First-run tip**: "Drive mode works great with voice—try the mic while in Drive"
   - **Mode description**: "Drive: Pair-programming driver. Best with voice."
   - **Settings**: Voice mode + Drive mode are separate toggles; guide explains the combo

**Trade-off**: Cursor may not expose the mode selector to extensions. Fallback: **beforeSubmitPrompt hook** as primary; status bar toggle activates Drive. @drive participant only if Cursor adds participant API support.

---

## 2. Original Journey vs Mode-Based Journey

| Aspect | Original (Mic Dropdown) | Mode-Based |
|--------|-------------------------|------------|
| **Entry** | Right-click mic → Single / Drive | Mode selector → Drive |
| **Voice** | Drive = voice-first by default | Drive = behavior; voice = optional input |
| **Discoverability** | Lower (hidden in mic menu) | Higher (mode selector) |
| **Blend-in** | New interaction (right-click mic) | Reuses existing pattern |
| **Complexity** | Two concepts (Single vs Drive) | One concept (Drive mode) |

**Verdict**: Mode-based is simpler and more discoverable. Keep mic for **input method** (voice vs type); use mode for **behavior** (Drive vs Agent vs Ask).

---

## 3. UX Principles: Blend In, Easy to Find, Not Flashy

### 3.1 Blend Into Cursor

- **Reuse UI**: Mode selector, chat panel, mic icon. No custom panels unless necessary.
- **Match Cursor patterns**: Same shortcuts, reaction style, button placement.
- **No new chrome**: Avoid custom sidebars, floating widgets, or branded overlays.
- **Consistent terminology**: Use Cursor's words (Agent, Composer, Chat, @codebase).

### 3.2 Easy to Identify

- **Visible in mode selector**: "Drive" appears where users look for behavior changes.
- **Clear description**: "Pair-programming driver. Listens first, drives execution." Tooltip or first-use hint.
- **Settings presence**: Drive mode toggle in Cursor settings (Features > Chat or similar).
- **Not buried**: Avoid "extensions" submenu only; surface in main chat/mode flow.

### 3.3 Not Flashy or Overwhelming

- **No animations** beyond subtle "listening" indicator (small badge, not a modal).
- **No onboarding popups** unless first-run; keep them dismissible and short.
- **Quiet by default**: Drive doesn't announce itself loudly; user opts in.
- **Progressive disclosure**: Advanced settings (activation phrase, submit phrase) collapsible.

### 3.4 Summary

| Principle | Implementation |
|-----------|----------------|
| Blend in | Use mode selector; no custom UI |
| Easy to find | Drive in mode list; settings entry |
| Not flashy | Subtle indicators; quiet default |
| Voice discoverable | Tip + mode description; separate voice toggle |

---

## 4. Implementation Path

### 4.1 If Cursor Exposes Mode API

- Register Drive as a **mode** in the chat/agent mode selector.
- Drive mode = our router + planner + driver behavior.
- Voice = Cursor's existing mic; when Drive + mic, we get voice-first.

### 4.2 If Mode API Not Available (Extension-Only)

- Use **beforeSubmitPrompt hook** as primary pipeline entry when Drive is active.
- Status bar + Ctrl+Shift+D toggles Drive. No @drive participant required.
- @drive participant only if Cursor adds participant API support.

### 4.3 Hybrid

- **Phase 1**: beforeSubmitPrompt hook as primary; status bar toggle.
- **Phase 2**: If Cursor adds mode registration, migrate to native mode.
- **Phase 3**: Voice integration (OpenClaw or native).

---

## 5. References

- [Drive Mode User Journey](drive-mode-user-journey.md)
- [Cursor-Native System Design](../architecture/cursor-native-system-design.md)
- [Cursor-Aligned Naming](../naming/cursor-aligned-naming.md)
