# Issue tracker: Local Markdown

Issues and plans for this repository live as Markdown files in `.scratch/`.

## Conventions

- One effort per directory: `.scratch/<effort>/`
- Wayfinder map: `.scratch/<effort>/map.md`
- Child tickets: `.scratch/<effort>/issues/<NN>-<slug>.md`
- Ticket type is recorded with `Type:`
- Ticket state is recorded with `Status:`
- Dependencies are recorded with `Blocked by:`
- Resolution answers are appended under `## Answer`
- The first open, unblocked, unclaimed ticket is the frontier

## Wayfinding operations

Claim a ticket by setting `Status: claimed` before work. Resolve it by adding its answer, setting `Status: resolved`, and linking a short decision gist from the map.
