import express from "express";
import cors from "cors";
import { requireUserId } from "./middleware/userId.js";
import exercisesRouter from "./routes/exercises.js";
import sessionRouter from  "./routes/session.js";
import setsRouter from "./routes/sets.js";
import authRouter from "./routes/auth.js"

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/auth", authRouter);
app.use("/api", requireUserId);

app.use("/api/exercises", exercisesRouter);
app.use("/api/sessions", sessionRouter)
app.use("/api/sets", setsRouter);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});