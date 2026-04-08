# Harbor

Harbor is a local-first desktop agent platform for internal team use.

The root npm workspace currently manages only the desktop app in `apps/desktop`.
External service code under `services/` is not part of the root workspace.

## Current Implementation Snapshot

The current runnable client is a desktop MVP under `apps/desktop` built with:

- Electron: desktop shell, native window, system dialogs
- React: renderer UI
- TypeScript: application code for both renderer and Electron entrypoints
- Vite: renderer dev server and production bundling
- Plain CSS + `lucide-react`: current UI styling and icons

At the moment the desktop app supports:

- Local conversation shell
- Simulated send / receive flow
- Local workspace folder selection
- A Codex-inspired dark desktop layout

It does not yet connect to a real backend agent runtime.

## Repository Structure

```text
docs/          Product, architecture, and roadmap documents
apps/          User-facing applications
services/      External or standalone backend services
packages/      Shared packages
scripts/       Local helper scripts such as packaging entrypoints
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

## Where To Start

If you want to understand the current desktop implementation, read these files in order:

1. `apps/desktop/README.md`
2. `apps/desktop/electron/main.ts`
3. `apps/desktop/electron/preload.ts`
4. `apps/desktop/src/App.tsx`
5. `apps/desktop/src/index.css`
