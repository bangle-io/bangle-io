import { matchAllPlus } from '@bangle.dev/utils';

import { getDayJs } from '@bangle.io/day-js';
import type { WsPath } from '@bangle.io/shared-types';
import { resolvePath2, updateFileName2 } from '@bangle.io/ws-path';

const dayFormat = 'YYYYMMDDHHmmssSSS';

export interface Dimension {
  width: number;
  height: number;
}

export function calcImageDimensions(blobUrl: string): Promise<Dimension> {
  const image = new Image();
  image.src = blobUrl;

  return new Promise((res) => {
    image.onload = () => {
      res({ width: image.width, height: image.height });
    };
  });
}

/**
 * Take hint about image dimensions from the wsPAth
 * example a file named my-pic-343x500.png means width = 343 and height = 500
 */
export function imageDimensionFromWsPath(
  imageWsPath: WsPath,
): Dimension | undefined {
  const { fileName } = resolvePath2(imageWsPath);
  const dimensionRegex = /.*-(\d+x\d+)\..*/;
  const result = dimensionRegex.exec(fileName);

  if (result?.[1]) {
    const [width, height] = result[1].split('x').map((r) => parseInt(r, 10));

    return { width: width!, height: height! };
  }

  return undefined;
}

function stringifyDimension(dimension: Dimension) {
  return `${dimension.width}x${dimension.height}`;
}

/**
 *
 * @param {*} fileName
 * @returns {name, ext} - Note ext will start with a `.`
 */
export function parseFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  const name = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  const ext = dotIndex === -1 ? '' : fileName.slice(dotIndex);

  return { name, ext };
}

export async function setImageMetadataInWsPath(
  imageWsPath: WsPath,
  dimension: Dimension,
  addTimestamp = false,
) {
  const existingDimension = imageDimensionFromWsPath(imageWsPath);
  let { fileName } = resolvePath2(imageWsPath);

  if (addTimestamp) {
    const matches = matchAllPlus(/-\d{17}/g, fileName).filter((r) => r.match); // Array.from(fileName.matchAll(/-\d{17}/g));
    for (const match of matches) {
      if (validTimestamp(match.subString.slice(1))) {
        fileName = fileName.replace(match.subString, '');
      }
    }
  }

  if (existingDimension) {
    fileName = replaceAll(
      fileName,
      '-' + stringifyDimension(existingDimension),
      '',
    );
  }
  let timestamp = '';

  if (addTimestamp) {
    const dayJs = await getDayJs();
    timestamp = '-' + dayJs(Date.now()).format(dayFormat);
  }

  const { name, ext } = parseFileName(fileName);

  const newDimensions = '-' + stringifyDimension(dimension);

  const newName = [name, timestamp, newDimensions].filter(Boolean).join('');

  const newFileName = newName + ext;

  return updateFileName2(imageWsPath, newFileName);
}

export function parseTimestamp(timestamp: string) {
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

function validTimestamp(timestamp: string) {
  let { year, month, day, hour, minute, second, milliseconds } =
    parseTimestamp(timestamp);

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

const scaleRegex = /.*-scale(\d.+)$/;

export function getImageAltScaleFactor(alt?: string) {
  if (!alt) {
    alt = '';
  }
  const result = scaleRegex.exec(alt);

  if (result?.[1]) {
    return parseFloat(result[1]);
  }

  return 1;
}

export function updateImageAltScaleFactor(alt?: string, scaleFactor = 1) {
  // so that null is also covered
  if (!alt) {
    alt = '';
  }
  const match = scaleRegex.exec(alt);

  if (match && match[1]) {
    alt = alt.split(`-scale${match[1]}`).join('');
  }

  if (scaleFactor === 1) {
    return alt;
  }

  return alt + '-scale' + scaleFactor.toFixed(2);
}

function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(find, 'g'), replace);
}
