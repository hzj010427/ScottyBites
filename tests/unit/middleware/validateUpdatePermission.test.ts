import { validateUpdatePermission } from '../../../server/middlewares/validateUpdatePermission';
import DAC from '../../../server/db/dac';
import { InMemoryDB } from '../../../server/db/inMemory.db';
import { Request, Response, NextFunction } from 'express';
import { IAppError } from '../../../common/server.responses';
import { IUser, IAuth, IUpdatedUser } from '../../../common/user.interface';
import { User } from '../../../server/models/user.model';

DAC._db = new InMemoryDB();

describe('Member Action of the User Profile Rule', () => {
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(async () => {
    await DAC._db.init();

    res = {
      locals: { userId: 'test' },
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test("Member should have permission to update one's own email", async () => {
    const req: Partial<Request> = {
      params: { userId: 'test' },
      body: { email: 'new_email@andrew.cmu.edu' } as IUpdatedUser,
    };

    await validateUpdatePermission(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  test("Member should have permission to update one's own username", async () => {
    const req: Partial<Request> = {
      params: { userId: 'test' },
      body: { username: 'new_username' } as IUpdatedUser,
    };

    await validateUpdatePermission(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  test("Member should NOT have permission to update one's own privilege level", async () => {
    const req: Partial<Request> = {
      params: { userId: 'test' },
      body: { role: 'admin' } as IUpdatedUser,
    };

    await validateUpdatePermission(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ClientError',
        name: 'ForbiddenRequest',
        message: expect.any(String),
      } as IAppError)
    );
  });

  test("Member should NOT have permission to update other's password", async () => {
    const req: Partial<Request> = {
      params: { userId: 'admin' },
      body: { password: 'new-password' },
    };

    await validateUpdatePermission(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ClientError',
        name: 'ForbiddenRequest',
        message: expect.any(String),
      } as IAppError)
    );
  });
});

describe('Active/Inactive Rule', () => {
  let res: Partial<Response>;
  let next: NextFunction;
  let inactiveUser: IUser;

  beforeEach(async () => {
    await DAC._db.init();

    const newUser = new User({
      email: 'newuser@andrew.cmu.edu',
      username: 'newuser',
      password: 'newuser',
    });
    await newUser.join();
    inactiveUser = (await User.updateUser(newUser._id, {
      active: 'inactive',
    })) as IUser;

    res = {
      locals: { userId: 'test' }, // send request as test user
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  test('Only admin can reactivate an user', async () => {
    const req: Partial<Request> = {
      params: { userId: inactiveUser._id },
      body: { active: 'active' } as IUpdatedUser,
    };
    await validateUpdatePermission(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ClientError',
        name: 'ForbiddenRequest',
        message: expect.any(String),
      } as IAppError)
    );

    res = {
      locals: { userId: 'admin' },
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    await validateUpdatePermission(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('Only another Administrator can reactivate an Inactive Administrator', async () => {
    // Promote the inactiveUser to admin
    await User.updateUser(inactiveUser._id, { role: 'admin' });

    const req: Partial<Request> = {
      params: { userId: inactiveUser._id },
      body: { active: 'active' } as IUpdatedUser,
    };

    res = {
      locals: { userId: inactiveUser._id }, // reactive oneself
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    await validateUpdatePermission(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ClientError',
        name: 'ForbiddenRequest',
        message: expect.any(String),
      } as IAppError)
    );

    res = {
      locals: { userId: 'admin' }, // reactive as another admin
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    await validateUpdatePermission(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
  });
});
