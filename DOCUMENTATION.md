<!---
sub menu
talk about module convention
describe basic commands
REPL - can take params
WEB
replace ~help (not commands)
-->


# nibblrjr documentation - (WIP)

* [API Reference](#api-reference)
* [Configuration](#configuration)

## API Reference

### functions for printing text 

<a name="print" href="#print">#</a> <b>print</b>(<i>string</i>{, <i>options</i>})

prints text using the colour parser from <a href="#IRC-colors">IRC.colors</a>

**_options_**

* `log` - _boolean_ &emsp; setting `false` will omit bot messages from the log
* `target` - _string_ &emsp; channel / user to send to (only works if the command is included in the `broadcast-commands` config array)

<a name="notice" href="#notice">#</a> <b>notice</b>(<i>string</i>{, <i>options</i>})

same as <a href="#print">print</a> but for notices

<a name="action" href="#action">#</a> <b>action</b>(<i>string</i>{, <i>options</i>})

same as <a href="#print">print</a> but for actions

### sub methods for printing functions

<a name="log" href="#log">#</a> <i>printer</i>.<b>log</b>(<i>object</i>{, <i>options</i>})

renders and prints an object using <a href="#IRC-inspect">IRC.inspect</a>

options can be those of <a href="#print">print</a> and <a href="#IRC-inspect">IRC.inspect</a>

<a name="raw" href="#raw">#</a> <i>printer</i>.<b>raw</b>(<i>string</i>{, <i>options</i>})

prints text without parsing the colour DSL

<a name="error" href="#error">#</a> <i>printer</i>.<b>error</b>(<i>error</i>{, <i>options</i>})

prints errors with <a href="#IRC-colors-error">IRC.colors.error</a>

<a name="info" href="#info">#</a> <i>printer</i>.<b>info</b>(<i>string</i>{, <i>options</i>})

prints text with <a href="#IRC-colors-info">IRC.colors.info</a>

<a name="success" href="#success">#</a> <i>printer</i>.<b>success</b>(<i>string</i>{, <i>options</i>})

prints text with <a href="#IRC-colors-success">IRC.colors.success</a>

### functions for fetching data

<a name="fetchsync" href="#fetchsync">#</a> <b>fetchSync</b>(<i>url</i>{, <i>options</i>}) -> <i>data</i>

works the same as [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) but is synchronous. options are the same as [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) with the addition;

* `type` - _string_ &emsp; can be `text`, `json` or `dom`

the `dom` option is useful for scraping websites or RSS feeds

```javascript
const { window, document } = fetchSync('http://google.com', {type: 'json'});
```
<a href="#fetchsync">fetchSync</a> blocks, but each command is run concurrently in a separate vm - so other features continue to be responsive

the following functions are deprecated

<a name="getText" href="#getText">#</a> <b>getText</b>(<i>url</i>{, <i>options</i>}) -> <i>promise</i>  
<a name="getJSON" href="#getJSON">#</a> <b>getJSON</b>(<i>url</i>{, <i>options</i>}) -> <i>promise</i>  
<a name="getDOM" href="#getDOM">#</a> <b>getDOM</b>(<i>url</i>{, <i>options</i>}) -> <i>promise</i>

### functions for using npm packages

<a name="require" href="#require">#</a> <b>require</b>(<i>packagename</i>) -> <i>object</i>

download a package from npm and bundle it with webpack. npm scripts are ignored for safety. subsequent accesses of the same package are cached

*packagename* can include the version and a path, like - `require('react-dom/server@16.8.6').renderToString( ... )`

package namespaces are currently broken

not everything works, compatibility fares better the closer you get to ECMAScript

the following command is deprecated

<a name="acquire" href="#acquire">#</a> <b>acquire</b>(<i>packagename</i>) -> <i>promise</i>

### functions for storing data

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

equal to **IRC.command.root**

different commands store data in different namespaces, only commands with the same `root` share the same namespace

read more about `command.root` in <a href="#IRC-command">IRC.command</a>

there is an experimental react-hooks like API for dealing with non-string values in the command module `module.loadObject` that can be used with <a href="#IRC-require">IRC.require</a>

```javascript
const [scores, setScores] = IRC.require('module.loadObject')('someKey');
```

once the API is finalised, it'll be moved into the core

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
* `isPM` - _bool_ &emsp; if the original message was in PM

<a name="IRC-nick" href="#IRC-nick">#</a> IRC.<b>nick</b>

the current nickname of the bot

<a name="IRC-command" href="#IRC-command">#</a> IRC.<b>command</b>

a parsed representation of the current command

* `path` - _string_ &emsp; the actual command requested ( ~**full.path** )
* `list` - _array_ &emsp; the path, split by the `.` character
* `params` - _array_ &emsp; list of strings from the command ( ~full.path(**param, ...**) )
* `root` - _string_ &emsp; the command namespace ( ~**full**.path )
* `input` - _string_ &emsp; the text after the command ( ~command **some text** )

<a name="IRC-channels" href="#IRC-channels">#</a> IRC.<b>channels</b>

an *object* containing information about channels

<a name="IRC-webAddress" href="#IRC-webAddress">#</a> IRC.<b>webAddress</b>

config-defined URL pointing to the web frontend

<a name="IRC-epoch" href="#IRC-epoch">#</a> IRC.<b>epoch</b>

*date* object indicating when the node process was started

<a name="IRC-version" href="#IRC-version">#</a> IRC.<b>version</b>

current version

<a name="IRC-secret" href="#IRC-secret">#</a> IRC.<b>secret</b>

a config-defined value for a specific command root. useful for API keys

### functions for colours / formatting

<a name="IRC-colors" href="#IRC-colors">#</a> IRC.<b>colors</b>

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
    {rand}random
    {bell}ascii beep
    {/}cancel effects

`{r}red{/} and {bo}bold{/} and {rb}rainbow{/}`


```javascript
with(IRC.colors) {
    print(`${link()}`)
}

## Configuration
