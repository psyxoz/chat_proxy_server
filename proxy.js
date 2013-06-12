var net = require('net'),
		config = require('./config.js').config,
		sessions = new (require('./sessions.js').Sessions);

var server = net.createServer(function(socket) {

	var session = sessions.new(socket);

	socket.setEncoding(config.proxy_server.socket_encoding);
	socket.setMaxListeners(0);

	console.log('Client ' + socket.remoteAddress + ' is connected to proxy server');

	// Отправка данных чат-серверу
	socket.on('data', function(data){

		var packs = data.toString().trim().replace('\u0000', '').split('\n');

		if (packs.length > 0 && packs[0] != '<?xml version="1.0"?>')
			packs.forEach(function(pack){

				if (typeof(pack) == 'undefined' || pack.trim().length == 0 || pack == '\u0000') return false;

				try {
					var result = JSON.parse(pack.toString());

					// Авторизация
					if (result['cmd'] && result['cmd'] == '*usrAuth') {

						// Проверям наличие разорванных соединений
						if (session.user_id === null)
							for (var id in sessions.sessions) {
								if (sessions.sessions.hasOwnProperty(id) && sessions.sessions[id].user_id == result['usrId']) {

									var old_session = sessions.sessions[id];

									// Отсылаем все утеренные пакеты
									if (old_session.data.length > 0) {
										old_session.data.forEach(function(p){ socket.write(p) });
										old_session.data = [];
									}

									// Восстановливаем утеренное соединение и заменяем сессию
									session.server_socket.destroy();
									delete sessions.sessions[session._id];
									session = old_session;
									break;
								}
							}
					}
				} catch (e) {
					console.log('JSON Parse error: ' + e);
					console.log('JSON Data: ' + pack);
				}
			});

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
