const storage = require('./storage');
const ss = require('./serverstate');
const uuid = require('uuid').v4;

class Lobby {

  constructor(io) {
    this.io = io;
    this.lobby = io.of('/lobby');
  }

  async init() {
    await this.initOpenGames();
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

      socket.on('exitGame', async (args, callback) => {
        await this.exitGame(args, callback);
      });
    });
  }

  async initOpenGames() {
    let games = await storage.findOpenGames();
    console.log(games);
    for (let i in games) {
      console.log(games[i]);
      await ss.getGame(this.io, games[i].token);
    }
  }

  async createGame(args, callback) {
    console.log('createGame', args);
    let result = {};
    if (true) {
      let game = {
        active: true,
        locked: false,
        ended: false,
        closed: false,
        token: uuid(),
        guest: uuid(),
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
    let game = await storage.findGameByParticipation(args.participation);
    if (game && !game.closed) {
      if (game.guest === args.participation) {
        result = {ok: true, participation: {token: game.guest, nick: "katsoja"}, game: game.token};
      } else {
        let participation = game.players.filter(p => p.token === args.participation)[0];
        result = {ok: true, participation: participation, game: game.token};  
      }
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
      let game = await storage.findGameByParticipation(participationToken);
      if (game && !game.closed) {
        if (game.guest === participationToken) {
          result.push({participation: {token: game.guest, nick: "katsoja", isGuest: true}, game: game});
        } else {
          let participation = game.players.filter(p => p.token === participationToken)[0];
          if (!participation.exited) {
            result.push({participation: participation, game: game});
          }  
        }
      }
    }

    setTimeout(() => callback({ok: true, participations: result}), 0);
  }

  async exitGame(args, callback) {
    console.log('exitGame', args);
    let result = {};
    let game = await storage.findGameByParticipation(args.participation);
    if (game && !game.closed) {
      if (game.locked) {
        game.players.forEach(p => {if (p.token === args.participation) p.exited = true});
      } else {
        game.players = game.players.filter(p => p.token !== args.participation);
      }
      await storage.updateGame(game);
      await (await ss.getGame(this.io, game.token)).onGameUpdated();
      result = {ok: true, game: game.token};
    } else {
      result = {ok: false, msg: "Peli on päättynyt"};
    }
    setTimeout(() => callback(result), 0);
  }
}

module.exports = {
  Lobby: Lobby
};
