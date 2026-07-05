// Shared motion styling for centered modal surfaces (Dialog, AlertDialog).
// Base UI drives enter/exit with the `data-starting-style` / `data-ending-style`
// presence attributes on the popup and backdrop, so animation is expressed as a
// CSS transition between those states rather than Radix `data-[state]` keyframes.

export const modalOverlayClassName =
  'fixed inset-0 z-50 bg-black/80 transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0';

export const centeredModalContentClassName =
  'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg transition-all duration-200 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 sm:rounded-lg';
