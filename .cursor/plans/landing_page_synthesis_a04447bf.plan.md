---
name: Landing Page Synthesis
overview: Synthesize the 7-site browser research findings into a single reference document at roler_ui/docs/research/landing-page-inspiration.md, following the plan structure.
todos: []
isProject: false
---

# Phase 2: Synthesize Landing Page Research

## Inputs

All Phase 1 subagent outputs are available:


| Source     | Sites             | Location                                                                                                                                                                                      |
| ---------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Subagent 1 | Basecamp, Cal.com | [roler/docs/research/landing-page-discovery-basecamp-calcom.json](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler\docs\research\landing-page-discovery-basecamp-calcom.json) |
| Subagent 2 | Stripe, Linear    | [roler/docs/research/landing-page-stripe-linear-research.json](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler\docs\research\landing-page-stripe-linear-research.json)       |
| Subagent 3 | Vercel, Plain     | Inline JSON from subagent (no saved file)                                                                                                                                                     |
| Subagent 4 | Charm Industrial  | [roler/docs/research/charm-industrial-landing-research.json](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler\docs\research\charm-industrial-landing-research.json)           |


## Output

**File:** [roler_ui/docs/research/landing-page-inspiration.md](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\docs\research\landing-page-inspiration.md)

**Structure** (per plan):

1. **Executive summary** — Lowkey, clean, product-focused principles distilled from all 7 sites
2. **Site-by-site notes** — Condensed findings (hero, sections, lowkey elements, avoid) for each site
3. **Patterns to adopt** — Section count, hero style, typography, whitespace, credibility
4. **Patterns to avoid** — Generic SaaS grid, testimonial bloat, multi-audience nav, hype
5. **Rolefinders-specific recommendations** — Aligned with product + science-based + word-of-mouth

## Synthesis Content (from research)

### Executive summary (draft)

- **Hero**: Short headline (4–8 words), single primary CTA, product-in-hero when possible (Cal.com, Linear)
- **Credibility**: Modest stats, 2–3 strong testimonials, third-party validation over self-claims
- **Sections**: 6–8 focused sections; avoid 12+ feature blocks (Basecamp) or 6+ product tabs (Stripe)
- **Tone**: Matter-of-fact, benefit-first headings, no marketing jargon

### Patterns to adopt

- Product demo or focused screenshot in hero (Cal.com, Linear)
- 3-step "How it works" (Cal.com) — scannable, not narrative
- Process-first layout when science-based (Charm: 4-step flow)
- Live data or concrete numbers when credible (Charm counter; Stripe stats — but scaled down)
- Minimal nav: Log in, Sign up, one "Learn more" (Linear)
- Dual CTA for self-serve vs sales (Cal.com, Plain)
- Customer logos without "Trusted by X" bloat (Plain)
- Generous whitespace, muted palette, restrained typography

### Patterns to avoid

- Long-form narrative hero (Basecamp)
- Multi-audience nav / Solutions dropdown (Cal.com)
- Six product tabs (Stripe)
- 12+ feature blocks (Basecamp)
- Newsletter as primary CTA (Charm — job products need direct conversion)
- Heavy testimonial carousel; prefer 2–3 short quotes
- Dense footer with 10+ link groups (Vercel)

### Rolefinders-specific

- Single primary audience; no use-case fragmentation
- One clear hero CTA (Get Early Access / Sign up)
- 3–4 core feature blocks max
- Rotating quotes (already implemented) align with lowkey, varied messaging
- Process credibility: discovery → tailoring → application pipeline (science-based)
- Lean footer; avoid enterprise-scale stats

## Implementation

1. Create `roler_ui/docs/research/` if it does not exist
2. Write [landing-page-inspiration.md](c:\Users\harri\Documents\Coding Projects\business\roler_ai\roler_ui\docs\research\landing-page-inspiration.md) with the five sections above, populated from the JSON and inline subagent outputs
3. Mark Phase 2 todo completed
