import {
  $tableMenu,
  type Command,
  type TableCellAlign,
  type TableMenuState,
} from '@bangle.io/prosemirror-plugins';
import { Button, DropdownMenu } from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import { ChevronDown, Table } from 'lucide-react';
import React from 'react';
import type { PmEditorService } from '../pm-editor-service';
import { useEditorCoreServices } from '../use-editor-core-services';
import { isTableActionAvailable, TABLE_ACTIONS } from './table-actions';
import {
  FLOATING_INITIAL_STYLE,
  useFloatingPosition,
} from './use-floating-position';

type EditorView = NonNullable<ReturnType<PmEditorService['getEditor']>>;
type Extensions = PmEditorService['extensions'];

/**
 * Floating controls for the table the cursor is in: add/delete rows and
 * columns, column alignment, and table deletion. The document mutations all
 * go through table extension commands.
 */
export function TableMenu({ editorName }: { editorName: string }) {
  const tableMenus = useAtomValue($tableMenu);
  const { editorEngine } = useEditorCoreServices();
  const editorView = editorEngine.getEditor(editorName);
  const tableMenu = editorView ? tableMenus.get(editorView) : undefined;

  if (!editorView || !tableMenu?.show) {
    return null;
  }

  return (
    <TableMenuContent
      anchorEl={tableMenu.anchorEl}
      editorView={editorView}
      ext={editorEngine.extensions}
      key={tableMenu.tablePos}
    />
  );
}

function TableMenuContent({
  anchorEl,
  editorView,
  ext,
}: {
  anchorEl: TableMenuState['anchorEl'];
  editorView: EditorView;
  ext: Extensions;
}) {
  const triggerRef = useFloatingPosition({
    show: true,
    anchorEl,
    boundaryElement: editorView.dom,
    placement: 'top-end',
  });

  const run = (command: Command) => {
    command(editorView.state, editorView.dispatch, editorView);
    editorView.focus();
  };

  const activeCell = ext.table.query.activeTableCell(editorView.state);
  const align: TableCellAlign | 'none' = activeCell?.align ?? 'none';

  return (
    <div ref={triggerRef} style={FLOATING_INITIAL_STYLE}>
      <DropdownMenu.DropdownMenu>
        <DropdownMenu.DropdownMenuTrigger
          render={
            <Button
              aria-label={t.app.editor.tableMenu.label}
              className="h-7 gap-1 border bg-popover px-2 text-muted-foreground shadow-xs hover:text-foreground"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Table className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          }
        />
        <DropdownMenu.DropdownMenuContent
          align="end"
          finalFocus={() => {
            editorView.focus();
            return false;
          }}
        >
          {TABLE_ACTIONS.filter((action) => action.section === 'insert').map(
            (action) => (
              <DropdownMenu.DropdownMenuItem
                key={action.id}
                disabled={
                  !isTableActionAvailable(action, ext, editorView.state)
                }
                onClick={() => run(action.command(ext))}
              >
                {action.title()}
              </DropdownMenu.DropdownMenuItem>
            ),
          )}
          <DropdownMenu.DropdownMenuSeparator />
          <DropdownMenu.DropdownMenuLabel>
            {t.app.editor.tableMenu.alignColumn}
          </DropdownMenu.DropdownMenuLabel>
          <DropdownMenu.DropdownMenuRadioGroup
            onValueChange={(value) => {
              run(
                ext.table.command.setColumnAlign(
                  value === 'left' || value === 'center' || value === 'right'
                    ? value
                    : null,
                ),
              );
            }}
            value={align}
          >
            <DropdownMenu.DropdownMenuRadioItem value="none">
              {t.app.editor.tableMenu.alignNone}
            </DropdownMenu.DropdownMenuRadioItem>
            <DropdownMenu.DropdownMenuRadioItem value="left">
              {t.app.editor.tableMenu.alignLeft}
            </DropdownMenu.DropdownMenuRadioItem>
            <DropdownMenu.DropdownMenuRadioItem value="center">
              {t.app.editor.tableMenu.alignCenter}
            </DropdownMenu.DropdownMenuRadioItem>
            <DropdownMenu.DropdownMenuRadioItem value="right">
              {t.app.editor.tableMenu.alignRight}
            </DropdownMenu.DropdownMenuRadioItem>
          </DropdownMenu.DropdownMenuRadioGroup>
          <DropdownMenu.DropdownMenuSeparator />
          {TABLE_ACTIONS.filter((action) => action.section === 'delete').map(
            (action) => (
              <DropdownMenu.DropdownMenuItem
                key={action.id}
                className={
                  action.destructive
                    ? 'text-destructive focus:text-destructive'
                    : undefined
                }
                disabled={
                  !isTableActionAvailable(action, ext, editorView.state)
                }
                onClick={() => run(action.command(ext))}
              >
                {action.title()}
              </DropdownMenu.DropdownMenuItem>
            ),
          )}
        </DropdownMenu.DropdownMenuContent>
      </DropdownMenu.DropdownMenu>
    </div>
  );
}
