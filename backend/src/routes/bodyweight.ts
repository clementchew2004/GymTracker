import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// GET /api/bodyweight → this user's weigh-ins, oldest first so the
// response is already in chart order.
router.get("/", async (_req, res) => {
  const userId = res.locals.userId as string;

  const entries = await prisma.bodyWeight.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  res.json(entries);
});

// POST /api/bodyweight → record a weigh-in. `date` is optional; without it
// the schema default (now) applies.
router.post("/", async (req, res) => {
  const userId = res.locals.userId as string;
  const { weightKg, date } = req.body;

  if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0) {
    res.status(400).json({ error: "weightKg must be a positive number" });
    return;
  }

  // Validate here rather than letting an Invalid Date reach Prisma, which
  // fails with a much less helpful message.
  let when: Date | undefined;
  if (date !== undefined) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ error: "date must be a valid date" });
      return;
    }
    when = parsed;
  }

  const entry = await prisma.bodyWeight.create({
    data: {
      userId,
      weightKg,
      ...(when ? { date: when } : {}),
    },
  });

  res.status(201).json(entry);
});

export default router;
