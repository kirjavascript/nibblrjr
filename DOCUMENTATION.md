# nibblrjr documentation

[//]: # (__docs__)

* [API Reference](#api-reference)
    * [printing text](#printing-text)
    * [fetching data](#fetching-data)
    * [storing data](#storing-data)
    * [using npm packages](#using-npm-packages)
    * [events](#events)
    * [the IRC object](#the-irc-object)
    * [colours / formatting](#colours--formatting)
    * [dealing with time](#dealing-with-time)
    * [reading logs](#reading-logs)
    * [manipulating commands](#manipulating-commands)
    * [authentication](#authentication)
    * [modules](#modules)
* [configuration](#configuration)
* [REPL](#repl)
* [remote debugger](#remote-debugger)

## API Reference

<a name="input" href="#input">#</a> <b>input</b>

equal to [IRC.command.input](#IRC-command)

### printing text 

<a name="print" href="#print">#</a> <b>print</b>(<i>string</i>{, <i>options</i>})

prints text using the colour parser from [IRC.colors](#IRC-colors). options are;

* `log` - _boolean_ &emsp; setting `false` will omit bot messages from the log
* `target` - _string_ &emsp; channel / user to send to (only works if the command is included in the `broadcastCommands` config array)

<a name="log" href="#log">#</a> <b>log</b>(<i>object</i>{, <i>options</i>})

alias for [print.log](#printer-log)

<a name="notice" href="#notice">#</a> <b>notice</b>(<i>string</i>{, <i>options</i>})

same as [print](#print) but for notices

<a name="action" href="#action">#</a> <b>action</b>(<i>string</i>{, <i>options</i>})

same as [print](#print) but for actions

each of the above functions has additional properties;

<a name="printer-log" href="#printer-log">#</a> <i>printer</i>.<b>log</b>(<i>object</i>{, <i>options</i>})

renders and prints an object using [IRC.inspect](#IRC-inspect)

options can be those of [print](#print) and [IRC.inspect](#IRC-inspect)

<a name="printer-raw" href="#printer-raw">#</a> <i>printer</i>.<b>raw</b>(<i>string</i>{, <i>options</i>})

prints text without parsing the colour DSL

<a name="printer-error" href="#printer-error">#</a> <i>printer</i>.<b>error</b>(<i>error</i>{, <i>options</i>})

prints errors with [IRC.colors.error](#IRC-colors-error). also used to print thrown errors

<a name="printer-info" href="#printer-info">#</a> <i>printer</i>.<b>info</b>(<i>string</i>{, <i>options</i>})

prints text with [IRC.colors.info](#IRC-colors-info)

<a name="printer-success" href="#printer-success">#</a> <i>printer</i>.<b>success</b>(<i>string</i>{, <i>options</i>})

prints text with [IRC.colors.success](#IRC-colors-success)

### fetching data

<a name="fetchsync" href="#fetchsync">#</a> <b>fetchSync</b>(<i>url</i>{, <i>options</i>}) -> <i>data</i>

works the same as [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) but is synchronous. options are the same as [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) with the addition;

* `type` - _string_ &emsp; can be `text`, `json` or `dom`
* `form` - _object_ &emsp; send multipart/form-data `fetchSync('https://example.com', { form: { key: 'value' } })`

[fetchSync](#fetchsync) blocks, but each command is run concurrently in a separate vm - so other features continue to be responsive

<a name="fetchsync-json" href="#fetchsync-json">#</a> fetchSync.<b>json</b>(<i>url</i>{, <i>options</i>}) -> <i>object</i>

same as [fetchSync](#fetchsync), except parses the response as JSON and returns an object

<a name="fetchsync-dom" href="#fetchsync-dom">#</a> fetchSync.<b>dom</b>(<i>url</i>{, <i>options</i>}) -> <i>DOM</i>

same as [fetchSync](#fetchsync), except parses the response as HTML and returns a window object

useful for scraping websites or RSS feeds

```javascript
const { window, document } = fetchSync.dom('http://google.com');
```

<a name="jsdom" href="#jsdom">#</a> <b>jsdom</b>() -> <i>{ JSDOM, ... }</i>

helper to set up the environment to run JSDOM and return the library

### storing data

#### key-value store

data is scoped by server and command. data will be stored in the server database

<a name="set" href="#set">#</a> store.<b>set</b>(<i>key</i>, <i>value</i>) 

a simple key-value store. the value can be either *string*, or *undefined|null* to remove the value

<a name="get" href="#get">#</a> store.<b>get</b>(<i>key</i>) -> <i>string|undefined</i>

retrieve the stored value

<a name="save" href="#save">#</a> store.<b>save</b>(<i>key</i>, <i>value</i>) 

a convenience function that JSON stringifies the value sent to the store

<a name="load" href="#load">#</a> store.<b>load</b>(<i>key</i>{, <i>default value</i>}) -> <i>value</i>

a convenience function that JSON parses the value retrieved from the store

<a name="all" href="#all">#</a> store.<b>all</b>() -> <i>array</i>

returns an array of objects have have the properties *key* and *value* corresponding to the data in the store

<a name="clear" href="#clear">#</a> store.<b>clear</b>()

removes all values from the store

<a name="namespace" href="#namespace">#</a> store.<b>namespace</b>

equal to [IRC.command.root](#IRC-command)

different commands store data in different namespaces, only commands with the same `root` share the same namespace

read more about `command.root` in [IRC.command](#IRC-command)

#### SQLite store

the SQLite store is scoped by command namespace only, so data is shared between servers

each command will have a seperate database file. various restrictions on execution time, filesize, and available features of the language have been made for safety reasons

statements have a prepare cache, so repeating the same query is as cheap as if you had prepared it

<a name="sql-run" href="#sql-run">#</a> SQL.<b>run</b>(<i>query</i>[, ...<i>params</i>]) -> <i>array</i>

run an SQLite statement

<a name="sql-one" href="#sql-one">#</a> SQL.<b>one</b>(<i>query</i>[, ...<i>params</i>]) -> <i>result</i>

retrieve a single result from a query

<a name="sql-many" href="#sql-many">#</a> SQL.<b>many</b>(<i>query</i>[, ...<i>params</i>]) -> <i>info</i>

retrieve all results of a query

an example use of the API could be like this; `SQL.one('SELECT ?', 1)`

however, the SQLite API also allows you to use tagged template strings for safe and easy statement escaping;

```
SQL.run`INSERT INTO foo (bar) VALUES (${userInput})`
```

### using npm packages

<a name="require" href="#require">#</a> <b>require</b>(<i>packagename</i>) -> <i>object</i>

download a package from npm and bundle it with esbuild. npm scripts are ignored for safety. subsequent accesses of the same package are cached

*packagename* can include the version and a path, like - `require('react-dom/server@16.8.6').renderToString( ... )`

### events

the event system runs in a dedicated long running vm. each server connection has their own vm

by convention, events are stored in commands with the prefix `event.`, but any command an be an event by setting the option in a command editor

only admins have access to changing events

the remote debugger is useful for event development

<a name="IRC-listen" href="#IRC-listen">#</a> IRC.<b>listen</b>(<i>eventname</i>, <i>callback</i> {, <i>options</i>})

run a callback each time an event happens

available events are

the `tick` event happens every second

the `message` event happens for each message

the `webhook.name` events happen when a request is sent to a webhook

available options are

* `showErrors` - _boolean_ &emsp; should errors in this event be printed
* `filter` - _function_ &emsp; provide a callback to dictate if an event should run or not

some additional APIs are only available in events;

<a name="IRC-queryConfig" href="#IRC-queryconfig">#</a> IRC.<b>queryConfig</b>(<i>key</i>{, <i>default value</i>}) -> <i>value</i>

query user-defined config values

will first check the channel config, then server, and then top level

<a name="fetch" href="#fetch">#</a> <b>fetch</b>(<i>url</i>{, <i>options</i>}) -> <i>Promise</i>

API to match browser [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

async APIs are favoured in events as blocking would cause the event system to pause

<a name="sql-async-run" href="#sql-async-run">#</a> SQL.async.<b>run</b>(<i>query</i>[, ...<i>params</i>]) -> <i>Promise</i>

<a name="sql-async-one" href="#sql-async-one">#</a> SQL.async.<b>one</b>(<i>query</i>[, ...<i>params</i>]) -> <i>Promise</i>

<a name="sql-async-many" href="#sql-async-many">#</a> SQL.async.<b>many</b>(<i>query</i>[, ...<i>params</i>]) -> <i>Promise</i>

async versions of the SQLite API

<a name="sql-async-many" href="#sql-async-many">#</a> IRC.<b>setNamespace</b>(<i>namespace</i>)

change the namespace the the key-value and SQLite stores use. this allows the events full access to all command data

### the IRC object

the IRC object includes data and helper functions for IRC-related things, but also contains some general things that didnt quite make it into the big league global scope

<a name="IRC-trigger" href="#IRC-trigger">#</a> IRC.<b>trigger</b>

a config-defined *string* denoting the prefix to run commands with

can be revealed by running `.bots` with no prefix if IBIP is enabled

<a name="IRC-message" href="#IRC-message">#</a> IRC.<b>message</b>

an *object* with information about the current message that triggered the command. has the folowing properties:

* `from` - _string_ &emsp; nickname of the message sender 
* `to` - _string_ &emsp; where the message was sent
* `text` - _string_ &emsp; full text of the message
* `message` - _object_ &emsp; raw information about the message
* `target` - _string_ &emsp; where the response message is aimed
* `isPM` - _boolean_ &emsp; if the original message was in PM

<a name="IRC-nick" href="#IRC-nick">#</a> IRC.<b>nick</b>

the current nickname of the bot

<a name="IRC-setNick" href="#IRC-setNick">#</a> IRC.<b>setNick</b>(<i>string</i>)

change the bot's nick. only works if the user is an admin or the channel has the `setNick` config option enabled

used in the `nick` command

<a name="IRC-command" href="#IRC-command">#</a> IRC.<b>command</b>

a parsed representation of the current command. uses [IRC.parseCommand](#IRC-parseCommand)

* `path` - _string_ &emsp; the actual command requested ( ~**full.path** )
* `list` - _array_ &emsp; the path, split by the `.` character
* `params` - _array_ &emsp; list of strings from the command ( ~full.path(**param, ...**) )
* `root` - _string_ &emsp; the command namespace ( ~**full**.path )
* `input` - _string_ &emsp; the text after the command ( ~command **some text** )

<a name="IRC-parseCommand" href="#IRC-parseCommand">#</a> IRC.<b>parseCommand</b>(<i>object</i>) -> <i>object</i>

used internally to parse commands. object has the following properties;

* `trigger` - _string|undefined_ &emsp; the command prefix to use, if at all 
* `text` - _string_ &emsp; the full message

<a name="IRC-webAddress" href="#IRC-webAddress">#</a> IRC.<b>webAddress</b>

config-defined URL pointing to the web frontend

<a name="IRC-epoch" href="#IRC-epoch">#</a> IRC.<b>epoch</b>

*date* object indicating when the node process was started

<a name="IRC-version" href="#IRC-version">#</a> IRC.<b>version</b>

bot version

<a name="IRC-nodeVersion" href="#IRC-nodeVersion">#</a> IRC.<b>nodeVersion</b>

node.js version

<a name="IRC-secret" href="#IRC-secret">#</a> IRC.<b>secret</b>

a config-defined value for a specific command root. useful for API keys

<a name="IRC-wordList" href="#IRC-wordList">#</a> IRC.<b>wordList</b>

an *array* of words from `/usr/share/dict/words`

<a name="IRC-resetBuffer" href="#IRC-resetBuffer">#</a> IRC.<b>resetBuffer</b>() 

cancel all pending messages (to suppress spam). used in the `reset` command

<a name="IRC-whois" href="#IRC-whois">#</a> IRC.<b>whois</b>(<i>nick</i>) -> <i>object</i> 

provides whois information for a user. properties are: nick, user, host, realname, channels, server, serverinfo, account, accountinfo

<a name="IRC-ping" href="#IRC-ping">#</a> IRC.<b>ping</b>(<i>host</i>) -> <i>promise</i> 

runs the CLI ping command at the specified host and provides the output

<a name="IRC-inspect" href="#IRC-inspect">#</a> IRC.<b>inspect</b>(<i>value</i>{, <i>options</i>}) -> <i>string</i> 

object inspector designed for IRC specifically. takes the following options;

* `depth` - _number_ &emsp; what level of of the tree should be rendered
* `truncate` - _number_ &emsp; at which point to truncate the output
* `colors` - _bool_ &emsp; should output be formatted with colours

values of zero will show the maximum instead

### colours / formatting

<a name="IRC-colors" href="#IRC-colors">#</a> IRC.<b>colors</b>(<i>string</i>) -> <i>string</i>

DSL parsing function. colours can be disabled entirely in the config

colours

    {r}red
    {dr}dark red
    {w}white
    {bl}black
    {c}cyan
    {dc}dark cyan
    {b}blue
    {db}dark blue
    {g}green
    {dg}dark green
    {p}magenta
    {dp}dark magenta
    {o}orange
    {y}yellow
    {gr}grey
    {dgr}dark grey

formatting

    {bo}bold
    {u}underline
    {i}italic

misc

    {rb}rainbow
    {g,r}background
    {rand}random colour
    {bell}ascii beep
    {/}cancel effects

for example

`{r}red{/} and {bo}bold{/} and {rb}rainbow{/} and {r,g}red with green background`

<a name="IRC-colors-hash" href="#IRC-colors-hash">#</a> IRC.colors.<b>hash</b>(<i>string</i>) -> <i>string</i>

produces a colour hashed from the input string

<a name="IRC-colors-nick" href="#IRC-colors-nick">#</a> IRC.colors.<b>nick</b>(<i>string</i>[, <i>boolean</i>]) -> <i>string</i>

uses hashing to render a nickname. additionally pass *false* to not render the angle brackets

<a name="IRC-colors-link" href="#IRC-colors-link">#</a> IRC.colors.<b>link</b>(<i>string</i>) -> <i>string</i>

a simple function to render a hyperlink

<a name="IRC-colors-cmd" href="#IRC-colors-cmd">#</a> IRC.colors.<b>cmd</b>(<i>name</i>[, <i>args</i>, <i>params</i>]) -> <i>string</i>

renders a command with usage information. args and params can be a *string* or an *array* of strings

<a name="IRC-colors-error" href="#IRC-colors-error">#</a> IRC.colors.<b>error</b>(<i>error|string</i>) -> <i>string</i>

renders an error's name (if different to 'Error') and message

<a name="IRC-colors-info" href="#IRC-colors-info">#</a> IRC.colors.<b>info</b>(<i>string</i>) -> <i>string</i>

renders a neutral message

<a name="IRC-colors-success" href="#IRC-colors-success">#</a> IRC.colors.<b>success</b>(<i>string</i>) -> <i>string</i>

renders a successful message

<a name="IRC-colors-strip" href="#IRC-colors-strip">#</a> IRC.colors.<b>strip</b>(<i>string</i>) -> <i>string</i>

removes (rendered) colour codes and formatting from a string

### dealing with time

<a name="IRC-parseTime" href="#IRC-parseTime">#</a> IRC.<b>parseTime</b>(<i>string</i>) -> <i>date</i>

used in the `memo` and `remind` commands

parses a *string* into a date object. it accepts various formats

absolute times

    YYYY-MM-DD
    HH:MM
    HH:MM:SS
    3am
    3pm
    sunday
    feb
    3rd
    march
    2019
    tomorrow

relative times

    3 weeks
    1y
    4 mins
    10 hours
    7d

each format can be combined to create a time offset

[see here](https://github.com/kirjavascript/nibblrjr/blob/master/irc/evaluate/scripts/parse-time.js) for a full list of strings that are accepted

### reading logs

used in the `log` command and subcommands, but also used to create sed like functionality for messages

<a name="IRC-log-get" href="#IRC-log-get">#</a> IRC.log.<b>get</b>(<i>text</i>[, <i>limit</i>[, <i>offset</i>]]) -> <i>array</i>

retrieve messages from the channel

<a name="IRC-log-count" href="#IRC-log-count">#</a> IRC.log.<b>count</b>(<i>text</i>) -> <i>number</i>

return the number of lines that match the provided string

<a name="IRC-log-user" href="#IRC-log-user">#</a> IRC.log.<b>user</b>(<i>nick</i>, <i>text</i>[, <i>limit</i>[, <i>offset</i>]]) -> <i>array</i>

retrieves messages from a specific user

<a name="IRC-log-random" href="#IRC-log-random">#</a> IRC.log.<b>random</b>([<i>quantity</i>]) -> <i>array</i>

pull random messages from the log

<a name="IRC-log-regex" href="#IRC-log-regex">#</a> IRC.log.<b>regex</b>(<i>string</i>[, <i>limit</i>[, <i>offset</i>]]) -> <i>array</i>

takes a regex as a *string* to search the database with

### manipulating commands

used in the `command` command and subcommands. commands can also be manipulated via the web frontend

<a name="IRC-commandFns-get" href="#IRC-commandFns-get">#</a> IRC.commandFns.<b>get</b>(<i>name</i>) -> <i>object|undefined</i>

returns information on a command. properties are;

* `name` - _string_ &emsp; name of the command
* `command` - _string_ &emsp; code snippet that is run when the command is triggered
* `locked` - _boolean_ &emsp; if the command is locked from editing
* `starred` - _boolean_ &emsp; if the command is a star ★

commands that share the same [root](#IRC-command) also share the same locked / starred state

<a name="IRC-commandFns-list" href="#IRC-commandFns-list">#</a> IRC.commandFns.<b>list</b>() -> <i>array</i>

returns an array of all command information

<a name="IRC-commandFns-names" href="#IRC-commandFns-names">#</a> IRC.commandFns.<b>names</b>() -> <i>array</i>

returns an array of all the command names

<a name="IRC-commandFns-count" href="#IRC-commandFns-count">#</a> IRC.commandFns.<b>count</b>() -> <i>number</i>

returns the number of commands

<a name="IRC-commandFns-set" href="#IRC-commandFns-set">#</a> IRC.commandFns.<b>setSafe</b>(<i>name</i>, <i>code</i>) -> <i>boolean</i>

sets the code for a particular command. returns *true* if successful

<a name="IRC-commandFns-delete" href="#IRC-commandFns-delete">#</a> IRC.commandFns.<b>deleteSafe</b>(<i>name</i>, <i>code</i>) -> <i>boolean</i>

deletes the command. returns *true* if successful

<a name="sleep" href="#sleep">#</a> <b>sleep</b>(<i>milliseconds</i>)

blocks the current thread for the specified time. other commands will continue to run

async timers may be added in future

### authentication

<a name="IRC-auth" href="#IRC-auth">#</a> IRC.<b>auth</b>()

if the user is not authenticated with nickserv, throws an error. otherwise does nothing

<a name="IRC-sudo" href="#IRC-sudo">#</a> IRC.<b>sudo</b>() -> <i>object</i>

checks the user is authenticated to nickserv, and checks if the user is in the `admins` config option for that server, otherwise throw an error

the returned object has the following properties

* `exit` - _function_ &emsp; kills the main process
* `node` - _proxy_ &emsp; a bridge out of the vm to the channel's internal node object in the main process

the `node` proxy allows you to send raw commands and update config options on the fly. examples of its use can be seen in the following commands; `reload`, `reboot`, `update`, `join`, `part`, `mode`, `topic`, `kick`, `nick`, `redirect`, `ignore`

`update` can be used to update the bot without rebooting

### modules

<a name="IRC-require" href="#IRC-require">#</a> IRC.<b>require</b>(<i>name</i>) -> <i>object</i>

loads a command as a module. the object is whatever was added to [module.exports](#module-exports)

some useful utilities are available as subcommands of the `module` command. for example:

```javascript
IRC.require('module.paste')('hello world') == 'https://paste.rs/PN2'
```

<a name="module-exports" href="#module-exports">#</a> module.<b>exports</b>

an *object* to place functions you would like to export on 

<a name="module-required" href="#module-required">#</a> module.<b>required</b>

a *boolean* indicating if the current command has been required or not. allows commands to be used as commands or modules

## configuration

**all properties are optional**. [see the example config](config.json.example)

if the configuration file is edited while the bot is running, these changes will be reflected in its behaviour, to the extent that if you change the server address it will leave the old one and rejoin the new one

* `servers` _array_ &emsp; list of IRC servers to connect to 
    * `address` _string_ &emsp; for example: `irc.libera.chat`
    * `password` _string_ &emsp; password to use for services authentication
    * `channels` _array_ &emsp; list of channels to join.
        * `name` _string_ &emsp; channel name to join. for example: `##rust`

the following properties are top level, but can also placed inside the server for a local override

* `trigger` _string_ &emsp; the prefix to use for running commands (default: `~`)
* `nickname` _string_ &emsp; nickname
* `userName` _string_ &emsp; username shown in whois information
* `realName` _string_ &emsp; real name shown in whois information
* `floodProtection` _boolean_ &emsp; should flood protection be enabled (default: `true`)
* `floodProtectionDelay` _number_ &emsp; set flood protection time delay in ms (default: `250`)
* `autoRejoin` _boolean_ &emsp; should the bot autorejoin channels when kicked (default: `true`)
* `ignoreHosts` _array_ &emsp; list of hostnames to ignore for events and messages entirely
* `admins` _array_ &emsp; list of nicknames of users that have access to [IRC.sudo](#IRC-sudo)
* `secrets` _object_ &emsp; keys in this object correspond to commands that have an [IRC.secret](#IRC-secret) value
* `broadcastCommands` _array_ &emsp; list of commands that are able to use the *target* property of [print](#print)

the following properties are top level, but can also placed inside the server or channel for a local override

* `lineLimit` _number_ &emsp; maximum number of lines a command can display (default: `10`)
* `charLimit` _number_ &emsp; maximum number of characters a command can display (default: `false`)
* `colLimit` _number_ &emsp; maximum number of characters per line a command can display (default: `400`)
* `colors` _boolean_ &emsp; should colours and formatting be enabled (default: `true`)
* `setNick` _boolean_ &emsp; does anyone in this channel have access to [IRC.setNick](#IRC-setNick) (default: `false`)
* `enableEvents` _boolean_ &emsp; should channel run events system (default: `true`)
* `enableCommands` _boolean_ &emsp; should commands be triggerable (default: `true`)

the following properties are top level only

* `timezone` _string_ &emsp; timezone to use for dates (default: `Europe/London`)
* `web` _object_ &emsp; configuration for the web frontend
    * `url` _string_ &emsp; web address for the frontend, available at [IRC.webAddress](#IRC-webAddress)
    * `port` _number_ &emsp; port to host the content at
    * `password` _string_ &emsp; logging in to the web interface allows you to modify locked commands

these used to be part of the core, but are now user-defined configuration values

* `enableIBIP` _boolean_ &emsp; should the bot conform to [IBIP](https://git.teknik.io/Teknikode/IBIP) standard (default: `true`)
* `fetchURL` _boolean_ &emsp; should URLs posted in channel have their titles displayed (default: `true`)
* `fetchURLAll` _boolean_ &emsp; should every scraped URL be shown, or just 'useful' ones (default: `false`)

## REPL

to run code in a JS interpreter, combine the [trigger](#IRC-trigger) prefix with one of the following symbols 

`>` prints the returned value and `>>`, `#` or `%` run code in an async IIFE

the REPL works as a command like any other, and `>` takes optional params. the params look like:

**>**(<i>depth</i>, <i>truncate</i>)

which correspond to the options from [IRC.inspect](#IRC-inspect)

## remote debugger

console output is available in real-time via a HTTP stream. this is useful for live monitoring and development

combine with `IRC.sudo().node.setDebug(true)` to show full IRC event information

to connect using curl: `curl -u io:webpassword https://host/api/iostream`
