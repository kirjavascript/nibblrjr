import React, { useEffect, useRef } from 'react';
import BarChart from './barchart';

// import * as d3 from 'd3';

// stats main / server / channel as FILTER w/ URL / time period


function Stats() {
    const node = useRef();

    useEffect(() => {
        const chart = new BarChart(node.current);

        fetch('/api/stats/activity', {credentials: 'include'})
            .then(res => res.json())
            .then(res => {
                console.log(res);


                chart
                    .data(res, d => d.name)
                    .render();
            })
            .catch(console.error);
    });

    return (
        <div className="stats">
            <div ref={node} />
        </div>
    );
}

export default Stats;
