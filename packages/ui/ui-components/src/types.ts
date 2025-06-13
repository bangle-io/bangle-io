import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from './button';

// Extract the variant prop from Button but only include the subset we commonly use
type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];

// Define the common action variant type as a subset of Button variants
export type ActionVariant = Extract<
  ButtonVariant,
  'default' | 'outline' | 'ghost'
>;

export interface Action<T = void> {
  id: string;
  label: string;
  onClick: (payload: T) => void;
  Icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
}
