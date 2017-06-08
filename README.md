# Amphora Search

Making it easier to use Elastic Search with Amphora

## Install

`$ npm install --save amphora-search`

## The Why

When dealing with component data we sometimes want to have feeds of data and that's where Elastic Search (ES) comes in. This module uses Amphora's plugin model to do three things:

1) Mange two internal indices: `sites` and `pages`
2) Expose a way for you, the implementer, to tap into data in the database and pass it to ES
3) Access a client-side endpoint to query ES

With this module you should be able to generate all the feeds your users and readers need.

## Integration

First, ensure that you have a compatible version of Amphora installed (2.13.0 or greater) and require `amphora-search` from wherever you are instantiating Amphora,

```javascript
const amphoraSearch = require('amphora-search');
```

Second, instantiate Amphora Search _before_ Amphora is instantiated. This is because your Amphora instance might have components who require a connection to ES and you want to make sure the client is available for the bootstrap phase of Amphora.

```javascript
amphoraSearch.setup({
  app: app,
  prefix: process.env.ELASTIC_PREFIX, // will be empty on raw environments, set on feature branches
  db: amphora.db,
  sites: amphora.sites,
  mappings: path.resolve('./search/mappings'),
  handlers: path.resolve('./search/handlers')
}).then(() => {
  // ...instantiate Amphora and anything else.
});
```
We'll discuss each one of the properties that are passed into the `setup` function in the Wiki.

Finally, you'll want to make sure you tell Amphora that Amphora Search is a plugin.

```javascript
return amphora({
  app: app,
  providers: ['apikey', amphoraProvider],
  sessionStore: redisStore,
  plugins: [
    amphoraSearch
  ]
});
```
This will is the most important part. Without passing in the plugin instance that you created you won't be able to take advantage of all the functionality of the module.

## How to use

Once instantiated Amphora Search will begin managing it's own internal indices, but it also allows for the creation of ES indices, aliases, mappings and queries that fit in with the Amphora data flow. For more details on how to do this and more details on instantiation be sure to read the Wiki.

- Instantiation Details
- Creating an index
- Available helpers and filters
- Querying an index

## Contributing

Want a feature or find a bug? Create an issue or a PR and someone will get on it.
