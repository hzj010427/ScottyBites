import path from 'path';
import App from './app';

// import { MongoDB } from './db/mongo.db'; // for later
import { InMemoryDB } from './db/inMemory.db';
import { MongoDB } from './db/mongo.db';
import { PORT, HOST, STAGE, ENV } from './env';
import { DB_CONN_STR as dbURL } from './env'; // for later
import AuthController from './controllers/auth.controller';
import HomeController from './controllers/home.controller';
import DirectoryController from './controllers/directory.controller';
import AccountController from './controllers/account.controller';
import ProfileController from './controllers/profile.controller';
import BusinessController from './controllers/business.controller';
import BlobController from './controllers/blob.controller';
import PostController from './controllers/post.controller';
import MapController from './controllers/map.controller';

const app = new App(
  [
    // TODO: Add initialized controllers here
    new HomeController('/'),
    new AuthController('/auth'),
    new DirectoryController('/directory'),
    new AccountController('/account'),
    new ProfileController('/profile'),
    new BusinessController('/business'),
    new BlobController('/blob'),
    new PostController('/post'),
    new MapController('/map')
  ],
  {
    clientDir: path.join(__dirname, '../.dist/client'),
    /* 
      for now using an InMemoryDB instance, but later change the following so that
      if STAGE !== 'EARLY', a MongoDB instance new MongoDB(dbURL) is used...
    */
    db: STAGE === 'EARLY' ? new InMemoryDB() : new MongoDB(dbURL),
    port: PORT,
    host: HOST,
    url: `${HOST}${ENV === 'LOCAL' ? ':' + PORT.toString() : ''}`,
    initOnStart: STAGE !== 'PROD',
  }
);

app.listen();
