# nibblrjr documentation

[//]: # (__docs__)

* [API Reference](#api-reference)
    * [printing text](#printing-text)
    * [fetching data](#fetching-data)
    * [storing data](#storing-data)
    * [using npm packages](#using-npm-packages)
    * [the IRC object](#the-irc-object)
    * [colours / formatting](#colours--formatting)
    * [dealing with time](#dealing-with-time)
    * [reading logs](#reading-logs)
    * [manipulating commands](#manipulating-commands)
    * [interacting with events](#interacting-with-events)
    * [timers](#timers)
    * [authentication](#authentication)
    * [modules](#modules)
* [Configuration](#configuration)
* [REPL](#REPL)
* [Flags](#Flags)

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

the `dom` option is useful for scraping websites or RSS feeds

```javascript
const { window, document } = fetchSync('http://google.com', {type: 'dom'});
```
[fetchSync](#fetchsync) blocks, but each command is run concurrently in a separate vm - so other features continue to be responsive

<a name="fetchsync-json" href="#fetchsync-json">#</a> fetchSync.<b>json</b>(<i>url</i>{, <i>options</i>}) -> <i>object</i>

same as [fetchSync](#fetchsync), except parses the response as JSON and returns an object

<a name="fetchsync-dom" href="#fetchsync-dom">#</a> fetchSync.<b>dom</b>(<i>url</i>{, <i>options</i>}) -> <i>DOM</i>

same as [fetchSync](#fetchsync), except parses the response as HTML and returns a window object

the following functions are deprecated

<a name="getText" href="#getText">#</a> <b>getText</b>(<i>url</i>{, <i>options</i>}) -> <i>promise</i>  
<a name="getJSON" href="#getJSON">#</a> <b>getJSON</b>(<i>url</i>{, <i>options</i>}) -> <i>promise</i>  
<a name="getDOM" href="#getDOM">#</a> <b>getDOM</b>(<i>url</i>{, <i>options</i>}) -> <i>promise</i>

### storing data

data is scoped by server. a future version may introduce additional scope

<a name="set" href="#set">#</a> store.<b>set</b>(<i>key</i>, <i>value</i>) 

a simple key-value store. the value can be either *string*, or *undefined|null* to remove the value

<a name="get" href="#get">#</a> store.<b>get</b>(<i>key</i>) -> <i>string|undefined</i>

retrieve the stored value

<a name="all" href="#all">#</a> store.<b>all</b>() -> <i>array</i>

returns an array of objects have have the properties *key* and *value* corresponding to the data in the store

<a name="clear" href="#clear">#</a> store.<b>clear</b>()

removes all values from the store

<a name="namespace" href="#namespace">#</a> store.<b>namespace</b>

equal to [IRC.command.root](#IRC-command)

different commands store data in different namespaces, only commands with the same `root` share the same namespace

read more about `command.root` in [IRC.command](#IRC-command)

there is an experimental react-hooks like API for dealing with non-string values in the command module `module.loadObject` that can be used with [IRC.require](#IRC-require)

```javascript
const [scores, setScores] = IRC.require('module.loadObject')('someKey');
```

once the API is finalised, it'll be moved into the core

### using npm packages

<a name="require" href="#require">#</a> <b>require</b>(<i>packagename</i>) -> <i>object</i>

download a package from npm and bundle it with webpack. npm scripts are ignored for safety. subsequent accesses of the same package are cached

*packagename* can include the version and a path, like - `require('react-dom/server@16.8.6').renderToString( ... )`

package namespaces are currently broken

not everything works, compatibility fares better the closer you get to ECMAScript

the following command is deprecated

<a name="acquire" href="#acquire">#</a> <b>acquire</b>(<i>packagename</i>) -> <i>promise</i>

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

<a name="IRC-channels" href="#IRC-channels">#</a> IRC.<b>channels</b>

an *object* containing information about channels

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

<a name="datefns" href="#datefns">#</a> <b>dateFns</b>

the [date-fns](https://date-fns.org/) library

### reading logs

used in the `log` command and subcommands, but also used to create sed like functionality for messages

<a name="IRC-log-get" href="#IRC-log-get">#</a> IRC.log.<b>get</b>(<i>text</i>[, <i>limit</i>[, <i>offset</i>]]) -> <i>array</i>

retrieve messages from the current channel

<a name="IRC-log-getGlobal" href="#IRC-log-getGlobal">#</a> IRC.log.<b>getGlobal</b>(<i>text</i>[, <i>limit</i>[, <i>offset</i>]]) -> <i>array</i>

same as [IRC.log.get](#IRC-log-get) but for every channel

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

<a name="IRC-commandFns-setSafe" href="#IRC-commandFns-setSafe">#</a> IRC.commandFns.<b>setSafe</b>(<i>name</i>, <i>code</i>) -> <i>boolean</i>

sets the code for a particular command. returns *true* if successful

<a name="IRC-commandFns-deleteSafe" href="#IRC-commandFns-deleteSafe">#</a> IRC.commandFns.<b>deleteSafe</b>(<i>name</i>, <i>code</i>) -> <i>boolean</i>

deletes the command. returns *true* if successful

the names `deleteSafe` and `setSafe` are used as in future, additional `delete` and `set` functions will be able to modify locked commands for admins

### interacting with events

used in the `memo` and `remind` commands

<a name="IRC-event" href="#IRC-event">#</a> IRC.<b>event</b>

if the command is running in an event, contains the event information

* `idx` - _number_ &emsp; index
* `callback` - _string_ &emsp; name of the command to trigger when the event happens
* `type` - _string_ &emsp; type of event triggered
* `timestamp` - _date_ &emsp; timestamp the message should reach before triggering
* `init` - _date_ &emsp; timestamp from when the event was created
* `user` - _string_ &emsp; user that created the event
* `target` - _string_ &emsp; user/channel the message is targeted at
* `message` - _string_ &emsp; additional text to send with the event

<a name="IRC-eventFns-addEvent" href="#IRC-eventFns-addEvent">#</a> IRC.eventFns.<b>addEvent</b>(<i>type</i>{, <i>options</i>})

type can be `speak` to trigger after a user has spoken, or `tick` to trigger after an elapsed amount of time. options are;

* `callback` - _string_ &emsp; name of the command to trigger when the event happens
* `time` - _date_ &emsp; minimum timestamp the message should reach before triggering
* `message` - _string_ &emsp; additional text to send with the event
* `target` - _string_ &emsp; user the event is intended for. (does nothing for tick)

<a name="IRC-eventFns-speakElapsed" href="#IRC-eventFns-speakElapsed">#</a> IRC.eventFns.<b>speakElapsed</b>(<i>nick</i>) -> <i>array</i>

an *array* of elapsed speak events for a specific user with the same format as [IRC.event](#IRC-event)

<a name="IRC-eventFns-tickElapsed" href="#IRC-eventFns-tickElapsed">#</a> IRC.eventFns.<b>tickElapsed</b>() -> <i>array</i>

an *array* of elapsed tick events for a specific user with the same format as [IRC.event](#IRC-event)

<a name="IRC-eventFns-delete" href="#IRC-eventFns-delete">#</a> IRC.eventFns.<b>delete</b>(<i>index</i>)

used to delete events

### timers

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

the `node` proxy allows you to send raw commands and update config options on the fly. examples of its use can be seen in the following commands; `reboot`, `update`, `join`, `part`, `mode`, `topic`, `kick`, `nick`, `redirect`, `ignore`

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

## Configuration

**all properties are optional**. [see the example config](config.json.example)

all root properties (except `timezone` and `web`) are global, and can also placed inside the server config for a local override

* `trigger` _string_ &emsp; the prefix to use for running commands (default: `~`)
* `nickname` _string_ &emsp; nickname
* `userName` _string_ &emsp; username shown in whois information
* `realName` _string_ &emsp; real name shown in whois information
* `floodProtection` _boolean_ &emsp; should flood protection be enabled (default: `true`)
* `floodProtectionDelay` _number_ &emsp; set flood protection time delay in ms (default: `250`)
* `autoRejoin` _boolean_ &emsp; should the bot autorejoin channels when kicked (default: `true`)
* `enableIBIP` _boolean_ &emsp; should the bot conform to [IBIP](https://git.teknik.io/Teknikode/IBIP) standard (default: `true`)
* `enableCommands` _boolean_ &emsp; should commands be triggerable (default: `true`)
* `commandLimit` _number_ &emsp; limit the number of times functions that manipulate commands can be used in a single REPL call (default: `2`)
* `logCommands` _bool_ &emsp; should messages that trigger commands be logged (default: `true`)
* `ignoreHosts` _array_ &emsp; list of hostnames to ignore for events and messages entirely
* `admins` _array_ &emsp; list of nicknames of users that have access to [IRC.sudo](#IRC-sudo)
* `colors` _boolean_ &emsp; should colours and formatting be enabled (default: `true`)
* `fetchURL` _boolean_ &emsp; should URLs posted in channel have their titles displayed (default: `true`)
* `secrets` _object_ &emsp; keys in this object correspond to commands that have an [IRC.secret](#IRC-secret) value
* `broadcastCommands` _array_ &emsp; list of commands that are able to use the *target* property of [print](#print)
* `timezone` _string_ &emsp; timezone to use for dates (default: `Europe/London`)
* `web` _object_ &emsp; configuration for the web frontend
    * `url` _string_ &emsp; web address for the frontend, available at [IRC.webAddress](#IRC-webAddress)
    * `port` _number_ &emsp; port to host the content at
    * `socketURL` _string_ &emsp; websocket URL to connect to
    * `password` _string_ &emsp; logging in to the web interface allows you to modify locked commands
* `servers` _array_ &emsp; list of IRC servers to connect to 
    * `address` _string_ &emsp; for example: `irc.freenode.org`
    * `password` _string_ &emsp; password to use for services authentication
    * `channels` _array_ &emsp; list of channels to join. (can just be a list of strings of channel names)
        * `name` _string_ &emsp; channel name to join. for example: `##rust`
        * `lineLimit` _number_ &emsp; maximum number of lines a command can display (default: `10`)
        * `setNick` _boolean_ &emsp; does anyone in this channel have access to [IRC.setNick](#IRC-setNick) (default: `false`)
        * `fetchURLAll` _boolean_ &emsp; should every scraped URL be shown, or just 'useful' ones (default: `false`)
        * `ignoreEvents` _boolean_ &emsp; should this channel ignore `speak` and `tick` events (default: `false`)

## REPL

to run code in a JS interpreter, combine the [trigger](#IRC-trigger) prefix with one of the following symbols 

`>` prints the returned value and `>>`, `#` or `%` run code in an async IIFE

the REPL works as a command like any other, and `>` takes optional params. the params look like:

**>**(<i>depth</i>, <i>truncate</i>)

which correspond to the options from [IRC.inspect](#IRC-inspect)

## Flags

`--no-webpack` will disable rebuilding the frontend assets when run

`--dev` will enable development mode
