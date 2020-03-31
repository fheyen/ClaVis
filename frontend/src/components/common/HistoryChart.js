import React, { Component } from 'react';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { extent } from 'd3-array';
import { axisLeft, axisBottom } from 'd3-axis';
import { line } from 'd3-shape';
import Tools from '../../lib/Tools';
import '../../style/common/HistoryChart.css';

export default class HistoryChart extends Component {

    constructor(props) {
        super(props);
        this.state = {
            margin: {
                top: 5,
                right: 15,
                bottom: 20,
                left: 40
            }
        };
    }

    componentDidMount() {
        this.drawInitialLayout();
    }

    componentDidUpdate() {
        if (this.state.svg) {
            // only redraw when variable, history or size changed
            if (this.props.variable !== this.state.variable) {
                this.draw();
            }
            if (this.props.clfResult.history_smoothed !== this.state.history) {
                this.draw();
            }
            if (this.props.width !== this.state.width || this.props.height !== this.state.height) {
                this.drawInitialLayout();
            }
        }
    }

    drawInitialLayout = () => {
        // reset the component
        select(this.svg).selectAll('*').remove();

        let data = Tools.getClfHistories([this.props.clfResult], this.props.variable);
        data = {
            train: data.train[0],
            val: data.val[0]
        };

        const margin = this.state.margin,
            width = this.props.width - margin.left - margin.right,
            height = this.props.height - margin.top - margin.bottom;

        const xScale = scaleLinear().domain([0, 1]).range([0, width]);
        const yScale = scaleLinear().domain([0, 1]).range([height, 0]);
        const xAxis = axisBottom().scale(xScale);
        const yAxis = axisLeft().scale(yScale);

        const svg2 = select(this.svg)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);
        const svg = svg2
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // x-axis
        const xAxisSelection = svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis);
        const xAxisLabel = xAxisSelection.append('text')
            .attr('x', width)
            .attr('y', -6)
            .text('Epoch');

        // y-axis
        const yAxisSelection = svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        const yAxisLabel = yAxisSelection.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 6)
            .attr('dy', '.71em')
            .text(this.props.variable);

        // line
        const lineFunction = line()
            .x((d, i) => i)
            .y(d => 0.5);

        const trainLine = svg.append('path')
            .attr('d', lineFunction(data.train))
            .attr('class', 'trainLine');

        const valLine = svg.append('path')
            .attr('d', lineFunction(data.val))
            .attr('class', 'valLine');

        this.setState(
            {
                svg,
                svg2,
                xAxisSelection,
                xAxisLabel,
                yAxisSelection,
                yAxisLabel,
                valLine,
                trainLine,
                width: this.props.width,
                height: this.props.height
            },
            this.draw
        );
    }

    draw = () => {
        let rawData = Tools.getClfHistories([this.props.clfResult], this.props.variable);
        rawData = {
            train: rawData.train[0],
            val: rawData.val[0]
        };

        // map values to {value, epoch} objects
        const valData = rawData.val.map((d, i) => { return { val: d, epoch: i + 1 } });
        const trainData = rawData.train.map((d, i) => { return { val: d, epoch: i + 1 } });

        const margin = this.state.margin,
            width = this.props.width - margin.left - margin.right,
            height = this.props.height - margin.top - margin.bottom;

        // setup x
        const xValue = d => d.epoch,
            xScale = scaleLinear().range([0, width]),
            xAxis = axisBottom().scale(xScale);

        // setup y
        const yValue = d => d.val,
            yScale = scaleLinear().range([height, 0]),
            yAxis = axisLeft().scale(yScale);

        // don't want dots overlapping axis, so add in buffer to data domain
        const allData = valData.concat(trainData);
        const [minX, maxX] = extent(allData, xValue);
        const [minY, maxY] = extent(allData, yValue);
        const xBuffer = (maxX - minX) * 0.05;
        const yBuffer = (maxY - minY) * 0.05;
        xScale.domain([minX - xBuffer, maxX]);
        yScale.domain([minY - yBuffer, maxY]);

        // x-axis
        this.state.xAxisSelection.call(xAxis);
        this.state.xAxisLabel.text('Epoch');

        // y-axis
        this.state.yAxisSelection.call(yAxis);
        this.state.yAxisLabel.text(this.props.variable);

        // lines
        const lineFunction = line()
            .x(d => xScale(d.epoch))
            .y(d => yScale(d.val));

        this.state.trainLine
            .transition()
            .duration(500)
            .attr('d', lineFunction(trainData));

        this.state.valLine
            .transition()
            .duration(500)
            .attr('d', lineFunction(valData));

        this.setState({
            xValue,
            yValue,
            xScale,
            yScale,
            xAxis,
            yAxis,
            variable: this.props.variable,
            history: this.props.clfResult.history_smoothed
        });
    }

    render() {
        return (
            <div
                className='HistoryChart'
                title='Dashed: training scores, Solid: validation scores'
            >
                <svg
                    className='Plot'
                    width={this.props.width}
                    height={this.props.height}
                    ref={n => this.svg = n}
                >
                </svg>
            </div>
        );
    }
}
