import React, { useEffect, useRef, useState, useMemo } from 'react';
import BarChart from './barchart';
import Filter from './filter';

// stats main / server / channel as FILTER w/ URL / time period
// open code in modal on mobil

function Stats({ history, location }) {
    const node = useRef();
    const [base, setBase] = useState({ servers: [] });

    useEffect(() => {
        const chart = new BarChart(node.current);

        fetch('/api/stats/activity')
            .then(res => res.json())
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
                onMonth={() => {
                    fetch('/api/stats/base')
                        .then(res => res.json())
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
