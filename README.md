# SkillOps

SkillOps is a local-first desktop agent platform for internal team use.

The root npm workspace currently manages only the desktop app in `apps/desktop`.
External service code under `services/` is not part of the root workspace.

## Repository Structure

```text
docs/          Product, architecture, and roadmap documents
apps/          User-facing applications
services/      External or standalone backend services
packages/      Shared packages
infra/         Infrastructure config and scripts
storage/       Local development storage
```

## Current Focus

The current implementation focus is the desktop client MVP.

## Current MVP Direction

The first milestone is a desktop client based on Electron + React.

- Desktop-first chat experience
- Local workspace selection on the user machine
- Message send / receive flow
- Later integration with API Server, Agent Runtime, and local model services

The repository is currently prioritizing the client shell and the core chat flow before backend integration.
