import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { ChevronRight, FileIcon, Folder, MoreHorizontal } from 'lucide-react';
import React, { useState, useCallback, useMemo } from 'react';

import { type TreeItem, cn } from '@bangle.io/ui-utils';
import { WsPath } from '@bangle.io/ws-path';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from './sidebar';

interface TreeNodeProps {
  item: TreeItem;
  activeWsPaths: string[];
  onTreeItemClick: (item: TreeItem) => void;
  onTreeItemRename: (item: TreeItem) => void;
  onTreeItemDelete: (item: TreeItem) => void;
  onTreeItemMove: (item: TreeItem) => void;
  onTreeItemCreateNote: (item: TreeItem) => void;
  wsPathToHref?: (wsPath: string) => string;
}

const TreeNode = function TreeNode({
  item,
  activeWsPaths,
  onTreeItemClick,
  onTreeItemRename,
  onTreeItemDelete,
  onTreeItemMove,
  onTreeItemCreateNote,
  wsPathToHref,
}: TreeNodeProps) {
  const isActive = activeWsPaths.includes(item.wsPath);

  // Draggable for files only
  const {
    attributes,
    listeners,
    setNodeRef: dragRef,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: { item },
    disabled: item.isDir,
  });

  const isDroppableDisabled =
    !WsPath.fromString(item.wsPath).getParent()?.isRoot && !item.isDir;
  // Droppable for directories or root-level files
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop-${item.id}`,
    data: { item },
    disabled: isDroppableDisabled,
  });

  const handleClick = useCallback(
    () => onTreeItemClick(item),
    [onTreeItemClick, item],
  );
  const handleRename = useCallback(
    () => onTreeItemRename(item),
    [onTreeItemRename, item],
  );
  const handleDelete = useCallback(
    () => onTreeItemDelete(item),
    [onTreeItemDelete, item],
  );
  const handleMove = useCallback(
    () => onTreeItemMove(item),
    [onTreeItemMove, item],
  );
  const handleCreateNote = useCallback(
    () => onTreeItemCreateNote(item),
    [onTreeItemCreateNote, item],
  );

  if (!item.isDir) {
    // File node
    return (
      <SidebarMenuItem
        ref={
          // we allow dropping on root level files, so they need a dropRef
          isDroppableDisabled ? undefined : dropRef
        }
        className={cn(
          'relative',
          isDragging && 'opacity-50',
          // Apply drop indicator style also to root files when hovered over
          isOver &&
            !isDroppableDisabled &&
            'rounded bg-sidebar-accent/50 outline outline-accent drop-shadow-xl',
        )}
        style={{ contentVisibility: 'auto' }}
      >
        <SidebarMenuButton
          onClick={handleClick}
          isActive={isActive}
          size="sm"
          ref={dragRef}
          {...attributes}
          {...listeners}
          asChild={!!wsPathToHref && !item.isDir}
        >
          {wsPathToHref && !item.isDir ? (
            <a
              href={wsPathToHref(item.wsPath)}
              className="flex w-full items-center gap-2"
            >
              <FileIcon />
              <span
                className={cn('select-none', isActive ? 'font-semibold' : '')}
              >
                {item.name}
              </span>
            </a>
          ) : (
            <>
              <FileIcon />
              <span
                className={cn('select-none', isActive ? 'font-semibold' : '')}
              >
                {item.name}
              </span>
            </>
          )}
        </SidebarMenuButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onClick={handleRename}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete}>Delete</DropdownMenuItem>
            <DropdownMenuItem onClick={handleMove}>Move</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  // Directory node
  const children = item.children || [];
  return (
    <SidebarMenuItem
      ref={dropRef}
      className={cn(
        isOver &&
          'rounded bg-sidebar-accent/50 outline outline-accent drop-shadow-xl',
      )}
    >
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={item.isOpen ?? false}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton size="sm" onClick={handleClick}>
            <ChevronRight className="transition-transform" />
            <Folder />
            <span className="select-none">{item.name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>

        {/* Add dropdown menu for directories */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onClick={handleCreateNote}>
              Create Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((subItem) => (
              <TreeNode
                key={subItem.id}
                item={subItem}
                onTreeItemClick={onTreeItemClick}
                onTreeItemDelete={onTreeItemDelete}
                onTreeItemRename={onTreeItemRename}
                onTreeItemMove={onTreeItemMove}
                onTreeItemCreateNote={onTreeItemCreateNote}
                activeWsPaths={activeWsPaths}
                wsPathToHref={wsPathToHref}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
};

export interface TreeProps {
  rootItem: TreeItem[];
  activeWsPaths: string[];
  onTreeItemClick: (item: TreeItem) => void;
  onTreeItemDelete: (item: TreeItem) => void;
  onTreeItemRename: (item: TreeItem) => void;
  onTreeItemMove: (item: TreeItem) => void;
  onTreeItemCreateNote: (item: TreeItem) => void;
  onFileDrop: (
    sourceItem: TreeItem,
    destinationItem: { isRoot: true } | TreeItem,
  ) => void;
  wsPathToHref?: (wsPath: string) => string;
}

export function Tree({
  rootItem,
  activeWsPaths,
  onTreeItemClick,
  onTreeItemDelete,
  onTreeItemRename,
  onTreeItemMove,
  onTreeItemCreateNote,
  onFileDrop,
  wsPathToHref,
}: TreeProps) {
  const [activeDragItem, setActiveDragItem] = useState<TreeItem | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const sourceItem = event.active.data.current?.item as TreeItem | undefined;
    if (sourceItem) {
      setActiveDragItem(sourceItem);
    }
  }, []);

  // Note: No explicit root drop zone needed currently.
  // Dropping outside any valid droppable (or onto a root-level file)
  // is handled in handleDragEnd by checking `over` and `destinationItem`.
  // const { setNodeRef: setRootRef, isOver: isRootOver } = useDroppable({
  //   id: 'root-drop',
  //   data: { isRoot: true },
  // });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragItem(null); // Reset drag item regardless of outcome

      if (!active) {
        return;
      }

      const sourceItem = active.data.current?.item as TreeItem | undefined;
      // If no source item, or dropped outside any droppable area (`over` is null)
      if (!sourceItem) {
        return;
      }

      // Case 1: Dropped outside any registered droppable area
      if (!over) {
        // Treat dropping outside as dropping to the root
        onFileDrop?.(sourceItem, { isRoot: true });
        return;
      }

      // Retrieve destination item from droppable data
      const destinationItem = over.data.current?.item as TreeItem | null;

      // Case 2: Dropped onto a registered droppable area, but it has no item data (should not happen with current setup)
      if (!destinationItem) {
        // This case might indicate an issue or an unexpected droppable target.
        // Optionally, treat as root drop or log an error.
        // For now, let's treat it as a root drop for robustness.
        onFileDrop?.(sourceItem, { isRoot: true });
        return;
      }

      // Case 3: Dropped onto a root-level file (which acts as a root drop target)
      const destWsPath = WsPath.fromString(destinationItem.wsPath);
      if (!destinationItem.isDir && destWsPath.getParent()?.isRoot) {
        onFileDrop?.(sourceItem, { isRoot: true });
        return;
      }

      // Case 4: Dropped onto a directory
      if (destinationItem.isDir) {
        // Prevent dropping an item onto itself or its current parent directory (no-op)
        if (sourceItem.id === destinationItem.id) {
          return;
        }
        const sourceParentPath = WsPath.fromString(sourceItem.wsPath)
          .getParent()
          ?.toString();
        const destPath = destinationItem.wsPath;
        if (sourceParentPath === destPath) {
          return;
        }

        onFileDrop?.(sourceItem, destinationItem);
        return;
      }

      // If none of the above, it's likely an invalid drop target (e.g., non-root file)
      // No action needed.
    },
    [onFileDrop],
  );

  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by X pixels before starting a drag
    activationConstraint: {
      distance: 8,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    // Delay drag start by 700ms on touch devices, allow 15px tolerance
    activationConstraint: {
      delay: 700,
      tolerance: 15,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={useMemo(() => [restrictToVerticalAxis], [])}
      sensors={sensors}
    >
      {/* Potential future location for an explicit root drop zone wrapper if needed */}
      {/* <div ref={setRootRef} className={cn(isRootOver && 'bg-blue-100')}> */}
      {rootItem.map((item) => (
        <TreeNode
          key={item.id}
          item={item}
          activeWsPaths={activeWsPaths}
          onTreeItemClick={onTreeItemClick}
          onTreeItemDelete={onTreeItemDelete}
          onTreeItemRename={onTreeItemRename}
          onTreeItemMove={onTreeItemMove}
          onTreeItemCreateNote={onTreeItemCreateNote}
          wsPathToHref={wsPathToHref}
        />
      ))}
      {/* </div> */}

      <DragOverlay>
        {activeDragItem ? (
          <SidebarMenuItem className="opacity-80">
            <SidebarMenuButton size="sm">
              {activeDragItem.isDir ? <Folder /> : <FileIcon />}
              {activeDragItem.name}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
