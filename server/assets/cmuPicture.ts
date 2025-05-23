import fs from 'fs';

export const cmuPictureBuf = fs.readFileSync(
  './server/assets/cmu.webp'
);

export const cmuPictureId = 'cmuPicture';