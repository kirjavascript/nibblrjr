import React from 'react';
import color from './color';

function quantity(n) {
    return n == 1 ? 'once' : n == 2 ? 'twice' : `${n} times`;
}

function plural(str, n) {
    return str + (n > 1 ? 's' : '');
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
    const {
        shouting = [],
        questions = [],
        kicks = [],
        kicked = [],
        avgLineLengthLow = [],
        avgLineLengthHigh = [],
    } = stats;

    return (
        <div className="factoids">
            {!!shouting.length && (
                <p className="factoid">
                    <UserList items={shouting} />
                    {' shouted in '}
                    <span className="fact-type">ALL CAPS</span>
                    {' ' + quantity(shouting[0].count)}
                </p>
            )}
            {!!questions.length && (
                <p className="factoid">
                    <UserList items={questions} />
                    {' asked ' + questions[0].count + ' '}
                    <span className="fact-type">
                        {plural('question', questions[0].count)}
                    </span>
                </p>
            )}
            {!!kicks.length && (
                <p className="factoid">
                    <UserList items={kicks} />
                    <span className="fact-type">
                        {' kicked '}
                    </span>
                    {kicks[0].count + ' '}
                    {kicks[0].count > 1 ? ' people' : ' person'}
                </p>
            )}
            {!!kicked.length && (
                <p className="factoid">
                    <UserList items={kicked} />
                    <span className="fact-type">
                        {' got kicked '}
                    </span>
                    {quantity(kicked[0].count)}
                </p>
            )}

            {!!avgLineLengthHigh.length && (
                <p className="factoid">
                    {'for '}
                    <span className="fact-type">
                        {' average line length '}
                    </span>
                    <UserList items={avgLineLengthHigh} />
                    {' had ' + (0 | avgLineLengthHigh[0].average) + ' and '}
                    <UserList items={avgLineLengthLow} />
                    {' had ' + (0 | avgLineLengthLow[0].average)}
                </p>
            )}
        </div>
    );
}

export default Factoids;
