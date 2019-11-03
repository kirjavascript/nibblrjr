import React, { useState } from 'react';
import Filter from './filter';
import { useFetch } from '../hooks';
import BarChart from './barchart';
import LineChart from './linechart';
import ForceSim from './forcesim';

// homepage = readme?
// update readme link to doc / add stats
// slider for month
// open code in modal on mobil
// TABLES G/S/B kicks

function Stats({ history, location }) {
    const { fetchAPI } = useFetch();
    const [base, setBase] = useState({ servers: [] });
    const [stats, setStats] = useState({});
    console.log(stats);

    return (
        <>
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
                <div className="row">
                    <div className="base">
                        <h4>total commands</h4>
                        <span>{base.commands}</span>
                        <h4>uptime</h4>
                        <span>{base.uptime}h</span>
                    </div>
                    <div className="command-chart">
                        <h3 className="title">most used commands</h3>
                        <BarChart
                            items={stats.commands}
                            accessor={d => d.command}
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="half">
                        <h3 className="title">activity / days</h3>
                        <LineChart
                            items={stats.activityDays}
                            accessor={d => d.day}
                            tickFormatX={d => +d.slice(3)}
                        />
                    </div>
                    <div className="half">
                        <h3 className="title">activity / hours</h3>
                        <LineChart
                            items={stats.activityHours}
                            accessor={d => d.hour}
                        />
                    </div>
                </div>
            </div>
            <div style={{borderTop: '5px solid rgba(235, 51, 110)'}}>
                <ForceSim items={stats.links} />
            </div>
        </>
    );
}

export default Stats;
