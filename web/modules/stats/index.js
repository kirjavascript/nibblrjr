import React, { useEffect, useRef, useState } from 'react';
import BarChart from './barchart';
import Filter from './filter';
import { useFetch } from '../hooks';

// TODO: change month, reset server and channel, add hash urls
// open code in modal on mobil

function Stats({ history, location }) {
    const { fetchAPI } = useFetch();
    const [base, setBase] = useState({ servers: [] });
    const node = useRef();

    useEffect(() => {
        const chart = new BarChart(node.current);

        fetchAPI('stats/activity')
            .then(res => {
                chart
                    .data(res.reverse(), d => d.name)
                    .render();
            })
            .catch(console.error);
    }, []);

    return (
        <div className="stats">
            <Filter
                history={history}
                location={location}
                base={base}
                onChange={({ month }) => {

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
            <div ref={node} />
            <h4>commands</h4>
            <pre>
                {JSON.stringify([base],0,4)}
            </pre>
        </div>
    );
}

export default Stats;
