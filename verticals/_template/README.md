# Template: adding a new vertical

1. Copy this whole `_template/` folder to `verticals/<new-vertical-name>/`.
2. Delete this README from the copy.
3. Use `constitution/_EXAMPLE.md` as the frontmatter/structure pattern for every
   guardrail file you write, in whichever of `constitution/`, `development/`, `review/`
   fits when an agent needs it (see `../medical-devices/` for a worked example across
   all three phases).
4. Fill in `INDEX.md` with one line per guardrail.
5. Add one row per guardrail to `../../registry/guardrail-index.yaml`.
6. Add any edges to other guardrails (same vertical or cross-cutting) to
   `../../registry/relationships.yaml`.
7. Get the content reviewed and signed off per `../../governance/CONTENT-OWNERS.md`
   before any guardrail is treated as `binding` in production use.
