export type WorkspaceAttachmentMode = 'relative' | 'root';

export type WorkspaceAttachmentConfig = {
  mode: WorkspaceAttachmentMode;
  directory: string;
  fileNamePrefix: string;
};

export type WorkspaceMetadata = Record<string, unknown> & {
  rootDirHandle?: FileSystemDirectoryHandle;
  attachments?: Partial<WorkspaceAttachmentConfig>;
};

export type WorkspaceInfo = {
  name: string;
  type: string;
  deleted?: boolean;
  lastModified: number;
  metadata: WorkspaceMetadata;
};

export type WorkspaceDatabaseQueryOptions = {
  type?: WorkspaceInfo['type'];
  allowDeleted?: boolean;
};
