import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faMap, faBars, faLessThanEqual, faSortNumericDown, faCircle, faClock, faQuestionCircle, faAlignLeft, faFilter } from '@fortawesome/free-solid-svg-icons';
// App layout
import InfoBar from './components/ui/InfoBar';
import ControlBar from './components/ui/ControlBar';
// Views
import Menu from './components/views/Menu';
import Help from './components/views/Help';
import Filter from './components/views/Filter';
import Ranking from './components/views/Ranking';
import ClassifierMap from './components/views/Map';
import Plot from './components/views/Plot';
import Summary from './components/views/Summary';
import History from './components/views/History';
import Comparison from './components/views/Comparison';
import DataInfo from './components/views/DataInfo';
import Blank from './components/views/Blank';
import Settings from './components/views/Settings';
// Parts of views
import ClassifierSummary from './components/common/ClassifierSummary';
// Utility
import Tools from './lib/Tools';
import Colormap from './lib/Colormap';
import Api from './api/Api';
import './style/App.css';
import './style/_colors.css';


export default class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            serverUri: 'http://127.0.0.1:12345/',
            // colors
            theme: localStorage.theme ? localStorage.theme : 'bright', // dark, bright
            clfColorMapMode: 'method',
            colorMapOptions: {
                categorical: 'schemeCategory10',
                diverging: 'interpolateRdYlGn',
                continuous: 'interpolateWarm'
            },
            // classifier ordering (default: sorted by test accuracy descending)
            clfOrdering: 'test_accuracy', // see this.sortClfResults()
            clfOrderingAscending: false,
            // highlight
            highlight: null,
            highlightClass: null,
            highlightClf: null,
            // menu progress bar and button
            progress: null,
            // views with circles
            circleRadius: 3,
            // classifier summary
            confMatrixSize: 250,
            // classifier map
            comparisonMetric: 'pred_proba', // confMatrices, pred_proba, pred
            // history
            historySmoothingWeight: 0,
            // data initial values
            serverInfo: null,
            clfResults: null,
            clfResultsAll: null,
            data: null,
            dataStats: null,
            // views
            twoColumnLayout: false,
            currentView: 'menu',
            currentSecondView: null,
            viewAfterLoading: 'ranking',
            showSettings: false,
            views: [
                {
                    name: 'menu',
                    title: 'Menu',
                    icon: (<FontAwesomeIcon icon={faBars} />)
                },
                {
                    name: 'help',
                    title: 'Help and Information',
                    icon: (<FontAwesomeIcon icon={faQuestionCircle} />)
                },
                {
                    name: 'filter',
                    title: 'Filter',
                    icon: (<FontAwesomeIcon icon={faFilter} />)
                },
                {
                    name: 'ranking',
                    title: 'Ranking',
                    icon: (<FontAwesomeIcon icon={faSortNumericDown} />)
                },
                {
                    name: 'map',
                    title: 'Classifier Similarity Map',
                    icon: (<FontAwesomeIcon icon={faMap} />)
                },
                {
                    name: 'plot',
                    title: 'Scatterplot and Correlation Matrix',
                    icon: (<FontAwesomeIcon icon={faCircle} />)
                },
                {
                    name: 'summary',
                    title: 'Classifier Summaries',
                    icon: (<FontAwesomeIcon icon={faAlignLeft} />)
                },
                {
                    name: 'history',
                    title: 'Training History',
                    icon: (<FontAwesomeIcon icon={faClock} />)
                },
                {
                    name: 'comparison',
                    title: 'Classifier Comparison',
                    icon: (<FontAwesomeIcon icon={faLessThanEqual} />)
                },
                {
                    name: 'data',
                    title: 'Dataset Visualization',
                    icon: (<FontAwesomeIcon icon={faDatabase} />)
                }
            ],
            // layout sizes
            screenSize: {
                width: 1000,
                height: 500,
            },
            mainSize: {
                width: 660,
                height: 420
            },
            columns: 5,
            detailViewWidth: 320,
        };
    }

    componentDidMount() {
        window.addEventListener('resize', this.onResize, false);
        this.onResize();
        this.getServerInfo();
    }

    // data functions
    getServerInfo = () => {
        // load server info (available methods, parameters)
        Api.callServerApi(this.state.serverUri, [{ action: 'info' }], 'Server Info')
            .then(serverInfo => {
                this.setState({ serverInfo: serverInfo[0].data });

                // load cache content
                Api.callServerApi(this.state.serverUri, [{ action: 'cache_content' }], 'Cache Content')
                    .then(content => {
                        this.setState({ cacheContent: content[0].data });
                    })
                    .catch(e => {
                        console.error(e);
                        alert('Cannot read cache!');
                    });
            }).catch(e => {
                console.error(e);
                alert('Cannot reach server, make sure it is running (python3 main.py in the backend)!');
            });
    }

    getServerData = (args) => {
        this.setState({
            // reset old data
            data: null,
            clfResults: null,
            clfResultsAll: null,
            clfProjections: null,
            // show progress
            progress: 'Loading projected data'
        });

        // reset layout
        if (this.state.twoColumnLayout) {
            this.toggleLayoutColumns();
        }

        // load the projected dataset
        const datasetConfig = {
            action: 'project',
            data: args.dataset,
            projection: args.projection
        };

        Api.callServerApi(this.state.serverUri, [datasetConfig], 'Projected Data')
            .then(data => {
                this.setState({
                    data: data[0],
                    progress: 'Loading classification results'
                });

                // load classification results
                const clfFiles = args.classifiers.map(c => c.file);

                Api.loadClassificationResults(this.state.serverUri, clfFiles)
                    .then(clfResults => {
                        // sort results
                        clfResults = this.sortClfResults(clfResults);

                        // initialize smoothed history
                        clfResults = clfResults.map(d => Tools.smoothClfHistory(d, 0));

                        // get classifier projections from server
                        const args = {
                            action: 'batch_project_classifiers',
                            classifier_hashes: clfResults.map(d => d.hash),
                            data_hash: data[0].data.hash
                        };

                        // set state so all views are ready
                        // and show the default view
                        this.setState(
                            {
                                progress: 'Loading classifier projections',
                                data: data[0],
                                clfResultsAll: clfResults,
                                // reset sorting and coloring options
                                clfOrdering: 'test_accuracy',
                                clfOrderingAscending: false,
                                clfColorMapMode: 'method',
                                // reset highlight
                                highlight: null,
                                highlightClass: null,
                                highlightClf: null,
                            },
                            () => {
                                // show a view when loading is finished
                                const callback = () => this.showView(this.state.viewAfterLoading);
                                this.setClfResults(clfResults, callback);
                            }
                        );

                        // API call to backend for classifier projection
                        // This is done in the background while users
                        // may already use any view but the map
                        Api.callServerApi(this.state.serverUri, [args], 'Batch Classifier Projection')
                            .then(clfProjections => {
                                let projections = [];
                                try {
                                    projections = clfProjections[0].data;
                                } catch (e) {
                                    console.error('Cannot load projections!');
                                    console.error(e);
                                }
                                this.setState({
                                    clfProjections: projections,
                                    progress: null,
                                });
                            })
                            .catch(e => { throw e });
                    })
                    .catch(e => { throw e });
            }).catch(e => {
                console.error(e);
                alert('Error, make sure the server is working correctly!');
            });
    }

    /**
     * Fetches another projection of the data from the server.
     */
    changeProjectedData = (projectionArgs) => {
        Api.callServerApi(this.state.serverUri, [projectionArgs], 'Projected Data')
            .then(data => {
                this.setState({ data: data[0] });
            })
            .catch(e => {
                console.error(e);
                alert('Error, make sure the server is working correctly!');
            });
    }

    setClfResults = (clfResults, callback) => {
        // sort
        clfResults = this.sortClfResults(clfResults);
        this.setState(
            {
                clfResults,
                dataStats: Tools.getDataStats(clfResults)
            },
            () => {
                this.changeClfColorMap();
                if (callback) {
                    callback();
                }
            }
        );
    }

    /**
     * Updates the state and clf color maps when the user changes
     * the color map settings in the Settings panel
     */
    updateColorMapSettings = (colorMapOptions) => {
        this.setState(
            { colorMapOptions },
            this.changeClfColorMap
        );
    }

    /**
     * Updates the color map.
     * Needed when color map settings or classification results change.
     */
    changeClfColorMap = (mode = this.state.clfColorMapMode) => {
        if (!this.state.clfResults) {
            return;
        }
        const { clfColorMap, clfColorMapOpacity } = Colormap.getClfColorMap(this.state.clfResults, mode, this.state.colorMapOptions);
        this.setState({
            clfColorMap,
            clfColorMapOpacity,
            clfColorMapMode: mode
        });
    }

    /**
     * Sorts the classification results
     * @param {string} mode mode to sort by: accuracy_test, accuracy_train, time
     * @param {object[]} clfResults the classification results to sort
     * @param {boolean} ascending if true, the ordering will be sorted ascending
     * @returns sorted results
     */
    sortClfResults = (
        clfResults,
        mode = this.state.clfOrdering,
        ascending = this.state.clfOrderingAscending
    ) => {
        let accessor;
        switch (mode) {
            case 'title':
                accessor = d => d.args.title;
                break;
            case 'method':
                accessor = d => d.args.method;
                break;
            case 'train_accuracy':
                accessor = d => -d.train_scores.accuracy;
                break;
            case 'test_accuracy':
                accessor = d => -d.test_scores.accuracy;
                break;
            case 'total_accuracy':
                accessor = d => -(d.train_scores.accuracy + d.test_scores.accuracy);
                break;
            case 'train_time':
                accessor = d => d.clf_time;
                break;
            case 'test_time':
                accessor = d => d.pred_time;
                break;
            case 'fold':
                accessor = d => Tools.getClassifierFoldNumber(d);
                break;
            default:
                // sorting by parameter
                accessor = d => d.args[mode] !== undefined ? d.args[mode] : null;
        }
        // compare function
        const compare = (a, b) => {
            const valA = accessor(a);
            const valB = accessor(b);
            if (valA === valB) {
                // stable sort
                return a.args.title < b.args.title ? 1 : -1;
            }
            return valA < valB ? 1 : -1;
        }
        clfResults.sort((a, b) => compare(a, b));
        // handle ordering direction
        if (!ascending) {
            clfResults.reverse();
        }
        return clfResults;
    }

    /**
     * React to window size changes
     */
    onResize = () => {
        let mainWidth = window.innerWidth - this.state.detailViewWidth - 25;
        if (this.state.currentSecondView !== null) {
            mainWidth = (window.innerWidth - this.state.detailViewWidth) / 2 - 50;
        }
        this.setState(
            {
                screenSize: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                },
                mainSize: {
                    width: mainWidth,
                    height: Math.round(window.innerHeight - 90)
                },
                columns: Math.round(mainWidth / 350)
            }
        );
    }

    /**
     * Highlights a data point
     */
    onHighlight = (d) => this.setState({
        highlight: d,
        highlightClass: null,
        highlightClf: null
    })

    /**
     * Highlights a class or end highlighting when user clicks same class again
     */
    onHighlightClass = (id) => this.setState({
        highlight: null,
        highlightClass: (id === -1 || this.state.highlightClass === id) ? null : id,
        highlightClf: null
    })

    /**
     * Highlights a classifier
     * @param clfResult clfResult to highlight (pass null to end highlighting)
     */
    onHighlightClf = (clfResult) => {
        let details;
        if (!clfResult) {
            details = null;
        } else {
            details = (
                <ClassifierSummary
                    data={this.state.data}
                    clfResult={clfResult}
                    serverInfo={this.state.serverInfo}
                    dataStats={this.state.dataStats}

                    confMatrixSize={this.state.confMatrixSize}
                    colorMap={Colormap.getCategoricalColorMap(this.state.colorMapOptions)}
                />
            );
        }
        this.setState({
            highlight: null,
            highlightClass: null,
            highlightClf: clfResult
        }, () => this.showDetails(details));
    }

    resetHighlight = () => {
        this.setState({
            highlight: null,
            highlightClass: null,
            highlightClf: null
        }, () => this.showDetails(null));
    }

    // View settings
    increaseColumns = () => this.setState({ columns: Math.min(12, this.state.columns + 1) })

    decreaseColumns = () => this.setState({ columns: Math.max(1, this.state.columns - 1) })

    increaseCircleRadius = () => this.setState({ circleRadius: Math.min(5, this.state.circleRadius + 0.5) })

    decreaseCircleRadius = () => this.setState({ circleRadius: Math.max(0.5, this.state.circleRadius - 0.5) })

    /**
    * Smooth history and update clfResult state
    */
    changeHistorySmoothing = (w = 0) => {
        w = Math.max(0, Math.min(w, 1));
        const clfResults = this.state.clfResults.map(d => Tools.smoothClfHistory(d, w));
        this.setState({
            historySmoothingWeight: w,
            clfResults
        });
    }

    // Classifier sorting order
    toggleSortDirection = () => {
        this.setState(
            { clfOrderingAscending: !this.state.clfOrderingAscending },
            () => this.orderingChanged(this.state.clfOrdering)
        );
    }

    orderingChanged = (e) => {
        if (this.state.clfResults) {
            let ordering = this.state.clfOrdering;
            if (e.target && e.target.value) {
                ordering = e.target.value;
            }
            const sorted = this.sortClfResults(this.state.clfResults, ordering);
            this.setState({
                clfOrdering: ordering,
                clfResults: sorted
            });
        }
    }

    toggleTheme = () => this.setState(
        { theme: this.state.theme === 'dark' ? 'bright' : 'dark' },
        () => {
            // remember theme in localStorage
            localStorage.theme = this.state.theme;
            this.changeClfColorMap(this.state.clfColorMapMode);
        }
    )

    toggleSettings = () => this.setState({ showSettings: !this.state.showSettings })

    /**
     * Show view (or second view if position is 'right')
     */
    showView = (view, position = 'left') => {
        // check if view is valid:
        // only if data is ready or view is menu or help
        if (
            (this.state.data === null || this.state.clfResults === null)
            && !['menu', 'help'].includes(view)
        ) {
            return;
        }
        if (position === 'left') {
            this.setState({ currentView: view });
        } else {
            this.setState({ currentSecondView: view });
        }
    }

    toggleLayoutColumns = (secondView = 'blank') => {
        // also adjust the width to allow for
        // either one view or two views side by side
        let twoColumnLayout = false;
        let currentSecondView = null;
        let mainWidth = window.innerWidth - this.state.detailViewWidth - 25;
        if (!this.state.twoColumnLayout) {
            // switch to two-colum layout
            twoColumnLayout = true;
            currentSecondView = secondView;
            mainWidth = (window.innerWidth - this.state.detailViewWidth) / 2 - 50;
        }
        this.setState({
            twoColumnLayout,
            currentSecondView,
            mainSize: {
                width: mainWidth,
                height: this.state.mainSize.height
            },
            columns: Math.round(mainWidth / 350)
        });
    }

    showDetails = (detailsContent) => this.setState({ detailsContent });

    // server cache functions
    removeFromServerCache = (filenames) => {
        // extract base file names (without suffix)
        filenames = filenames.map(d => d.replace('_args.json', ''));
        const args = [{
            action: 'delete_cache_files',
            files: filenames
        }];
        Api.callServerApi(this.state.serverUri, args, 'Removing cached files')
            .then(response => {
                if (response[0].data.type !== 'success') {
                    alert(`${response[0].data.type}: ${response[0].data.msg}`);
                }
                // reload cache content
                this.updateServerCacheContent();
            })
            .catch(e => {
                console.error(e);
                alert(`Something went wrong! Make sure the server is running.`);
            });
    }

    /**
     * Deletes all classifier projections from the cache.
     * They are computed automatically when loading data in the menu,
     * depending on the classifiers the user has selected and may not be
     * needed any more.
     */
    deleteAllClfProjections = () => {
        if (window.confirm(`Delete all classifier projections?`)) {
            const args = [{ action: 'delete_all_clf_projs' }];
            Api.callServerApi(this.state.serverUri, args, 'Removing all classifier projections').then(response => {
                try {
                    // if (response[0].data.type !== 'success') {
                    alert(`${response[0].data.type}: ${response[0].data.msg}`);
                    // }
                } catch (e) {
                    alert(`Something went wrong! Make sure the server is running.`);
                }
            });
        }
    }

    updateServerCacheContent = () => {
        // update cache content
        Api.callServerApi(this.state.serverUri, [{ action: 'cache_content' }], 'Cache Content').then(content => {
            this.setState({ cacheContent: content[0].data }, this.render);
        }).catch(e => {
            console.error(e);
            alert('Cannot read backend server cache!');
        });
    }

    /**
     * Get current view content.
     */
    getCurrentViewContent = (viewName) => {
        if (viewName === null) {
            return null;
        }

        let data = this.state.data ? this.state.data.data : null;

        const categoricalColorMap = Colormap.getCategoricalColorMap(this.state.colorMapOptions);
        const categoricalColorMapOpacity = Tools.addOpacity(categoricalColorMap, 0.7)
        const divergingColorMap = Colormap.getDivergingColorMap(this.state.colorMapOptions);

        if (viewName === 'menu') {
            if (this.state.serverInfo && this.state.cacheContent) {
                return (
                    <Menu
                        serverInfo={this.state.serverInfo}
                        cacheContent={this.state.cacheContent}

                        showDetails={this.showDetails}
                        detailViewWidth={this.state.detailViewWidth}

                        mainSize={this.state.mainSize}
                        confMatrixSize={this.state.confMatrixSize}
                        colorMap={categoricalColorMap}

                        onSubmit={this.getServerData}
                        removeFromServerCache={this.removeFromServerCache}
                        deleteAllClfProjections={this.deleteAllClfProjections}

                        progress={this.state.progress}
                    />
                );
            }

        } else if (viewName === 'filter') {
            if (data && this.state.clfResults) {
                return (
                    <Filter
                        data={this.state.data}
                        clfResults={this.state.clfResults}
                        clfResultsAll={this.state.clfResultsAll}
                        serverInfo={this.state.serverInfo}
                        dataStats={this.state.dataStats}

                        mainSize={this.state.mainSize}
                        colorMap={categoricalColorMap}
                        clfColorMap={this.state.clfColorMap}

                        setClfResults={this.setClfResults}
                        sortClfResults={this.sortClfResults}

                        highlightClf={this.state.highlightClf}
                        onHighlightClf={this.onHighlightClf}
                    />
                );
            }

        } else if (viewName === 'ranking') {
            if (data && this.state.clfResults) {
                return (
                    <Ranking
                        data={data}
                        clfResults={this.state.clfResults}
                        serverInfo={this.state.serverInfo}
                        dataStats={this.state.dataStats}

                        mainSize={this.state.mainSize}
                        clfColorMap={this.state.clfColorMap}
                        divergingColorMap={divergingColorMap}

                        sortClfResults={this.sortClfResults}

                        highlightClf={this.state.highlightClf}
                        onHighlightClf={this.onHighlightClf}
                    />
                );
            }

        } else if (viewName === 'map') {
            if (!(this.state.serverInfo && data && this.state.clfResults && this.state.clfProjections)) {
                return (
                    <div>
                        <p>The classifier projections have not finished loading yet. We load them in the background so you can already use the other views.</p>
                        <p>Please try this view again later, or stay here until it refreshes itself.</p>
                    </div>
                );
            } else {
                if (this.state.clfResults.length < 3) {
                    return (
                        <div>
                            At least 3 classification results are needed for this view.
                        </div>
                    );
                } else {
                    return (
                        <ClassifierMap
                            data={data}
                            clfResults={this.state.clfResults}
                            clfProjections={this.state.clfProjections}
                            serverInfo={this.state.serverInfo}

                            circleRadius={this.state.circleRadius}
                            comparisonMetric={this.state.comparisonMetric}
                            clfColorMap={this.state.clfColorMap}
                            clfColorMapOpacity={this.state.clfColorMapOpacity}
                            mainSize={this.state.mainSize}

                            highlightClf={this.state.highlightClf}
                            onHighlightClf={this.onHighlightClf}
                        />
                    );
                }
            }

        } else if (viewName === 'plot') {
            if (this.state.serverInfo && data && this.state.clfResults) {
                return (
                    <Plot
                        clfResults={this.state.clfResults}
                        dataStats={this.state.dataStats}

                        mainSize={this.state.mainSize}
                        clfColorMap={this.state.clfColorMap}
                        clfColorMapOpacity={this.state.clfColorMapOpacity}
                        divergingColorMap={divergingColorMap}

                        highlightClf={this.state.highlightClf}
                        onHighlightClf={this.onHighlightClf}
                    />
                );
            }

        } else if (viewName === 'data') {
            if (data) {
                return (
                    <DataInfo
                        data={this.state.data}
                        serverInfo={this.state.serverInfo}
                        cacheContent={this.state.cacheContent}

                        mainSize={this.state.mainSize}
                        circleRadius={this.state.circleRadius}
                        colorMap={categoricalColorMapOpacity}
                        theme={this.state.theme}

                        highlight={this.state.highlight}
                        onHighlight={this.onHighlight}
                        highlightClass={this.state.highlightClass}
                        onHighlightClass={this.onHighlightClass}

                        changeProjectedData={this.changeProjectedData}
                        showDetails={this.showDetails}
                    />
                );
            }

        } else if (viewName === 'summary') {
            if (data && this.state.clfResults) {
                return (
                    <Summary
                        clfResults={this.state.clfResults}
                        data={this.state.data}
                        serverInfo={this.state.serverInfo}
                        dataStats={this.state.dataStats}

                        columns={this.state.columns}
                        confMatrixSize={this.state.confMatrixSize}
                        colorMap={categoricalColorMap}
                        clfColorMapOpacity={this.state.clfColorMapOpacity}

                        onHighlightClf={this.onHighlightClf}
                        highlightClf={this.state.highlightClf}
                    />
                );
            }

        } else if (viewName === 'history') {
            if (data && this.state.clfResults) {
                return (
                    <History
                        clfResults={this.state.clfResults}

                        mainSize={this.state.mainSize}
                        columns={this.state.columns}
                        clfColorMap={this.state.clfColorMap}
                        clfColorMapMode={this.state.clfColorMapMode}
                        historySmoothingWeight={this.state.historySmoothingWeight}

                        onHighlightClf={this.onHighlightClf}
                        highlightClf={this.state.highlightClf}
                    />
                );
            }

        } else if (viewName === 'comparison') {
            if (data && this.state.clfResults) {
                return (
                    <Comparison
                        data={this.state.data}
                        clfResults={this.state.clfResults}
                        serverInfo={this.state.serverInfo}
                        dataStats={this.state.dataStats}

                        theme={this.state.theme}
                        confMatrixSize={this.state.confMatrixSize}
                        colorMap={categoricalColorMap}
                        clfColorMap={this.state.clfColorMap}
                        divergingColorMap={divergingColorMap}

                        highlight={this.state.highlight}
                        onHighlight={this.onHighlight}
                        highlightClass={this.state.highlightClass}
                        onHighlightClass={this.onHighlightClass}
                        highlightClf={this.state.highlightClf}
                        onHighlightClf={this.onHighlightClf}
                    />
                );
            }

        } else if (viewName === 'help') {
            return (
                <Help
                    serverInfo={this.state.serverInfo}
                    showDetails={this.showDetails}
                    showView={this.showView}
                />
            );

        } else if (viewName === 'blank') {
            return (<Blank />);
        }

        // fallback if there is no data
        return (<div className='awaitingData'>Loading data ...</div>);
    }

    /**
     * Renders the basic App layout with toolbar,
     * statusbar, view area and details panel.
     */
    render() {
        const currentView = this.getCurrentViewContent(this.state.currentView);
        const currentSecondView = this.getCurrentViewContent(this.state.currentSecondView);
        const data = this.state.data ? this.state.data.data : null;

        // calculate styles for sizes
        const heightStyle = { height: `${this.state.mainSize.height}px` };
        const firstViewCol = currentSecondView !== null ? 'auto' : `${this.state.mainSize.width + 25}px`;
        const secondViewCol = currentSecondView !== null ? `${this.state.mainSize.width + 25}px` : '';
        const mainStyle = {
            height: `${this.state.mainSize.height + 20}px`,
            gridTemplateColumns: `${firstViewCol} ${secondViewCol} ${this.state.detailViewWidth}px`
        };

        return (
            <div
                // handle theming
                className={`App ${this.state.theme}`}
            >
                <ControlBar
                    dataReady={data !== null && this.state.clfResults !== null}
                    clfResults={this.state.clfResults}
                    screenSize={this.state.screenSize}

                    views={this.state.views}
                    currentView={this.state.currentView}
                    currentSecondView={this.state.currentSecondView}
                    showView={this.showView}
                    twoColumnLayout={this.state.twoColumnLayout}
                    toggleLayoutColumns={this.toggleLayoutColumns}

                    increaseColumns={this.increaseColumns}
                    decreaseColumns={this.decreaseColumns}

                    increaseCircleRadius={this.increaseCircleRadius}
                    decreaseCircleRadius={this.decreaseCircleRadius}

                    clfOrdering={this.state.clfOrdering}
                    sortAscending={this.state.clfOrderingAscending}
                    toggleSortDirection={this.toggleSortDirection}
                    orderingChanged={this.orderingChanged}

                    toggleTestset={this.toggleTestset}
                    toggleTheme={this.toggleTheme}
                    toggleSettings={this.toggleSettings}

                    clfColorMapMode={this.state.clfColorMapMode}
                    changeClfColorMap={this.changeClfColorMap}

                    historySmoothingWeight={this.state.historySmoothingWeight}
                    changeHistorySmoothing={this.changeHistorySmoothing}
                />

                <div
                    className='Main'
                    style={mainStyle}
                >
                    <div
                        className='ViewContainer'
                        style={heightStyle}
                    >
                        {currentView}
                    </div>
                    {
                        currentSecondView !== null &&
                        <div
                            className='ViewContainer secondView'
                            style={heightStyle}
                        >
                            {currentSecondView}
                        </div>
                    }
                    <div
                        className='DetailsPanel'
                        style={heightStyle}
                    >
                        {this.state.detailsContent ? this.state.detailsContent : 'Hover anything to show details here'}
                    </div>
                </div>

                <InfoBar
                    data={this.state.data}
                    clfResultsAll={this.state.clfResultsAll}
                    clfResults={this.state.clfResults}
                    serverInfo={this.state.serverInfo}
                    currentView={this.state.currentView}

                    colorMap={this.state.colorMap}
                    clfColorMap={this.state.clfColorMap}

                    highlight={this.state.highlight}
                    onHighlight={this.onHighlight}
                    highlightClf={this.state.highlightClf}
                    onHighlightClf={this.onHighlightClf}
                    highlightClass={this.state.highlightClass}
                    onHighlightClass={this.onHighlightClass}
                    resetHighlight={this.resetHighlight}
                />

                {this.state.showSettings &&
                    <Settings
                        toggleSettings={this.toggleSettings}
                        toggleTheme={this.toggleTheme}

                        colorMapOptions={this.state.colorMapOptions}
                        updateColorMapSettings={this.updateColorMapSettings}
                    />
                }
            </div>
        );
    }
}
