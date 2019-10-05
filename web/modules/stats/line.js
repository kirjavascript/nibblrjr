
//         const domainMax = this.config.data.reduce((a, c) => Math.max(a, c.count), 0);
//         const xScale = d3.scaleLinear()
//             .domain([0, this.config.data.length - 1])
//             .range([0, width]);
//         const yScale = d3.scaleLinear()
//             .domain([0, domainMax])
//             .range([height, 0]);
//         const xAxis = d3.axisBottom(xScale)
//             .tickSize(10)
//         this.xAxisG
//             .attr('transform', `translate(0,${height})`)
//             .call(xAxis)
//             .selectAll('text')
//             .style('text-anchor', 'end')
//             .attr('dx', '-.8em')
//             .attr('dy', '.55em')
//             .attr('transform', 'rotate(-14)' );
//         const yAxis = d3.axisLeft(yScale)
//             .tickSize(10)
//             .ticks(12);
//         this.yAxisG
//             .call(yAxis);

//         const line = d3.line()
//             .x((d, i) => xScale(i))
//             .y(d => yScale(d.count))
//             .curve(d3.curveMonotoneX)

//         this.contents.append("path")
//             .datum(this.config.data)
//             .attr("class", "line")
//             .attr("d", line);

//         this.contents.selectAll(".dot")
//             .data(this.config.data)
//             .enter().append("circle")
//             .attr("class", "dot")
//             .attr("cx", (d, i) => xScale(i))
//             .attr("cy", (d) => yScale(d.count))
//             .attr("r", 5)
