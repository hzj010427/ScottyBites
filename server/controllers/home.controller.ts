// Controller serving the home page

import Controller from './controller';
import { Request, Response } from 'express';
import path from 'path';

export default class HomeController extends Controller {
  public constructor(path: string) {
    super(path);
  }

  // Just redirection going on here, nothing fancy
  // Plus a an about page generated on the fly

  public initializeRoutes(): void {
    this.router.get('/', this.indexPage);
  }

  public indexPage(req: Request, res: Response): void {
    res.sendFile(path.resolve('.dist', 'client', 'pages', 'index.html'));
  }
}
