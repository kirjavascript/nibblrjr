import React, { useRef, useEffect } from 'react';

const d3 = Object.assign({},
    require('d3-selection'),
    require('d3-scale'),
    require('d3-axis'),
    require('d3-transition'),
);

function rect({ x, y, width, height, radius = 3 }) {
    if (radius > height) {
        radius = height;
    }

    if (width < radius * 2) {
        radius = width /2;
    }

    return `
        M${x},${y + height}
        v${-height + radius}
        a${radius},${radius} 0 0 1 ${radius},${-radius}
        h${width - 2*radius}
        a${radius},${radius} 0 0 1 ${radius},${radius}
        v${height - radius}
        z
    `.replace(/\s\s+/g, ' ');
}

export default function BarChart({ items, accessor }) {
    const node = useRef();
    const chart = useRef();

    useEffect(() => {
        if (!chart.current) {
            chart.current = new BarChartObj(node.current);
        }
        const deduped = items.reduce((acc, cur) => {
            const found = acc.find(d => accessor(d) === accessor(cur));
            if (found) {
                found.count += cur.count;
            } else {
                acc.push(cur);
            }
            return acc;
        }, []);
        deduped.sort((a, b) => b.count - a.count);
        chart.current
            .data(deduped.slice(0, 10).reverse(), accessor)
            .render(true);

    }, [items]);

    return (
        <div ref={node} />
    );
}

class BarChartObj {
    config = {
        margin: {
            top: 5, right: 20, bottom: 40, left: 60,
        },
        height: 400,
        data: undefined,
        accessor: d => d.label,
    };

    get dimensions() {
        const { top, right, bottom, left } = this.config.margin;
        return {
            width: this.outerWidth - left - right,
            height: this.config.height - top - bottom,
            top,
            right,
            bottom,
            left,
        };
    }

    container;
    svg;
    main;
    contents;
    xAxisG;
    yAxisG;
    outerWidth;

    constructor(node) {
        this.container = d3.select(node);
        this.container.selectAll('*').remove();

        this.svg = this.container.append('svg');
        this.main = this.svg.append('g');
        this.contents = this.main.append('g');

        this.xAxisG = this.main
            .append('g')
            .attr('transform', `translate(0, ${this.dimensions.height})`)
            .attr('class', 'axis x');
        this.yAxisG = this.main
            .append('g')
            .attr('class', 'axis y');

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

    setWidth = () => {
        this.outerWidth = this.container.node().getBoundingClientRect().width;
    };

    resize = () => {
        this.render();
    };

    render = (update = false) => {
        this.setWidth();
        const { width, height, top, right, bottom, left } = this.dimensions;

        const trans = selection => update ? selection.transition() : selection;

        // set margins / size
        this.svg
            .attr('width', width + left + right)
            .attr('height', height + top + bottom);
        this.main
            .attr('transform', `translate(${[left, top]})`);

        // scales

        const domainMax = this.config.data.reduce((a, c) => Math.max(a, c.count), 0);
        const yScale = d3.scaleLinear()
            .domain([0, domainMax])
            .range([height, 0]);
        const xScale = d3.scaleBand()
            .paddingInner(1 / 3)
            .paddingOuter(1 / 6)
            .rangeRound([0, width])
            .domain(this.config.data.map(this.config.accessor));
        const xAxis = d3.axisBottom(xScale)
            .tickSize(10)
        trans(this.xAxisG)
            .attr('transform', `translate(0,${height})`)
            .call(xAxis)
            .selectAll('text')
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '.55em')
            .attr('transform', 'rotate(-14)' );
        const yAxis = d3.axisLeft(yScale)
            .tickSize(10)
            .ticks(12);
        trans(this.yAxisG)
            .call(yAxis);

        const barsSelect = this.contents.selectAll('.bar')
            .data(this.config.data, this.config.accessor);

        barsSelect.exit()
            .attr('opacity', 1)
            .transition()
            .attr('opacity', 0)
            .attr('d', rect({
                x: xScale.bandwidth(),
                width: xScale.bandwidth(),
                height: 0,
                y: height,
            }))
            .remove();

        const barsEnter = barsSelect.enter();

        const updateSelect = barsEnter
            .append('path')
            .classed('bar', 1)
            .attr('d', d => rect({
                x: xScale(this.config.accessor(d)),
                width: xScale.bandwidth(),
                height: 0,
                y: height,
            }))
            .merge(barsSelect);

        trans(updateSelect)
            .attr('d', d => rect({
                x: xScale(this.config.accessor(d)),
                width: xScale.bandwidth(),
                height: Math.abs(yScale(d.count) - yScale(0)),
                y: yScale(Math.max(0, d.count)),
            }))
    };

};
