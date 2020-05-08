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

const insertGame = async (game) => {
  let inserted = await db.collection('game').insertOne(game);
  game._id = inserted.insertedId;
  return inserted.insertedId;
};

const updateGame = async (game) => {
  await db.collection('game').replaceOne({_id: game._id}, game);
};

const findOpenGames = async (token) => {
  return await db.collection('game').find({ended: false}).toArray();
};

const findGameByToken = async (token) => {
  return await db.collection('game').findOne({active: true, token: token});
};

const findGameByCode = async (code) => {
  return await db.collection('game').findOne({active: true, locked: false, code: code});
};

const findGameByPartipation = async (token) => {
  let activeGames = await db.collection('game').find({active: true}).toArray();
  let matchingGames = activeGames.filter(g => g.players.reduce((acc, p) => acc || p.token === token, false));
  return matchingGames.length === 1 ? matchingGames[0] : null;
};

const findRoundState = async (gameToken) => {
  return await db.collection('roundstate').findOne({'gameToken': gameToken}, {sort:{$natural:-1}});
};

const writeRoundState = async (state, gameToken) => {
  await db.collection('roundstate').insertOne({...state, gameToken: gameToken});
};

function pad(num, size) {
  var s = "000000000" + num;
  return s.substr(s.length-size);
}

const generateGameCode = async () => {
  let currCodes = await db.collection('game').find({locked: false}).map(g => g.code).toArray();
  for (let i = 1000; i > 0; i--) {
    let code = pad(Math.floor(Math.random()*10000), 4);
    if (currCodes.indexOf(code) < 0) return code;
  }
  return "----";
}

module.exports = {
  init: init,
  roundstate: () => db.collection('roundstate'),
  game: () => db.collection('game'),
  close: async () => await client.close(),
  insertGame: insertGame,
  updateGame: updateGame,
  findOpenGames: findOpenGames,
  findGameByToken: findGameByToken,
  findGameByCode: findGameByCode,
  findGameByPartipation: findGameByPartipation,
  findRoundState: findRoundState,
  writeRoundState: writeRoundState,
  generateGameCode: generateGameCode,
  DB: () => db
}
