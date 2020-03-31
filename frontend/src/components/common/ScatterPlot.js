import React, { Component } from 'react';
import { quadtree } from 'd3-quadtree';
import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import '../../style/common/ScatterPlot.css';

/**
 * Scatterplot class.
 */
export default class ScatterPlot extends Component {
    constructor(props) {
        super(props);
        this.state = {
            highlightClass: this.props.highlightClass,
            colorMap: this.props.colorMap
        };
    }

    componentDidMount() {
        this.setState(
            {
                canvas: this.canvas,
                highlightCanvas: this.highlightCanvas,
                context: this.canvas.getContext('2d'),
                highlightContext: this.highlightCanvas.getContext('2d')
            },
            this.updateSize
        );
    }

    componentDidUpdate() {
        if (isNaN(this.props.width) || isNaN(this.props.height)) {
            console.error(`Scatterplot size is not valid: width ${this.props.width} height ${this.props.height}`);
            return;
        }
        if (this.props.width !== this.state.width || this.props.height !== this.state.height) {
            this.setState(
                {
                    width: this.props.width,
                    height: this.props.height
                },
                this.updateSize
            );
        }
        if (this.props.highlightClass !== this.state.highlightClass) {
            this.highlightClass(this.props.highlightClass);
            this.setState({ highlightClass: this.props.highlightClass });
        }
        if (this.props.colorMap !== this.state.colorMap) {
            this.setState(
                { colorMap: this.props.colorMap },
                this.draw
            );
        }
    }

    updateSize = () => {
        const width = this.props.width;
        this.state.canvas.setAttribute('width', width);
        this.state.highlightCanvas.setAttribute('width', width);
        this.draw();
    }

    /**
     * Searches quadtree for nodes in the current brush box.
     * @param {d3.quadtree} quadtree
     * @param {number} x0
     * @param {number} y0
     * @param {number} x3
     * @param {number} y3
     */
    search = (scpQuadtree, x0, y0, x3, y3) => {
        const selected_nodes = [];
        scpQuadtree.visit(function (node, x1, y1, x2, y2) {
            // data has no length, only tree nodes
            if (!node.length) {
                do {
                    const d = node.data;
                    const selected = (d.x >= x0) && (d.x < x3) && (d.y >= y0) && (d.y < y3);
                    if (selected) {
                        selected_nodes.push(d.id);
                    }
                    node = node.next;
                } while (node);
            }
            return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
        });
        return selected_nodes;
    }

    /**
     * Handles highlight when the mouse
     * is moving over the scatterplot.
     * @param {MouseEvent} e mouse event
     */
    handleMouseMove = (e) => {
        const searchradius = 20;
        if (!this.state.quadtree) {
            return;
        }
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
        // search quadtree for nearest data point
        const nearest = this.state.quadtree.find(x, y, searchradius);
        if (!nearest) {
            // cancel highlight
            this.handleMouseOut();
            return;
        }
        this.props.onHighlight({ ids: [nearest.id], factor: 2, x, y });
        // show details
        const { id, label, type } = nearest;
        const color = this.props.colorMap[label];
        const className = this.props.data.class_names[label];
        const details = (
            <div className='Details'>
                <h2>Data Point Details</h2>
                <table>
                    <tbody>
                        <tr>
                            <td className='key'>Id</td>
                            <td>{id}</td>
                        </tr>
                        <tr>
                            <td className='key'>Type</td>
                            <td>{type}</td>
                        </tr>
                        <tr>
                            <td className='key'>Class</td>
                            <td>
                                <span style={{ color }}>■&nbsp;</span>
                                {className}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
        this.props.showDetails(details);
    }

    /**
     * Ends highlighting.
     */
    handleMouseOut = () => {
        this.props.onHighlight({ ids: [], factor: 0 });
        this.props.showDetails(null);
    }

    /**
    * Draws data on the scatterplot,
    * also updates data and labels.
    */
    draw = () => {
        const {
            X_train,
            y_train,
            X_test,
            y_test
        } = this.props.data;
        const margin = 10;

        // scales
        const allX = X_train.concat(X_test);
        const x_ext = extent(allX, d => d[0]);
        const y_ext = extent(allX, d => d[1]);
        const x = scaleLinear().domain(x_ext).range([margin, this.props.width - margin]);
        const y = scaleLinear().domain(y_ext).range([this.props.height - margin, margin]);

        // preprocess data
        const data = [];
        let localIndex = -1;
        for (let inputIndex = 0; inputIndex < X_train.length; inputIndex++) {
            localIndex++;
            const label = y_train[inputIndex];
            const d = X_train[inputIndex];
            data.push({
                type: 'train',
                x: x(d[0]),
                y: y(d[1]),
                label: label,
                color: this.props.colorMap[label % this.props.colorMap.length],
                id: localIndex
            });
        }
        if (this.props.drawTestset) {
            for (let inputIndex = 0; inputIndex < X_test.length; inputIndex++) {
                localIndex++;
                const label = y_test[inputIndex];
                const d = X_test[inputIndex];
                data.push({
                    type: 'test',
                    x: x(d[0]),
                    y: y(d[1]),
                    label: label,
                    color: this.props.colorMap[label % this.props.colorMap.length],
                    id: localIndex
                });
            }
        }

        // quadtree
        const qt = quadtree()
            .extent([
                [-1, -1],
                [this.props.width + 1, this.props.height + 1]
            ]);
        qt.x(d => d.x);
        qt.y(d => d.y);
        qt.addAll(data);
        this.setState(
            {
                quadtree: qt,
                dataProcessed: data
            },
            this.drawCircles
        );
    }

    /**
     * Highlights the given data by drawing the circles larger.
     * @param {number[][]} data
     * @param {number[]} labels
     * @param {number} factor scaling factor
     */
    highlight = (ids, factor = 1, classHighlight = false) => {
        this.removeHighlight();
        if (ids.length > 0) {
            // dim background
            const ctx = this.state.highlightContext;
            ctx.fillStyle = this.props.theme === 'dark' ? 'rgba(17, 17, 17, 0.7)' : 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(0, 0, this.props.width, this.props.height);
            const radius = this.props.circleRadius * factor;
            const mark = !classHighlight;
            // only draw array indices in ids
            for (const id of ids) {
                if (this.state.dataProcessed[id]) {
                    this.drawCircle(this.state.highlightContext, this.state.dataProcessed[id], radius, mark, true);
                }
            }
        }
    }

    /**
     * Removes highlight.
     */
    removeHighlight = () => {
        if (this.state.highlightContext) {
            const ctx = this.state.highlightContext;
            ctx.clearRect(0, 0, this.props.width, this.props.height);
        }
    }

    /**
     * Highlights all data from one class
     * @param {*} classId id of the class
     */
    highlightClass = (classId) => {
        if (!this.state.dataProcessed) {
            return;
        }
        const ids = this.state.dataProcessed
            .filter(d => d.label === classId)
            .map(d => d.id);
        this.highlight(ids, 1, true);
    }

    /**
     * Draws all circles.
     */
    drawCircles = () => {
        this.state.context.clearRect(0, 0, this.props.width, this.props.height);
        for (const d of this.state.dataProcessed) {
            this.drawCircle(this.state.context, d, this.props.circleRadius);
        }
    }

    /**
     * Draws one point on the canvas
     * @param {CanvasRenderingContext2D} ctx canvas context
     * @param {*} point [x, y, class_id]
     * @param {number} radius radius
     */
    drawCircle = (ctx, point, radius) => {
        if (point.type === 'test' && !this.props.drawTestset) {
            return;
        }
        if (point.type === 'test') {
            ctx.lineWidth = radius / 2;
            radius *= 1.5;
            ctx.beginPath();
            // draw +
            radius *= Math.SQRT2;
            ctx.moveTo(point.x - radius, point.y);
            ctx.lineTo(point.x + radius, point.y);
            ctx.moveTo(point.x, point.y - radius);
            ctx.lineTo(point.x, point.y + radius);
            ctx.strokeStyle = point.color;
            ctx.stroke();
        } else {
            // draw train set
            if (this.props.drawTestset) {
                ctx.fillStyle = 'rgba(128, 128, 128, 0.25)';
            } else {
                ctx.fillStyle = point.color;
            }
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI, true);
            ctx.fill();
        }
    }

    render() {
        const w = this.props.width;
        const h = this.props.height;
        // draw data if possible
        if (this.state.context && this.state.dataProcessed) {
            this.drawCircles();
        }
        // check if there is something to highlight
        if (this.props.highlightClass !== null) {
            const id = this.props.highlightClass;
            this.removeHighlight();
            this.highlightClass(id, 2);
        } else if (this.props.highlight) {
            const { ids, factor } = this.props.highlight;
            this.highlight(ids, factor);
        }
        return (
            <div
                className='ScatterPlot'
                ref={n => this.node = n}
                style={{
                    width: `${w}px`,
                    height: `${h}px`
                }}
                onMouseMove={this.handleMouseMove}
                onMouseOut={this.handleMouseOut}
            >
                <canvas
                    width={w}
                    height={h}
                    ref={n => this.canvas = n}
                />
                <canvas
                    className='highlightCanvas'
                    width={w}
                    height={h}
                    ref={n => this.highlightCanvas = n}
                />
            </div>
        );
    }
}
