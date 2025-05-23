import express, { Express, Request, Response, NextFunction } from 'express';
import { Server as HttpServer, createServer } from 'http';
import DAC, { IDatabase } from './db/dac';
import Controller from './controllers/controller';
import { Server as SocketServer } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../common/socket.interface';
import { logger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';
import { handleOnlineStatus } from './sockets/status.socket';
import { handleNotificationRooms } from './sockets/notification.socket';
import { authSocketMiddleware } from './sockets/auth.socket';

class App {
  public app: Express;

  public port: number;

  public db: IDatabase;

  public host: string;

  public clientDir: string; // pathname for the client folder

  public url: string;

  public server: HttpServer;

  public io: SocketServer;

  constructor(
    controllers: Controller[],
    params: {
      port: number;
      host: string;
      clientDir: string;
      db: IDatabase;
      url: string;
      initOnStart: boolean;
    }
  ) {
    this.app = express();
    this.server = createServer(this.app);
    // for later
    this.io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(
      this.server
    );

    this.port = params.port;
    this.db = params.db;
    this.host = params.host;
    this.clientDir = params.clientDir;
    this.url = params.url; // construct the URL from the host and port
    this.configureApp(params.initOnStart);
    this.configureMiddlewares();
    this.configureControllers(controllers);
    this.configureSocket();
    this.app.use(errorHandler); // for error handling
  }

  private configureApp(initOnStart: boolean) {
    DAC.db = this.db;
    DAC.db.connect().then(async () => {
      if (initOnStart) {
        await this.db.cleanUp(); // clean up the database
        await this.db.init(); // initialize the database
      }
    });
  }

  private configureMiddlewares() {
    this.app.use(express.static(this.clientDir)); // serve the static assets from the client folder
    /* 
       The next two lines are for setting up the view engine: they will work with the post-buid
       script buidForPug in the client folder
    */
    this.app.set('view engine', 'pug'); // set the view engine to pug
    this.app.set('views', this.clientDir + '/views'); // set the views directory for pug templates
    this.app.use(express.json()); // for parsing request's json body
    this.app.use(express.urlencoded({ extended: true })); // for decoding the encoded url
    this.app.use(logger); // for logging
  }

  private configureControllers(controllers: Controller[]) {
    Controller.io = this.io; // for later
    controllers.forEach((controller) => {
      this.app.use(controller.path, controller.router);
    });
  }

  private configureSocket() {
    this.io.use(authSocketMiddleware()); // handle authentication
    this.io.on('connection', (socket) => {
      handleOnlineStatus(socket, this.io);
      handleNotificationRooms(socket, this.io);
    });
  }

  public async listen(): Promise<HttpServer> {
    // listen for incoming requests
    return new Promise<HttpServer>((resolve, reject) => {
      try {
        this.server.listen(this.port, () => {
          // must listen on http server, not express app, for socket.io to work
          console.log(`⚡️[Server]: Running at ${this.url} ...`);
          resolve(this.server);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

export default App;
