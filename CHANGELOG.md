# Changelog

## [0.1.1] - 2026-05-11

### Changed

- Made the publish workflow skip npm publishing when `NODE_AUTH_TOKEN` is not configured while still running release validation.

## [0.1.0] - 2026-05-11

### Added

- Initial standalone `pi-agent-system` extension extracted from senpi-mono.
- Built-in `general` and `explore` profiles.
- Markdown agent loading from global and project `.pi` / `.senpi` config directories.
- Agent default permission loading from settings files.
- Unit tests for wildcard matching, agent validation, loading, registry merging, and extension behavior.
