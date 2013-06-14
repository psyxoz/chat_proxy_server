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

	this.update = function(session){
		self.sessions[session._id] = session;
	};

	// Сессия пользователя
	function Session(){
		this._id = uuid.v4() || 0;
		this.user_id = null;
		this.data = [];

		this.ping_interval = null;
		this.destruction_timeout = null;

		this.client_socket = null;
		this.server_socket = net.createConnection(config.chat_server.port, config.chat_server.ip);

		var current = this;

		this.server_socket.on('data', function(data){
			if (!current.client_socket.write(data)) current.data.push(data);
		});

		this.destroy = function(){
			if (current.ping_interval !== null) return false;

			current.ping_interval = setInterval(function(){
				current.server_socket.write('{"cmd":"*ping"}\0');
			}, 15000); // 15 секунд

			current.destruction_timeout = setTimeout(function(){
				clearInterval(current.ping_interval);
				current.ping_interval = null;

				if (current.server_socket) current.server_socket.destroy();
				delete self.sessions[current._id];
			}, 300000); // 5 минут
		};

		this.cancel_destruction = function(){
			clearInterval(current.ping_interval);
			current.ping_interval = null;

			clearTimeout(current.destruction_timeout);
			current.destruction_timeout = null;
		}
	};
};