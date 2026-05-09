import "dotenv/config";
import express from "express";
import cors from "cors";
import aiRoutes from "./routes/ai.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/ai", aiRoutes);

const port = Number(process.env.PORT || 5050);
app.listen(port, () => {
  console.log(`AI backend listening on ${port}`);
});
