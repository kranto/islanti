
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var lobbys = require('./Lobby');
const storage = require('./storage');


app.use(express.static('client'));

app.get('/', function (req, res) {
  console.log('request', __dirname);
  res.sendFile(__dirname + '/client/index.html');
});

const lobby = new lobbys.Lobby(io);

(async () => {
  try {
    await storage.init(process.env.MONGO_ADDRESS);
    http.listen(4000, () => console.log('listening on *:4000'));
    await lobby.init();
  } catch (e) {
    console.log(e);
  }
})();
