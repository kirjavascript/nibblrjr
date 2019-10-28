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

        this.svg = this.container.append('canvas');

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
        // zoom etc
    };

    render = (update = false) => {
        this.outerWidth = this.container.node().getBoundingClientRect().width;

        const height = 800;
        const width = 1000;

        const canvas = this.svg.node();

        this.svg
            .style('border', '1px solid red')
            .attr('width', width)
            .attr('height', height)
            .call(d3.drag()
                  .container(canvas)
                  .subject(dragsubject)
                  .on("start", dragstarted)
                  .on("drag", dragged)
                  .on("end", dragended));


        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        const { links, nodes } = this.config;

        // var lines = this.svg.append('g')
        //     .selectAll('line')
        //     .data(links)
        //     .enter()
        //     .append('line')
        //     .attr('stroke', 'steelblue')
        //     .attr('opacity', '.1')
        //     .attr('stroke-width', 2);


        // const circles = this.svg.append('g')
        //     .selectAll('circle')
        //     .data(nodes)
        //     .enter()
        //     .append('circle')
        //     .attr('r', 10)
        //     .attr('fill', 'green')
      // .call(d3.drag()
        //   .on("start", dragstarted)
        //   .on("drag", dragged)
        //   .on("end", dragended));

        // const names = this.svg.append('g')
        //     .selectAll('text')
        //     .data(nodes)
        //     .enter()
        //     .append('text')
        //     .text(d => d.id)

        // TODO: arc with arrows
        // TODO: lazy scroll load
        // TODO: simulation.stop() / cleanup

        const simulation = d3.forceSimulation()
            .nodes(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .strength(d => 1 / d.count)
            )
            .force('charge', d3.forceManyBody()
                .strength(() => -900)
            )
            .force('box', boxForce)
            .force('center', d3.forceCenter(width / 2, height / 2))
            .on('tick', () => {
                ctx.clearRect(0, 0, width, height);
                // links
                ctx.beginPath();
                links.forEach(d => {
                    ctx.moveTo(d.source.x, d.source.y);
                    ctx.lineTo(d.target.x, d.target.y);
                });
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';
                ctx.stroke();
                // nodes
                ctx.beginPath();
                nodes.forEach(d => {
                    ctx.moveTo(d.x + 10, d.y);
                    ctx.arc(d.x, d.y, 10, 0, 2 * Math.PI);
                });
                ctx.fillStyle = 'green';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.strokeWidth = 4;
                ctx.stroke();
                // lines
                //     .attr('x1', d => d.source.x)
                //     .attr('y1', d => d.source.y)
                //     .attr('x2', d => d.target.x)
                //     .attr('y2', d => d.target.y)
                // circles
                //     .attr('cx', d => d.x)
                //     .attr('cy', d => d.y)

                // names
                //     .attr('x', d => d.x)
                //     .attr('y', d => d.y)
            });

function dragsubject() {
    return simulation.find(d3.event.x, d3.event.y);
}

function dragstarted() {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d3.event.subject.fx = d3.event.subject.x;
  d3.event.subject.fy = d3.event.subject.y;
}

function dragged() {
  d3.event.subject.fx = d3.event.x;
  d3.event.subject.fy = d3.event.y;
}

function dragended() {
  if (!d3.event.active) simulation.alphaTarget(0);
  d3.event.subject.fx = null;
  d3.event.subject.fy = null;
}
function boxForce() {
    const radius = 100;
    for (var i = 0, n = nodes.length; i < n; ++i) {
        const curr_node = nodes[i];
        curr_node.x = Math.max(radius, Math.min(width - radius, curr_node.x));
        curr_node.y = Math.max(radius, Math.min(height - radius, curr_node.y));
    }
}
    };

};
