# changelog

## 4.0.0
- automatic config reloading
- user specified custom config entries
- more control over limits on printing output
- remote IO console viewer + debugger
- events API
    - MVP events: tick / message / webhook
    - built in IBIP / URL scraper behaviour moved to user-defined events
    - memo/remind moved to user-defined events
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

### Upgrading from v3 to v4

- server data in `storage` should be moved to `storage/server`
- require() implementation has changed, so delete `cache/acquire` folder
- dateFns and lodash removed from environment: use require() instead
    to provide backwards compat in commands that used it;
    ```javascript
        const dateFns = require('date-fns@1.30.1');
        const _ = require('lodash');
    ```
- some configuration scope has changed; see docs for exact details
