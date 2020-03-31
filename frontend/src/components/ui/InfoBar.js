import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartPie, faBrain, faVial, faHighlighter, faInfo, faDatabase, faTags, faFilter, faEraser } from '@fortawesome/free-solid-svg-icons';
import ColorMapLegend from '../common/ColorMapLegend';
import '../../style/ui/InfoBar.css';

export default class InfoBar extends Component {
    render() {
        if (['menu', 'help'].includes(this.props.currentView)) {
            return (
                <div className='InfoBar'>
                    <div className='helpText'>
                        <span className='accent'>
                            <FontAwesomeIcon icon={faInfo} />
                        </span>
                        Select a batch job and some classifiers, then press the start button to proceed. Loading may take a few minutes.
                    </div>
                </div>
            );
        }

        if (!this.props.data || !this.props.data.data || !this.props.serverInfo) {
            return (
                <div className='InfoBar'>
                    <div> No data </div>
                </div>
            );
        }

        const classNames = this.props.data.data.class_names;
        const trainSize = this.props.data.data.X_train.length;
        const testSize = this.props.data.data.X_test.length;

        // datset info
        let datasetDescription = this.props.serverInfo.datasets.datasets
            .filter(d => d.name === this.props.data.request.data.dataset)[0].description;
        if (this.props.data.request.data.title !== undefined) {
            datasetDescription = `${this.props.data.request.data.title} - ${datasetDescription}`;
        }
        let datasetDescriptionText = datasetDescription;
        // show truncated dataset description and tooltip with full descr.
        if (datasetDescription.length > 50) {
            datasetDescriptionText = `${datasetDescription.substring(0, 47)}...`;
        }

        // highlight info
        let highlightInfo = (<span>Nothing highlighted</span>);

        if (this.props.highlightClf) {
            highlightInfo = (
                <span>
                    Highlighting classifier&nbsp;
                    <span className='accent'>
                        {this.props.highlightClf.args.title}
                    </span>&nbsp;
                </span>
            );
        } else if (this.props.highlightClass !== null) {
            const id = this.props.highlightClass;
            highlightInfo = (
                <span>
                    Highlighting class&nbsp;
                    <span className='accent'>{classNames[id]}</span>&nbsp;
                </span>
            );
        } else if (this.props.highlight) {
            const { ids } = this.props.highlight;
            if (ids && ids.length > 0) {
                highlightInfo = (
                    <span>
                        Highlighting sample&nbsp;
                    <span className='accent'>{ids[0]}</span>&nbsp;
                </span>
                );
            }
        }

        return (
            <div className='InfoBar'>
                <div title={datasetDescription}>
                    <FontAwesomeIcon icon={faDatabase} />
                    {datasetDescriptionText}
                </div>

                <div title='Number of classifiers, total and filtered'>
                    <FontAwesomeIcon icon={faTags} />
                    Classifiers: <span className='accent'>{this.props.clfResultsAll.length}</span> ( <FontAwesomeIcon icon={faFilter} /><span className='accent'>{this.props.clfResults.length}</span>)
                </div>

                <div title={classNames.join(', ')}>
                    <FontAwesomeIcon icon={faChartPie} />
                    Classes: <span className='accent'>{classNames.length}</span>
                </div>

                <div>
                    <FontAwesomeIcon icon={faBrain} />
                    Training samples: <span className='accent'>{trainSize}</span>
                </div>
                <div>
                    <FontAwesomeIcon icon={faVial} />
                    Test samples: <span className='accent'>{testSize}</span>
                </div>

                <ColorMapLegend
                    clfResults={this.props.clfResults}
                    clfColorMap={this.props.clfColorMap}
                    highlightClf={this.props.highlightClf}
                    onHighlightClf={this.props.onHighlightClf}
                />

                <div>
                    <FontAwesomeIcon icon={faHighlighter} />
                    {highlightInfo}
                    <button
                        title='Reset highlight'
                        onClick={this.props.resetHighlight}
                    >
                        &nbsp;<FontAwesomeIcon icon={faEraser} />
                    </button>
                </div>
            </div>
        );
    }
}
