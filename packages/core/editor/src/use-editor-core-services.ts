import { useCoreServices } from '@bangle.io/context';
import type { PmEditorService } from './pm-editor-service';

/**
 * Core services narrowed to this package's concrete `PmEditorService`. The
 * context package only knows the slim `EditorEngineContract`; code inside
 * this engine package should use this hook instead of repeating the generic
 * at every call site.
 */
export function useEditorCoreServices() {
  return useCoreServices<PmEditorService>();
}
