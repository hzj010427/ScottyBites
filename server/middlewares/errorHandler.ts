import { Request, Response, NextFunction } from 'express';
import * as responses from '../../common/server.responses';

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
    if (responses.isClientError(err as responses.IResponse)) {
        if (err.name === 'UnauthorizedRequest') {
            return res.status(401).json(err);
        }

        if (err.name === 'ForbiddenRequest') {
            return res.status(403).json(err);
        }

        if (err.name.includes('NotFound')) {
            return res.status(404).json(err);
        }
        
        res.status(400).json(err);
    } else if (responses.isServerError(err as responses.IResponse)) {
        res.status(500).json(err);
    } else {
        const errorRes: responses.IAppError = {
            type: 'ServerError',
            name: 'UnknownError',
            message: err.message,
        };
        res.status(500).json(errorRes);
    }
}