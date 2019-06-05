## nibblrjr documentation - (WIP)

* [API Reference](#api-reference)
* [Configuration](#configuration)

### API Reference

#### functions for printing text

<a name="print" href="#print">#</a> <b>print</b>(<i>string</i>[, <i>options</i>])

prints text using the colour parser from IRC.color

**_options_**

* `log` - _boolean_ &emsp; setting `false` will omit bot messages from the log (default: `true`)
* `target` - _string_ &emsp; channel / user to send to (only works if the command is in included in the `broadcast-commands` config array)

<a name="notice" href="#notice">#</a> <b>notice</b>(<i>string</i>[, <i>options</i>])

same as **print** but for notices

<a name="action" href="#action">#</a> <b>action</b>(<i>string</i>[, <i>options</i>])

same as **print** but for actions

#### sub methods for printing functions

<a name="log" href="#log">#</a> <i>printer</i>.<b>log</b>(<i>object</i>[, <i>options</i>])

prints an object using IRC.inspect

### Configuration
