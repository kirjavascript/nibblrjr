<<<<<<< HEAD
// from object-inspect, modified for IRC and extended
=======
// from object-inspect, extended and modified for IRC
>>>>>>> webstats
// original licence follows
//
// This software is released under the MIT license:

// Copyright (c) 2013 James Halliday

// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = (obj, opts = {}) => {
    const output = inspect_(obj, opts);
    const { truncate = 390 } = opts;
    return output.length > truncate && truncate > 0
        ? output.slice(0, truncate) + '\u000f ...'
        : output;
};

const codes = { r: '04', dr: '05', w: '00', bl: '01', c: '11', dc: '10', b: '12', db: '02', g: '09', dg: '03', p: '13', dp: '06', o: '07', y: '08', gr: '15', dgr: '14' };

let hasColors = true;
const color = (code, text) => {
    return hasColors ? `\u0003${codes[code]}${text}\u000f` : text;
}

var inspectSymbol = module.exports.symbol = Symbol('inspect');

var hasMap = typeof Map === 'function' && Map.prototype;
var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, 'size') : null;
var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === 'function' ? mapSizeDescriptor.get : null;
var mapForEach = hasMap && Map.prototype.forEach;
var hasSet = typeof Set === 'function' && Set.prototype;
var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, 'size') : null;
var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === 'function' ? setSizeDescriptor.get : null;
var setForEach = hasSet && Set.prototype.forEach;
var booleanValueOf = Boolean.prototype.valueOf;
var objectToString = Object.prototype.toString;
var dateToISO = Date.prototype.toISOString;
var bigIntValueOf = typeof BigInt === 'function' ? BigInt.prototype.valueOf : null;

function inspect_(obj, opts, depth, seen) {
    if (!opts) opts = {};
    hasColors = opts.colors !== false;

    if (has(opts, 'quoteStyle') && (opts.quoteStyle !== 'single' && opts.quoteStyle !== 'double')) {
        throw new TypeError('option "quoteStyle" must be "single" or "double"');
    }

    if (typeof obj === 'undefined') {
        return color('dgr', 'undefined');
    }
    if (obj === null) {
        return color('p', 'null');
    }
    if (typeof obj === 'boolean') {
        return color('o', obj ? 'true' : 'false');
    }

    if (typeof obj === 'string') {
        return inspectString(obj, opts);
    }
    if (typeof obj === 'number') {
      if (obj === 0) {
        return color('o', Infinity / obj > 0 ? '0' : '-0');
      }
      return color('o', String(obj));
    }
    if (typeof obj === 'bigint') {
      return color('o', String(obj) + 'n');
    }

    var maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
    if (typeof depth === 'undefined') depth = 0;
    if (depth >= maxDepth && maxDepth > 0 && typeof obj === 'object') {
        return color('dc', '[Object]');
    }

    if (typeof seen === 'undefined') seen = [];
    else if (indexOf(seen, obj) >= 0) {
        return color('r', '[Circular]');
    }

    function inspect(value, from) {
        if (from) {
            seen = seen.slice();
            seen.push(from);
        }
        return inspect_(value, opts, depth + 1, seen);
    }

    if (typeof obj === 'object') {
        if (inspectSymbol && typeof obj[inspectSymbol] === 'function') {
            return obj[inspectSymbol]();
        }
    }

    if (typeof obj === 'function') {
        const name = nameOf(obj);
        const isAsync = nameOf(obj.constructor || {}) === 'AsyncFunction';
        const defn = `[${isAsync ? 'Async' : ''}Function${(name ? ': ' + name : '')}]`;
        // if (!Object.keys(obj).length) {
            return color('dc', defn);
        // } else {
        //     return `{ ${defn} ${arrObjKeys(obj), inspect).join(', ')} }`;
        // }
    }
    if (isSymbol(obj)) {
        var symString = Symbol.prototype.toString.call(obj);
        return color('dg', typeof obj === 'object' ? markBoxed(symString) : symString);
    }
    if (isElement(obj)) {
        var s = '<' + String(obj.nodeName).toLowerCase();
        var attrs = obj.attributes || [];
        for (var i = 0; i < attrs.length; i++) {
            s += ' ' + attrs[i].name + '=' + wrapQuotes(quote(attrs[i].value), 'double', opts);
        }
        s += '>';
        if (obj.childNodes && obj.childNodes.length) s += '...';
        s += '</' + String(obj.nodeName).toLowerCase() + '>';
        return s;
    }
    if (isArray(obj)) {
        if (obj.length === 0) return '[]';
        if (obj.length > 1000) return `[ ${arrObjKeys(obj.slice(0, 1000), inspect).join(', ')} ... ${obj.length - 1000} more items ]`
        return `[ ${arrObjKeys(obj, inspect).join(', ')} ]`;
    }
    if (isError(obj)) {
        var parts = arrObjKeys(obj, inspect);
        if (parts.length === 0) return '[' + String(obj) + ']';
        return '{ [' + String(obj) + '] ' + parts.join(', ') + ' }';
    }
    if (isMap(obj)) {
        var parts = [];
        mapForEach.call(obj, function (value, key) {
            parts.push(inspect(key, obj) + ' => ' + inspect(value, obj));
        });
        return collectionOf('Map', mapSize.call(obj), parts);
    }
    if (isSet(obj)) {
        var parts = [];
        setForEach.call(obj, function (value ) {
            parts.push(inspect(value, obj));
        });
        return collectionOf('Set', setSize.call(obj), parts);
    }
    if (isNumber(obj)) {
        return markBoxed(inspect(Number(obj)));
    }
    if (isBigInt(obj)) {
        return markBoxed(inspect(bigIntValueOf.call(obj)));
    }
    if (isBoolean(obj)) {
        return markBoxed(booleanValueOf.call(obj));
    }
    if (isString(obj)) {
        return markBoxed(inspect(String(obj)));
    }
    if (isDate(obj)) {
        return color('dp', dateToISO.call(obj));
    }
    if (isRegExp(obj)) {
        return color('dr', String(obj));
    }
    if (isPromise(obj)) {
        return 'Promise {}';
    }
    if (isIterator(obj)) {
        return 'Iterator {}';
    }
    var xs = arrObjKeys(obj, inspect);
    if (xs.length === 0) return '{}';
    return '{ ' + xs.join(', ') + ' }';
};

function wrapQuotes (s, defaultStyle, opts) {
    var quoteChar = (opts.quoteStyle || defaultStyle) === 'double' ? '"' : "'";
    return color('dg', quoteChar + s + quoteChar);
}

function quote (s) {
    return String(s).replace(/"/g, '&quot;');
}

function isArray (obj) { return toStr(obj) === '[object Array]'; }
function isDate (obj) { return toStr(obj) === '[object Date]'; }
function isRegExp (obj) { return toStr(obj) === '[object RegExp]'; }
function isError (obj) { return toStr(obj) === '[object Error]'; }
function isSymbol (obj) { return toStr(obj) === '[object Symbol]'; }
function isString (obj) { return toStr(obj) === '[object String]'; }
function isNumber (obj) { return toStr(obj) === '[object Number]'; }
function isBigInt (obj) { return toStr(obj) === '[object BigInt]'; }
function isBoolean (obj) { return toStr(obj) === '[object Boolean]'; }
function isPromise (obj) { return toStr(obj) === '[object Promise]'; }
function isIterator (obj) { return obj != null && typeof obj[Symbol.iterator] === 'function'; }

var hasOwn = Object.prototype.hasOwnProperty || function (key) { return key in this; };
function has (obj, key) {
    return hasOwn.call(obj, key);
}

function toStr (obj) {
    return objectToString.call(obj);
}

function nameOf (f) {
    if (f.name) return f.name;
    var m = String(f).match(/^function\s*([\w$]+)/);
    if (m) return m[1];
}

function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) return i;
    }
    return -1;
}

function isMap (x) {
    if (!mapSize) {
        return false;
    }
    try {
        mapSize.call(x);
        try {
            setSize.call(x);
        } catch (s) {
            return true;
        }
        return x instanceof Map; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isSet (x) {
    if (!setSize) {
        return false;
    }
    try {
        setSize.call(x);
        try {
            mapSize.call(x);
        } catch (m) {
            return true;
        }
        return x instanceof Set; // core-js workaround, pre-v2.5.0
    } catch (e) {}
    return false;
}

function isElement (x) {
    if (!x || typeof x !== 'object') return false;
    if (typeof HTMLElement !== 'undefined' && x instanceof HTMLElement) {
        return true;
    }
    return typeof x.nodeName === 'string'
        && typeof x.getAttribute === 'function'
    ;
}

function inspectString (str, opts) {
    var s = str.replace(/(['\\])/g, '\\$1').replace(/[\x00-\x1f]/g, lowbyte);
    return wrapQuotes(s, 'single', opts);
}

function lowbyte (c) {
    var n = c.charCodeAt(0);
    var x = { 8: 'b', 9: 't', 10: 'n', 12: 'f', 13: 'r' }[n];
    if (x) return '\\' + x;
    return '\\x' + (n < 0x10 ? '0' : '') + n.toString(16);
}

function markBoxed (str) {
    return 'Object(' + str + ')';
}

function collectionOf (type, size, entries) {
    return type + ' (' + size + ') {' + entries.join(', ') + '}';
}

function emptySlots (qty) {
    return color('dgr', `<${qty} empty slot${qty > 1 ? 's' : ''}>`);
}

function arrObjKeys (obj, inspect) {
    var isArr = isArray(obj);
    var xs = [];
    if (isArr) {
        xs.length = obj.length;
        for (var i = 0; i < obj.length; i++) {
            xs[i] = has(obj, i) ? inspect(obj[i], obj) : '';
        }
        // combine empty slots
        const withEmpty = [];
        let qty = 0;
        for (let i = 0; i < xs.length; i++) {
            const el = xs[i];
            if (el === '') {
                qty += 1;
            }
            if ((el === '' && i === xs.length - 1) || el !== '' && qty > 0) {
                withEmpty.push(emptySlots(qty));
                qty = 0;
            }
            if (el !== '') {
                withEmpty.push(el);
            }
        }
        xs = withEmpty;
    }
    for (var key in obj) {
        if (!has(obj, key)) continue;
        if (isArr && String(Number(key)) === key && key < obj.length) continue;
        if (/[^\w$]/.test(key)) {
            xs.push(inspect(key, obj) + ': ' + inspect(obj[key], obj));
        } else {
            xs.push(key + ': ' + inspect(obj[key], obj));
        }
    }
    return xs;
}
