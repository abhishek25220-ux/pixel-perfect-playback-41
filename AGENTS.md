<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- What-if scenarios (src/lib/rail/scenario.ts) only filter and re-rank the optimizer's existing candidates via `weightedScores`/`checkRoute`; budget and deadline are hard filters, the cost/time weight only orders — so simulated picks never diverge from the core cost model or invent routes.
- Emissions (src/lib/rail/emissions.ts) are derived only from an existing route's distance × shipment tonnes × one configurable factor in `EMISSIONS_CONFIG`; the results page, print view and CSV all read `compareEmissions` and its shared rounding helpers — so the three outputs can never disagree and no emissions data is invented per route.
