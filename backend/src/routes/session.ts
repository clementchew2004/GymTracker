import {prisma} from "../prisma.js";
import { Router } from "express";

const router = Router();

router.get("/", async(req, res) => {
    const userId = res.locals.userId as string;
    const sessions = await prisma.session.findMany({
        where: {userId},
        orderBy: {date: "desc"},
        include:  {
            sets: {
                include: {exercise: true},
                orderBy: {setNumber: "asc"},
            },
        },
    });
    res.json(sessions);
})

router.get("/last", async(req, res) => { 
    const userId = res.locals.userId as string; 
    const exerciseId = req.query.exerciseId as string | null;
    if(!exerciseId) {
        return(res.status(400).json({error: "Exercise ID is required"}));
    } 
    const session = await prisma.session.findFirst({
        where: {
            userId,
            sets: {some: {exerciseId}}
        },
        orderBy: {date : "desc"},
        include: {
            sets: 
            {
                where: {exerciseId},
                orderBy: {setNumber: "asc"}
            },
        },
    });
    res.json(session);
})

router.post("/", async (req, res) => {
    const userId = res.locals.userId as string;
    const {dayType} = req.body; 
    if (!dayType) {
        res.status(400).json({
            error: "DayType is required"
        });
        return;
    }
    const session = await prisma.session.create({
        data: {dayType, userId},
        include: {sets: true},
    });
    res.status(201).json(session);
})

export default router; 