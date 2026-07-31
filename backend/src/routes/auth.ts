import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET env var is required");
}

const TOKEN_LIFETIME = "30d";
const BCRYPT_ROUNDS = 12;

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, password: passwordHash },
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: TOKEN_LIFETIME,
  });

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, plannedDayTypes: user.plannedDayTypes },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    res.status(401).json({ error: "invalid credentials" });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: TOKEN_LIFETIME,
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, plannedDayTypes: user.plannedDayTypes },
  });
});

export default router;