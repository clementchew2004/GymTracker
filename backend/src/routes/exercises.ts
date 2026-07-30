import { prisma } from "../prisma.js";
import { Router } from "express";

const router = Router();

router.get("/", async(req, res) => {
    const dayType = req.query.dayType as string || undefined; 
    const where = dayType ? {defaultDayType: {has: dayType}} : {};
    const result = await prisma.exercise.findMany ({
        where,
        orderBy: {name: "asc"} 
    })
    res.json(result);
})

router.post("/", async(req, res) => {
    const {name, muscleGroup, defaultDayType} = req.body;
    if (!muscleGroup || !name) {
        res.status(400).json({
            error: "Name and Muscle Group is required"
        })
        return; 
    }
    const exercise = await prisma.exercise.create ({
        data: {name, muscleGroup, defaultDayType : defaultDayType ?? [] }
    })
    return(res.status(201).json(
        {
        message: "Exercise created successfully",
        exercise: exercise
        }
    ));
})

export default router; 