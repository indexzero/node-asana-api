# node-asana-api

A node.js client implementation for Asana API.

## Usage

### Create the client with an API key

``` js
  var asana = require('asana-api');

  var client = asana.createClient({
    apiKey: 'your-secret-api-key'
  });

  client.users.list(function (err, users) {
    //
    // List all users for this Asana account.
    //
    console.dir(users);
  });
```

### Alternatively, create the client with an OAuth access token

``` js
  var asana = require('asana-api');

  var client = asana.createClient({
    token: 'your-oauth-token'
  });

  client.users.list(function (err, users) {
    //
    // List all users for this Asana account.
    //
    console.dir(users);
  });
```

**Or go even further and supply enough information for OAuth to refresh the access token**

``` js
  var asana = require('asana-api');

  var client = asana.createClient({
    oauth: {
      "accessToken" : "your-oauth-token",
      "refreshToken" : "your-oauth-refresh-token",
      "clientId" : "your-client-id",
      "clientSecret" : "your-client-secret",
      "redirectUrl" : "your-redirect-url-to-store-new-token"
    }
  });

  client.users.list(function (err, users) {
    //
    // List all users for this Asana account.
    //
    console.dir(users);
  });
```



## API Coverage

### Implemented

``` scala
  GET /users
  GET /users/me
  GET /users/:user-id

  GET /workspaces
  GET /workspaces/:workspace-id/tasks

  POST /tasks
  GET /tasks
  GET /tasks/:task-id

  GET /projects
  GET /projects/:project-id/tasks

  POST /tags
  GET /tags
  GET /tags/:tag-id
  PUT /tags/:tag-id
  GET /tags/:tag-id/tasks
```

### Not Implemented

``` scala
  PUT  /tasks/:task-id
  GET  /tasks/:task-id/stories
  POST /tasks/:task-id/stories
  GET  /tasks/:task-id/projects
  POST /tasks/:task-id/addProject
  POST /tasks/:task-id/removeProject

  GET /projects/:project-id
  PUT /projects/:project-id

  GET /stories/:story-id

  PUT  /workspaces/:workspace-id
  POST /workspaces/:workspace-id/tasks
  GET  /workspaces/:workspace-id/projects
  GET  /workspaces/:workspace-id/users
```

## Installation

### Installing npm (node package manager)
```
  curl http://npmjs.org/install.sh | sh
```

### Installing node-asana-api
```
  [sudo] npm install asana-api
```

## Run Tests

``` bash
  $ npm test
```

#### Author: [Charlie Robbins][0]

[0]: http://nodejitsu.com
