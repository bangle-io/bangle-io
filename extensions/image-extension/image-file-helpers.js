import { getDayJs } from 'utils/utility';
import { resolvePath, updateFileName } from 'workspace';
const dayFormat = 'YYYYMMDDHHmmssSSS';

export function calcImageDimensions(blobUrl) {
  const image = new Image();
  image.src = blobUrl;
  return new Promise((res) => {
    image.onload = () => {
      res({ width: image.width, height: image.height });
    };
  });
}
const dimensionRegex = /.*-(\d+x\d+)\..*/;

/**
 * Take hint about image dimensions from the wsPAth
 * example a file named my-pic-343x500.png means width = 343 and height = 500
 */
export function imageDimensionFromWsPath(imageWsPath) {
  const { fileName } = resolvePath(imageWsPath);
  const result = dimensionRegex.exec(fileName);
  if (result) {
    const [width, height] = result[1].split('x').map((r) => parseInt(r, 10));
    return { width, height };
  }
  return undefined;
}

function stringifyDimensions(dimensions) {
  return `${dimensions.width}x${dimensions.height}`;
}

/**
 *
 * @param {*} fileName
 * @returns {name, ext} - Note ext will start with a `.`
 */
export function parseFileName(fileName) {
  const dotIndex = fileName.lastIndexOf('.');
  const name = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  const ext = dotIndex === -1 ? '' : fileName.slice(dotIndex);
  return { name, ext };
}

export async function setImageMetadataInWsPath(
  imageWsPath,
  dimensions,
  addTimestamp = false,
) {
  const existingDimension = imageDimensionFromWsPath(imageWsPath);
  let { fileName } = resolvePath(imageWsPath);

  if (addTimestamp) {
    const matches = Array.from(fileName.matchAll(/-\d{17}/g));
    for (const match of matches) {
      const possibleTimestamp = match[0].slice(1);
      if (validTimestamp(possibleTimestamp)) {
        fileName = fileName.replace(match[0], '');
      }
    }
  }

  if (existingDimension) {
    fileName = fileName.replaceAll(
      '-' + stringifyDimensions(existingDimension),
      '',
    );
  }
  let timestamp = '';
  if (addTimestamp) {
    const dayJs = await getDayJs();
    timestamp = '-' + dayJs(Date.now()).format(dayFormat);
  }

  const { name, ext } = parseFileName(fileName);

  const newDimensions = '-' + stringifyDimensions(dimensions);

  const newName = [name, timestamp, newDimensions].filter(Boolean).join('');

  const newFileName = newName + ext;

  return updateFileName(imageWsPath, newFileName);
}

export function parseTimestamp(timestamp) {
  let [year, month, day, hour, minute, second, milliseconds] = [
    timestamp.slice(0, 4),
    timestamp.slice(4, 6),
    timestamp.slice(6, 8),
    timestamp.slice(8, 10),
    timestamp.slice(10, 12),
    timestamp.slice(12, 14),
    timestamp.slice(14),
  ];
  return {
    year: parseInt(year),
    month: parseInt(month),
    day: parseInt(day),
    hour: parseInt(hour),
    minute: parseInt(minute),
    second: parseInt(second),
    milliseconds: parseInt(milliseconds),
  };
}

function validTimestamp(timestamp) {
  let { year, month, day, hour, minute, second, milliseconds } = parseTimestamp(
    timestamp,
  );

  return (
    year > 2000 &&
    year < 2100 &&
    month > 0 &&
    month <= 12 &&
    day > 0 &&
    day <= 31 &&
    hour >= 0 &&
    hour < 24 &&
    minute >= 0 &&
    minute < 60 &&
    second >= 0 &&
    second < 60 &&
    milliseconds >= 0 &&
    milliseconds < 1000
  );
}
