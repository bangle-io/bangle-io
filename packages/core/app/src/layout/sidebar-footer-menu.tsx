import { KEYBOARD_SHORTCUTS } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import {
  bangleTransparentIconUrl,
  DropdownMenu,
  KbdShortcut,
  Sidebar,
} from '@bangle.io/ui-components';
import { useSetAtom } from 'jotai';
import {
  BugPlay,
  Command,
  ExternalLink,
  Folder,
  MessageCircle,
  PlusIcon,
  Search,
  Settings2,
} from 'lucide-react';
import React from 'react';

/**
 * The dropdown content for the sidebar footer: creation shortcuts, app
 * actions, and external links. Extracted from AppSidebar so the sidebar
 * component stays a thin composition layer.
 */
export function SidebarFooterMenu({
  canCreateFiles,
}: {
  canCreateFiles: boolean;
}) {
  const { commandDispatcher, workbenchState } = useCoreServices();
  const setOpenOmniSearch = useSetAtom(workbenchState.$openOmniSearch);

  return (
    <>
      <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
        {t.app.sidebar.newLabel}
      </DropdownMenu.DropdownMenuLabel>
      <DropdownMenu.DropdownMenuItem
        disabled={!canCreateFiles}
        onClick={() => {
          if (!canCreateFiles) {
            return;
          }
          commandDispatcher.dispatch(
            'command::ui:create-note-dialog',
            {
              prefillName: undefined,
            },
            'ui',
          );
        }}
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        <span>{t.app.common.newNote}</span>
      </DropdownMenu.DropdownMenuItem>
      <DropdownMenu.DropdownMenuItem
        onClick={() =>
          commandDispatcher.dispatch(
            'command::ui:create-workspace-dialog',
            null,
            'ui',
          )
        }
      >
        <Folder className="mr-2 h-4 w-4" />
        <span>{t.app.common.newWorkspace}</span>
      </DropdownMenu.DropdownMenuItem>

      <DropdownMenu.DropdownMenuSeparator />
      <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
        {t.app.sidebar.appActionsLabel}
      </DropdownMenu.DropdownMenuLabel>
      <DropdownMenu.DropdownMenuItem onClick={() => setOpenOmniSearch(true)}>
        <Search className="mr-2 h-4 w-4" />
        <span>{t.app.sidebar.omniSearch}</span>
        <KbdShortcut
          className="ml-auto"
          keys={KEYBOARD_SHORTCUTS.toggleOmniSearch.keys}
        />
      </DropdownMenu.DropdownMenuItem>
      <DropdownMenu.DropdownMenuItem
        onClick={() => workbenchState.goToCommandRoute()}
      >
        <Command className="mr-2 h-4 w-4" />
        <span>{t.app.sidebar.allCommands}</span>
      </DropdownMenu.DropdownMenuItem>
      <SettingsMenuItem
        onOpenSettings={() =>
          commandDispatcher.dispatch('command::ui:open-settings', null, 'ui')
        }
      />

      <DropdownMenu.DropdownMenuSeparator />
      <DropdownMenu.DropdownMenuLabel className="text-muted-foreground text-xs">
        {t.app.sidebar.linksLabel}
      </DropdownMenu.DropdownMenuLabel>
      <DropdownMenu.DropdownMenuItem
        onClick={() => window.open('https://bangle.io', '_blank')}
      >
        <img
          src={bangleTransparentIconUrl}
          alt={t.app.common.bangleLogoAlt}
          className="mr-2 h-4 w-4 grayscale"
        />
        <span>{t.app.sidebar.homepage}</span>
      </DropdownMenu.DropdownMenuItem>
      <DropdownMenu.DropdownMenuItem
        onClick={() =>
          window.open('https://github.com/bangle-io/bangle-io', '_blank')
        }
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        <span>{t.app.sidebar.githubProject}</span>
      </DropdownMenu.DropdownMenuItem>
      <DropdownMenu.DropdownMenuItem
        onClick={() =>
          window.open(
            'https://github.com/bangle-io/bangle-io/issues/new',
            '_blank',
          )
        }
      >
        <BugPlay className="mr-2 h-4 w-4" />
        <span>{t.app.sidebar.reportIssue}</span>
      </DropdownMenu.DropdownMenuItem>
      <DropdownMenu.DropdownMenuItem
        onClick={() => window.open('https://twitter.com/bangle_io', '_blank')}
      >
        <ExternalLink className="mr-2 h-4 w-4" />
        <span>{t.app.sidebar.twitter}</span>
      </DropdownMenu.DropdownMenuItem>
      <DropdownMenu.DropdownMenuItem
        onClick={() => window.open('https://discord.gg/GvvbWJrVQY', '_blank')}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        <span>{t.app.sidebar.discord}</span>
      </DropdownMenu.DropdownMenuItem>
    </>
  );
}

function SettingsMenuItem({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { isMobile, setOpenMobile } = Sidebar.useSidebar();

  return (
    <DropdownMenu.DropdownMenuItem
      onClick={() => {
        if (isMobile) {
          setOpenMobile(false);
        }
        onOpenSettings();
      }}
    >
      <Settings2 className="mr-2 h-4 w-4" />
      <span>{t.app.sidebar.settings}</span>
    </DropdownMenu.DropdownMenuItem>
  );
}
