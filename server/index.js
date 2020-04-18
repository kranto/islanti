
var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var server = require('./serverstate');


app.use(express.static('islanti'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/islanti/index.html');
});

var s = new server.ServerState(io, "dev");
s.init();

http.listen(4000, function(){
  console.log('listening on *:4000');
});
