---
name: How It Works Pipeline Graphic
overview: Replace the "How It Works" three-step cards with an animated pipeline graphic (SVG nodes + connecting lines) using anime.js timeline, createDrawable for line-draw, optional motion path, and React-safe scope/cleanup. Reuse the same conceptual pipeline for future dashboard user-pipeline visualization.
todos: []
isProject: false
---

# How It Works — Animated Pipeline Graphic (anime.js)

**Goal:** Replace the current three step cards in the "How It Works" section with a single, animated pipeline graphic that shows flow from "Upload" → "Agents Apply" → "You Interview," using techniques from [animejs.com](https://animejs.com/) (timeline, SVG line-draw, optional motion path). Align with the kind of pipeline visualization you want later for the dashboard.

**Scope:** [roler_ui](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui). Main files: [LandingPage.tsx](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\pages\LandingPage.tsx), new component + constants.

---

## 1. Current "How It Works" (to replace)

- **Section:** `id="how-it-works"`, heading "How It Works", subtext "Three steps from resume to interviews."
- **Content:** Grid of three `StepCard`s driven by [HOW_IT_WORKS_STEPS](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\constants.ts) (Upload Once, Agents Apply, You Interview).
- **Remove:** The grid and `StepCard` usage in this section only. Keep `HOW_IT_WORKS_STEPS` (or a pipeline-specific copy) for labels on the graphic. `StepCard` can remain in the file if used elsewhere, or be removed if only used here.

---

## 2. Anime.js techniques to use (from docs)

| Technique | Doc | Use in pipeline |
|-----------|-----|------------------|
| **createTimeline** | [Timeline](https://animejs.com/documentation/timeline) | Run node entrance → line draw → optional loop in one sequence. |
| **createDrawable** | [createDrawable](https://animejs.com/documentation/svg/createdrawable) | Draw connecting paths between nodes (`draw: '0 1'`) with stagger so the line "travels" left to right. |
| **createMotionPath** | [createMotionPath](https://animejs.com/documentation/svg/createmotionpath) | Optional: move a small dot/icon along the pipeline path to show flow. |
| **stagger** | [stagger](https://animejs.com/documentation/utilities/stagger) | Stagger node opacity/scale on enter; stagger line segments. |
| **React** | [Using with React](https://animejs.com/documentation/getting-started/using-with-react) | `createScope({ root })`, add animations in `useEffect`, `return () => scope.current.revert()` so no leaks. |

---

## 3. Pipeline graphic design

- **Layout:** Horizontal flow: **Node 1** — line — **Node 2** — line — **Node 3** (Upload → Agents Apply → You Interview). Responsive: same order, scale or stack on small screens if needed.
- **Nodes:** Three circles or rounded rects with icons or numbers; label under each (from `HOW_IT_WORKS_STEPS`). Styled to match section (e.g. `text-primary-foreground`, light borders).
- **Connecting lines:** SVG `<path>` or `<polyline>` between node centers. Use `svg.createDrawable(path)` and animate `draw: '0 1'` so each segment "draws" in sequence (first segment, then second).
- **Animation sequence (timeline):**
  1. Nodes appear with stagger (opacity 0→1, optional scale or translateY).
  2. First path draws (`draw: '0 1'`), then second path.
  3. Optional: small dot/circle animated with `createMotionPath` along the full path, once or loop.
- **Respect reduced motion:** Use `prefers-reduced-motion: reduce` (or existing `useReducedMotion` if present): skip or shorten animations, show final state.

---

## 4. Implementation steps

**4.1 Add anime.js**

- Install: `animejs` (v4). Use modular imports in the component, e.g. `animejs/animation`, `animejs/timeline`, `animejs/svg`, `animejs/utilities` (stagger), plus React guidance (createScope from main or correct subpath per docs).

**4.2 New component: `PipelineGraphic`**

- **Path:** `src/components/landing/PipelineGraphic.tsx` (or `HowItWorksPipeline.tsx`).
- **Props:** Optional `steps` (default from `HOW_IT_WORKS_STEPS`) for labels; optional `className` for wrapper.
- **Structure:**
  - Outer wrapper with `ref={root}` for `createScope({ root })`.
  - SVG with `viewBox` that fits: three node positions + two path segments. Use a simple coordinate system (e.g. 0–400 width, nodes at 80, 200, 320) so paths are easy to define.
  - For each step: a `<g>` with circle/rect + text (or foreignObject for HTML labels). Give nodes and paths stable class names or data attributes for anime.js targets (e.g. `.pipeline-node`, `.pipeline-path`).
- **Animation in useEffect:**
  - `scope.current = createScope({ root }).add(() => { ... })`.
  - Inside: `createTimeline()`, then:
    - `timeline.add('.pipeline-node', { opacity: [0, 1], scale: [0.9, 1], ... }, stagger(120))`.
    - `timeline.add(firstPathDrawable, { draw: '0 1', duration: 600 }, '<+=200')`.
    - `timeline.add(secondPathDrawable, { draw: '0 1', duration: 600 }, '<+=100')`.
    - Optional: `timeline.add(dotElement, { ...svg.createMotionPath(combinedPath), duration: 1500 }, '<+=200')`.
  - If reduced motion: skip timeline or set very short duration and show final state.
  - `return () => scope.current.revert()`.

**4.3 Integrate in LandingPage**

- In the "How It Works" section, remove the grid and `HOW_IT_WORKS_STEPS.map(StepCard)`.
- Render `<PipelineGraphic />` (and optionally a short subtext or labels below from `HOW_IT_WORKS_STEPS` if not inside the SVG). Keep the section heading and "Three steps from resume to interviews" (or update to "From resume to interviews").
- Remove unused `StepCard` and `HOW_IT_WORKS_STEPS` import if StepCard is no longer used anywhere.

**4.4 Constants**

- Keep `HOW_IT_WORKS_STEPS` in [constants.ts](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\constants.ts) for titles/descriptions. Pipeline graphic can use the same data for tooltips or labels under each node.

---

## 5. Dashboard pipeline (future)

- The same **pipeline graphic concept** (nodes + connecting lines + anime.js draw/motion path) can be reused for the dashboard "user pipeline" view: replace step labels with real pipeline stages (e.g. Applied → Screen → Interview → Offer) and optionally drive positions or state from API. This plan only implements the landing version; dashboard can share the component later with different data and optional interactivity.

---

## 6. File summary

| Action | File |
|--------|------|
| Add dependency | `package.json` (animejs) |
| New pipeline graphic component | `src/components/landing/PipelineGraphic.tsx` |
| Replace step grid with graphic | `LandingPage.tsx` |
| Optional: remove StepCard / tidy imports | `LandingPage.tsx` |
| Keep or reuse step labels | `constants.ts` (HOW_IT_WORKS_STEPS) |

---

## 7. Verification

- Section "How It Works" shows one pipeline graphic with three nodes and two connecting lines.
- On load (or when in view): nodes appear in order, lines draw left-to-right; optional dot travels the path.
- Reduced motion: animation is skipped or minimal; content still readable.
- No console errors; cleanup on unmount (navigate away) does not leave anime.js timers running.
