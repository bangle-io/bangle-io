# Service Authoring Guide

Bangle keeps service wiring explicit and small. Services should be easy to
inspect, easy to replace in tests, and difficult to accidentally couple across
workspace layers.

## Where Things Go

- Slot IDs live in the browser or test service map, not inside the service
  implementation. The production service map is in
  `packages/core/initialize-services/src/initialize-services.ts`.
- Contracts live at the lowest layer that owns the concept. Shared contracts
  belong in `packages/shared/types`; core service APIs belong in
  `packages/core/service-core`; platform implementations belong in
  `packages/platform/service-platform`.
- Implementations stay in their owning package and are exported through that
  package root. Consumers should import from package roots such as
  `@bangle.io/service-core` or `@bangle.io/service-platform`, not private
  `src` paths.
- Browser wiring belongs in `@bangle.io/initialize-services`. It chooses the
  browser implementations, supplies configs, instantiates the container, and
  exposes the typed app services to React.
- Test wiring belongs in `@bangle.io/test-utils`. It should mirror production
  wiring while replacing browser-only platform services with memory or fake
  implementations.

## Dependencies

Declare service-to-service dependencies with a static `deps` field:

```ts
export class NavigationService extends BaseService {
  static deps = ['router'] as const;

  constructor(
    context: BaseServiceContext,
    dependencies: { router: BaseRouterService },
  ) {
    super('NavigationService', context, dependencies);
  }
}
```

`static deps` is the constructor contract for services. The container uses it to
build the dependency graph, instantiate services in dependency order, and report
startup diagnostics. If a service reads another service, that relationship
should be visible in `static deps`; do not hide it in mutable module state,
late lookups, or callbacks passed only to work around the graph.

Services should not call the container. They receive their declared
dependencies and config through the constructor, then use their service context
for shared app facilities such as logging, abort handling, and the store. This
keeps the container in composition roots and keeps lower layers oblivious to who
uses them.

## Wiring

Production setup and test setup should stay structurally parallel:

- Use the same slot IDs for equivalent services.
- Configure services before `instantiateAll()`.
- Keep browser-specific choices in the production composition root.
- Keep memory, fake, or test-only replacements in `@bangle.io/test-utils`.
- Mount services through the returned setup helper rather than from individual
  service constructors.

When adding a service, update both the production service map and the test
service map unless the service is deliberately browser-only or test-only. A
test that creates the real container is usually better than mocking a service
that participates in lifecycle, persistence, routing, commands, or editor state.

## Guardrails

`pnpm custom-validation` is the place for lightweight service architecture
checks. It currently enforces the workspace dependency graph, service package
layer order, and service-specific import boundaries:

- Service consumers must not import private `@bangle.io/service-core/src/...`,
  `@bangle.io/service-platform/src/...`, or
  `@bangle.io/initialize-services/src/...` paths.
- `@bangle.io/poor-mans-di` is only imported by the DI package itself, the base
  service adapter, the browser composition root, and the test composition
  helper.

Broader checks should only be added when they catch real drift. For example,
checking every `static deps` relationship with text patterns would be fragile:
some platform services have no dependencies, and TypeScript plus the container
already fail missing declared dependencies at startup. Prefer a focused unit or
integration test when a dependency contract needs more precision.
