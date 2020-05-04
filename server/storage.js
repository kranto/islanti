let MongoClient = require('mongodb');

const defaultURL = "mongodb://localhost:27017/";

let db;

let init = async (url) => {
  url = url || defaultURL;
  let client = await MongoClient.connect(url, { useUnifiedTopology: true });
  db = await client.db("islanti");
  await db.createCollection("roundstate");
  await db.createCollection("game");
  console.log('storage initialized');
}

const updateGame = async (game) => {
  await db.collection('game').replaceOne({_id: game._id}, game);
};

const findGameByToken = async (token) => {
  return await db.collection('game').findOne({active: true, token: token});
};

const findRoundState = async (gameToken) => {
  return await db.collection('roundstate').findOne({'gameToken': gameToken}, {sort:{$natural:-1}});
};

const writeRoundState = async (state, gameToken) => {
  await db.collection('roundstate').insertOne({...state, gameToken: gameToken});
};


module.exports = {
  init: init,
  roundstate: () => db.collection('roundstate'),
  game: () => db.collection('game'),
  close: async () => await client.close(),
  updateGame: updateGame,
  findGameByToken: findGameByToken,
  findRoundState: findRoundState,
  writeRoundState: writeRoundState,
  DB: () => db
}
