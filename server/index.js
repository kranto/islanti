
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var server = require('./serverstate');
var lobbys = require('./Lobby');
const storage = require('./storage');


app.use(express.static('islanti'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/islanti/index.html');
});

const myArgs = process.argv.slice(2);
// const roundNumber = parseInt(myArgs[0]);
// const dealerIndex = parseInt(myArgs[1]);
// const s = new server.ServerState(io, "dev");

const lobby = new lobbys.Lobby(io);

(async () => {
  try {
    await storage.init();
    console.log("initialized");
    http.listen(4000, () => console.log('listening on *:4000'));
    // await s.init(roundNumber, dealerIndex);
    await lobby.init();
  } catch (e) {
    console.log(e);
  }
})();
