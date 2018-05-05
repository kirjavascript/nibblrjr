const { limit } = require('./limit');
const { ping } = require('./spawn');
const { getText, getJSON, getDOM } = require('./fetch');
const { parseColors } = require('../colors');
const { objectDebug } = require('../evaluate');
const { parseTime, formatTime } = require('./parse-time');
const dateFns = require('date-fns');
const _ = require('lodash');


function getContext({ print, notice, action, msgData, node }) {

    const IRC = {
        trigger: node.get('trigger', '!'),
        message: msgData,
        parseColors,
        nick: node.client.nick,
        channels: node.client.chans,
        setNick: (str) => {
            node.client.send('NICK', str);
        },
        setTopic: (str) => {
            node.client.send('TOPIC', msgData.target, str);
        },
        log: node.database.logFactory(msgData.target),
        commandFns: node.parent.database.commands.commandFns,
        eventFns: node.database.eventFactory(msgData.from),
        resetBuffer: node.resetBuffer,
        webAddress: _.get(node, 'parent.web.url', '[unspecified]'),
        setEvent: (event) => {
            IRC.event = event;
            IRC.eventFns.addEvent = () => {
                throw new Error('cannot add an event in an event callback');
            };
        },
        // command, require are patched later
    };

    const util = {
        ping,
        parseTime,
        objectDebug,
    };

    const ctx = {
        print,
        notice,
        action,
        getText: limit(getText),
        getJSON: limit(getJSON),
        getDOM: limit(getDOM),
        IRC,
        util,
        setTimeout(...args) {
            return node.timeouts.push(setTimeout(...args));
        },
        setInterval(...args) {
            return node.intervals.push(setInterval(...args));
        },
        dateFns,
        _: { ..._, delay: void 0, defer: void 0, debounce: void 0, throttle: void 0 },
        // store is patched after
    };

    return ctx;
}

module.exports = {
    getContext,
};
