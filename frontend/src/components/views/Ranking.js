import React, { Component } from 'react';
import { mean } from 'd3-array';
import { Checkbox, ControlLabel, FormGroup } from 'react-bootstrap';
import Tools from '../../lib/Tools';
import '../../style/views/Ranking.css';

export default class Ranking extends Component {

    constructor(props) {
        super(props);
        this.state = {
            // substract minimum of values to better show differences?
            normalizeBars: false,
            // use stacked bars
            stack: true,
            aggregationMode: 'none',
            representantMode: 'mean',
            // the classifier groups that are expanded
            expanded: new Set()
        };
    }

    /**
     * Aggregates classifiers by a variable
     */
    aggregate = (clfResults, groupingAttribute) => {
        // group classifiers
        const { aggregatedMap, accessor } = Tools.groupClassifiersByAttribute(clfResults, groupingAttribute);

        // choose representants
        let representants = [];
        // eslint-disable-next-line
        for (const [attrValue, clfs] of aggregatedMap.entries()) {
            let repr;
            const sorted = this.props.sortClfResults(clfs);
            if (this.state.representantMode === 'best') {
                // take best of each group
                repr = Tools.clone(sorted[0]);

            } else if (this.state.representantMode === 'median') {
                // take median of each group
                const index = Math.floor(clfs.length / 2);
                repr = Tools.clone(sorted[index]);

            } else {
                // create mean classifier
                repr = {
                    // copy all args etc. into the new object
                    ...Tools.clone(sorted[0]),
                    // but change scores
                    pred_time: mean(clfs.map(d => d.pred_time)),
                    clf_time: mean(clfs.map(d => d.clf_time)),
                    test_scores: {
                        accuracy: mean(clfs.map(d => d.test_scores.accuracy)),
                        pre_rec_fs_supp: [
                            mean(clfs.map(d => d.test_scores.pre_rec_fs_supp[0])),
                            mean(clfs.map(d => d.test_scores.pre_rec_fs_supp[1])),
                            mean(clfs.map(d => d.test_scores.pre_rec_fs_supp[2])),
                        ],
                        conf_matrix: Tools.getMeanTestConfMatrix(sorted)
                    },
                    train_scores: {
                        accuracy: mean(clfs.map(d => d.train_scores.accuracy)),
                        pre_rec_fs_supp: [
                            mean(clfs.map(d => d.train_scores.pre_rec_fs_supp[0])),
                            mean(clfs.map(d => d.train_scores.pre_rec_fs_supp[1])),
                            mean(clfs.map(d => d.train_scores.pre_rec_fs_supp[2])),
                        ],
                        conf_matrix: []
                    }
                };
            }
            // flag it as an representant
            repr.isRepresentant = true;
            representants.push(repr);
        }

        return {
            // sort by current ordering
            representants: this.props.sortClfResults(representants),
            aggregatedMap,
            accessor
        }
    }

    /**
     * Expands or collapses an aggregated classifier
     */
    expand = (clfResult, accessor) => {
        if (this.state.aggregationMode === 'none') {
            return;
        }
        const expanded = this.state.expanded;
        const variable = accessor(clfResult);
        if (expanded.has(variable)) {
            expanded.delete(variable);
        } else {
            expanded.add(variable);
        }
        this.setState({ expanded });
    }

    expandAll = (clfResults, accessor) => {
        if (this.state.aggregationMode === 'none') {
            return;
        }
        const expanded = this.state.expanded;
        clfResults.forEach(d => {
            const variable = accessor(d);
            expanded.add(variable);
        });
        this.setState({ expanded });
    }

    /**
     * Creates the lines connecting all bars of a classifier
     * @param {*} clfs
     * @param {*} sortedByTrainAcc
     * @param {*} sortedByTestAcc
     * @param {*} sortedByClfTime
     * @param {*} sortedByPredTime
     * @param {*} rowHeight
     * @param {*} colors
     * @param {*} labelWidth
     * @param {*} barWidth
     */
    getConnectors = (
        clfs,
        sortedByTrainAcc,
        sortedByTestAcc,
        sortedByClfTime,
        sortedByPredTime,
        rowHeight,
        colors,
        labelWidth,
        barWidth
    ) => {
        return clfs.map((d, i) => {
            // get ranking positions if this classifier
            const indices = [
                i,
                sortedByTrainAcc.indexOf(d),
                sortedByTestAcc.indexOf(d),
                sortedByClfTime.indexOf(d),
                sortedByPredTime.indexOf(d)
            ];
            // get pixel positions
            const y = indices.map(d => (d + 1.4) * rowHeight);
            let x = colors.length + 0.25;
            // create Bezier curves
            let pathD = `M ${labelWidth},                            ${y[0]}
                         L ${labelWidth + colors.length * barWidth}, ${y[0]}`;
            for (let i = 1; i < indices.length; i++) {
                pathD = `${pathD}
                         C ${labelWidth + x * barWidth},          ${y[i - 1]}
                           ${labelWidth + x * barWidth},          ${y[i]}
                           ${labelWidth + (x + 0.25) * barWidth}, ${y[i]}
                         L ${labelWidth + (x + 1.25) * barWidth}, ${y[i]}`;
                x += 1.5;
            }

            let isHighlighted = false;
            if (this.props.highlightClf && this.props.highlightClf.args) {
                isHighlighted = d.args.title === this.props.highlightClf.args.title;
            }

            return (
                <path
                    key={i}
                    onMouseOver={() => this.props.onHighlightClf(d)}
                    strokeWidth={isHighlighted ? rowHeight * 0.6 : 1}
                    d={pathD}
                />
            );
        });
    }

    render() {
        let clfs = this.props.clfResults;
        if (clfs.length === 0) {
            return (<div>You have not selected any classifiers.</div>);
        }

        // aggregate
        let accessor;
        let representants;
        if (this.state.aggregationMode !== 'none') {
            const result = this.aggregate(clfs, this.state.aggregationMode);
            accessor = result.accessor;
            representants = result.representants;
            let aggregatedMap = result.aggregatedMap;

            clfs = [];
            // add representants (and children if expanded)
            representants.forEach((d, i) => {
                const variable = accessor(d);
                const children = aggregatedMap.get(variable);
                d.numChildren = children.length;
                d.isExpanded = this.state.expanded.has(variable);
                // add representant
                clfs.push(d);
                if (d.isExpanded) {
                    // add children clfs
                    clfs = clfs.concat(children);
                }
            });
        }

        // layout variables
        const width = this.props.mainSize.width;
        const rowHeight = 20;
        const height = 16;
        const fontSize = 12;
        const labelWidth = width / 5;
        const barWidth = (width - labelWidth - 30) / 10;
        const spacing = 2;
        // pick colors from diverging colormap,
        // so colorblind users can change it
        const colors = [
            this.props.divergingColorMap(1),
            this.props.divergingColorMap(0.75),
            this.props.divergingColorMap(0),
            this.props.divergingColorMap(0.25)
        ];

        // create shorthands for data stats
        let dataStats = this.props.dataStats;
        if (this.state.aggregationMode !== 'none') {
            // when aggregated, use only displayed clfs for scaling
            dataStats = Tools.getDataStats(clfs);
        }
        const [minTrainAcc, maxTrainAcc] = dataStats.trainAccuracy;
        const [minTestAcc, maxTestAcc] = dataStats.testAccuracy;
        const [minTrainTime, maxTrainTime] = dataStats.trainTime;
        const [minTestTime, maxTestTime] = dataStats.testTime;

        // sorted classifiers (by each score that is displayed)
        const sortedByTrainAcc = this.props.sortClfResults(clfs.map(d => d), 'train_accuracy');
        const sortedByTestAcc = this.props.sortClfResults(clfs.map(d => d), 'test_accuracy');
        const sortedByClfTime = this.props.sortClfResults(clfs.map(d => d), 'train_time');
        const sortedByPredTime = this.props.sortClfResults(clfs.map(d => d), 'test_time');

        // rows with label, combined chart and single charts
        const rows = clfs.map((d, i) => {
            const y = (i + 1) * rowHeight;

            // combined bar
            let widths;
            if (this.state.normalizeBars) {
                widths = [
                    (d.train_scores.accuracy - minTrainAcc) / (maxTrainAcc - minTrainAcc),
                    (d.test_scores.accuracy - minTestAcc) / (maxTestAcc - minTestAcc),
                    (d.clf_time - minTrainTime) / (maxTrainTime - minTrainTime),
                    (d.pred_time - minTestTime) / (maxTestTime - minTestTime)
                ];
            } else {
                widths = [
                    d.train_scores.accuracy,
                    d.test_scores.accuracy,
                    d.clf_time / maxTrainTime,
                    d.pred_time / maxTestTime
                ];
            }
            widths = widths.map(d => d * barWidth);

            const titles = [
                `Training accuracy: ${(d.train_scores.accuracy * 100).toFixed(2)} %`,
                `Test accuracy: ${(d.test_scores.accuracy * 100).toFixed(2)} %`,
                `Training time: ${Tools.formatTime(d.clf_time)}`,
                `Test time: ${Tools.formatTime(d.pred_time)}`
            ];

            // single bars in current row (not necessarily of the classifier in this row)
            const entries = [
                sortedByTrainAcc[i],
                sortedByTestAcc[i],
                sortedByClfTime[i],
                sortedByPredTime[i]
            ];
            let widths2;
            if (this.state.normalizeBars) {
                widths2 = [
                    (entries[0].train_scores.accuracy - minTrainAcc) / (maxTrainAcc - minTrainAcc),
                    (entries[1].test_scores.accuracy - minTestAcc) / (maxTestAcc - minTestAcc),
                    (entries[2].clf_time - minTrainTime) / (maxTrainTime - minTrainTime),
                    (entries[3].pred_time - minTestTime) / (maxTestTime - minTestTime)
                ];
            } else {
                widths2 = [
                    entries[0].train_scores.accuracy,
                    entries[1].test_scores.accuracy,
                    entries[2].clf_time / maxTrainTime,
                    entries[3].pred_time / maxTestTime,
                ];
            }
            widths2 = widths2.map(d => d * barWidth);
            const titles2 = [
                `Training accuracy: ${(entries[0].train_scores.accuracy * 100).toFixed(3)} %`,
                `Test accuracy: ${(entries[1].test_scores.accuracy * 100).toFixed(3)} %`,
                `Training time: ${Tools.formatTime(entries[2].clf_time)}`,
                `Test time: ${Tools.formatTime(entries[3].pred_time)}`
            ];
            // get x position for all bars
            let x;
            if (this.state.stack) {
                const anchor = labelWidth + 2 * barWidth + 2 * spacing;
                x = [
                    anchor - widths[0] - widths[1] - 2 * spacing,
                    anchor - widths[1] - spacing,
                    anchor,
                    anchor + widths[2] + spacing
                ];
            } else {
                x = widths.map((d, i) => labelWidth + i * (barWidth + spacing));
            }

            // change title to display number of items for aggregation representants
            let title = d.args.title;
            if (d.isRepresentant) {
                title = `${accessor(d).toString().toUpperCase()} (${d.numChildren})`;
            }

            // group indicator
            let grpIndicator;
            if (this.state.aggregationMode !== 'none') {
                if (d.isRepresentant) {
                    grpIndicator = (
                        <rect
                            x={labelWidth - 8}
                            y={y + 5}
                            height={rowHeight - 5}
                            width={6}
                            fill='#888'
                        />
                    );
                } else {
                    grpIndicator = (
                        <rect
                            x={labelWidth - 6}
                            y={y}
                            height={rowHeight}
                            width={2}
                            fill='#888'
                        />
                    );
                }
            }

            return (
                <g
                    key={i}
                >
                    <g
                        className={d.isRepresentant ? 'row aggregated' : 'row'}
                        onMouseOver={() => this.props.onHighlightClf(d)}
                        onClick={d.isRepresentant ? () => this.expand(d, accessor) : undefined}
                    >
                        {/* label */}
                        <text
                            x={labelWidth - 10}
                            y={y + fontSize}
                            fill={this.props.clfColorMap.get(d.args.title)}
                            textAnchor='end'
                        >
                            {title}
                            <title>
                                {d.args.title}
                            </title>
                        </text>

                        {grpIndicator}

                        {/* combined chart */}
                        {titles.map((title, i) => (
                            <rect
                                key={title}
                                x={x[i]}
                                y={y}
                                height={height}
                                width={widths[i]}
                                fill={colors[i]}
                            >
                                <title>{title}</title>
                            </rect>
                        ))}
                    </g>

                    {/* charts for single scores */}
                    {titles2.map((title, i) => {
                        const offset = titles2.length + 0.5 + i * 1.5;
                        return (
                            <rect
                                key={i}
                                x={labelWidth + offset * barWidth}
                                y={y}
                                height={height}
                                width={widths2[i]}
                                fill={colors[i]}
                                onMouseOver={() => this.props.onHighlightClf(entries[i])}
                            >
                                <title>{title}</title>
                            </rect>
                        );
                    })}
                </g>
            );
        });

        // lines connecting the same classification in all charts
        const connectors = this.getConnectors(clfs, sortedByTrainAcc, sortedByTestAcc, sortedByClfTime, sortedByPredTime, rowHeight, colors, labelWidth, barWidth);

        // labels
        const labels = [
            ['Train. Acc.', 'Training accuracy'],
            ['Test Acc.', 'Test accuracy'],
            ['Train. Time', 'Training time'],
            ['Test Time*', 'Test time (time for predicting all training and test set samples)'],
        ].map((d, i) => (
            <text
                key={i}
                x={labelWidth + (i + 0.5) * barWidth}
                y={fontSize}
                fill={colors[i]}
            >
                {d[0]}
                <title>{d[1]}</title>
            </text>
        ));

        // legend (min and max on top of the single bars)
        const legend = [
            [Tools.formatAccuracy(minTrainAcc), Tools.formatAccuracy(maxTrainAcc)],
            [Tools.formatAccuracy(minTestAcc), Tools.formatAccuracy(maxTestAcc)],
            [Tools.formatTime(minTrainTime), Tools.formatTime(maxTrainTime)],
            [Tools.formatTime(minTestTime), Tools.formatTime(maxTestTime)]
        ].map((d, i) => (
            <g key={i}>
                <text
                    x={labelWidth + (colors.length + 0.5 + (i * 1.5)) * barWidth}
                    y={fontSize}
                >
                    {this.state.normalizeBars ? d[0] : 0}
                </text>
                <text
                    x={labelWidth + (colors.length + ((i + 1) * 1.5)) * barWidth}
                    y={fontSize}
                >
                    {d[1]}
                </text>
            </g>
        ));

        // allow to aggregate on parameter names
        const params = Tools.getParameterNames(this.props.clfResults);
        const paramOptions = params.map(d => (
            <option
                key={d}
                value={d}
            >
                {d}
            </option>
        ));

        return (
            <div className='Ranking'>
                <div className='control'>
                    <FormGroup>
                        <ControlLabel>
                            Group by
                        </ControlLabel>
                        <select
                            onChange={(e) => this.setState({ aggregationMode: e.target.value, expanded: new Set() })}
                            defaultValue={this.state.aggregationMode}
                        >
                            <optgroup label='General'>
                                <option value='none'>None</option>
                                <option value='method'>Method</option>
                                <option value='fold'>Fold</option>
                                <option value='clf_with_fold'>Classifier with folds</option>
                            </optgroup>
                            <optgroup label='Parameters'>
                                {paramOptions}
                            </optgroup>
                        </select>
                    </FormGroup>

                    <FormGroup>
                        <ControlLabel>
                            Represent groups by
                        </ControlLabel>
                        <select
                            onChange={(e) => this.setState({ representantMode: e.target.value })}
                            defaultValue={this.state.representantMode}
                            disabled={this.state.aggregationMode === 'none'}
                        >
                            <option value='mean'>Computed mean</option>
                            <option value='best'>Top result (according to current ordering)</option>
                            <option value='median'>Median result (according to current ordering)</option>
                        </select>
                    </FormGroup>

                    <FormGroup>
                        <button
                            onClick={() => this.expandAll(representants, accessor)}
                            disabled={this.state.aggregationMode === 'none'}
                        >
                            Expand all
                        </button>
                        <button
                            onClick={() => this.setState({ expanded: new Set() })}
                            disabled={this.state.aggregationMode === 'none'}
                        >
                            Collapse all
                        </button>
                    </FormGroup>

                    <FormGroup>
                        <Checkbox
                            title='Scales the bars, such that differences are shown more clearly, but the bar length is no longer proportional to the value.'
                            onChange={() => this.setState({ normalizeBars: !this.state.normalizeBars })}
                        >
                            Normalize bars
                        </Checkbox>
                        <Checkbox
                            title='Stacked bars may be harder to compare'
                            onChange={() => this.setState({ stack: !this.state.stack })}
                            defaultChecked={true}
                        >
                            Stack bars
                        </Checkbox>
                    </FormGroup>
                </div>

                <svg
                    width={width}
                    height={(clfs.length + 1) * rowHeight}
                >
                    {/* labels */}
                    <g className='labels'>
                        {labels}
                    </g>

                    {/* legend */}
                    <g className='legend'>
                        {legend}
                    </g>

                    {connectors}

                    {rows}
                </svg>
            </div>
        );
    }
}
