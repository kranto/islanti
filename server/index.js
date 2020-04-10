
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

// io.on('connection', function(socket){
//   console.log("new connection!", new Date());
//   socket.broadcast.emit('hi');
//   socket.emit('chat message', 'Welcome!');
//   socket.on('chat message', function(msg){
//     // io.emit('chat message', msg);
//     socket.broadcast.emit('chat message', msg);

//   });
// });

http.listen(4000, function(){
  console.log('listening on *:4000');
});


