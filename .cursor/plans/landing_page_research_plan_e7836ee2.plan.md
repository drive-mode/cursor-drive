---
name: Landing Page Research Plan
overview: Coordinate subagents to research modern tech company landing pages via browser, document their structure and experience, and produce a reference doc for a lowkey, clean, product-focused Rolefinders landing page.
todos: []
isProject: false
---

# Landing Page Research and Documentation Plan

## Objective

Research modern tech company landing pages using browser-based exploration, document their structure and experience, and produce a reference document that guides Rolefinders toward a **lowkey, clean, simple, magnifique** landing page — product-focused and science-based, with word-of-mouth over flashy marketing.

## Context

- **Current landing page**: Generic hero → features → how it works → pricing → testimonials → CTA structure. Feels like "vibe coded" AI slop.
- **Dashboard pages**: Already good; no changes needed beyond Rolefinders name.
- **Brand direction**: Lowkey, word-of-mouth, quality product, science-based approach. Clean and simple over stylish.

## Target Sites (Browser Research)


| Site             | URL                 | Why                                                     |
| ---------------- | ------------------- | ------------------------------------------------------- |
| Basecamp         | basecamp.com        | Minimalist, calm, opinionated; product over marketing   |
| Cal.com          | cal.com             | Open source, minimal, clean; developer/creator audience |
| Stripe           | stripe.com          | Clean, data-driven, credible; trust through substance   |
| Linear           | linear.app          | Product-focused, minimal; "built for purpose"           |
| Vercel           | vercel.com          | Developer-focused, minimal; technical credibility       |
| Plain            | plain.com           | Very minimal, understated; support-focused              |
| Charm Industrial | charmindustrial.com | Clean tech, science-focused; process over polish        |


## Phase 1: Parallel Discovery (Browser Subagents)

Launch **3–4 subagents** in parallel, each using **cursor-ide-browser** MCP to visit and analyze 2 sites:

**Batch A:**

- **Subagent 1**: Basecamp + Cal.com — structure, hero, sections, what feels lowkey vs flashy
- **Subagent 2**: Stripe + Linear — layout, typography, how they establish credibility
- **Subagent 3**: Vercel + Plain — minimalism, developer/product focus, CTA placement
- **Subagent 4**: Charm Industrial (or alternate) — science-based, process-focused, understated

**Per-subagent instructions:**

1. Use `browser_navigate` to visit each site
2. Use `browser_snapshot` to capture structure
3. Scroll through sections; note layout, hierarchy, section count
4. Document: hero structure, section order, what makes it feel "clean" or "lowkey", what to avoid

**Return format (per subagent):**

```json
{
  "sites": [
    {
      "site": "Basecamp",
      "url": "https://basecamp.com",
      "hero": "description, headline style, CTA",
      "sections": ["list of section types in order"],
      "lowkey_elements": ["what makes it feel understated"],
      "avoid": ["what to avoid for Rolefinders"]
    }
  ]
}
```

## Phase 2: Synthesize

Single subagent (or parent) synthesizes all findings into a structured document:

**Output:** [roler_ui/docs/research/landing-page-inspiration.md](roler_ui/docs/research/landing-page-inspiration.md)

**Structure:**

1. **Executive summary** — Lowkey, clean, product-focused landing page principles
2. **Site-by-site notes** — Condensed findings from each site
3. **Patterns to adopt** — Section count, hero style, typography, whitespace
4. **Patterns to avoid** — Generic SaaS grid, testimonial cards, "Powerful Features"
5. **Rolefinders-specific recommendations** — Aligned with product + science-based + word-of-mouth

## Phase 3: Implementation (Deferred)

Once the research doc exists, a follow-up plan or task can apply the findings to redesign the landing page structure. This plan covers only research and documentation.

## Deliverables


| Deliverable       | Location                                             |
| ----------------- | ---------------------------------------------------- |
| Research doc      | `roler_ui/docs/research/landing-page-inspiration.md` |
| Subagent findings | Raw JSON or structured notes from each subagent      |


## Invariants

- Use **cursor-ide-browser** MCP for subagents (browser mode)
- Subagents: `generalPurpose` or `ui-frontend-verifier` with browser instructions
- No edits to landing page code in this plan — research only
- Batching: ≤4 subagents per batch
