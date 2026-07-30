import type { Request, Response, NextFunction } from "express";

export function requireUserId(
    req: Request, 
    res: Response,
    next: NextFunction
) {
    const userId = req.header("X-User-Id") 
    if (!userId) {
        res.status(401).json(
            {error: "X-User-Id header is required"}
        );
        return;
    }
    res.locals.userId = userId;
    next();
}