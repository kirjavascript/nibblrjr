import React, { useRef, useEffect } from 'react';

const d3 = Object.assign({},
    require('d3-selection'),
    require('d3-force'),
);

export default function ForceSim({
    items = [],
    accessor,
    ...config
}) {
    const node = useRef();
    const chart = useRef();

    useEffect(() => {
        if (!chart.current) {
            chart.current = new ForceSimObj(node.current, config);
        }
        chart.current
            // .data(deduped, accessor)
            .render(true);
    }, [items]);

    useEffect(() => () => chart.current.destroy(), []);

    return (
        <div ref={node} />
    );
}

class ForceSimObj {
    config = {
        height: 400,
        data: {
            "nodes": [
                { "id": "0", "group": "1" },
                { "id": "1", "group": "2" },
                { "id": "2", "group": "2" },
                { "id": "3", "group": "2" },
                { "id": "4", "group": "2" },
                { "id": "5", "group": "3" },
                { "id": "6", "group": "3" },
                { "id": "7", "group": "3" },
                { "id": "8", "group": "3" }
            ],
            "links1": [
                { "source": "0", "target": "1", "id": "0"},
                { "source": "0", "target": "2", "id": "1"},
                { "source": "0", "target": "3", "id": "2"},
                { "source": "0", "target": "4", "id": "3"},
                { "source": "1", "target": "5", "id": "4"},
                { "source": "2", "target": "6", "id": "5"},
                { "source": "3", "target": "7", "id": "6"},
                { "source": "4", "target": "8", "id": "7"},
                { "source": "1", "target": "8", "id": "8"},
                { "source": "2", "target": "5", "id": "9"},
                { "source": "3", "target": "6", "id": "10"},
                { "source": "4", "target": "7", "id": "11"}
            ]
        },
    };

    container;
    svg;

    constructor(node, config = {}) {
        this.container = d3.select(node);
        this.container.selectAll('*').remove();
        Object.assign(this.config, config);

        this.svg = this.container.append('svg');

        window.addEventListener('resize', this.resize);
    }

    // public

    destroy = () => {
        window.removeEventListener('resize', this.resize);
        this.container.selectAll('*').remove();
    };

    data = (data, accessor) => {
        this.config.data = data;
        this.config.accessor = accessor;
        return this;
    };

    resize = () => {
        this.render();
    };

    render = (update = false) => {
        this.outerWidth = this.container.node().getBoundingClientRect().width;

    };

};
