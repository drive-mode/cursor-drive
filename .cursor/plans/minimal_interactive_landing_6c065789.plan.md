---
name: Minimal Interactive Landing
overview: Redesign the Rolefinders landing page to be visually minimal with a centered hero (brand + rotating quote) and layered, interactive sections that invite exploration without being intrusive.
todos: []
isProject: false
---

# Minimal Interactive Landing Page

## Design Direction

**Visual:** Minimal — single focal point, lots of whitespace, no clutter.
**Dynamic:** Rotating hero quote, layered sections, subtle interactions.
**Principle:** Easy to explore, never annoying. Respect `prefers-reduced-motion`.

---

## Hero (Above the Fold)

**Layout:** Centered, vertical stack. No badge, no buttons competing for attention initially.

```
        Rolefinders

   [rotating quote — 4s interval]
```

**Quotes (from user):**

1. "AI agents that work for you to find better roles"
2. "Stop applying for roles — start rejecting interviews. Rolefinders brings the job interview requests to you."
3. "Quit wasting time tailoring your resume."
4. "Rolefinders will focus on your career growth while you can focus on work & grow."

**Animation:** Fade or slide transition between quotes. Avoid jarring cuts. 4-second interval. Pause on hover if user is reading.

---

## Technical Approach


| Element         | Implementation                                                                             |
| --------------- | ------------------------------------------------------------------------------------------ |
| Rotating quote  | `useState` + `useEffect` with 4s interval; cleanup on unmount                              |
| Transition      | CSS `opacity` + `transform` (e.g. `translateY` or fade) with `transition`; or `@keyframes` |
| Reduced motion  | `prefers-reduced-motion: reduce` → skip animation, instant swap                            |
| Quote container | Fixed height or `min-height` to avoid layout shift when quote changes                      |


---

## Layered Sections (Below Hero)

**Current:** Hero → Features → How It Works → Pricing → Testimonials → CTA → Footer (all visible, dense).

**Proposed:** Keep same content but make it **layered** — less visually upfront, more discoverable on scroll:

- **Option A:** Collapsible sections — "What it does" / "How it works" / "Pricing" as expandable headers; click to reveal.
- **Option B:** Scroll-triggered reveal — sections fade/slide in as user scrolls (like Linear, Raycast).
- **Option C:** Single "Explore" or "Learn more" link that reveals the next section or a subtle scroll hint.

**Recommendation:** Option B (scroll reveal) — minimal on load, content appears as user explores. Avoid accordions unless user prefers that pattern.

---

## Nav and CTAs

- **Nav:** Keep minimal — logo, Sign in, Get Started. Consider hiding "What It Does" / "How It Works" / "Pricing" until user scrolls, or move to a single "Learn more" that scrolls to first section.
- **Primary CTA:** One clear CTA below the rotating quote (e.g. "Get early access" or "See how it works"). No button cluster.

---

## Files to Change


| File                                                                                                                                | Changes                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [roler_ui/src/pages/LandingPage.tsx](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\pages\LandingPage.tsx) | Replace hero with minimal layout + rotating quote; add scroll-reveal or collapsible sections |
| [roler_ui/src/constants.ts](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\constants.ts)                   | Add `HERO_QUOTES` array for rotating copy                                                    |
| [roler_ui/src/index.css](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\src\index.css)                         | Optional: animation keyframes, reduced-motion overrides                                      |


---

## Animation Notes

- **Quote transition:** 300–400ms ease-out. Fade out current → fade in next. Or `translateY(8px)` → `translateY(0)` for subtle slide.
- **Scroll reveal:** 400–500ms when section enters viewport. Use `IntersectionObserver` or a library (e.g. `framer-motion` if already in deps; otherwise vanilla).
- **Avoid:** Auto-playing video, infinite loops, rapid flashing.

---

## Implementation Order

1. Add `HERO_QUOTES` to constants.
2. Build minimal hero: "Rolefinders" + rotating quote + single CTA.
3. Add quote transition (CSS + JS), with `prefers-reduced-motion` check.
4. Refactor sections: collapse or scroll-reveal for Features, How It Works, Pricing.
5. Simplify nav: remove or consolidate links.
6. Test: reduced motion, no layout shift, mobile.
