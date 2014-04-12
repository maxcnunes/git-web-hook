/*
 * Based on git://github.com/nlf/node-github-hook.git
 */

var Http = require('http');
var Url = require('url');
var Querystring = require('querystring');
var EventEmitter = require('events').EventEmitter;
var Util = require('util');

var GitHook = function (options) {
  if (!(this instanceof GitHook)) return new GitHook(options);
  options = options || {};
  this.port = options.port || 9001;
  this.host = options.host || '0.0.0.0';
  this.secret = options.secret || false;
  this.logger = options.logger || { log: function () {}, error: function () {} };

  this.server = Http.createServer(serverHandler.bind(this));
  EventEmitter.call(this);
};

Util.inherits(GitHook, EventEmitter);

GitHook.prototype.listen = function (callback) {
  var self = this;

  self.server.listen(self.port, self.host, function () {
    self.logger.log(Util.format('[GitHook] listening for github events on %s:%d', self.host, self.port));
    if (typeof callback === 'function') callback();
  });
};

function serverHandler(req, res) {
  var self = this;
  var url = Url.parse(req.url, true);
  var buffer = [];
  var bufferLength = 0;
  var isForm = false;
  var failed = false;
  var remoteAddress = req.ip || req.socket.remoteAddress || req.socket.socket.remoteAddress;
  var query = url.query;

  req.on('data', function (chunk) {
    if (failed) return;
    buffer.push(chunk);
    bufferLength += chunk.length;
  });

  req.on('end', function (chunk) {
    if (failed) return;
    var data;

    if (chunk) {
      buffer.push(chunk);
      bufferLength += chunk.length;
    }

    self.logger.log(Util.format('[GitHook] received %d bytes from %s', bufferLength, remoteAddress));

    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') isForm = true;

    data = Buffer.concat(buffer, bufferLength).toString();
    if (isForm) data = Querystring.parse(data).payload;
    data = parse(data);

    // invalid json
    if (!data) {
      self.logger.error(Util.format('[GitHook] received invalid data from %s, returning 400', remoteAddress));
      return reply(400, res);
    }
    if (!data.repository || !data.repository.name) {
      self.logger.error(Util.format('[GitHook] received incomplete data from %s, returning 400', remoteAddress));
      return reply(400, res);
    }

    var event = data.total_commits_count ? 'push' : data.object_kind;
    var repo = data.repository.name;
    var ref = data.ref;

    // and now we emit a bunch of data
    var logQuery = Object.getOwnPropertyNames(query).length === 0 ? '' : Util.format('with query: %s', JSON.stringify(query));
    self.logger.log(Util.format('[GitHook] got %s event on %s:%s from %s %s', event, repo, ref, remoteAddress, logQuery));
    self.emit(repo, event, ref, data, query);
    self.emit(repo + ':' + ref, event, data, query);
    self.emit(event, repo, ref, data, query);
    self.emit(event + ':' + repo, ref, data, query);
    self.emit(event + ':' + repo + ':' + ref, data, query);

    reply(200, res);
  });

  self.logger.log(Util.format('[GitHook]', req.method, req.url, remoteAddress));

  // 405 if the method is wrong
  if (req.method !== 'POST') {
    self.logger.error(Util.format('[GitHook] got invalid method from %s, returning 405', remoteAddress));
    failed = true;
    return reply(405, res);
  }

  // if a secret is configured, check it and 403 if it's wrong
  if (self.secret && url.query.secret !== self.secret) {
      self.logger.error(Util.format('[GitHook] got invalid secret from %s, returning 403', remoteAddress));
      failed = true;
      return reply(403, res);
  }
}

function reply(statusCode, res) {
  var message = { message: Http.STATUS_CODES[statusCode].toLowerCase() };
  message.result = statusCode >= 400 ? 'error' : 'ok';
  message = JSON.stringify(message);

  var headers = {
    'Content-Type': 'application/json',
    'Content-Length': message.length
  };

  res.writeHead(statusCode, headers);
  res.end(message);
}

function parse(data) {
  var result;
  try {
    result = JSON.parse(data);
  } catch (e) {
    result = false;
  }
  return result;
}

module.exports = GitHook;
