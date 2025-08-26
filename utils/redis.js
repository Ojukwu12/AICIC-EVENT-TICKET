const redis = require("redis");

const client = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

client.on("error", (error) => {
  console.error("Redis error:", error);
});

let isConnected = false;

async function connectRedis() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("Connected to Redis");
  }
}

connectRedis();

module.exports = client;
