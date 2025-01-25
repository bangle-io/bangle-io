export interface ValidationError {
  reason: string;
  invalidPath: string;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; validationError: ValidationError };

export function validateWsName(wsName: string): ValidationResult<string> {
  if (!wsName) {
    return {
      ok: false,
      validationError: {
        reason: 'Invalid wsPath: Workspace name cannot be empty',
        invalidPath: wsName,
      },
    };
  }

  if (wsName === '.') {
    return {
      ok: false,
      validationError: {
        reason: 'Invalid wsPath: Workspace name cannot be "."',
        invalidPath: wsName,
      },
    };
  }

  if (wsName.includes(':')) {
    return {
      ok: false,
      validationError: {
        reason: 'Workspace name contains invalid character ":"',
        invalidPath: wsName,
      },
    };
  }

  return { ok: true, data: wsName };
}

export function validatePath(filePath: string): ValidationResult<string> {
  if (filePath.startsWith('/')) {
    return {
      ok: false,
      validationError: {
        reason:
          'Invalid wsPath: File path cannot start with a forward slash (/)',
        invalidPath: filePath,
      },
    };
  }
  if (filePath.includes('//')) {
    return {
      ok: false,
      validationError: {
        reason:
          'Invalid wsPath: Contains consecutive forward slashes (//) which is not allowed',
        invalidPath: filePath,
      },
    };
  }

  if (filePath.endsWith('.')) {
    return {
      ok: false,
      validationError: {
        reason: 'Invalid wsPath: Path cannot end with a dot (.)',
        invalidPath: filePath,
      },
    };
  }

  // Validate path segments
  const segments = filePath.split('/');
  for (const segment of segments) {
    if (segment === '.' || segment === '..') {
      return {
        ok: false,
        validationError: {
          reason: 'Invalid wsPath: Path segments cannot be "." or ".."',
          invalidPath: filePath,
        },
      };
    }
  }

  return { ok: true, data: filePath };
}

export function validateWsPath(raw: string): ValidationResult<{
  wsName: string;
  filePath: string;
}> {
  if (!raw) {
    return {
      ok: false,
      validationError: {
        reason: 'Invalid wsPath: Expected a non-empty string',
        invalidPath: String(raw),
      },
    };
  }

  const colonPos = raw.indexOf(':');
  if (colonPos < 0) {
    return {
      ok: false,
      validationError: {
        reason:
          'Invalid wsPath: Missing required ":" separator between workspace name and path',
        invalidPath: raw,
      },
    };
  }

  const wsName = raw.substring(0, colonPos);
  const filePath = raw.substring(colonPos + 1);

  const wsNameResult = validateWsName(wsName);
  if (!wsNameResult.ok) {
    return wsNameResult;
  }

  const pathResult = validatePath(filePath);
  if (!pathResult.ok) {
    return pathResult;
  }

  return { ok: true, data: { wsName, filePath } };
}
