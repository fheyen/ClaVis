import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faCheckSquare, faSquare, faCheckCircle, faCircle, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import { extent } from 'd3-array';
import ScoreBar from '../common/ScoreBar';
import ClassifierSummary from '../common/ClassifierSummary';
import '../../style/views/Menu.css';
import Tools from '../../lib/Tools';

export default class Menu extends Component {
    constructor(props) {
        super(props);

        // TODO: re-do all those things when component updates, check if this fixes problems when pressing start after deleting classifiers
        // TODO: add job -> classifier map
        // const jobClassifiersMap = new Map();
        // this.props.cacheContent.classifiers.forEach(d => classifierArgsMap.set(d.file, d.args));

        // prepare datasets and classifiers by mapping argument names etc
        // and storing everything in one object per item
        const jobArgsMap = new Map();
        this.props.cacheContent.datasets.forEach(d => jobArgsMap.set(d.file, d.args));
        const classifierArgsMap = new Map();
        this.props.cacheContent.classifiers.forEach(d => classifierArgsMap.set(d.file, d.args));
        const projectionsArgsMap = new Map();
        this.props.cacheContent.projections.forEach(d => projectionsArgsMap.set(d.file, d.args));

        this.state = {
            // current user selection
            dataset: null,
            classifiers: new Set(),
            projection: null,
            // map:filename -> arguments
            jobArgsMap,
            classifierArgsMap,
            projectionsArgsMap
        };
    }

    componentDidMount() {
        // automatically select the first dataset
        if (this.props.cacheContent.datasets.length > 0) {
            this.jobChanged(this.props.cacheContent.datasets[0]);
        }
    }

    /**
    * Returns the file name from items that are related to the dataset
    */
    getItemNamesWithJob = (file, items) => {
        return this.getItemsWithJob(file, items).map(d => d.file);
    }

    /**
     * Returns the items that are related to the dataset
     */
    getItemsWithJob = (file, items) => {
        const job = file.replace('_args.json', '');
        return items.filter(d => d.file.split('__')[0] === job);
    }

    /**
    * Updates the state with the data selection
    */
    jobChanged = (data) => {
        const job = data.file;
        // select first projection if any are available
        const projections = this.getItemsWithJob(job, this.props.cacheContent.projections);
        let projection;
        if (projections.length > 0) {
            // select first, sorted alphabetically by title
            projection = projections.sort((a, b) => a.args.title > b.args.title ? 1 : -1)[0];
            projection = projection.file;
        }
        // also add all classifiers to selection in state
        let classifiers = this.getItemsWithJob(job, this.props.cacheContent.classifiers);
        // remove those without test scores
        classifiers = classifiers
            .filter(d => d.scores.test_scores)
            .map(d => d.file);

        this.setState({
            dataset: job,
            projection: projection,
            classifiers: new Set(classifiers),
            numClfsForCurrentData: classifiers.length
        });
    }

    /**
     * Updates the state with the classifier selection
     */
    classifierChanged = (data) => {
        const fileName = data.file;
        const classifiers = this.state.classifiers;
        if (!classifiers.has(fileName)) {
            classifiers.add(fileName);
        } else {
            classifiers.delete(fileName);
        }
        this.setState({ classifiers });
    }

    selectAllOrNoneClfs = () => {
        let classifiers = this.state.classifiers;
        if (this.state.classifiers.size === this.state.numClfsForCurrentData) {
            // all are selected, clear selection
            classifiers.clear();
        } else {
            // some or none are selected, select all
            classifiers = new Set(
                this.getItemNamesWithJob(
                    this.state.dataset,
                    this.props.cacheContent.classifiers)
            );
        }
        this.setState({ classifiers });
    }

    sortClassifiers = (clfs) => {
        return clfs.sort((a, b) => {
            // stable sort by accuracy and title
            if (a.scores.test_scores.accuracy === b.scores.test_scores.accuracy) {
                return a.args.title >= b.args.title ? 1 : -1;
            } else {
                return b.scores.test_scores.accuracy - a.scores.test_scores.accuracy;
            }
        });
    }

    selectTopXClassifiers = (e) => {
        const x = e.target.value;
        const clfs = this.getItemsWithJob(
            this.state.dataset,
            this.props.cacheContent.classifiers);
        const top = this.sortClassifiers(clfs)
            .slice(0, x)
            .map(d => d.file);
        this.setState({ classifiers: new Set(top) });
    }

    selectBetterThanNaive = () => {
        const clfs = this.getItemsWithJob(
            this.state.dataset,
            this.props.cacheContent.classifiers);
        const top = this.sortClassifiers(clfs);
        // add classifiers until we reach the first naive
        let better = [];
        for (let i = 0; i < top.length; i++) {
            const clf = top[i];
            if (clf.args.method === 'naive') {
                break;
            }
            better.push(clf);
        }

        better = better.map(d => d.file);
        this.setState({ classifiers: new Set(better) });
    }

    invertSelection = () => {
        let clfs = this.getItemsWithJob(
            this.state.dataset,
            this.props.cacheContent.classifiers);
        clfs = clfs
            .filter(d => !this.state.classifiers.has(d.file))
            .map(d => d.file);
        this.setState({ classifiers: new Set(clfs) });
    }

    /**
     * Remove single folds from the current selection
     */
    removeFolds = () => {
        let clfs = this.getItemsWithJob(
            this.state.dataset,
            this.props.cacheContent.classifiers);
        clfs = clfs
            // take currently selected
            .filter(d => this.state.classifiers.has(d.file))
            // and remove those that have titles ending in 'fold*'
            .filter(d => {
                const splitted = d.args.title.split(' ');
                if (splitted.length < 2) {
                    return true;
                }
                const lastPart = splitted[splitted.length - 1];
                if (!lastPart.includes('fold')) {
                    return true;
                }
                return false;
            })
            .map(d => d.file);
        this.setState({ classifiers: new Set(clfs) });
    }

    /**
     * Shows classifiers and info for the hovered job
     */
    jobHovered = (data) => {
        const args = data.args;
        const paramsTableRows = [];
        for (const property in args) {
            if (args.hasOwnProperty(property)) {
                let description = property.replace('_', ' ');
                description = description[0].toUpperCase() + description.substr(1);
                const value = (args[property]).toString();

                paramsTableRows.push((
                    <tr key={property}>
                        <td>{description}</td>
                        <td>{value}</td>
                    </tr>
                ));
            }
        }
        const details = (
            <div className='Job Details'>
                <h2>Job Details</h2>
                <table>
                    <tbody>
                        {paramsTableRows}
                        <tr key='file'>
                            <td>Hash</td>
                            <td title={data.file}>
                                {data.file.substr(0, 15)}...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
        this.setState({
            hoveredDataset: data.file,
        });
        this.props.showDetails(details);
    }

    /**
     * Shows ClassifierSummary for the hovered classifier
     */
    classifierHovered = (data) => {
        const details = (
            <ClassifierSummary
                data={{}}
                clfResult={{
                    args: data.args,
                    ...data.scores
                }}
                serverInfo={this.props.serverInfo}
                confMatrixSize={this.props.confMatrixSize}
                colorMap={this.props.colorMap}
            />
        );
        this.props.showDetails(details);
    }

    /**
     * Returns selected data to App.js, which then triggers data fetching
     */
    handleSubmit = (e) => {
        if (!this.state.dataset || !this.state.projection || this.state.classifiers.size === 0) {
            alert('Please select at least one dataset, classifier and projection!');
        } else {
            this.props.onSubmit({
                dataset: this.state.jobArgsMap.get(this.state.dataset),
                projection: {
                    file: this.state.projection.replace('_args.json', '')
                },
                classifiers: Array.from(this.state.classifiers.values()).map(d => {
                    return {
                        ...this.state.classifierArgsMap.get(d),
                        file: d.replace('_args.json', '')
                    };
                }),
            });
        }
        e.preventDefault();
    }

    /**
     * Removes a dataset (and everything related to it) from the cache
     */
    deleteCurrentJob = () => {
        const jobArgs = this.state.jobArgsMap.get(this.state.dataset);
        const title = jobArgs.title;
        if (window.confirm(`Delete job ${title} and all its classifications and projections?`)) {
            // send request and update cache content in App.js state
            this.props.removeFromServerCache([this.state.dataset]);
            this.setState({
                dataset: null,
                classifiers: new Set(),
                projection: null
            });
        }
    }

    /**
     * Delete all currently selected classifiers from the cache
     */
    deleteSelectedClassifiers = () => {
        const toDelete = Array.from(this.state.classifiers);
        if (window.confirm(`Delete ${toDelete.length} classifiers?`)) {
            this.props.removeFromServerCache(toDelete);
        }
    }

    render() {
        const ds = this.props.serverInfo.datasets.datasets;
        let selectedDataset;
        if (this.state.hoveredDataset) {
            selectedDataset = this.state.hoveredDataset.replace('_args.json', '');
        } else if (this.state.dataset) {
            selectedDataset = this.state.dataset.replace('_args.json', '');
        }

        // jobs / datasets
        let jobs = <li>There is nothing to show yet. Run some batch jobs first, they will be displayed here.</li>;
        if (this.props.cacheContent.datasets.length > 0) {
            jobs = this.props.cacheContent.datasets
                // sort alphabetically by title or dataset
                .sort((a, b) => a.args.title >= b.args.title ? 1 : -1)
                .map(d => {
                    let description;
                    let onClickFn;
                    try {
                        description = ds.filter(x => x.name === d.args.dataset)[0].description;
                        onClickFn = () => this.jobChanged(d);
                    } catch (e) {
                        description = `${d.args.dataset} (missing plugin)`;
                        // disable this option
                        onClickFn = () => alert('The plugin for this dataset has been removed from the server!');
                    }
                    const relatedProjs = this.getItemNamesWithJob(d.file, this.props.cacheContent.projections);
                    let relatedClfs = this.getItemsWithJob(d.file, this.props.cacheContent.classifiers);
                    relatedClfs = relatedClfs.filter(c => {
                        if (!c.scores.test_scores) {
                            console.warn('Classifier has no test scores!');
                            console.log(c);
                            console.log(d);
                            return false;
                        }
                        return true;
                    });
                    // remove optimal and naive for statistics
                    const ownClfs = relatedClfs.filter(c => {
                        return c.args.method !== 'optimal'
                            && c.args.method !== 'naive';
                    });
                    // accuracy range
                    let accuracyExtentBadge;
                    if (ownClfs.length > 0) {
                        try {
                            const accuracyExtent = extent(ownClfs.map(d => d.scores.test_scores.accuracy));
                            accuracyExtentBadge = (
                                <span className='badge accuracy'>
                                    {accuracyExtent[0].toFixed(2)} - {accuracyExtent[1].toFixed(2)}
                                </span>

                            );
                        } catch (e) {
                            console.warn(`Cannot display accuracy extent for ${d.args.title}!`);
                        }
                    }
                    // total time (training and testing, nothing else)
                    const totalTime = ownClfs.reduce((total, d) => total + d.scores.clf_time + d.scores.pred_time, 0);
                    const meanTime = ownClfs.length > 0 ? totalTime / ownClfs.length : 0;
                    return (
                        <li
                            key={d.file}
                            onMouseOver={() => this.jobHovered(d)}
                            onMouseOut={() => this.setState({ detailsContent: null, hoveredDataset: null })}
                            onClick={onClickFn}
                            className={this.state.dataset === d.file ? 'selected' : ''}
                        >
                            <FontAwesomeIcon icon={this.state.dataset === d.file ? faCheckCircle : faCircle} />
                            {d.args.title !== undefined &&
                                <span className='title'>{d.args.title} </span>
                            }
                            <span className='subtitle'>
                                {description}
                            </span>
                            <br />
                            {accuracyExtentBadge}
                            <span
                                className='badge time'
                                title={`Mean time: ${Tools.formatTime(meanTime)}`}
                            >
                                {Tools.formatTime(totalTime)}
                            </span>
                            <span className='badge classifiers'>
                                {relatedClfs.length}
                            </span>
                            <span className='badge projections'>
                                {relatedProjs.length}
                            </span>
                        </li>
                    );
                });
        }

        // classifiers
        let classifiers = <li>Choose a batch job first</li>;
        if (this.state.dataset !== null) {
            let relatedClfs = this.getItemsWithJob(selectedDataset, this.props.cacheContent.classifiers);
            // remove classifiers without scores
            relatedClfs = relatedClfs.filter(d => d.scores.test_scores);
            if (relatedClfs.length === 0) {
                classifiers = <li>There are no valid classifiers for this dataset. Keep in mind that classifiers without test scores are not supported.</li>;
            } else {
                classifiers = this.sortClassifiers(relatedClfs)
                    .map(d => {
                        const selected = this.state.classifiers.has(d.file);
                        return (
                            <li
                                key={d.file}
                                onMouseOver={() => this.classifierHovered(d)}
                                onClick={() => this.classifierChanged(d)}
                                className={selected ? 'selected' : ''}
                            >
                                <ScoreBar ratio={d.scores.test_scores.accuracy} />
                                <FontAwesomeIcon icon={selected ? faCheckSquare : faSquare} />
                                {d.args.title}
                            </li>
                        );
                    });
            }
        }

        // button to select all or none of available classifier configurations
        let selectAllNoneText = this.state.classifiers.size === this.state.numClfsForCurrentData ? 'Clear classifier selection' : 'Select all classifiers';

        return (
            <div className='Menu'>
                <div className='DataSelection'>

                    <div>
                        <h1>Batch Jobs</h1>
                        <span className='badge accuracy'
                            title='Without optimal and naive classifiers'
                        >
                            Test accuracy range *
                        </span>
                        <span className='badge time'
                            title='Total training and test time of all classifiers (without the time needed for data preprocessing)'
                        >
                            Time *
                        </span>
                        <span className='badge classifiers'>Number of classifiers</span>
                        <span className='badge projections'>Number of projections</span>
                        <ul>{jobs}</ul>
                    </div>

                    <div>
                        <h1>Classifiers</h1>
                        <span>Sorted by test accuracy, which is also visualized by the green bars</span>
                        <ul>
                            {classifiers}
                        </ul>
                    </div>

                    {this.state.dataset &&
                        <div className='actionButtons'>
                            <h1>Actions</h1>

                            <span className='first'>Select classifiers</span>

                            <label title='Sorted by test accuracy. You can type a number or use the arrows for steps of 5.'>
                                Select the top
                            <input
                                    type='number'
                                    defaultValue='10'
                                    step='5'
                                    min='5'
                                    max='10000'
                                    onChange={this.selectTopXClassifiers}
                                    disabled={this.props.progress !== null}
                                />
                                classifiers
                            </label>

                            <Button
                                onClick={this.selectAllOrNoneClfs}
                                disabled={this.props.progress !== null}
                            >
                                {selectAllNoneText}
                            </Button>

                            <Button
                                onClick={this.invertSelection}
                                disabled={this.props.progress !== null}
                            >
                                Invert the current selection
                            </Button>

                            <Button
                                onClick={this.selectBetterThanNaive}
                                disabled={this.props.progress !== null}
                            >
                                Select better than naive
                            </Button>

                            <Button
                                onClick={this.removeFolds}
                                title='Only applicable for cross validation with saved folds. When folds are selected, classifier projections (in the map view) might not work or make sense!'
                                disabled={this.props.progress !== null}
                            >
                                Remove cross validation folds
                            </Button>

                            <span>Delete data</span>

                            <Button
                                title='Delete the currently selected batch job. This cannot be undone!'
                                onClick={this.deleteCurrentJob}
                                disabled={this.props.progress !== null}
                            >
                                Delete the selected batch job
                            </Button>

                            <Button
                                onClick={this.deleteSelectedClassifiers}
                                disabled={this.props.progress !== null}
                                title='Delete selected classifiers. This cannot be undone!'
                            >
                                Delete all selected classifiers
                            </Button>

                            <Button
                                onClick={this.props.deleteAllClfProjections}
                                disabled={this.props.progress !== null}
                                title='Delete all classifier projections, which are created and cached each time you press start.'
                            >
                                Delete all classifier projections
                            </Button>

                            <span>Start the analysis</span>

                            <Button
                                onClick={this.handleSubmit}
                                title='Load the selected data and start the visualization.'
                                className={this.props.progress ? 'startButton loading' : 'startButton'}
                                disabled={this.props.progress !== null}
                            >
                                <FontAwesomeIcon icon={!this.props.progress ? faPlay : faHourglassHalf} />
                                {!this.props.progress ? 'Start' : this.props.progress}
                            </Button>
                        </div>}
                </div>
            </div>
        );
    }
}
