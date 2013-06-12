var net = require('net'),
		config = require('./config.js').config,
		sessions = new (require('./sessions.js').Sessions);

var server = net.createServer(function(socket) {

	var session = sessions.new(socket);
	console.log(Object.keys(sessions.sessions).length);

	socket.setEncoding(config.proxy_server.socket_encoding);
	socket.setMaxListeners(0);

	// Отправка данных чат-серверу
	socket.on('data', function(data){

		var packs = data.toString().trim().replace('\u0000', '').split('\n'),
				can_send = true;

		if (packs.length > 0 && packs[0] != '<?xml version="1.0"?>' && session.user_id === null)
			packs.forEach(function(pack){

				if (typeof(pack) == 'undefined' || pack.trim().length == 0 || pack == '\u0000')
					return false;

				try {
					var result = JSON.parse(pack.toString());

					// Авторизация
					if (result['cmd'] && result['cmd'] == '*usrAuth' && result['usrId']) {

						// Проверям наличие разорванных соединений
						if (session.user_id === null)
							for (var id in sessions.sessions) {
								if (sessions.sessions.hasOwnProperty(id) && sessions.sessions[id].user_id == result['usrId']) {

									// Восстановливаем соединение
									sessions.sessions[id].client_socket = socket;
									session.server_socket.destroy();
									delete sessions.sessions[session._id];

									// Отсылаем все утеренные пакеты
									sessions.sessions[id].data.forEach(function(p){ socket.write(p) });
									sessions.sessions[id].data = [];

									sessions.sessions[id].cancel_destruction();
									session = sessions.sessions[id];
									can_send = false;
									break;
								}
							}

						session.user_id = result['usrId'];
					}
				} catch (e) {
					console.log('Error: ' + e);
					console.log('JSON Data: ' + pack);
				}
			});

		if (can_send) session.server_socket.write(data);
	});

	socket.on('close', function(){
		session.destroy();
	});

	socket.on('timeout', function(){
		session.destroy();
	});

	socket.on('error', function(){
		session.destroy();
	})
});

server.listen(config.proxy_server.port, config.proxy_server.ip);
