import type { Logger } from '@bangle.io/logger';
import type { RootEmitter, RootEvents } from '@bangle.io/root-emitter';

export interface AppBuildIdentity {
  id: string;
  builtAt: string;
}

interface AppBuildGuardOptions {
  rootEmitter: RootEmitter;
  appBuild: AppBuildIdentity;
  tabId: string;
  logger: Logger;
  abortSignal: AbortSignal;
}

type AppBuildPresence = Extract<
  RootEvents,
  { event: 'event::app:build-presence' }
>['payload'];

export function setupAppBuildGuard(options: AppBuildGuardOptions) {
  const { rootEmitter, appBuild, tabId, logger, abortSignal } = options;
  const builtAt = Date.parse(appBuild.builtAt);
  if (!Number.isFinite(builtAt)) {
    throw new Error(`Invalid app build time: ${appBuild.builtAt}`);
  }

  const announce = (reply: boolean) => {
    rootEmitter.emit('event::app:build-presence', {
      protocol: 1,
      buildId: appBuild.id,
      builtAt,
      reply,
      sender: { id: tabId, tag: 'app-build-guard' },
    });
  };

  let started = false;
  let stale = false;
  rootEmitter.on(
    'event::app:build-presence',
    (presence) => {
      if (
        !started ||
        !isBuildPresence(presence) ||
        presence.sender.id === tabId
      ) {
        return;
      }

      // Reply once to a hello so a tab opened later can discover builds that
      // were already running. Replies never receive another reply.
      if (!presence.reply) {
        announce(true);
      }

      if (
        !stale &&
        presence.buildId !== appBuild.id &&
        compareBuilds({ id: appBuild.id, builtAt }, presence) < 0
      ) {
        stale = true;
        logger.warn('A newer app build is open in another tab', {
          localBuildId: appBuild.id,
          remoteBuildId: presence.buildId,
        });
        rootEmitter.emit('event::app:stale-tab', {
          sender: { id: tabId, tag: 'app-build-guard' },
        });
      }
    },
    abortSignal,
  );

  return {
    start() {
      if (started || abortSignal.aborted) {
        return;
      }
      started = true;
      announce(false);
    },
  };
}

function isBuildPresence(value: unknown): value is AppBuildPresence {
  return (
    typeof value === 'object' &&
    value !== null &&
    'protocol' in value &&
    value.protocol === 1 &&
    'buildId' in value &&
    typeof value.buildId === 'string' &&
    value.buildId.length > 0 &&
    'builtAt' in value &&
    typeof value.builtAt === 'number' &&
    Number.isFinite(value.builtAt) &&
    'reply' in value &&
    typeof value.reply === 'boolean' &&
    'sender' in value &&
    typeof value.sender === 'object' &&
    value.sender !== null &&
    'id' in value.sender &&
    typeof value.sender.id === 'string'
  );
}

function compareBuilds(
  local: { id: string; builtAt: number },
  remote: { buildId: string; builtAt: number },
) {
  if (local.builtAt !== remote.builtAt) {
    return local.builtAt - remote.builtAt;
  }
  return local.id.localeCompare(remote.buildId);
}
