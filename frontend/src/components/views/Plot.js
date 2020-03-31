import React, { Component } from 'react';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { extent } from 'd3-array';
import { axisLeft, axisBottom } from 'd3-axis';
import { zoom, zoomIdentity } from 'd3-zoom';
import { event } from 'd3-selection';
import { ControlLabel, FormGroup, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faSearchMinus, faEye, faExpandArrowsAlt } from '@fortawesome/free-solid-svg-icons';
import Tools from '../../lib/Tools';
import '../../style/views/Plot.css';

export default class Plot extends Component {

    constructor(props) {
        super(props);

        const clfParameters = new Set();
        this.props.clfResults.forEach(c => {
            const params = c.args;
            for (const param in params) {
                if (params.hasOwnProperty(param)) {
                    // only use numerical, boolean, or string parameters
                    if (['number', 'boolean', 'string'].includes(typeof params[param])) {
                        clfParameters.add(param);
                    }
                }
            }
        });
        clfParameters.delete('title');
        clfParameters.delete('method');

        this.state = {
            // plot settings
            xVariable: 'method',
            yVariable: 'Test accuracy',
            radiusMode: 'fixed',
            // map for ordinal legend
            xStringMap: new Map(),
            yStringMap: new Map(),
            // size
            width: this.props.mainSize.width - 270,
            height: this.props.mainSize.height - 100,
            // display settings
            showLabels: this.props.clfResults.length <= 25,
            radius: this.props.clfResults.length <= 25 ? 5 : 3,
            fontSize: 10,
            zoomFactor: 1,
            hideSingleValues: true,
            // other
            jitterStrength: 15,
            hiddenParams: ['save_model', 'file'],
            clfParameters: Array.from(clfParameters).sort(),
            colorMap: this.props.clfColorMapOpacity
        };
    }

    componentDidMount() {
        this.drawInitialLayout();
    }

    componentDidUpdate() {
        // react to filtering of classifiers
        if (this.props.clfResults !== this.state.clfResults) {
            this.drawInitialLayout();
        }
        // show currently highlighted classifier by drawing a stronger stroke
        if (this.props.onHighlightClf) {
            // make stroke thicker
            this.state.dots.attr('stroke-width', d => {
                if (this.props.highlightClf && d.args.title === this.props.highlightClf.args.title) {
                    return 2 / this.state.zoomFactor;
                }
                return 0.5 / this.state.zoomFactor;
            });
            // show label if hidden
            if (!this.state.showLabels) {

                this.state.labels.style('display', d => {
                    if (this.props.highlightClf && d.args.title === this.props.highlightClf.args.title) {
                        return 'block';
                    }
                    return 'none';
                });
            }
        }
        // react to colormap changes
        if (this.props.clfColorMapOpacity !== this.state.colorMap) {
            this.setState(
                { colorMap: this.props.clfColorMapOpacity },
                () => {
                    if (this.state.dots) {
                        this.state.dots.style('fill', d => this.props.clfColorMapOpacity.get(d.args.title));
                    }
                }
            );
        }
        // resize when size changes
        if (
            this.state.width !== this.props.mainSize.width - 270
            || this.state.height !== this.props.mainSize.height - 100
        ) {
            this.setState(
                {
                    width: this.props.mainSize.width - 270,
                    height: this.props.mainSize.height - 100,
                },
                this.drawInitialLayout
            );
        }
    }

    /**
     * Returns the data accessor depeding on the plotted variable
     */
    getAccessors = (variable) => {
        switch (variable) {
            case 'Training accuracy':
                return d => d.train_scores.accuracy;
            case 'Test accuracy':
                return d => d.test_scores.accuracy;
            case 'Training time':
                return d => d.clf_time;
            case 'Test time':
                return d => d.pred_time;
            case 'fold':
                return d => Tools.getClassifierFoldNumber(d);
            case 'clf_with_folds':
                return d => Tools.getClassifierBaseTitle(d);
            default:
                // handle clf parameters
                return d => d.args[variable];
        }
    }

    /**
     * Returns the circle radius depending on the current radius mode
     */
    getRadius = (clfResult) => {
        const base = 0.5 + 3 * this.state.radius;
        switch (this.state.radiusMode) {
            case 'Training accuracy':
                return base * Math.sqrt(clfResult.train_scores.accuracy / this.state.dataStats.trainAccuracy[1]);
            case 'Test accuracy':
                return base * Math.sqrt(clfResult.test_scores.accuracy / this.state.dataStats.testAccuracy[1]);
            case 'Training time':
                return base * Math.sqrt(clfResult.clf_time / this.state.dataStats.trainTime[1]);
            case 'Test time':
                return base * Math.sqrt(clfResult.pred_time / this.state.dataStats.testTime[1]);
            case 'fixed':
                return this.state.radius;
            default:
                console.error(`invalid area / radius mapping ${this.state.radiusMode}`);
                return this.state.radius;
        }
    }

    /**
     * Initializes the plot
     */
    drawInitialLayout = () => {
        const data = this.props.clfResults;

        const margin = { top: 10, right: 10, bottom: 25, left: 70 },
            width = this.state.width - margin.left - margin.right,
            height = this.state.height - margin.top - margin.bottom;

        const xScale = scaleLinear().domain([0, 1]).range([0, width]);
        const yScale = scaleLinear().domain([0, 1]).range([height, 0]);
        const xAxis = axisBottom().scale(xScale);
        const yAxis = axisLeft().scale(yScale);

        const zoomBeh = zoom()
            .scaleExtent([0.25, 10000])
            .translateExtent([[-width, -height], [2 * width, 2 * height]])
            .extent([[0, 0], [width, height]])
            .on('zoom', this.zoomed);

        const svg2 = select(this.svg)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .call(zoomBeh);
        svg2.selectAll('*')
            .remove();
        const svg = svg2
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // x-axis
        const xAxisSelection = svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis);
        const xAxisLabel = xAxisSelection.append('text')
            .attr('class', 'axisLabel')
            .attr('x', width)
            .attr('y', -6)
            .text(this.state.xVariable);

        // y-axis
        const yAxisSelection = svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        const yAxisLabel = yAxisSelection.append('text')
            .attr('class', 'axisLabel')
            .attr('transform', 'rotate(-90)')
            .attr('y', 6)
            .attr('dy', '.71em')
            .text(this.state.yVariable);

        // draw dots
        const dots = svg.selectAll('.dot')
            .data(data)
            .enter().append('circle')
            .attr('class', 'dot')
            .attr('r', this.state.radius)
            .attr('cx', 0.5 * width)
            .attr('cy', 0.5 * height)
            .style('fill', '#888');

        // labels
        const labels = svg.selectAll('.dataLabel')
            .data(data)
            .enter().append('text')
            .attr('class', 'dataLabel')
            .style('display', this.state.showLabels ? 'block' : 'none')
            .attr('x', 0.5 * width)
            .attr('y', 0.5 * height)
            .style('font-size', 0)
            .text(d => d.args.title);

        this.setState(
            {
                zoomBeh,
                svg,
                svg2,
                xAxisSelection,
                xAxisLabel,
                yAxisSelection,
                yAxisLabel,
                dots,
                labels,
                clfResults: this.props.clfResults
            },
            this.draw
        );
    }

    /**
     * Resets the zoom and draw the plot
     */
    draw = () => {
        try {
            this.resetZoom();
        } catch {
            // should only happen on first draw, does not matter...
        }
        // wait for zoom to reset
        setTimeout(
            this.drawContinued,
            300
        );
    }

    /**
     * Draws the plot
     */
    drawContinued = () => {
        const margin = { top: 10, right: 10, bottom: 25, left: 70 },
            width = this.state.width - margin.left - margin.right,
            height = this.state.height - margin.top - margin.bottom;

        // setup x
        const xScale = scaleLinear().range([0, width]),
            xMap = d => xScale(d.x),
            xAxis = axisBottom().scale(xScale);

        // setup y
        const yScale = scaleLinear().range([height, 0]),
            yMap = d => yScale(d.y),
            yAxis = axisLeft().scale(yScale);

        // preprocess data
        // map booleans and strings to numbers
        const { data, xStringMap, yStringMap } = this.cleanupData(this.props.clfResults, this.state.xVariable, this.state.yVariable);

        // TODO: rescale time to minutes

        // avoid overlapping the axes and leave
        // place for jitter by adding a margin
        const dataValid = data.filter(d => d.x !== undefined && d.y !== undefined);
        const [minX, maxX] = extent(dataValid, d => d.x);
        const [minY, maxY] = extent(dataValid, d => d.y);
        const xBuffer = (maxX - minX) * 0.1;
        const yBuffer = (maxY - minY) * 0.1;
        xScale.domain([minX - xBuffer, maxX + xBuffer]);
        yScale.domain([minY - yBuffer, maxY + yBuffer]);


        // x-axis tick strings
        this.setupAxisTicks(xStringMap, xAxis, this.state.xAxisSelection);
        this.state.xAxisLabel.text(this.state.xVariable);

        // y-axis tick strings
        this.setupAxisTicks(yStringMap, yAxis, this.state.yAxisSelection);
        this.state.yAxisLabel.text(this.state.yVariable);

        // draw dots
        this.state.dots
            .data(data)
            .on('mouseover', d => this.props.onHighlightClf(d.clf))
            .transition()
            .duration(1000)
            .attr('r', this.getRadius)
            .attr('cx', xMap)
            .attr('cy', yMap)
            .attr('stroke', 'white')
            .attr('stroke-width', 0.5)
            .style('display', d => {
                return d.x === undefined || d.y === undefined ? 'none' : 'block';
            })
            .style('fill', d => this.props.clfColorMapOpacity.get(d.args.title));

        // labels
        this.state.labels
            .data(data)
            .transition()
            .duration(1000)
            .attr('x', xMap)
            .attr('y', yMap)
            .attr('dy', d => this.getRadius(d) + this.state.fontSize)
            .style('font-size', `${this.state.fontSize}px`)
            .style('display', d => {
                return this.state.showLabels && d.x !== undefined && d.y !== undefined ? 'block' : 'none';
            })
            .text(d => d.args.title);

        this.setState(
            { xScale, yScale, xAxis, yAxis },
            this.resetZoom
        );
    }

    /**
     * Replace booleans and string values by numbers.
     */
    cleanupData = (clfs, xVariable, yVariable) => {
        let xStrings = new Set();
        let yStrings = new Set();
        let xType;
        let yType;
        // get data type and all values
        clfs.forEach(d => {
            const x = this.getAccessors(xVariable)(d);
            const y = this.getAccessors(yVariable)(d);
            // convert boolean to 0 and 1
            if (typeof x === 'boolean') {
                xType = 'boolean';
            }
            if (typeof y === 'boolean') {
                yType = 'boolean';
            }
            // map string to an integer
            if (typeof x === 'string') {
                xStrings.add(x);
            }
            if (typeof y === 'string') {
                yStrings.add(y);
            }
        });
        if (xType === 'boolean') {
            xStrings.add('false');
            xStrings.add('true');
        }
        if (yType === 'boolean') {
            yStrings.add('false');
            yStrings.add('true');
        }
        // sort and genrate string maps
        const xStringMap = new Map(Array.from(xStrings).sort().map((d, i) => [d, i]));
        const yStringMap = new Map(Array.from(yStrings).sort().map((d, i) => [d, i]));
        // map values
        clfs = clfs.map(d => {
            let x = this.getAccessors(xVariable)(d),
                y = this.getAccessors(yVariable)(d);
            // convert boolean to 0 and 1
            if (typeof x === 'boolean') {
                x = x === true ? 1 : 0;
            }
            if (typeof y === 'boolean') {
                y = y === true ? 1 : 0;
            }
            // map string to an integer
            if (typeof x === 'string') {
                x = xStringMap.get(x);
            }
            if (typeof y === 'string') {
                y = yStringMap.get(y);
            }
            return { ...d, clf: d, x, y };
        });
        // get datastats of cleanedup data so scaling ranges are only for them
        const relevantClfs = clfs.filter(d => d.x !== undefined && d.y !== undefined);
        this.setState({
            dataStats: Tools.getDataStats(relevantClfs),
            xStringMap,
            yStringMap
        });
        return {
            data: clfs,
            xStringMap,
            yStringMap
        };
    }

    /**
     * Handles zooming
     */
    zoomed = () => {
        // avoid scrolling
        if (event && event.sourceEvent) {
            event.sourceEvent.stopPropagation();
        }

        // must be less than the waiting time in drawFinishedLayout
        const transDuration = 250;

        // update axes
        var new_xScale = event.transform.rescaleX(this.state.xScale);
        var new_yScale = event.transform.rescaleY(this.state.yScale)
        this.state.xAxisSelection
            .transition()
            .duration(transDuration)
            .call(this.state.xAxis.scale(new_xScale));
        this.state.yAxisSelection
            .transition()
            .duration(transDuration)
            .call(this.state.yAxis.scale(new_yScale));

        // zoomed or panned?
        const k = event.transform.k;
        if (Math.abs(this.state.zoomFactor - k) > 0.0001) {
            this.state.dots
                .transition()
                .duration(transDuration)
                .attr('transform', event.transform)
                .attr('stroke-width', 0.5 / k)
                .attr('r', d => this.getRadius(d) / k);
            this.state.labels
                .transition()
                .duration(transDuration)
                .attr('transform', event.transform)
                .style('font-size', `${this.state.fontSize / k}px`)
                .attr('dy', d => (this.getRadius(d) + this.state.fontSize) / k);
            this.setState({ zoomFactor: k });
        } else {
            this.state.dots.attr('transform', event.transform);
            this.state.labels.attr('transform', event.transform);
        }
    }

    /**
     * Resets the zoom (and jitter)
     */
    resetZoom = () => {
        this.state.svg2.call(this.state.zoomBeh.transform, zoomIdentity);
    }

    showLabelsChanged = () => {
        this.setState(
            { showLabels: !this.state.showLabels },
            () => {
                this.state.labels.style('display', d => {
                    if (!this.state.showLabels) {
                        return 'none';
                    }
                    if (d.x === undefined || d.y === undefined) {
                        return 'none';
                    }
                    return 'block';
                });
            }
        );
    }

    /**
     * Moves circles a bit in a random direction to avoid overlap
     */
    jitter = (direction) => {
        const strength = this.state.jitterStrength / this.state.zoomFactor;
        // TODO: better: get number of points in this area and move each by a fraction of a circle

        // randomly move dots and labels
        let shifts;
        if (direction === 'radial') {
            shifts = this.props.clfResults.map(() => {
                // move by strength into random direction
                const dir = Math.random() * 2 * Math.PI;
                return {
                    x: strength * Math.cos(dir),
                    y: strength * Math.sin(dir),
                };
            });
        } else if (direction === 'x') {
            shifts = this.props.clfResults.map(() => {
                return {
                    x: strength * (Math.random() * 2 - 1),
                    y: 0,
                };
            });
        } else if (direction === 'y') {
            shifts = this.props.clfResults.map(() => {
                return {
                    x: 0,
                    y: strength * (Math.random() * 2 - 1),
                };
            });
        } else {
            console.error(`Invalid direction for jitter '${direction}'!`);
        }

        this.state.dots
            .transition()
            .duration(500)
            .attr('transform', (d, i) => `translate(${shifts[i].x}, ${shifts[i].y})`);

        this.state.labels
            .transition()
            .duration(500)
            .attr('transform', (d, i) => `translate(${shifts[i].x}, ${shifts[i].y})`);
    }

    /**
     * Calculates a scatterplot matrix which displays the pearson correlation for each pair of variables.
     */
    getSplom = () => {
        const colorMapDiv = this.props.divergingColorMap;
        const w = 250;
        const labelMarginLeft = 150;
        const labelMarginTop = 90;
        const scores = ['Training accuracy', 'Test accuracy', 'Training time', 'Test time'];
        const params = scores
            .concat(['method', 'title', 'fold'])
            .concat(this.state.clfParameters)
            .filter(d => !this.state.hiddenParams.includes(d));

        const cellSize = Math.min(25, (w - labelMarginLeft) / scores.length);

        // score labels
        const labels = scores.map((d, i) => {
            return (
                <text
                    key={d}
                    className='scoreLabel'
                    x={labelMarginLeft + (i + 1) * cellSize - 12}
                    y={labelMarginTop + 5}
                >
                    {d}
                    <title>
                        {d}
                    </title>
                </text>
            );
        });

        // one row for each parameter
        const cells = [];
        let xOffset = 0;
        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            const stringMap = new Map();
            let dataParam = this.props.clfResults
                .map(this.getAccessors(param))
                // clean up data like for plot
                .filter(d => d !== undefined)
                .map(d => {
                    // convert boolean to 0 and 1
                    if (typeof d === 'boolean') {
                        return d === true ? 1 : 0;
                    }
                    // map string to an integer
                    if (typeof d === 'string') {
                        if (!stringMap.has(d)) {
                            stringMap.set(d, stringMap.size);
                        }
                        return stringMap.get(d);
                    }
                    return d;
                });
            // skip this param if all values are equal
            // since there will be no correlation
            if (this.state.hideSingleValues) {
                let valuesEqual = true;
                const firstValue = dataParam[0];
                for (let value of dataParam) {
                    if (value !== firstValue) {
                        valuesEqual = false;
                        break;
                    }
                }
                if (valuesEqual) {
                    continue;
                }
            }

            labels.push(
                <text
                    key={i}
                    className='paramLabel'
                    x={labelMarginLeft - 5}
                    y={labelMarginTop + (xOffset + 1) * cellSize - 12}
                >
                    {param}
                    <title>
                        {param}
                    </title>
                </text>
            );

            // one column for each score
            for (let j = 0; j < scores.length; j++) {
                const score = scores[j];
                const dataScore = this.props.clfResults
                    .filter((d, i) => dataParam[i] !== undefined)
                    .map(this.getAccessors(score));

                const correlation = Tools.pearsonCorrelation(dataParam, dataScore);

                // diverging colormap for negative, 0 and positive correlation
                const color = colorMapDiv((correlation + 1) / 2);
                const title = `${param} - ${score}: ${correlation.toFixed(2)}`;
                const stroke = (score === this.state.yVariable && param === this.state.xVariable) ? 'var(--accentColor)' : 'none';

                // on click: change variables displayed in the plot
                const onClick = (e) => this.setState(
                    {
                        xVariable: param,
                        yVariable: score,
                    },
                    this.draw
                );

                cells.push(
                    <rect
                        key={i * params.length + j}
                        x={labelMarginLeft + j * cellSize}
                        y={labelMarginTop + xOffset * cellSize}
                        width={cellSize * 0.9}
                        height={cellSize * 0.9}
                        fill={color}
                        onClick={onClick}
                        stroke={stroke}
                    >
                        <title>
                            {title}
                        </title>
                    </rect>
                );
            }
            xOffset++;
        }

        return (
            <svg
                className='SPLOM'
                width={w}
                height={labelMarginTop + xOffset * cellSize + 10}
            >
                {labels}
                {cells}
            </svg>
        );
    }

    /**
     * Sets up the axis ticks (needed for string labels)
     * @param {Map} valueStringMap
     * @param {*} axis
     * @param {*} selection
     */
    setupAxisTicks(valueStringMap, axis, selection, ) {
        const tickValues = new Map();
        for (const [key, value] of valueStringMap.entries()) {
            tickValues.set(value, key);
        }
        axis.tickFormat(d => {
            // numbers or categorical values?
            if (tickValues.size > 0) {
                return tickValues.has(d) ? tickValues.get(d) : null;
            }
            return d;
        });
        selection.call(axis);
    }

    render() {
        const scoreOptions = [
            'Training accuracy',
            'Test accuracy',
            'Training time',
            'Test time'
        ].map((d, i) => <option key={i} value={d}>{d}</option>);

        const paramOptions = this.state.clfParameters
            .map((d, i) => <option key={i} value={d}>{d}</option>);

        // compute scatterplot matrix
        const splom = this.getSplom();

        return (
            <div className='Plot'>
                <form>
                    <FormGroup>
                        <ControlLabel>
                            X-axis variable
                        </ControlLabel>
                        <select
                            key={this.state.xVariable}
                            onChange={(e) => this.setState({ xVariable: e.target.value }, this.draw)}
                            defaultValue={this.state.xVariable}
                        >
                            <optgroup label='General'>
                                <option value='method'>Method</option>
                                <option value='title'>Title</option>
                                <option value='fold'>Fold</option>
                                <option value='clf_with_folds'>Classifier with folds</option>
                            </optgroup>
                            <optgroup label='Scores'>
                                {scoreOptions}
                            </optgroup>
                            <optgroup label='Parameters'>
                                {paramOptions}
                            </optgroup>
                        </select>
                    </FormGroup>

                    <FormGroup>
                        <ControlLabel>
                            Y-axis variable
                        </ControlLabel>
                        <select
                            key={this.state.yVariable}
                            onChange={(e) => this.setState({ yVariable: e.target.value }, this.draw)}
                            defaultValue={this.state.yVariable}
                        >
                            <optgroup label='General'>
                                <option value='method'>Method</option>
                                <option value='title'>Title</option>
                                <option value='fold'>Fold</option>
                                <option value='clf_with_folds'>Classifier with folds</option>
                            </optgroup>
                            <optgroup label='Scores'>
                                {scoreOptions}
                            </optgroup>
                            <optgroup label='Parameters'>
                                {paramOptions}
                            </optgroup>
                        </select>
                    </FormGroup>

                    <FormGroup>
                        <ControlLabel>
                            Size (area)
                        </ControlLabel>
                        <select
                            key={this.state.radiusMode}
                            onChange={(e) => this.setState({ radiusMode: e.target.value }, this.draw)}
                            defaultValue={this.state.radiusMode}
                        >
                            <option value='fixed'>Fixed size</option>
                            {scoreOptions}
                        </select>
                    </FormGroup>

                    <FormGroup>
                        <Button
                            title='Toggle the display of variables with only one value in the correlation matrix (they do not have any correlation!)'
                            onClick={() => this.setState({ hideSingleValues: !this.state.hideSingleValues })}
                        >
                            <FontAwesomeIcon icon={faEye} />
                            All variables
                        </Button>
                        <Button
                            onClick={this.showLabelsChanged}
                            title='Toggle labels'
                        >
                            <FontAwesomeIcon icon={faTag} />
                            Labels
                        </Button>
                        <Button onClick={this.resetZoom}>
                            <FontAwesomeIcon icon={faSearchMinus} />
                            Reset zoom
                        </Button>
                        <Button onClick={() => this.jitter('radial')}>
                            <FontAwesomeIcon icon={faExpandArrowsAlt} />
                            Jitter
                        </Button>
                        <Button onClick={() => this.jitter('x')}>
                            <FontAwesomeIcon icon={faExpandArrowsAlt} />
                            Jitter (x)
                        </Button>
                        <Button onClick={() => this.jitter('y')}>
                            <FontAwesomeIcon icon={faExpandArrowsAlt} />
                            Jitter (y)
                        </Button>
                    </FormGroup>
                </form>

                <div className='main'>
                    <svg
                        className='Plot'
                        width={this.state.width}
                        height={this.state.height}
                        ref={n => this.svg = n}
                    />

                    <div>
                        <h4>
                            Correlation between Parameters and Scores
                        </h4>
                        <p>
                            Click on a cell to display the plot.
                        </p>
                        <p className='correlationLegend'>
                            {
                                // using the color map, since it might change
                                [
                                    ['positive', 1],
                                    ['none', 0.5],
                                    ['negative', 0]
                                ].map((d, i) => {
                                    const color = this.props.divergingColorMap(d[1]);
                                    const textColor = Tools.getBrigthness(color) > 128 ? 'black' : 'white';
                                    return (
                                        <span
                                            key={i}
                                            style={{ background: color, color: textColor }}
                                        >
                                            {d[0]}
                                        </span>
                                    );
                                })}
                        </p>
                        {splom}

                        <p className='hiddenParamsList'>
                            Hidden parameters: {this.state.hiddenParams.join(', ')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }
}
