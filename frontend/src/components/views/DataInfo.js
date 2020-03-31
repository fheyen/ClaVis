import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPercent, faVial } from '@fortawesome/free-solid-svg-icons';
import ScatterPlot from '../common/ScatterPlot';
import { max } from 'd3-array';
import '../../style/views/DataInfo.css';

export default class DataInfo extends Component {

    constructor(props) {
        super(props);

        // calculate number of samples per class
        const data = this.props.data.data;

        const samplesPerClassTrain = new Array(data.class_names.length).fill(0);
        data.y_train.forEach(d => samplesPerClassTrain[d]++);

        const samplesPerClassTest = new Array(data.class_names.length).fill(0);
        data.y_test.forEach(d => samplesPerClassTest[d]++);

        this.state = {
            // display options
            drawTestset: false,
            showPercent: false,
            showPercentTotal: false,
            // statistics
            samplesPerClassTrain,
            samplesPerClassTest,
            maxSamplesPerClassTrain: max(samplesPerClassTrain),
            maxSamplesPerClassTest: max(samplesPerClassTest),
            // sizes
            width: this.props.mainSize.width,
            height: this.props.mainSize.height,
            scpWidth: this.props.mainSize.width - 295,
            scpHeight: this.props.mainSize.height - 15
        };
    }

    componentDidUpdate() {
        // resize when size changes
        if (
            this.state.width !== this.props.mainSize.width
            || this.state.height !== this.props.mainSize.height
        ) {
            this.setState(
                {
                    width: this.props.mainSize.width,
                    height: this.props.mainSize.height,
                    scpWidth: this.props.mainSize.width - 295,
                    scpHeight: this.props.mainSize.height - 15
                },
                this.render
            );
        }
    }

    changeProjection = (event) => {
        const file = event.target.value;
        const proj = this.props.cacheContent.projections.filter(d => d.file === file)[0];
        const args = {
            action: 'project',
            data: this.props.data.request.data,
            projection: {
                ...proj.args,
                file: proj.file.replace('_args.json', '')
            }
        };
        this.props.changeProjectedData(args);
    }

    /**
     * Creates a class distribution histogram
     */
    getClassDistribution = (
        classNames,
        samplesPerClass,
        maxPercent,
        dataset,
        datasetName
    ) => {
        return (
            <svg
                className='classDistribution'
                width='280'
                height={classNames.length * 5}
            >
                {
                    classNames.map((d, i) => {
                        const percent = samplesPerClass[i] / dataset.length * 100;
                        let color = this.props.colorMap[i % this.props.colorMap.length];
                        if (this.props.highlightClass === i) {
                            color = this.props.theme === 'dark' ? 'white' : 'black';
                        }
                        return (
                            <rect
                                key={i}
                                x='0'
                                y={i * 5}
                                width={percent / maxPercent * 250}
                                height='4'
                                fill={color}
                                onClick={() => this.props.onHighlightClass(i)}
                            >
                                <title>
                                    {d} ({percent.toFixed(2)} % of the {datasetName})
                                </title>
                            </rect>
                        );
                    })
                }
            </svg>
        );
    }

    /**
     * Creates the rows for the class details table
     */
    getClassDetailRows = () => {
        const data = this.props.data.data;
        const totalNumSamples = data.y_train.length + data.y_test.length;
        const boldStyle = { fontWeight: 'bold' };
        return data.class_names.map((d, i) => {
            const trainSamples = this.state.samplesPerClassTrain[i];
            const testSamples = this.state.samplesPerClassTest[i];
            const biggestTrainClass = trainSamples === this.state.maxSamplesPerClassTrain;
            const biggestTestClass = testSamples === this.state.maxSamplesPerClassTest;
            const style = {
                background: this.props.colorMap[i % this.props.colorMap.length],
                borderLeft: this.props.highlightClass === i ?
                    '3px solid var(--textColor)' :
                    '3px solid transparent'
            };
            // show either sample counts or percentages
            if (this.state.showPercent) {
                let trainPercent, testPercent;
                // show either pecent of the current set or of total data
                if (this.state.showPercentTotal) {
                    trainPercent = trainSamples / totalNumSamples * 100;
                    testPercent = testSamples / totalNumSamples * 100;
                } else {
                    trainPercent = trainSamples / data.y_train.length * 100;
                    testPercent = testSamples / data.y_test.length * 100;
                }
                const totalPercent = (trainSamples + testSamples) / totalNumSamples * 100;
                return (
                    <tr
                        key={i}
                        style={style}
                        onClick={() => this.props.onHighlightClass(i)}
                    >
                        <td>
                            {d}
                        </td>
                        <td style={biggestTrainClass ? boldStyle : null}>
                            {trainPercent.toFixed(1)}%
                        </td>
                        <td style={biggestTestClass ? boldStyle : null}>
                            {testPercent.toFixed(1)}%
                        </td>
                        <td>
                            {totalPercent.toFixed(1)}%
                        </td>
                    </tr>
                );
            } else {
                return (
                    <tr
                        key={i}
                        style={style}
                        onClick={() => this.props.onHighlightClass(i)}
                    >
                        <td>
                            {d}
                        </td>
                        <td style={biggestTrainClass ? boldStyle : null}>
                            {trainSamples}
                        </td>
                        <td style={biggestTestClass ? boldStyle : null}>
                            {testSamples}
                        </td>
                        <td>
                            {trainSamples + testSamples}
                        </td>
                    </tr>
                );
            }
        });
    }

    render() {
        // show data statistics
        const info = this.props.serverInfo;
        const data = this.props.data.data;
        const request = this.props.data.request;
        const dsName = request.data.dataset;
        const title = info.datasets.datasets.filter(d => d.name === dsName)[0].description;

        const totalNumSamples = data.y_train.length + data.y_test.length;
        const maxPercentTrain = this.state.maxSamplesPerClassTrain / data.y_train.length * 100;
        const maxPercentTest = this.state.maxSamplesPerClassTest / data.y_test.length * 100;

        const classDetailRows = this.getClassDetailRows();

        // projection options to select
        const projectionOptions = this.props.cacheContent.projections
            .filter(d => d.file.split('__')[0] === data.hash)
            .sort((a, b) => a.args.title > b.args.title ? 1 : -1)
            .map(d => {
                return (
                    <option
                        key={d.file}
                        value={d.file}
                    >
                        {d.args.title}
                    </option>
                );
            });

        return (
            <div className='DataInfo'>
                <div className='info' style={{ height: this.state.scpHeight }} >
                    <table>
                        <tbody>
                            <tr>
                                <td className='accent'>Experiment</td>
                                <td>{request.data.title}</td>
                            </tr>
                            <tr>
                                <td className='accent'>Dataset</td>
                                <td>{title}</td>
                            </tr>
                            <tr>
                                <td className='accent'>Projection</td>
                                <td>
                                    <select
                                        defaultValue={request.projection.file}
                                        onChange={(e) => this.changeProjection(e)}
                                    >
                                        {projectionOptions}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td className='accent'>Classes</td>
                                <td>{data.class_names.length}</td>
                            </tr>
                        </tbody>
                    </table>

                    <button
                        onClick={() => this.setState({ drawTestset: !this.state.drawTestset })}
                        title='Toggle test set display.'>
                        <FontAwesomeIcon icon={faVial} />
                        Toggle test set
                    </button>

                    <div>
                        Training set class distribution
                            {this.getClassDistribution(
                            data.class_names,
                            this.state.samplesPerClassTrain,
                            maxPercentTrain,
                            data.y_train,
                            'training set'
                        )}
                    </div>

                    {data.y_test.length > 0 &&
                        <div>
                            Test set class distribution
                            {this.getClassDistribution(
                                data.class_names,
                                this.state.samplesPerClassTest,
                                maxPercentTest,
                                data.y_test,
                                'test set'
                            )}
                        </div>
                    }

                    <div>
                        <button
                            title='Toggle percentage / number of samples'
                            onClick={() => this.setState({ showPercent: !this.state.showPercent })}
                        >
                            <FontAwesomeIcon icon={faPercent} />
                            Toggle number display
                        </button>
                        <button
                            title='Percentage of a class in relation to the training / test set or to the total amount of data'
                            onClick={() => this.setState({ showPercentTotal: !this.state.showPercentTotal })}
                            disabled={!this.state.showPercent}
                        >
                            <FontAwesomeIcon icon={faPercent} />
                            Toggle percentage of set or total
                        </button>
                    </div>

                    <table>
                        <tbody>
                            <tr>
                                <th>Class name</th>
                                <th>Train</th>
                                <th>Test</th>
                                <th>Total</th>
                            </tr>
                            {classDetailRows}
                            {!this.state.showPercent &&
                                <tr key='total' onClick={() => this.props.onHighlightClass(-1)}>
                                    <td>Sample count</td>
                                    <td>{data.y_train.length}</td>
                                    <td>{data.y_test.length}</td>
                                    <td>{totalNumSamples}</td>
                                </tr>
                            }
                            {this.state.showPercent &&
                                <tr key='total_percent' onClick={() => this.props.onHighlightClass(-1)}>
                                    <td>% {this.state.showPercentTotal ? 'of total' : 'of set'}</td>
                                    <td>
                                        {this.state.showPercentTotal ? (data.y_train.length / totalNumSamples * 100).toFixed(1) : 100}%
                                    </td>
                                    <td>
                                        {this.state.showPercentTotal ? (data.y_test.length / totalNumSamples * 100).toFixed(1) : 100}%
                                    </td>
                                    <td>100%</td>
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>

                <div>
                    <ScatterPlot
                        // update scp when projection changes
                        key={`${this.props.data.request.projection.file} ${this.state.drawTestset}`}

                        data={data}

                        width={this.state.scpWidth}
                        height={this.state.scpHeight}
                        circleRadius={this.props.circleRadius}
                        colorMap={this.props.colorMap}
                        theme={this.props.theme}
                        drawTestset={this.state.drawTestset}

                        highlight={this.props.highlight}
                        highlightClass={this.props.highlightClass}
                        onHighlight={this.props.onHighlight}

                        showDetails={this.props.showDetails}
                    />
                </div>
            </div>
        );
    }
}
