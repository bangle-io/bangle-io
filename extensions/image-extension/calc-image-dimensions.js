export function calcImageDimensions(blobUrl) {
  const image = new Image();
  image.src = blobUrl;
  return new Promise((res) => {
    image.onload = () => {
      res({ width: image.width, height: image.height });
    };
  });
}
