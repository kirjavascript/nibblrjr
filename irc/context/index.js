const { limit } = require('./limit');
const { ping } = require('./spawn');
const { getText, getJSON, getDOM } = require('./fetch');
const { getColorFuncs } = require('../evaluate/scripts/colors');
const { objectDebug } = require('../evaluate');
const { parseTime, formatTime } = require('./parse-time');
const { parseCommand } = require('../parse-command');
const { sudo, auth } = require('./access');
const dateFns = require('date-fns');
const fetch = require('node-fetch');
const _ = require('lodash');

function getContext({ print, notice, action, msgData, node }) {

    // const trigger = node.get('trigger', '!');

    // const channels = Object.entries(_.cloneDeep(node.client.chans))
    //     .reduce((acc, [key, value]) => {
    //         delete value.users;
    //         acc[key.toLowerCase()] = value;
    //         return acc;
    //     }, {});

    const IRC = {
        // trigger,
        // message: msgData,
        // colors: getColorFuncs(trigger),
        // nick: node.client.nick,
        // channels,
        // log: node.database.logFactory(msgData.target),
        // commandFns: node.parent.database.commands.getCommandFns(node),
        // eventFns: node.database.eventFactory(msgData.from),
        // resetBuffer: node.resetBuffer,
        // webAddress: _.get(node, 'parent.web.url', '[unspecified]'),
        // setEvent: (event) => {
        //     IRC.event = event;
        //     IRC.eventFns.addEvent = () => {
        //         throw new Error('cannot add an event in an event callback');
        //     };
        // },
        // setNick: (str) => {
        //     if (node.getChannelConfig(msgData.to).setNick) {
        //         str = String(str).replace(/[^a-zA-Z0-9]+/g, '');
        //         node.client.send('NICK', str);
        //         return true;
        //     } else {
        //         return false;
        //     }
        // },
        // whois: (text, callback) => text && node.client.whois(text, (data) => {
        //     try {
        //         callback(data);
        //     } catch (e) {
        //         print.error(e);
        //     }
        // }),
        ping,
        // parseTime,
        // parseCommand,
        // objectDebug,
        // breakHighlight: (s) => `${s[0]}\uFEFF${s.slice(1)}`,
        auth: (callback) => { auth({ IRC, callback, node, print }); },
        sudo: (callback) => { sudo({ IRC, callback, node, print }); },
        // command, require are patched later
    };

    const ctx = {
        // print,
        // notice,
        // action,
        getText: limit(getText),
        getJSON: limit(getJSON),
        getDOM: limit(getDOM),
        fetch: limit(fetch),
        // IRC,
        // setTimeout(...args) {
        //     return node.timeouts.push(setTimeout(...args));
        // },
        // setInterval(...args) {
        //     return node.intervals.push(setInterval(...args));
        // },
        // clearTimeout,
        // clearInterval,
        // dateFns,
        // _: { ..._, delay: void 0, defer: void 0, debounce: void 0, throttle: void 0 },
        // store, input, acquire are patched later
    };

    return ctx;
}

module.exports = {
    getContext,
};
