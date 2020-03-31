import React, { Component } from 'react';

export default class ColorMapLegend extends Component {

    constructor(props) {
        super(props);
        this.state = {
            width: 200,
            height: 20
        };
    }

    componentDidMount() {
        this.setState(
            {
                canvas: this.canvas,
                context: this.canvas.getContext('2d')
            },
            this.draw
        );
    }

    componentDidUpdate() {
        this.draw();
    }

    draw = () => {
        const ctx = this.state.context;
        const colorMap = this.props.clfColorMap;
        const clfs = this.props.clfResults;
        const segmentSize = this.state.width / clfs.length;
        // clear
        ctx.clearRect(0, 0, this.props.width, this.props.height);
        // draw one rect per clfResult, with its current color
        clfs.forEach((d, i) => {
            if (d === this.props.highlightClf) {
                ctx.fillStyle = 'black';
            } else {
                ctx.fillStyle = colorMap.get(d.args.title);
            }
            ctx.fillRect(i * segmentSize, 0, segmentSize, this.state.height);
        });
    }

    handleMouseMove = (e) => {
        // get clfResult from x position
        const x = e.nativeEvent.offsetX;
        const clfs = this.props.clfResults;
        let index = Math.floor(x / this.state.width * clfs.length);
        index = Math.min(+index, clfs.length - 1);
        const clf = clfs[index];
        // trigger highlight
        this.props.onHighlightClf(clf);
    }

    render() {
        return (
            <div className='ColorMapLegend'>
                <canvas
                    onMouseMove={this.handleMouseMove}
                    width={this.state.width}
                    height={this.state.height}
                    ref={n => this.canvas = n}
                />
            </div>
        );
    }
}
