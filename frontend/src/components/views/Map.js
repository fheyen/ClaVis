import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faSearchMinus } from '@fortawesome/free-solid-svg-icons';
import { select, event } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import '../../style/views/Map.css';

export default class ClassifierMap extends Component {

    constructor(props) {
        super(props);

        // get available projections
        const availableProjections = new Map();
        this.props.clfProjections.forEach(d => {
            const type = d.data_type === 'scores' ? 'scores' : 'predicted probabilities';
            const train = d.use_training_data ? ', incl. training data' : '';
            const title = `${d.projection.title} (${type}${train})`;
            availableProjections.set(title, d);
        });
        const availableProjectionsSorted = Array
            .from(availableProjections)
            .sort((a, b) => a[0] < b[0] ? -1 : 1);

        let projection;
        if (availableProjectionsSorted.length > 0) {
            projection = availableProjectionsSorted[0][1];
        }

        this.state = {
            // projection params
            availableProjections,
            availableProjectionsSorted,
            projection,
            // hide labels by default if there are a lot of classifiers
            showLabels: this.props.clfResults.length <= 50,
            layoutInitialized: false,
            fontSize: 10,
            margin: 20,
            zoomFactor: 1,
            radius: 3,
            // props that change
            colorMap: this.props.clfColorMapOpacity,
            highlightClf: this.props.highlightClf,
            width: this.props.mainSize.width,
            height: this.props.mainSize.height - 100
        };
    }

    componentDidMount() {
        this.setState({
            svgCircleGrp: this.svgCircleGrp,
            svgLabelGrp: this.svgLabelGrp,
        }, this.draw);
    }

    componentDidUpdate() {
        // react to filtering of classifiers
        if (this.props.clfResults !== this.state.clfResults) {
            this.setState(
                {
                    clfResults: this.props.clfResults,
                    svgCircleGrp: this.svgCircleGrp,
                    svgLabelGrp: this.svgLabelGrp,
                    layoutInitialized: false
                },
                this.draw
            );
        }
        // react to colormap changes
        if (this.props.clfColorMapOpacity !== this.state.colorMap) {
            this.setState(
                { colorMap: this.props.clfColorMapOpacity },
                () => {
                    if (this.state.circles) {
                        this.state.circles.style('fill', d => this.props.clfColorMapOpacity.get(d.clf.args.title));
                    }
                }
            );
        }
        // react to highlights
        if (this.props.highlightClf !== this.state.highlightClf) {
            this.setState(
                { highlightClf: this.props.highlightClf },
                () => {
                    if (!this.props.highlightClf) {
                        this.onHighlightEnd();
                    } else {
                        this.onHighlight(this.props.highlightClf);
                    }
                }
            );
        }
        // resize when size changes
        if (
            this.state.width !== this.props.mainSize.width
            || this.state.height !== this.props.mainSize.height - 100
        ) {
            this.setState(
                {
                    width: this.props.mainSize.width,
                    height: this.props.mainSize.height - 100
                },
                this.draw
            );
        }
    }

    draw = () => {
        const clfResults = this.props.clfResults;
        let distanceMatrix, maxDistance;
        const selectedProjection = this.state.projection;
        try {
            distanceMatrix = selectedProjection.distances;
            maxDistance = selectedProjection.max_distance;
        } catch (e) {
            console.error('Cannot access projection!');
            console.error(e);
            return;
        }

        // map classifier hashes to distance matrix indices
        const clfHashArray = selectedProjection.clf_hashes;
        const clfIndexMap = new Map();
        clfHashArray.forEach((d, i) => clfIndexMap.set(d, i));

        this.setState({
            distanceMatrix,
            maxDistance,
            clfIndexMap
        });

        // get graph nodes and links
        const nodes = clfResults.map((d, i) => {
            // get correct projected point
            const index = clfIndexMap.get(d.hash);
            const data = selectedProjection.projected_data[index];
            return {
                id: i,
                clf: d,
                label: d.args.title,
                x: data[0],
                y: data[1]
            };
        });

        if (!this.state.layoutInitialized) {
            // initialize SVG elements
            this.drawInitialLayout(nodes, () => this.drawFinishedLayout(nodes));
        } else {
            // draw animation towards final layout
            this.drawFinishedLayout(nodes);
        }
    }

    scaleToFitView = (nodes, width, height, margin) => {
        // ignore removed nodes when calculating extent
        let xExtent = extent(nodes.map(n => n.x));
        let yExtent = extent(nodes.map(n => n.y));
        // scale
        const xScale = scaleLinear().domain(xExtent).range([margin, width - margin]);
        const yScale = scaleLinear().domain(yExtent).range([margin, height - margin]);
        nodes.forEach(node => {
            node.x = xScale(node.x);
            node.y = yScale(node.y);
        });
        return nodes;
    }

    drawInitialLayout = (nodes, callback = () => { }) => {
        // draw this and then only update, no need to delete and redraw elements every time
        const w = this.state.width;
        const h = this.state.height;

        // reset
        select(this.state.svgCircleGrp)
            .selectAll('circle')
            .remove();
        select(this.state.svgLabelGrp)
            .selectAll('text')
            .remove();

        const circles = select(this.state.svgCircleGrp)
            .selectAll('circle')
            .data(nodes)
            .enter()
            .append('circle')
            .attr('r', 0)
            .attr('fill', '#888')
            .attr('cx', w / 2)
            .attr('cy', h / 2)
            .on('mouseover', (node) => this.props.onHighlightClf(node.clf));

        const labels = select(this.state.svgLabelGrp)
            .selectAll('text')
            .data(nodes)
            .enter()
            .append('text')
            .style('display', this.state.showLabels ? 'block' : 'none')
            .attr('font-size', 0)
            .attr('x', w / 2)
            .attr('y', h / 2)
            .attr('dy', 0);

        const zoomBeh = zoom()
            .scaleExtent([0.25, 10000])
            .translateExtent([[-w, -h], [2 * w, 2 * h]])
            .extent([[0, 0], [w, h]])
            .on('zoom', this.zoomed);

        select(this.svg).call(zoomBeh);

        this.setState({
            layoutInitialized: true,
            circles,
            labels,
            nodes,
            zoomBeh
        },
            callback
        );
    }

    drawFinishedLayout = (nodes) => {
        try {
            this.resetZoom();
        } catch {
            // should only happen on first draw, does not matter...
        }
        // wait for zoom to reset
        setTimeout(
            () => this.drawFinishedLayoutContinued(nodes),
            300
        );
    }

    drawFinishedLayoutContinued = (nodes) => {
        const { radius, fontSize, margin } = this.state;
        const w = this.state.width;
        const h = this.state.height;

        // scale layout to fit the whole space
        nodes = this.scaleToFitView(nodes, w, h, margin);

        this.state.circles
            .data(nodes)
            .transition()
            .duration(1000)
            .attr('fill', node => this.props.clfColorMapOpacity.get(node.clf.args.title))
            .attr('stroke-width', 0.5 / this.state.zoomFactor)
            .attr('r', radius / this.state.zoomFactor)
            .attr('cx', node => node.x)
            .attr('cy', node => node.y);

        this.state.labels
            .data(nodes)
            .text(node => node.label)
            .transition()
            .duration(1000)
            .attr('font-size', fontSize)
            .attr('x', node => node.x)
            .attr('y', node => node.y)
            .attr('dy', radius + fontSize);

        this.setState({ nodes });
    }

    zoomed = () => {
        const { radius, fontSize } = this.state;
        // must be less than the waiting time in drawFinishedLayout
        const transDuration = 250;
        // avoid scrolling
        if (event && event.sourceEvent) {
            event.sourceEvent.stopPropagation();
        }
        // zoomed or panned?
        const k = event.transform.k;
        if (Math.abs(this.state.zoomFactor - k) > 0.0001) {
            this.state.circles
                .transition()
                .duration(transDuration)
                .attr('transform', event.transform)
                .attr('stroke-width', 0.5 / k)
                .attr('r', radius / k);
            this.state.labels
                .transition()
                .duration(transDuration)
                .attr('transform', event.transform)
                .attr('dy', (radius + fontSize) / k)
                .style('font-size', `${fontSize / k}px`);
            this.setState({ zoomFactor: k });
        } else {
            this.state.circles.attr('transform', event.transform);
            this.state.labels.attr('transform', event.transform);
        }
    }

    resetZoom = () => {
        if (this.state.zoomBeh) {
            select(this.svg).call(this.state.zoomBeh.transform, zoomIdentity);
        }
    }

    onHighlight = (clfResult) => {
        // get node id
        const nodes = this.state.nodes.filter(d => d.clf === clfResult)
        if (nodes.length > 0) {
            const id = nodes[0].id;
            // show labels when hovering
            if (!this.state.showLabels) {
                this.state.labels.style('display', label => {
                    if (label.id === id || label.id === id) {
                        return 'block';
                    } else {
                        return 'none';
                    }
                });
            }
            // show highlighted circle by thicker stroke
            this.state.circles.attr('stroke-width', n => {
                return n.id === id ? 2 / this.state.zoomFactor : 0.5 / this.state.zoomFactor;
            });
        }
    }

    onHighlightEnd = () => {
        this.state.circles.attr('stroke-width', 0.5 / this.state.zoomFactor);
        // hide labels if they are disabled
        if (!this.state.showLabels) {
            this.state.labels.style('display', 'none');
        }
    }

    showLabelsChanged = () => {
        this.setState(
            { showLabels: !this.state.showLabels },
            () => this.state.labels.style('display', this.state.showLabels ? 'block' : 'none')
        );
    }

    projectionChanged = (e) => {
        const p = this.state.availableProjections.get(e.target.value);
        this.setState(
            { projection: p },
            this.draw
        );
    }

    render() {
        const options = this.state.availableProjectionsSorted.map(d => (
            <option
                key={d[0]}
                value={d[0]}>
                {d[0]}
            </option>
        ));

        return (
            <div
                className='ClassifierMap'
                ref={n => this.node = n}
            >
                <div className='control'>
                    <select onChange={this.projectionChanged}>
                        {options}
                    </select>

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
                </div>

                <svg
                    className='Map'
                    width={this.state.width}
                    height={this.state.height}
                    ref={n => this.svg = n}
                >
                    <g
                        className='circles'
                        ref={n => this.svgCircleGrp = n}
                    />
                    <g
                        className='labels'
                        ref={n => this.svgLabelGrp = n}
                    />
                </svg>
            </div>
        );
    }
}
