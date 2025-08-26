const client = require("../utils/redis");

async function cache(req, res, next) {
  const key = req.originalUrl;

  
  const cachedData = await client.get(key);

  if (cachedData) {
    return res.send(JSON.parse(cachedData));
  } else{
 const originalJson = res.json.bind(res);
  res.json = (body) => {
   if (res.statusCode === 200) {
    client.setEx(key, 600, JSON.stringify(body));
    originalJson(body);
  }
  console.log("stored to cache");
 }

  next();
}
}

module.exports = cache;
