## Summary

<!-- Brief description, 1-3 bullets -->

-

## Verification

- [ ] `npm run check` (typecheck + biome)
- [ ] `npm test` (unit tests)
- [ ] `npm pack --dry-run` (release sanity)
- [ ] `SANEPI_AGENT_TYPE=explore pi -e ./src/index.ts` smoke-tested locally, if behavior changed

## agent-system impact

- [ ] Agent file format changes are documented in README if changed
- [ ] Tool filtering behavior remains covered by tests
- [ ] CHANGELOG entry added for user-facing changes
