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
import React, { useState, useCallback, memo, useMemo } from 'react';

import { type TreeItem, cn } from '@bangle.io/ui-utils';
import { isRootLevelFile } from '@bangle.io/ws-path';
import { isValidNoteWsPath } from '@bangle.io/ws-path/src/helpers';
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
  SidebarMenu,
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
}

const TreeNode = function TreeNode({
  item,
  activeWsPaths,
  onTreeItemClick,
  onTreeItemRename,
  onTreeItemDelete,
  onTreeItemMove,
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

  const isDroppableDisabled = !isRootLevelFile(item.wsPath) && !item.isDir;
  // Droppable for directories only
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

  if (!item.isDir) {
    return (
      <SidebarMenuItem
        ref={
          // we allow dropping on root level files
          isDroppableDisabled ? undefined : dropRef
        }
        className={cn(
          isActive && 'select-none bg-sidebar-accent',
          'relative',
          isDragging && 'opacity-50',
        )}
        style={{ contentVisibility: 'auto' }}
      >
        <SidebarMenuButton
          className="data-[active=true]:bg-transparent"
          onClick={handleClick}
          isActive={item.isOpen}
          size="sm"
          ref={dragRef}
          {...attributes}
          {...listeners}
        >
          <FileIcon className={cn(isActive ? 'text-accent' : 'text-inherit')} />
          <span className={cn('select-none', isActive ? 'font-semibold' : '')}>
            {item.name}
          </span>
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
          'rounded bg-sidebar-accent/50 outline outline-accent drop-shadow-lg',
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
                activeWsPaths={activeWsPaths}
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
  onFileDrop: (
    sourceItem: TreeItem,
    destinationItem: { isRoot: true } | TreeItem,
  ) => void;
}

export function Tree({
  rootItem,
  activeWsPaths,
  onTreeItemClick,
  onTreeItemDelete,
  onTreeItemRename,
  onTreeItemMove,
  onFileDrop,
}: TreeProps) {
  const [activeDragItem, setActiveDragItem] = useState<TreeItem | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const sourceItem = event.active.data.current?.item as TreeItem | undefined;
    if (sourceItem) {
      setActiveDragItem(sourceItem);
    }
  }, []);

  // const { setNodeRef: setRootRef, isOver: isRootOver } = useDroppable({
  //   id: 'root-drop',
  //   data: { isRoot: true },
  // });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!active) {
        setActiveDragItem(null);
        return;
      }

      const sourceItem = active.data.current?.item as TreeItem | undefined;
      if (!sourceItem || !over) {
        setActiveDragItem(null);
        return;
      }

      const destinationItem =
        over.id === 'root-drop'
          ? null
          : (over.data.current?.item as TreeItem | null);

      // Updated logic here
      if (
        destinationItem === null ||
        (destinationItem &&
          !destinationItem.isDir &&
          isRootLevelFile(destinationItem.wsPath))
      ) {
        // Treat root-level files like root
        onFileDrop?.(sourceItem, { isRoot: true });
      } else if (destinationItem?.isDir) {
        onFileDrop?.(sourceItem, destinationItem);
      }

      setActiveDragItem(null);
    },
    [onFileDrop],
  );

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
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
      {rootItem.map((item) => (
        <TreeNode
          key={item.id}
          item={item}
          activeWsPaths={activeWsPaths}
          onTreeItemClick={onTreeItemClick}
          onTreeItemDelete={onTreeItemDelete}
          onTreeItemRename={onTreeItemRename}
          onTreeItemMove={onTreeItemMove}
        />
      ))}

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
