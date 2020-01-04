import React from 'react';
import { interpolateRainbow } from 'd3-scale-chromatic';

function quantity(n) {
    return n == 1 ? 'once' : n == 2 ? 'twice' : `${n} times`;
}

function plural(str, n) {
    return str + (n > 1 ? 's' : '');
}

function color(str) {
    return interpolateRainbow(adler32(str) / 32640);
}

function adler32(str) {
    const [a, b] = [...str].reduce(
        ([a, b], cur) => {
            const next = (a + cur.charCodeAt()) % 0xfff1;
            return [next, (b + next) % 0xfff1];
        },
        [1, 0],
    );
    return (b << 0x10) | a;
}

function getBest(items = [], accessor = 'count', type = 'max') {
    const cmp = type == 'max' ? 0 : Infinity;
    const max = items.reduce((acc, cur) => Math[type](acc, cur[accessor]), cmp);
    return items.filter(d => d[accessor] === max);
}

function UserList({ items }) {
    return items
        .map(d => (
            <span
                key={d.user}
                className="name"
                style={{ color: color(d.user) }}
            >
                {d.user}
            </span>
        ))
        .reduce((acc, cur, i, arr) => [
            acc,
            // oxford comma disambiguates multiple lists
            i == arr.length - 1 ? (i-1?',':'') + ' and ' : ', ',
            cur,
        ]);
}

function Factoids({ stats }) {
    const shouters = getBest(stats.shouting);
    const questioners = getBest(stats.questions);
    const kickers = getBest(stats.kicks);
    const kickees = getBest(stats.kicked);
    const avgLowPpl = getBest(stats.avgLineLengthLow, 'average', 'min');
    const avgHighPpl = getBest(stats.avgLineLengthHigh, 'average');

    return (
        <div className="factoids">
            {!!shouters.length && (
                <p className="factoid">
                    <UserList items={shouters} />
                    {' shouted in '}
                    <span className="fact-type">ALL CAPS</span>
                    {' ' + quantity(shouters[0].count)}
                </p>
            )}
            {!!questioners.length && (
                <p className="factoid">
                    <UserList items={questioners} />
                    {' asked a total of ' + questioners[0].count + ' '}
                    <span className="fact-type">
                        {plural('question', questioners[0].count)}
                    </span>
                </p>
            )}
            {!!kickers.length && (
                <p className="factoid">
                    <UserList items={kickers} />
                    <span className="fact-type">
                        {' kicked '}
                    </span>
                    {kickers[0].count + ' '}
                    {kickers[0].count > 1 ? ' people' : ' person'}
                </p>
            )}
            {!!kickees.length && (
                <p className="factoid">
                    <UserList items={kickees} />
                    <span className="fact-type">
                        {' got kicked '}
                    </span>
                    {quantity(kickees[0].count)}
                </p>
            )}

            {!!avgHighPpl.length && (
                <p className="factoid">
                    {'for '}
                    <span className="fact-type">
                        {' average line length '}
                    </span>
                    <UserList items={avgHighPpl} />
                    {' had ' + (0 | avgHighPpl[0].average) + ' and '}
                    <UserList items={avgLowPpl} />
                    {' had ' + (0 | avgLowPpl[0].average)}
                </p>
            )}
        </div>
    );
}

export default Factoids;
