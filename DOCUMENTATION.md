## nibblrjr documentation - (WIP)

* [API Reference](#api-reference)
* [Configuration](#configuration)

### API Reference

#### functions for printing text

<a name="print" href="#print">#</a> <b>print</b>(<i>string</i>[, <i>options</i>])

prints text using the colour parser from <a href="#IRC-colors">IRC.colors</a>

**_options_**

* `log` - _boolean_ &emsp; setting `false` will omit bot messages from the log
* `target` - _string_ &emsp; channel / user to send to (only works if the command is included in the `broadcast-commands` config array)

<a name="notice" href="#notice">#</a> <b>notice</b>(<i>string</i>[, <i>options</i>])

same as <a href="#print">print</a> but for notices

<a name="action" href="#action">#</a> <b>action</b>(<i>string</i>[, <i>options</i>])

same as <a href="#print">print</a> but for actions

#### sub methods for printing functions

<a name="log" href="#log">#</a> <i>printer</i>.<b>log</b>(<i>object</i>[, <i>options</i>])

renders and prints an object using <a href="#IRC-inspect">IRC.inspect</a>

options can be those of <a href="#print">print</a> and <a href="#IRC-inspect">IRC.inspect</a>

<a name="raw" href="#raw">#</a> <i>printer</i>.<b>raw</b>(<i>string</i>[, <i>options</i>])

prints text without parsing the colour DSL

<a name="error" href="#error">#</a> <i>printer</i>.<b>error</b>(<i>error</i>[, <i>options</i>])

prints errors with <a href="IRC-colors-error">IRC.colors.error</a>

<a name="info" href="#info">#</a> <i>printer</i>.<b>info</b>(<i>string</i>[, <i>options</i>])

prints text with <a href="IRC-colors-info">IRC.colors.info</a>

<a name="success" href="#success">#</a> <i>printer</i>.<b>success</b>(<i>string</i>[, <i>options</i>])

prints text with <a href="IRC-colors-success">IRC.colors.success</a>

#### functions for fetching data



### Configuration
