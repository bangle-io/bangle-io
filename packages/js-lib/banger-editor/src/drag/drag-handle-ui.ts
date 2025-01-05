export function createDragHandle(): HTMLElement {
  const dragHandle = document.createElement('button');
  dragHandle.type = 'button';

  dragHandle.className = [
    'bg-center',
    'bg-no-repeat',
    'cursor-grab',
    'duration-200',
    'ease-linear',
    'fixed',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-ring',
    'h-6',
    'items-center',
    'justify-center',
    'rounded-md',
    'flex',
    'transition-[background-color,opacity]',
    'w-5',
    'z-50',
    'text-foreground/70',
    'dark:text-foreground/70',
    'hover:bg-muted',
    'hover:text-muted-foreground',
    'dark:hover:bg-muted',
    'dark:hover:text-muted-foreground',
    'active:bg-muted',
    'active:cursor-grabbing',
    'active:text-muted-foreground',
  ].join(' ');
  // Create grip icons
  const iconWrapper = document.createElement('div');
  iconWrapper.classList.add('flex', 'pointer-events-none', 'text-current');

  // Using GripVertical icon from lucide-react
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>`;
  iconWrapper.innerHTML = iconSvg;

  dragHandle.appendChild(iconWrapper);

  return dragHandle;
}
