import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient();

const exercises: {
    name: string, 
    muscleGroup: string, 
    defaultDayType: string[],
} [] = [
  { name: "Incline Bench Press", muscleGroup: "chest", defaultDayType: ["PUSH"] },
  { name: "Pec Deck Fly", muscleGroup: "chest", defaultDayType: ["PUSH"] },
  { name: "Tricep Pushdown", muscleGroup: "triceps", defaultDayType: ["PULL"] },
  { name: "Triceps Overhead Extension", muscleGroup: "triceps", defaultDayType: ["PULL"] },

  // PULL-only
  { name: "Chest Supported Row", muscleGroup: "back", defaultDayType: ["PULL"] },
  { name: "Face Pull", muscleGroup: "rear-delts", defaultDayType: ["PULL"] },
  { name: "Biceps Curl", muscleGroup: "biceps", defaultDayType: ["PUSH"] },
  { name: "Hammer Curl", muscleGroup: "biceps", defaultDayType: ["PUSH"] },

  // Appear on BOTH push and upper
  { name: "Shoulder Press", muscleGroup: "shoulders", defaultDayType: ["PUSH", "UPPER"] },
  { name: "Machine Lateral Raise", muscleGroup: "shoulders", defaultDayType: ["PUSH", "UPPER"] },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", defaultDayType: ["PUSH", "UPPER"] },
  { name: "High-to-Low Cable Fly", muscleGroup: "chest", defaultDayType: ["PUSH", "UPPER"] },

  // Appear on BOTH pull and upper
  { name: "Lat Pulldown", muscleGroup: "back", defaultDayType: ["PULL", "UPPER"] },
  { name: "Seated Cable Row", muscleGroup: "back", defaultDayType: ["PULL", "UPPER"] },

  // LEGS
  { name: "Leg Extension", muscleGroup: "quads", defaultDayType: ["LEGS"] },
  { name: "Leg Press", muscleGroup: "quads", defaultDayType: ["LEGS"] },
  { name: "Leg Curl", muscleGroup: "hamstrings", defaultDayType: ["LEGS"] },
  { name: "Standing Calf Raise", muscleGroup: "calves", defaultDayType: ["LEGS"] },
  { name: "Sit-Ups", muscleGroup: "abs", defaultDayType: ["LEGS"] },
  { name: "Abdominal Crunch", muscleGroup: "abs", defaultDayType: ["LEGS"] },
];

async function main() {
  let created = 0;
  for (const ex of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: { name: ex.name},
    });
    if (!existing) {
      await prisma.exercise.create({ data: ex });
      created++;
    }
  }
  console.log(`Seed complete — created ${created}, skipped ${exercises.length - created}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
