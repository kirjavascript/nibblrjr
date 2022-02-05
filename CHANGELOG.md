# changelog

## 4.0.0
- automatic config reloading
- user specified custom config entries
- more control over limits on printing output
- remote IO console viewer + debugger
- events API
    - MVP events: tick / message / webhook
    - built in IBIP / URL scraper behaviour moved to user-defined events
    - uses a dedicated long-running isolate
- SQLite API
    - sync and async APIs
    - tagged templates for easy escaping
    - auto-prepare caching
- webhooks 
- require(): switched from webpack to esbuild
- web style async fetch API
- lots of new APIs (check the documentation)
- much fewer dependencies used
- dateFns and lodash removed from environment: use require() instead
