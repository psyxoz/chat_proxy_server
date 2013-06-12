var uuid = require('node-uuid'),
		net = require('net'),
		config = require('./config.js').config;

exports.Sessions = function(){
	this.sessions = {};
	var self = this;

	this.new = function(client_socket){
		var session = new Session();
		session.client_socket = client_socket;
		self.sessions[session._id] = session;
		return self.sessions[session._id];
	};

	this.delete = function(id){
		var ping = setInterval(function(){
			if (self.sessions.hasOwnProperty(id)) self.sessions[id].server_socket.write('{}\0');
		}, 15000); // 15 секунд

		setTimeout(function(){
			console.log('Session destroy');
			clearInterval(ping);                                       å
			if (self.sessions.hasOwnProperty(id)) self.sessions[id].destroy();
		}, 1800000); // 30 минут
	};

	// Сессия пользователя
	function Session(){
		this._id = uuid.v4() || 0;
		this.user_id = null;
		this.data = [];

		this.client_socket = null;
		this.server_socket = net.createConnection(config.chat_server.port, config.chat_server.ip);
		console.log('Connected to chat server');

		var current = this;
		this.server_socket.on('data', function(data){
			var packs = data.toString().trim().split('\n');

			if (packs.length > 0 && packs[0] != '<?xml version="1.0"?>')
				packs.forEach(function(pack){

					if (typeof(pack) == 'undefined' || pack.trim().length == 0 || pack == '\u0000') return false;

					try {
						var result = JSON.parse(pack.toString());

						// Авторизация
						if (result['cmd'] && result['cmd'] == 'usrAuthOk') {

							// Проверям наличие разорванных соединений
							if (current.user_id === null)
								for (var id in self.sessions) {
									if (self.sessions.hasOwnProperty(id) && self.sessions[id].user_id == result['sessionId']) {

										var old_session = self.sessions[id];

										// Отсылаем все утеренные пакеты
										if (old_session.data.length > 0) {
											old_session.data.forEach(function(pack){
												current.client_socket.write(pack);
											});
										}

										// Восстановливаем утеренное соединение
										current.server_socket = old_session.server_socket;

										// Удаляем старую сессию
										delete self.sessions[id];
										break;
									}
								}

							current.user_id = result['sessionId'];
						}
					} catch (e) {
						console.log('JSON Parse error: ' + e);
						console.log('JSON Data: ' + pack);
					}
				});

			if (!current.client_socket.write(data)) current.data.push(data);
		});

		this.destroy = function(){
			if (current.server_socket) current.server_socket.destroy();
			delete self.sessions[current._id];
		};
	};
};