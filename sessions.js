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
			if (self.sessions.hasOwnProperty(id)) self.sessions[id].server_socket.write('{"cmd":"*ping"}\0');
		}, 15000); // 15 секунд

		setTimeout(function(){
			console.log('Session destroy');
			clearInterval(ping);
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
			console.log(data.toString());
			if (!current.client_socket.write(data)) current.data.push(data);
		});

		this.destroy = function(){
			if (current.server_socket) current.server_socket.destroy();
			delete self.sessions[current._id];
		};
	};
};