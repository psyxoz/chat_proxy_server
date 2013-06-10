var net = require('net'),
		config = require('./config.js').config,
		sessions = new (require('./sessions.js'));

var server = net.createServer(function(socket) {

	var session = sessions.new(socket);

	socket.setEncoding(config.proxy_server.socket_encoding);
	socket.setMaxListeners(0);

	// Отправка данных чат-серверу
	socket.on('data', function(data){
		session.server_socket.write(data);
	});

	socket.on('close', function(){
		sessions.delete(session._id);
	});

	socket.on('timeout', function(){
		sessions.delete(session._id);
	});

	socket.on('error', function(){
		sessions.delete(session._id);
	})
});

server.listen(config.proxy_server.port, config.proxy_server.ip);
