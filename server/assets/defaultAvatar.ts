import fs from 'fs';

export const defaultAvatarBuf = fs.readFileSync(
  './server/assets/default-avatar.png'
);

export const defaultAvatarId = 'default-avatar';