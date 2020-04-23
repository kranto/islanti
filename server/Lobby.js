const storage = require('./storage');

const readState = async () => {
  return await storage.roundstate().findOne({}, { sort: { $natural: -1 } });
};

const writeState = async (state) => {
  await storage.roundstate().insert(state);
};

class Lobby {

  constructor(io) {
    this.io = io.of('/lobby');
  }

  init() {
    this.io.on('connection', socket => {
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

  createGame(args, callback) {
    console.log('createGame', args, callback);
    let result = {};
    if (args.nick.length > 5) {
      result = {ok: true, gameId: '1234567899123', participationId: '8283828283', createdBy: 'Antti-Orvokki', createdAt: new Date()};
    } else {
      result = {ok: false, msg: "Pelin luonti ei onnistunut"}
    }
    setTimeout(() => callback(result), 2000);

  }

  findGame(args, callback) {
    console.log('findGame', args, callback);
    let result = {};
    if (args.code === '9999') {
      result = {ok: true, gameId: '1234567899123', createdBy: 'Antti-Orvokki', createdAt: new Date()};
    } else {
      result = {ok: false, msg: "Koodi ei kelpaa"}
    }
    setTimeout(() => callback(result), 2000);
  }

  joinGame(args, callback) {
    console.log('joinGame', args, callback);
    let result = {};
    if (args.nick.length > 5) {
      result = {ok: true, participationId: '1987654321', nick: args.nick, gameId: args.gameId};
    } else {
      result = {ok: false, msg: "Peli on suljettu"};
    }
    setTimeout(() => callback(result), 2000);
  }

  resumeParticipation(args, callback) {
    console.log('resumeParticipation', args, callback);
    let result = {};
    if (args.participationId.length > 5) {
      result = {ok: true, participationId: '1987654321', nick: "Mikko Mallikas", gameId: '7766554433'};
    } else {
      result = {ok: false, msg: "Osallistuminen ei ole voimassa"};
    }
    setTimeout(() => callback(result), 0);
  }

}

module.exports = {
  Lobby: Lobby
};
