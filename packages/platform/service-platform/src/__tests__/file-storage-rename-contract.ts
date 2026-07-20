import { expect, it } from 'vitest';

type RenameProvider = {
  createFile(wsPath: string, file: File): Promise<void>;
  readFile(wsPath: string): Promise<File | undefined>;
  renameFile(wsPath: string, options: { newWsPath: string }): Promise<void>;
};

export function testCrossWorkspaceRenameContract(
  setup: () => Promise<{
    service: RenameProvider;
    onChange: { mockClear(): void };
  }>,
): void {
  it('provider contract: rejects cross-workspace renames without changing storage', async () => {
    const { service, onChange } = await setup();
    const source = 'myWorkspace:a.md';
    const destination = 'otherWorkspace:b.md';

    await service.createFile(source, new File(['source'], 'a.md'));
    onChange.mockClear();

    await expect(
      service.renameFile(source, { newWsPath: destination }),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        name: 'error::file:invalid-operation',
        payload: {
          operation: 'rename',
          oldWsPath: source,
          newWsPath: destination,
        },
      }),
    });

    expect(await (await service.readFile(source))?.text()).toBe('source');
    expect(await service.readFile(destination)).toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });
}
