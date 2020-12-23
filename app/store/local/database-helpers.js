// // import { fileDb } from 'bangle-play/app/components/native-file-api/disk';
// import localforage from 'localforage';

// export const activeDatabaseInstance = localforage.createInstance({
//   name: activeDatabaseName,
// });

// // export const activeDatabaseInstance = fileDb;

// console.log('Using db', activeDatabaseName);

// export async function getAllDbData(id) {
//   let source = localforage.createInstance({
//     name: id,
//   });
//   const items = await new Promise((res) => {
//     let result = [];
//     source
//       .iterate((value, key, iterationNumber) => {
//         result.push(value);
//       })
//       .then(() => {
//         res(result);
//       });
//   });
//   return items;
// }

// export async function putDbData(id, items, mapping = (a) => a) {
//   let target = localforage.createInstance({
//     name: id,
//   });

//   for (const item of items) {
//     await target.setItem(
//       item.docName || item.uid,
//       mapping({
//         ...item,
//         docName: item.docName || item.uid,
//         doc: item.doc || item.content,
//         version: item.version || 1,
//       }),
//     );
//   }
// }
// export async function backupDb(
//   id = activeDatabaseName,
//   backUpId = 'backup/' + id,
// ) {
//   const items = await getAllDbData(id);

//   await putDbData(backUpId, items);
//   console.save(items, backUpId + new Date().getTime() + '.json');
// }

// (function (console) {
//   console.save = function (data, filename) {
//     if (!data) {
//       console.error('Console.save: No data');
//       return;
//     }

//     if (!filename) {
//       filename = 'console.json';
//     }

//     if (typeof data === 'object') {
//       data = JSON.stringify(data, undefined, 2);
//     }

//     var blob = new Blob([data], { type: 'text/json' }),
//       e = document.createEvent('MouseEvents'),
//       a = document.createElement('a');

//     a.download = filename;
//     a.href = window.URL.createObjectURL(blob);
//     a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
//     e.initMouseEvent(
//       'click',
//       true,
//       false,
//       window,
//       0,
//       0,
//       0,
//       0,
//       0,
//       false,
//       false,
//       false,
//       false,
//       0,
//       null,
//     );
//     a.dispatchEvent(e);
//   };
// })(console);
