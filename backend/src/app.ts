import express from "express";
import cors from "cors";
import { requireUserId } from "./middleware/userId.js";
import exercisesRouter from "./routes/exercises.js";
import sessionRouter from  "./routes/session.js";
import setsRouter from "./routes/sets.js";
import bodyweightRouter from "./routes/bodyweight.js";
import authRouter, {meRouter} from "./routes/auth.js"

const app = express();

// Which front ends may call this API. Comma-separated so a preview deploy
// can be allowed alongside production. Defaults to the local Vite server so
// nothing extra is needed for development.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Public 
app.use("/api/auth", authRouter);

app.use("/api/exercises", requireUserId, exercisesRouter);
app.use("/api/sessions", requireUserId, sessionRouter)
app.use("/api/sets", requireUserId, setsRouter);
app.use("/api/bodyweight", requireUserId, bodyweightRouter);

app.use("/api/auth", requireUserId, meRouter); //Protected

// Hosting platforms assign a port and expect the app to bind to it. Binding
// to a hardcoded one makes the service unreachable however healthy it looks.
const PORT = Number(process.env.PORT) || 4000;

// 0.0.0.0 rather than the default loopback — inside a container, binding to
// localhost means nothing outside the container can reach you.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`CORS allows: ${allowedOrigins.join(", ")}`);
});