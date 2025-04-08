import type { WorkspaceConfig, WorkspaceValidation } from './workspace-dialog';

export function validateWorkspaceConfig(
  config: Partial<WorkspaceConfig>,
): WorkspaceValidation {
  if (!config.type) {
    return {
      isValid: false,
      message: t.app.errors.workspaceValidation.typeRequired,
    };
  }

  if (config.type === 'browser' && !config.name) {
    return {
      isValid: false,
      message: t.app.errors.workspaceValidation.nameRequired,
    };
  }

  if (config.type === 'nativefs' && !config.dirHandle) {
    return {
      isValid: false,
      message: t.app.errors.workspaceValidation.dirRequired,
    };
  }

  // Add more validation rules as needed

  return { isValid: true };
}
