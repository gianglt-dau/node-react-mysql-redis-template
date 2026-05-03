import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { createClient } from "redis";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);

async function checkMySQL() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "app_db",
  });

  const [rows] = await connection.query("SELECT 1 AS ok");
  await connection.end();
  return rows[0]?.ok === 1;
}

async function checkRedis() {
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT || 6379),
    },
  });

  await client.connect();
  await client.set("iac-demo-health", "ok");
  const value = await client.get("iac-demo-health");
  await client.disconnect();
  return value === "ok";
}

app.get("/", (_req, res) => {
  res.json({
    app: "iac-demo-backend",
    message: "Backend is running",
  });
});

app.get("/health", async (_req, res) => {
  const result = {
    status: "ok",
    timestamp: new Date().toISOString(),
    mysql: "unknown",
    redis: "unknown",
  };

  try {
    result.mysql = (await checkMySQL()) ? "ok" : "failed";
  } catch (error) {
    result.mysql = `failed: ${error.message}`;
  }

  try {
    result.redis = (await checkRedis()) ? "ok" : "failed";
  } catch (error) {
    result.redis = `failed: ${error.message}`;
  }

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
