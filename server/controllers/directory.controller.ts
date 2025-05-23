// Controller serving the directory page

import Controller from './controller';
import { Request, Response } from 'express';
import path from 'path';

export default class DirectoryController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  public initializeRoutes(): void {
    this.router.get('/pages/access', this.directoryPage);
  }

  public async directoryPage(req: Request, res: Response) {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'directory.html'));
  }
}
