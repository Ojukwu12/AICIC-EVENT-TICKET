const client = require("../utils/redis");

async function cache(req, res, next) {
 try {
  const key = req.originalUrl;

  
  const cachedData = await client.get(key);

  if (cachedData) {
    return res.send(JSON.parse(cachedData));
  } else {
   res.sendResponse = res.send;
   res.send = async (body) => {
    res.sendResponse(body);
    await client.setEx(key, 3600, JSON.stringify(body)); // Cache for 1 hour
  console.log("stored to cache");
 }

  next();
}} catch (err) {
  console.error("Cache middleware error:", err);
  next();
}
}

module.exports = cache;
