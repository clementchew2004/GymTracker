import express from "express";
import cors from "cors";
import { requireUserId } from "./middleware/userId.js";
import exercisesRouter from "./routes/exercises.js";
import sessionRouter from  "./routes/session.js";
import setsRouter from "./routes/sets.js";
import authRouter, {meRouter} from "./routes/auth.js"

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Public 
app.use("/api/auth", authRouter);

app.use("/api/exercises", requireUserId, exercisesRouter);
app.use("/api/sessions", requireUserId, sessionRouter)
app.use("/api/sets", requireUserId, setsRouter);

app.use("/api/auth", requireUserId, meRouter); //Protected

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});