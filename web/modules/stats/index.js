import React, { useEffect, useRef, useState } from 'react';
import BarChart from './barchart';
import Filter from './filter';
import { useFetch } from '../hooks';

// slider for month
// open code in modal on mobil

function Stats({ history, location }) {
    const { fetchAPI } = useFetch();
    const [base, setBase] = useState({ servers: [] });
    const [stats, setStats] = useState({ activity: [] });

    const node = useRef();
    const activity = useRef();

    useEffect(() => {
        if (!activity.current) {
            activity.current = new BarChart(node.current);
        }
        const deduped = stats.activity.reduce((acc, cur) => {
            const found = acc.find(d => d.user === cur.user);
            if (found) {
                found.count += cur.count;
            } else {
                acc.push(cur);
            }
            return acc;
        }, []);
        deduped.sort((a, b) => b.count - a.count);
        activity.current
            .data(deduped.slice(0, 10).reverse(), d => d.user)
            .render(true);
    }, [stats.activity]);

    return (
        <div className="stats">
            <Filter
                history={history}
                location={location}
                base={base}
                onChange={({ month, server, channel }) => {
                    fetchAPI('stats/all', {
                        body: { month, server, channel },
                        method: 'POST',
                    })
                        .then(setStats)
                        .catch(console.error);
                }}
                onMonth={({ month }) => {
                    fetchAPI('stats/base', {
                        body: { month },
                        method: 'POST',
                    })
                        .then(setBase)
                        .catch(console.error);
                }}
            />
            <h4>commands</h4>
            <span>{base.commands}</span>
            <h4>uptime</h4>
            <span>{base.uptime}h</span>
            <h4>servers</h4>
            <span>{base.servers.length}</span>
            <div ref={node} />
            <pre>
                {JSON.stringify([stats, base],0,4)}
            </pre>
        </div>
    );
}

export default Stats;
