import express from "express";
import cors from "cors";
import helmet from "helmet";
import docs from "./docs";

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// API Documentation
app.use("/docs", docs);

export default app;
