import React from 'react';

// color name from app
// animations?1

function getBest(items = [], accessor = 'count') {
    const max = items.reduce((acc, cur) => Math.max(acc, cur[accessor]), 0);
    return items.filter(d => d[accessor] === max);
}

function quantity(n) {
    return n == 1 ? 'once' : n == 2 ? 'twice' : `${n} times`;
}

function Factoids({ stats }) {
    const shouting = getBest(stats.shouting);
    // TODO: sort out draw with AND

    return (
        <>
            {!!shouting.length && (
                <p>
                    shouted in <span>ALL CAPS</span> {quantity(shouting[0].count)}
                </p>
            )}
            <pre>
                {JSON.stringify(getBest(stats.shouting))}
            </pre>
        </>
    );
}

export default Factoids;
