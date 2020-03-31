import React, { Component } from 'react';
import { scaleLinear } from 'd3-scale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faWindowClose } from '@fortawesome/free-solid-svg-icons';
import Colormap from '../../lib/Colormap';
import '../../style/views/Settings.css';


export default class Settings extends Component {

    constructor(props) {
        super(props);
        const o = this.props.colorMapOptions;
        this.state = {
            // size
            colorMapWidth: 500,
            colorMapHeight: 20,
            // colormaps
            colorMapCategorical: o.categorical,
            colorMapDiverging: o.diverging,
            colorMapContinuous: o.continuous
        };
    }

    componentDidMount() {
        this.setState(
            {
                // canvas
                contextCategorical: this.canvasCategorical.getContext('2d'),
                contextDiverging: this.canvasDiverging.getContext('2d'),
                contextContinuous: this.canvasContinuous.getContext('2d'),
            },
            this.draw
        );
    }

    componentDidUpdate() {
        this.draw();
    }


    /**
     * Draws a color map on a canvas
     */
    drawColorMap = (colorMap, ctx, mode) => {
        const w = this.state.colorMapWidth;
        const h = this.state.colorMapHeight;
        ctx.clearRect(0, 0, w, h);
        let scale;
        if (mode === 'categorical') {
            const segmentSize = w / colorMap.length;
            for (let i = 0; i < colorMap.length; i++) {
                ctx.fillStyle = colorMap[i];
                ctx.fillRect(i * segmentSize, 0, segmentSize, h);
            }
        } else {
            scale = scaleLinear().domain([0, w]).range([0, 1]);
            for (let i = 0; i < w; i++) {
                const value = scale(i);
                ctx.fillStyle = colorMap(value);
                ctx.fillRect(i, 0, 1, h);
            }
        }
    }

    draw = () => {
        const s = this.state;
        const categorical = Colormap.categoricalColorMaps.get(s.colorMapCategorical);
        const diverging = Colormap.divergingColorMaps.get(s.colorMapDiverging);
        const continuous = Colormap.continuousColorMaps.get(s.colorMapContinuous);
        this.drawColorMap(categorical, s.contextCategorical, 'categorical');
        this.drawColorMap(diverging, s.contextDiverging, 'diverging');
        this.drawColorMap(continuous, s.contextContinuous, 'continuous');
    }

    /**
     * Update local state and tell App.js to update its state
     * and the clf color maps
     */
    changeColorMap = (mode, value) => {
        switch (mode) {
            case 'categorical':
                this.setState({ colorMapCategorical: value });
                this.props.updateColorMapSettings({
                    ...this.props.colorMapOptions,
                    categorical: value
                });
                break;
            case 'diverging':
                this.setState({ colorMapDiverging: value });
                this.props.updateColorMapSettings({
                    ...this.props.colorMapOptions,
                    diverging: value
                });
                break;
            case 'continuous':
                this.setState({ colorMapContinuous: value });
                this.props.updateColorMapSettings({
                    ...this.props.colorMapOptions,
                    continuous: value
                });
                break;
            default:
                console.warn(`Invalid color map mode ${mode}`);
        }
    }

    getColorMapOptions = (mapOfColorMaps) => {
        return Array.from(mapOfColorMaps).map(d => (
            <option
                key={d[0]}
                value={d[0]}
            >
                {d[0]}
            </option>
        ));
    }

    render() {
        return (
            <div
                className='Settings'
                onClick={this.toggleSettings}
            >
                <div className='content'>
                    <button
                        className='closeButton'
                        onClick={this.props.toggleSettings}
                        title='Close'
                    >
                        <FontAwesomeIcon icon={faWindowClose} />
                    </button>

                    <h1>Settings</h1>

                    <h3>Theme</h3>

                    <button
                        onClick={this.props.toggleTheme}
                        title='Toggle dark / bright theme'
                    >
                        <FontAwesomeIcon icon={faSun} /> Toggle bright / dark theme
                    </button>

                    <h3>Color maps</h3>
                    You can change the color maps here if you have issues with readability or prefer different colors. Changes are applied immediately.
                    <div>
                        <h4>Categorical</h4>
                        Used for classifiers when they are colored by a category and for classes in the data view.
                        <div>
                            <canvas
                                width={this.state.colorMapWidth}
                                height={this.state.colorMapHeight}
                                ref={n => this.canvasCategorical = n}
                            />
                        </div>
                        <select
                            onChange={(e) => this.changeColorMap('categorical', e.target.value)}
                            defaultValue={this.state.colorMapCategorical}
                        >
                            {this.getColorMapOptions(Colormap.categoricalColorMaps)}
                        </select>
                    </div>

                    <div>
                        <h4>Continuous</h4>
                        Used for classifiers when they are colored by a score.<br />
                        Colors on the right indicate better classifiers.
                        <div>
                            <canvas
                                width={this.state.colorMapWidth}
                                height={this.state.colorMapHeight}
                                ref={n => this.canvasContinuous = n}
                            />
                        </div>
                        <select
                            onChange={(e) => this.changeColorMap('continuous', e.target.value)}
                            defaultValue={this.state.colorMapContinuous}
                        >
                            {this.getColorMapOptions(Colormap.continuousColorMaps)}
                        </select>
                    </div>

                    <div>
                        <h4>Diverging</h4>
                        Used for the correlation matrix and difference confusion matrices.<br />
                        Colors go from the left to the middle to the right for low, neutral and high values.
                        <div>
                            <canvas
                                width={this.state.colorMapWidth}
                                height={this.state.colorMapHeight}
                                ref={n => this.canvasDiverging = n}
                            />
                        </div>
                        <select
                            onChange={(e) => this.changeColorMap('diverging', e.target.value)}
                            defaultValue={this.state.colorMapDiverging}
                        >
                            {this.getColorMapOptions(Colormap.divergingColorMaps)}
                        </select>
                    </div>
                </div>
            </div>
        );
    }
}
