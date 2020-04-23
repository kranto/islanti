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

      socket.on('goToGame', (args, callback) => {
        this.goToGame(args, callback);
      });
    });
  }

  createGame(args, callback) {
    console.log('createGame', args, callback);

  }

  findGame(args, callback) {
    console.log('findGame', args, callback);
    setTimeout(() => callback({gameId: '1234567899123', createdBy: 'Antti-Orvokki', createdAt: new Date()}), 2000);
  }

  joinGame(args, callback) {
    console.log('joinGame', args, callback);
    setTimeout(() => callback({result: true, participationId: '1987654321', nick: args.nick, gameId: args.gameId}), 2000);
  }

  goToGame(args, callback) {
    console.log('goToGame', args, callback);

  }

}

module.exports = {
  Lobby: Lobby
};
