let MongoClient = require('mongodb');

const defaultURL = "mongodb://localhost:27017/";

let db;

let init = async (url) => {
  url = url || defaultURL;
  let client = await MongoClient.connect(url, { useUnifiedTopology: true });
  db = await client.db("islanti");
  await db.createCollection("rounds");
  await db.createCollection("roundstate");
  console.log('storage initialized');
}

module.exports = {
  init: init,
  roundstate: () => db.collection('roundstate'),
  close: async () => await client.close(),
  DB: () => db
}
