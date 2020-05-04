const storage = require('./storage');
const ss = require('./serverstate');
const uuid = require('uuid').v4;

class Lobby {

  constructor(io) {
    this.io = io;
    this.lobby = io.of('/lobby');
  }

  init() {
    this.lobby.on('connection', socket => {
      console.log('someone connected to lobby', new Date());

      socket.on('createGame', async (args, callback) => {
        await this.createGame(args, callback);
      });

      socket.on('findGame', (args, callback) => {
        this.findGame(args, callback);
      });

      socket.on('joinGame', (args, callback) => {
        this.joinGame(args, callback);
      });

      socket.on('resumeParticipation', async (args, callback) => {
        await this.resumeParticipation(args, callback);
      });

      socket.on('validateParticipations', async (args, callback) => {
        await this.validateParticipations(args, callback);
      });
    });
  }

  async createGame(args, callback) {
    console.log('createGame', args);
    let result = {};
    if (true) {
      let game = {
        active: true,
        locked: false,
        ended: false,
        token: uuid(),
        code: await storage.generateGameCode(),
        createdBy: args.nick,
        createdAt: new Date(),
        players: [{token: uuid(), nick: args.nick}]
      }
      await storage.insertGame(game);
      console.log(game);
      await (await ss.getGame(this.io, game.token));
      result = {ok: true, participation: game.players[0], game: game.token, code: game.code, createdBy: game.players[0].nick };
    } else {
      result = {ok: false, msg: "Pelin luonti ei onnistunut"}
    }
    setTimeout(() => callback(result), 2000);

  }

  async findGame(args, callback) {
    console.log('findGame', args);
    let result = {};
    let game = await storage.findGameByCode(args.code);
    if (game) {
      result = {ok: true, game: game.token, createdBy: game.createdBy, createdAt: game.createdAt};
    } else {
      result = {ok: false, msg: "Koodi ei kelpaa"}
    }
    setTimeout(() => callback(result), 2000);
  }

  async joinGame(args, callback) {
    console.log('joinGame', args);
    let result = {};
    let game = await storage.findGameByToken(args.game);
    console.log('found game', game);
    if (game) {
      let newParticipation = {token: uuid(), nick: args.nick};
      game.players.push(newParticipation);
      await storage.updateGame(game);
      await (await ss.getGame(this.io, game.token)).onGameUpdated();
      result = {ok: true, participation: newParticipation, game: game.token};
    } else {
      result = {ok: false, msg: "Peli on suljettu"};
    }
    setTimeout(() => callback(result), 2000);
  }

  async resumeParticipation(args, callback) {
    console.log('resumeParticipation', args);
    let result = {};
    let game = await storage.findGameByPartipation(args.participation);
    if (game && !game.ended) {
      let participation = game.players.filter(p => p.token === args.participation)[0];
      result = {ok: true, participation: participation, game: game.token};
      await ss.getGame(this.io, game.token);
    } else {
      result = {ok: false, msg: "Osallistuminen ei ole voimassa"};
    }
    setTimeout(() => callback(result), 0);
  }

  async validateParticipations(args, callback) {
    console.log('validateParticipations', args);
    let result = [];
    for (const index in args.participations) {
      const participationToken = args.participations[index];
      let game = await storage.findGameByPartipation(participationToken);
      console.log(participationToken, game);
      if (game && !game.ended) {
        let participation = game.players.filter(p => p.token === participationToken)[0];
        result.push({participation: participation, game: game});
        console.log(participationToken);
      }
    }
    console.log(result.length);
    setTimeout(() => callback({ok: true, participations: result}), 0);
  }

  async exitGame(args, callback) {
    console.log('exitGame', args);
    let result = {};
    let game = await storage.findGameByPartipation(args.participation);
    if (game && !game.ended) {
      game.players = game.players.filter(p => p.token !== args.participation)[0];
      await updateGame(game);
      await (await ss.getGame(this.io, game.token)).onGameUpdated();
      result = {ok: true, participation: newParticipation, game: game.token};
    } else {
      result = {ok: false, msg: "Peli on suljettu"};
    }
    setTimeout(() => callback(result), 2000);
  }
}

module.exports = {
  Lobby: Lobby
};
