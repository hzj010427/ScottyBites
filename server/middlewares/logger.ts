import { Request, Response, NextFunction } from 'express';

/**
 * Server logger middleware
 */
export function logger(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, url, ip, body } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = `[${new Date().toISOString()}] ${method} ${url} - ${res.statusCode} ${duration}ms - IP: ${ip}`;
        
        console.log(logMessage);
        
        // uncomment the following lines to log request body
        // if (Object.keys(body).length) {
        //     console.log(`📦 Request Body:`, body);
        // }
    });

    next();
}
