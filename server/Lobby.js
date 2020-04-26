const storage = require('./storage');
const ss = require('./serverstate');
const uuid = require('uuid').v4;

const updateGame = async (game) => {
  console.log('updateGame', game);
  await storage.game().update({_id: game._id}, game);
};

const findGameByToken = async (token) => {
  return await storage.game().findOne({active: true, token: token});
};

const findGameByCode = async (code) => {
  return await storage.game().findOne({active: true, code: code});
};

const findGameByPartipation = async (token) => {
  let activeGames = await storage.game().find({active: true}).toArray();
  let matchingGames = activeGames.filter(g => g.players.reduce((acc, p) => acc || p.token === token, false));
  return matchingGames.length === 1 ? matchingGames[0] : null;
};

const insertGame = async (game) => {
  let inserted = await storage.game().insertOne(game);
  console.log(inserted);
  game._id = inserted.insertedId;
  return inserted.insertedId;
};

function pad(num, size) {
  var s = "000000000" + num;
  return s.substr(s.length-size);
}


class Lobby {

  constructor(io) {
    this.io = io;
    this.lobby = io.of('/lobby');
  }

  init() {
    this.lobby.on('connection', socket => {
      console.log('someone connected to lobby', new Date());

      socket.on('createGame', (args, callback) => {
        this.createGame(args, callback);
      });

      socket.on('findGame', (args, callback) => {
        this.findGame(args, callback);
      });

      socket.on('joinGame', (args, callback) => {
        this.joinGame(args, callback);
      });

      socket.on('resumeParticipation', (args, callback) => {
        this.resumeParticipation(args, callback);
      });
    });
  }

  async createGame(args, callback) {
    console.log('createGame', args, callback);
    let result = {};
    if (true) {
      let game = {
        active: true,
        token: uuid(),
        code: pad(Math.floor(Math.random()*10000), 4),
        createdAt: new Date(),
        players: [{token: uuid(), nick: args.nick}]
      }
      await insertGame(game);
      console.log(game);
      result = {ok: true, participation: game.players[0], game: game.token, code: game.code, createdBy: game.players[0].nick };
    } else {
      result = {ok: false, msg: "Pelin luonti ei onnistunut"}
    }
    setTimeout(() => callback(result), 2000);

  }

  async findGame(args, callback) {
    console.log('findGame', args, callback);
    let result = {};
    let game = await findGameByCode(args.code);
    console.log(game);
    if (game) {
      result = {ok: true, game: game.token, createdBy: game.createBy, createdAt: game.createAt};
    } else {
      result = {ok: false, msg: "Koodi ei kelpaa"}
    }
    setTimeout(() => callback(result), 2000);
  }

  async joinGame(args, callback) {
    console.log('joinGame', args, callback);
    let result = {};
    let game = await findGameByToken(args.game);
    console.log('found game', game);
    if (game) {
      let newParticipation = {token: uuid(), nick: args.nick};
      game.players.push(newParticipation);
      await updateGame(game);
      await (await ss.getGame(this.io, game.token)).onGameUpdated();
      result = {ok: true, participation: newParticipation, game: game.token};
    } else {
      result = {ok: false, msg: "Peli on suljettu"};
    }
    setTimeout(() => callback(result), 2000);
  }

  async resumeParticipation(args, callback) {
    console.log('resumeParticipation', args, callback);
    let result = {};
    let game = await findGameByPartipation(args.participation);
    console.log(game);
    if (game) {
      let participation = game.players.filter(p => p.token === args.participation)[0];
      result = {ok: true, participation: participation, game: game.token};
      await ss.getGame(this.io, game.token);
    } else {
      result = {ok: false, msg: "Osallistuminen ei ole voimassa"};
    }
    setTimeout(() => callback(result), 0);
  }

}

module.exports = {
  Lobby: Lobby
};
