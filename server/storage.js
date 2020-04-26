let MongoClient = require('mongodb');

const defaultURL = "mongodb://localhost:27017/";

let db;

let init = async (url) => {
  url = url || defaultURL;
  let client = await MongoClient.connect(url, { useUnifiedTopology: true });
  db = await client.db("islanti");
  await db.createCollection("roundstate");
  await db.createCollection("game");
  await db.createCollection("participation");
  console.log('storage initialized');
}

module.exports = {
  init: init,
  roundstate: () => db.collection('roundstate'),
  game: () => db.collection('game'),
  participation: () => db.collection('participation'),
  close: async () => await client.close(),
  DB: () => db
}
