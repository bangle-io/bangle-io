import { fileWsPathsToFlatDirTree } from '../file-ws-paths-to-flat-dir-tree';
import { flatPathsToTree as oldPathToTree } from '../FileBrowser';
import { resolvePath } from 'workspace';

function understandOldFunc(data) {
  const obj = oldPathToTree(data);

  const res = {
    name: '$starter',
    id: '$starter',
    children: obj,
  };
  const recurse = (obj) => {
    if (obj.children) {
      const childResult = obj.children
        .sort((a, b) => {
          if (a.children && b.children) {
            return a.name.localeCompare(b.name);
          }
          if (a.children) {
            return -1;
          }
          if (b.children) {
            return 1;
          }
          return a.name.localeCompare(b.name);
        })
        .flatMap((i) => recurse(i));
      return [obj.id, ...childResult];
    }
    return [obj.path];
  };

  return recurse(res)
    .filter((r) => r !== '$starter')
    .map((r) => resolvePath(r).filePath);
}

test('sample data', () => {
  const data = [
    'idly:archive/idly/src/utils/NOTES.md',
    'idly:packages/idly-common/README.md',
    'idly:packages/idly-faster-osm-parser/README.md',
    'idly:packages/idly-gl/CHANGELOGs.md',
    'idly:packages/idly-osm-to-geojson/README.md',
    'idly:packages/idly-worker/src/bugs.md',
    'idly:packages/idly-worker/bugs.md',
    'idly:README.md',
  ];
  expect(fileWsPathsToFlatDirTree(data)).toEqual(understandOldFunc(data));
  expect(fileWsPathsToFlatDirTree(data)).toMatchSnapshot();
});
test('sample data 2', () => {
  const data = [
    'yxxsg:-jojo-manskey.md',
    'yxxsg:].md',
    'yxxsg:][[s.md',
    'yxxsg:]sdsds.md',
    'yxxsg:Asana Doc.md',
    'yxxsg:babaji.md',
    'yxxsg:brother is here.md',
    'yxxsg:dad.md',
    'yxxsg:daddy.md',
    'yxxsg:do you remember what you said about everybody.md',
    'yxxsg:good.md',
    'yxxsg:hello_world7.md',
    'yxxsg:jojo/kajrare.md',
    'yxxsg:jojo/mankey.md',
    'yxxsg:jojo/manskey.md.md',
    'yxxsg:jojo/test scroll.md',
    'yxxsg:jojo/wiki-link.md',
    'yxxsg:kajrare.md',
    'yxxsg:Life .md',
    'yxxsg:magic___ sdsdsd.md',
    'yxxsg:magic.md',
    'yxxsg:micheal/daddy/loves/kajrare.md',
    'yxxsg:micheal/daddy/mankey.md',
    'yxxsg:note1.md',
    'yxxsg:pap.md',
    'yxxsg:paplu.md',
    'yxxsg:s.md',
    'yxxsg:sdsd[][.md',
    'yxxsg:test .md',
    'yxxsg:test scroll.md',
    'yxxsg:test.md',
    'yxxsg:Users/kushanjoshi/code/test/yxxsg/jojo/test%20scroll.md.md',
    'yxxsg:wiki link.md',
    'yxxsg:wiki-link.md',
    'yxxsg:wow.md',
  ];
  expect(fileWsPathsToFlatDirTree(data)).toMatchSnapshot();
  expect(fileWsPathsToFlatDirTree(data)).toEqual(understandOldFunc(data));
});

test('sample data 3', async () => {
  const data = require('./fixture-file-wspaths-1.json');

  expect(fileWsPathsToFlatDirTree(data)).toEqual(understandOldFunc(data));
  expect(fileWsPathsToFlatDirTree(data)).toMatchSnapshot();
});

test('sample data 4', async () => {
  const data = require('./fixture-file-wspaths-2.json');

  expect(fileWsPathsToFlatDirTree(data)).toEqual(understandOldFunc(data));
  expect(fileWsPathsToFlatDirTree(data)).toMatchSnapshot();
});

test('sample data 5', async () => {
  const data = require('./fixture-file-wspaths-3.json');

  expect(fileWsPathsToFlatDirTree(data)).toEqual(understandOldFunc(data));
  expect(fileWsPathsToFlatDirTree(data)).toMatchSnapshot();
});

test('sample data 6', async () => {
  const data = require('./fixture-file-wspaths-4.json');
  expect(fileWsPathsToFlatDirTree(data)).toEqual(understandOldFunc(data));
  expect(fileWsPathsToFlatDirTree(data)).toMatchSnapshot();
});
