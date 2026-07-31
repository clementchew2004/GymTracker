import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extracting the check into a function returns a definite `string`,
// which TS carries into closures without any fuss.
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET env var is required");
  return s;
}
const JWT_SECRET = getJwtSecret();

export function requireUserId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Bearer token required" });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    // Cast to a minimal shape describing what we expect from the payload.
    // Runtime check right after validates the assumption.
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: unknown };
    if (typeof payload.userId !== "string") {
      res.status(401).json({ error: "invalid token payload" });
      return;
    }
    res.locals.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
}