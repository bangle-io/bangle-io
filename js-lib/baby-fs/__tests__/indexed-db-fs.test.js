import { IndexedDBFileSystem } from '../indexed-db-fs';

const toFile = (str) => {
  var file = new File([str], 'foo.txt', { type: 'text/plain' });

  return file;
};

const serializeMap = (map) => {
  return Promise.all(
    [...map.entries()].map(async (r) => [r[0], await r[1]?.text()]),
  );
};

test('writeFile', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  await expect(
    (await fs.readFile('hola/hi'))?.text(),
  ).resolves.toMatchInlineSnapshot(`"my-data"`);

  expect(await fs.stat('hola/hi')).toEqual({
    mtimeMs: expect.any(Number),
  });
});

test('readFile', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  const data = await fs.readFileAsText('hola/hi');
  expect(data).toMatchInlineSnapshot(`"my-data"`);
});

test('stat', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  const data = await fs.stat('hola/hi');
  expect(data).toEqual({
    mtimeMs: expect.any(Number),
  });
});

test('stat throws error if file not found', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));

  await expect(
    fs.stat('hola/unknown'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"File "hola/unknown" not found"`,
  );
});

test('rename', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));
  await fs.rename('hola/hi', 'ebola/two');

  await expect(
    fs.readFile('hola/hi'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"File "hola/hi" not found"`);

  await expect(
    (await fs.readFile('ebola/two'))?.text(),
  ).resolves.toMatchInlineSnapshot(`"mydata"`);
});

test('rename throws error if old file not found', async () => {
  const fs = new IndexedDBFileSystem();

  await expect(
    fs.rename('hola/hi', 'ebola/two'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"File "hola/hi" not found"`);
});

test('rename throws error if new file already exists', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('mydata'));
  await fs.writeFile('ebola/two', toFile('mydata'));

  await expect(
    fs.rename('hola/hi', 'ebola/two'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Cannot rename; File "hola/hi" already exists"`,
  );
});

test('unlink', async () => {
  const fs = new IndexedDBFileSystem();
  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.unlink('hola/hi');
  await expect(
    fs.readFile('hola/hi'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"File "hola/hi" not found"`);
});

test('opendirRecursive root', async () => {
  const fs = new IndexedDBFileSystem();

  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.writeFile('hola/bye', toFile('my-data'));
  const result = await fs.opendirRecursive('hola');
  expect(result.sort()).toEqual(['hola/bye', 'hola/hi']);
});

test('opendirRecursive subdir', async () => {
  const fs = new IndexedDBFileSystem();

  await fs.writeFile('hola/hi', toFile('my-data'));
  await fs.writeFile('hola/bye', toFile('my-data'));
  await fs.writeFile('holamagic/bye', toFile('my-data'));
  await fs.writeFile('jango/bye', toFile('my-data'));
  let result = await fs.opendirRecursive('jango/');
  expect(result).toMatchInlineSnapshot(`
    [
      "jango/bye",
    ]
  `);

  result = await fs.opendirRecursive('hola');
  expect(result.sort()).toEqual(['hola/bye', 'hola/hi']);

  result = await fs.opendirRecursive('holamagic');
  expect(result).toMatchInlineSnapshot(`
    [
      "holamagic/bye",
    ]
  `);
});
