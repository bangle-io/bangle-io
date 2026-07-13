export type BlockHandleLabels = {
  /** Accessible name for the "+" add-block button. */
  addBlockLabel: string;
  /** Tooltip line explaining a plain click ("Click to add below"). */
  addBelowHint: string;
  /** Tooltip line explaining the modifier click ("Alt-click to add above"). */
  addAboveHint: string;
  /** Accessible name for the drag grip. */
  dragHandleLabel: string;
};

export const DEFAULT_BLOCK_HANDLE_LABELS: BlockHandleLabels = {
  addBlockLabel: 'Add block',
  addBelowHint: 'Click to add below',
  addAboveHint: 'Alt-click to add above',
  dragHandleLabel: 'Drag to move',
};

export type BlockHandleOrientation = 'horizontal' | 'vertical';

/** Pixel gap between the "+" button and the drag grip. */
export const BLOCK_HANDLE_BUTTON_GAP = 2;

const BUTTON_CLASSES = [
  'flex',
  'h-6',
  'w-5',
  'shrink-0',
  'items-center',
  'justify-center',
  'rounded-md',
  'duration-200',
  'ease-linear',
  'transition-[background-color,opacity]',
  'focus-visible:outline-hidden',
  'focus-visible:ring-2',
  'focus-visible:ring-ring',
  'text-foreground/70',
  'hover:bg-muted',
  'hover:text-muted-foreground',
  'active:bg-muted',
  'active:text-muted-foreground',
];

// Lucide GripVertical
const GRIP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>`;

// Lucide Plus
const PLUS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`;

function createHandleButton(iconSvg: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = BUTTON_CLASSES.join(' ');
  button.setAttribute('aria-label', label);

  const iconWrapper = document.createElement('div');
  iconWrapper.classList.add('flex', 'pointer-events-none', 'text-current');
  iconWrapper.innerHTML = iconSvg;
  button.appendChild(iconWrapper);

  return button;
}

function createTooltip(lines: string[]): HTMLElement {
  const tooltip = document.createElement('div');
  tooltip.className = [
    'pointer-events-none',
    'absolute',
    'top-full',
    'left-0',
    'z-50',
    'mt-1.5',
    'flex',
    'w-max',
    'flex-col',
    'rounded-md',
    'bg-primary',
    'px-2.5',
    'py-1.5',
    'text-primary-foreground',
    'text-xs',
    'opacity-0',
    'transition-opacity',
    'group-hover:opacity-100',
    'group-hover:delay-500',
  ].join(' ');
  for (const line of lines) {
    const row = document.createElement('span');
    row.textContent = line;
    tooltip.appendChild(row);
  }
  return tooltip;
}

export type BlockHandle = {
  wrapper: HTMLElement;
  plusButton: HTMLButtonElement;
  dragButton: HTMLButtonElement;
};

/**
 * Builds the hover block-handle cluster: a "+" add-block button followed by
 * the drag grip. The wrapper is positioned by the drag events plugin and can
 * be laid out horizontally (side by side) or vertically (+ on top) via
 * {@link setBlockHandleOrientation}.
 */
export function createBlockHandle(labels: BlockHandleLabels): BlockHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'fixed z-50 flex';
  wrapper.style.gap = `${BLOCK_HANDLE_BUTTON_GAP}px`;
  wrapper.dataset.blockHandle = '';

  const plusButton = createHandleButton(PLUS_ICON_SVG, labels.addBlockLabel);
  plusButton.classList.add('group', 'relative', 'cursor-pointer');
  plusButton.dataset.addBlockButton = '';
  plusButton.appendChild(
    createTooltip([labels.addBelowHint, labels.addAboveHint]),
  );

  const dragButton = createHandleButton(GRIP_ICON_SVG, labels.dragHandleLabel);
  dragButton.classList.add('cursor-grab', 'active:cursor-grabbing');

  wrapper.appendChild(plusButton);
  wrapper.appendChild(dragButton);

  return { wrapper, plusButton, dragButton };
}

export function setBlockHandleOrientation(
  wrapper: HTMLElement,
  orientation: BlockHandleOrientation,
) {
  wrapper.dataset.orientation = orientation;
  wrapper.classList.toggle('flex-col', orientation === 'vertical');
}
