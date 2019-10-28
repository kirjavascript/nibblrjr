import React, { useRef, useEffect } from 'react';

const d3 = Object.assign({},
    require('d3-selection'),
    require('d3-force'),
    require('d3-drag'),
);

Object.defineProperty(d3, 'event', {
    get: function () {
        return require('d3-selection').event;
    },
});

export default function ForceSim({
    items: links = [],
    ...config
}) {
    const node = useRef();
    const chart = useRef();

    useEffect(() => {
        if (!chart.current) {
            chart.current = new ForceSimObj(node.current, config);
        }
        const nodes = links.map(d => d.source)
            .concat(links.map(d => d.target))
            .filter((d, i, a) => a.indexOf(d) === i);

        chart.current
            .data(links, nodes.map(node => ({ id: node })))
            .render(true);
    }, [links]);

    useEffect(() => () => chart.current.destroy(), []);

    return (
        <div ref={node} />
    );
}

class ForceSimObj {
    config = {
        height: 400,
        data: { },
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

    data = (links, nodes) => {
        this.config.links = links;
        this.config.nodes = nodes;
        return this;
    };

    resize = () => {
        // this.render();
        // TODO: free moving but resize canvas
    };

    render = (update = false) => {
        this.outerWidth = this.container.node().getBoundingClientRect().width;

        const height = 800;
        const width = 1000;

        this.svg
            .style('border', '1px solid red')
            .attr('width', width)
            .attr('height', height);

        const { links, nodes } = this.config;

        var lines = this.svg.append('g')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', 'steelblue')
            .attr('opacity', '.1')
            .attr('stroke-width', 2);


        const circles = this.svg.append('g')
            .selectAll('circle')
            .data(nodes)
            .enter()
            .append('circle')
            .attr('r', 10)
            .attr('fill', 'green')
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

        const names = this.svg.append('g')
            .selectAll('text')
            .data(nodes)
            .enter()
            .append('text')
            .text(d => d.id)

        // TODO: arc with arrows
        // TODO: lazy scroll load
        // TODO: group by server

        const simulation = d3.forceSimulation()
            .nodes(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                // .distance(d => d.count * 10)
                .strength(d => 1 / d.count)
            )
            .force('charge', d3.forceManyBody()
                .strength(() => -900)
                // .distanceMax(500)
            )
            .force("box_force", box_force)
            .force('center', d3.forceCenter(width / 2, height / 2))
            .on('tick', () => {
                lines
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y)
                circles
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y)

                names
                    .attr('x', d => d.x)
                    .attr('y', d => d.y)
            });

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}
const radius = 100;
function box_force() {
  for (var i = 0, n = nodes.length; i < n; ++i) {
    const curr_node = nodes[i];
    curr_node.x = Math.max(radius, Math.min(width - radius, curr_node.x));
    curr_node.y = Math.max(radius, Math.min(height - radius, curr_node.y));
  }
}
    };

};
