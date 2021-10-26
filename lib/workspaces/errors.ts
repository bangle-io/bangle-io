import { BaseError } from '@bangle.io/utils';

export class WorkspaceError extends BaseError {}

export const WORKSPACE_NOT_FOUND_ERROR = 'WORKSPACE_NOT_FOUND_ERROR';
export const WORKSPACE_ALREADY_EXISTS_ERROR = 'WORKSPACE_ALREADY_EXISTS_ERROR';
