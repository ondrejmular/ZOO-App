'use strict';

const Hapi = require('hapi');
const Good = require('good');
const Qr = require('qr-image');
const Inert = require('inert');

const server = new Hapi.Server();
server.connection({ port: 3000 });

server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('Hello, world!');
    }
});

server.route({
    method: 'GET',
    path: '/qr_code',
    handler: function (request, reply) {
      let str = request.query.text ? request.query.text : 'ZOO App!';
      let response = reply(Qr.imageSync(str, {type: 'png'}));
      response.variety = 'buffer';
      response.type('image/png');
      return response;
    }
});

server.route({
    method: 'GET',
    path: '/news',
    handler: function (request, reply) {
        reply.file('./data/news.json').type('application/json');
    }
});

server.route({
    method: 'GET',
    path: '/animals',
    handler: function (request, reply) {
        reply.file('./data/animals.json').type('application/json');
    }
});

server.route({
    method: 'GET',
    path: '/events',
    handler: function (request, reply) {
        let response = reply('501 NOT IMPLEMENTED');
        response.statusCode = 501;
        return response;
    }
});

server.route({
    method: 'GET',
    path: '/{name}',
    handler: function (request, reply) {
        reply('Hello, ' + encodeURIComponent(request.params.name) + '!');
    }
});

server.register(Inert, (err) => {
    if (err) {
        throw err;
    }
});

server.register({
    register: Good,
    options: {
      ops: {
        interval: 1000
      },
      reporters: {
        console: [
          {
            module: 'good-squeeze',
            name: 'Squeeze',
            args: [{ log: '*', response: '*' }]
          },
          {
            module: 'good-console'
          },
          'stdout'
        ]
      }
    }
}, (err) => {

    if (err) {
        throw err; // something bad happened loading the plugin
    }
});

server.start((err) => {

    if (err) {
       throw err;
    }
    server.log('info', 'Server running at: ' + server.info.uri);
});
