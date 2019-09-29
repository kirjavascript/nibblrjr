
import d3 from '#lib/d3';

/*
 * methods for users; margin, width, height, data, render, onResize
 * TODO: extract into Chart class and extend
 * TODO: this.config { data, margin }
 * TODO: just set up axes and render for each chart (have canned axes)
 * IBCM
 */

export default class BarChart {
    // private
    firstRender = true;
    enableTransition = false;
    // public
    marginObj = {
        top: 40, right: 40, bottom: 40, left: 40,
    };
    dataObj = [];
    outerWidth = 960;
    outerHeight = 500;
    fixedWidth = false;
    onResizeCallback = () => {};

    constructor(node) {
        if (!node) {
            throw new Error('Please specify a Node or selector to this constructor');
        }
        this.container = d3.select(node);
        this.container.selectAll('*').remove();
    }

    // 'public' setters

    margin = (obj) => {
        Object.assign(this.margin, obj);
        return this;
    };

    width = (num) => {
        this.outerWidth = num;
        return this;
    };

    height = (num) => {
        this.outerHeight = num;
        return this;
    };

    data = (arr) => {
        if (arr.some((d) => !('key' in d))) {
            throw new Error('Each datum requires a key');
        }
        this.dataObj = arr;
        return this;
    };

    onResize = (cb) => {
        this.onResizeCallback = cb;
        return this;
    };

    // rendering / lifecycle methods

    // transition helper
    t = (selection) => do {
        if (this.enableTransition) {
            selection.transition();
        } else {
            selection;
        }
    };

    snapWidth = () => {
        if (!this.fixedWidth) {
            const node = this.container.node();
            this.outerWidth = node.getBoundingClientRect().width;
        }
    };

    getDimensions = () => {
        const {
            top, right, bottom, left,
        } = this.marginObj;
        return {
            width: this.outerWidth - left - right,
            height: this.outerHeight - top - bottom,
            top,
            right,
            bottom,
            left,
        };
    };

    preFirstRender = () => {
        if (!this.firstRender) return;
        this.snapWidth();
        window.addEventListener('resize', this.resize);

        // apply margins and add wrappers
        const {
            width, height, top, right, bottom, left,
        } = this.getDimensions();

        this.svg = this.container.append('svg').append('g');

        this.barG = this.svg.append('g'); // TODO: rename to something more generic

        this.xAxisG = this.svg
            .insert('g', 'g')
            .attr('class', 'axis x');
        this.yAxisG = this.svg
            .insert('g', 'g')
            .attr('class', 'axis y');
    };

    setScalesAndAxes = () => {
        const {
            width, height, top, right, bottom, left,
        } = this.getDimensions();
        // set margins / size
        this.t(this.container.select('svg'))
            .attr('width', width + left + right)
            .attr('height', height + top + bottom)
            .select('g')
            .attr('transform', `translate(${[left, top]})`);

        const domainMax = Math.max(...this.dataObj.map((d) => d.value));
        this.yScale = d3.scaleLinear()
            .domain([0, domainMax])
            .range([height, 0]);
        this.xScale = d3.scaleBand()
            .paddingInner(1 / 3)
            .paddingOuter(1 / 6)
            .rangeRound([0, width])
            .domain(this.dataObj.map((d) => d.key));
        this.xAxis = d3.axisBottom(this.xScale)
            .tickSize(5)
            // force correct label
            .tickFormat((d, i) => this.dataObj[i].label);
        this.t(this.xAxisG)
            .attr('transform', `translate(0,${height})`)
            .call(this.xAxis);
        this.yAxis = d3.axisLeft(this.yScale)
            .tickSize(5)
            .ticks(5);
        this.t(this.yAxisG)
            .call(this.yAxis);
    };

    render = () => {
        this.preFirstRender();
        this.setScalesAndAxes();

        const barAttrs = (selection) => {
            selection
                .attr('x', (d) => this.xScale(d.key))
                .attr('width', this.xScale.bandwidth())
                .attr('height', (d) => (
                    Math.abs(this.yScale(d.value) - this.yScale(0))
                ))
                .attr('y', (d) => this.yScale(Math.max(0, d.value)));
        };

        const barsSelect = this.barG.selectAll('.bar')
            .data(this.dataObj, (d) => d.key);

        barsSelect.exit().remove();

        const barsEnter = barsSelect.enter();

        barsEnter
            .append('rect')
            .classed('bar', 1)
            .call(barAttrs);

        this.t(barsSelect)
            .call(barAttrs);

        if (this.firstRender) {
            this.firstRender = false;
            this.enableTransition = true;
        }
        return this;
    };

    resize = () => {
        this.onResizeCallback(this);
        this.snapWidth();
        this.enableTransition = false;
        this.container.selectAll('*').interrupt();
        this.render();
        this.enableTransition = true;
    };

    destroy = () => {
        window.removeEventListener('resize', this.resize);
        this.container.selectAll('*').remove();
        this.firstRender = true;
        this.enableTransition = false;
    };
}
