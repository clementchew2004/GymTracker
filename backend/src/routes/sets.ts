import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// POST /api/sets           → log a set against a session + exercise
router.post("/", async (req, res) => {
  const userId = res.locals.userId as string;
  const { sessionId, exerciseId, weight, reps, rpe } = req.body;

  if (
    !sessionId ||
    !exerciseId ||
    typeof weight !== "number" ||
    typeof reps !== "number"
  ) {
    res.status(400).json({
      error: "sessionId, exerciseId, weight (number), reps (number) required",
    });
    return;
  }

  // Guard: the session must belong to the caller — otherwise User A could
  // add sets to User B's session by guessing an ID.
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Auto-increment setNumber per (session, exercise).
  const priorCount = await prisma.setEntry.count({
    where: { sessionId, exerciseId },
  });

  const set = await prisma.setEntry.create({
    data: {
      sessionId,
      exerciseId,
      weight,
      reps,
      rpe: rpe ?? null,
      setNumber: priorCount + 1,
    },
  });
  res.status(201).json(set);
});

export default router;