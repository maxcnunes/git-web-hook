Simple web hook for [gitlab](https://www.gitlab.com/). This is a simplified version of [node-github-hook](https://github.com/nlf/node-github-hook). As gitlab's web hook is simpler than github, I have just took off some parts from **node-github-hook** to allow work also with gitlab.

## Installation

Install via npm:

    $ npm install git-web-hook

## Usage

### Using the Git Hook

```javascript
var GitHook = require('git-web-hook');
var githook = GitHook({/* options */});

githook.listen();

githook.on('event', function (repo, ref, data, query) {
});

githook.on('event:reponame', function (ref, data, query) {
});

githook.on('event:reponame:ref', function (data, query) {
});

githook.on('reponame', function (event, ref, data, query) {
});

githook.on('reponame:ref', function (event, data, query) {
});
```

### Event Emitters

- **event** - the event name to listen to (sent by github, typically 'push')
- **reponame** - the name of your repo (this one is node-github-hook)
- **ref** - the git reference (such as ref/heads/master)

### Options

- **host** - the host to listen on, defaults to '0.0.0.0'
- **port** - the port to listen on, defaults to 3420
- **secret** - an optional secret to require in callbacks as a query parameter, default is to not use a secret
- **logger** - an optional instance of a logger that supports the "log" and "error" methods and one parameter for data (like console), default is to not log. mostly only for debugging purposes.


### Configuring Web Hook

Configure a WebHook URL to whereever the server is listening. You also can include in the query string a secret parameter (http://...?secret=yoursecret) to be checked during each event is running.


## License

Copyright (c) 2014 Max Claus Nunes. This software is licensed under the [MIT License](http://raw.github.com/maxcnunes/git-web-hook/master/LICENSE).
