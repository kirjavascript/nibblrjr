import React from 'react';
import { interpolateRainbow } from 'd3-scale-chromatic';

// color name from app
// animations?1

function getBest(items = [], accessor = 'count') {
    const max = items.reduce((acc, cur) => Math.max(acc, cur[accessor]), 0);
    return items.filter(d => d[accessor] === max);
}

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
            i == arr.length - 1 ? ' and ' : ', ',
            cur,
        ]);
}

function Factoids({ stats }) {
    const shouters = getBest(stats.shouting);
    const quizzical = getBest(stats.questions);

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
            {!!quizzical.length && (
                <p className="factoid">
                    <UserList items={quizzical} />
                    {' asked a total of ' + quizzical[0].count + ' '}
                    <span className="fact-type">
                        {plural('question', quizzical[0].count)}
                    </span>
                </p>
            )}
            <pre>{JSON.stringify(getBest(stats.questions))}</pre>
        </div>
    );
}

export default Factoids;
