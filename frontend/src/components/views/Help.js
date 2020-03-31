import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faSearchPlus, faMousePointer, faInfo, faMicrochip, faArrowsAltH, faSortAmountUp, faSortAmountDown, faPalette, faBars, faDatabase, faMap, faFilter, faSortNumericDown, faCircle, faAlignLeft, faClock, faLessThanEqual, faColumns, faThLarge, faFile, faCog } from '@fortawesome/free-solid-svg-icons';
import '../../style/views/Help.css';

export default class Help extends Component {

    /**
     * Shows details about a plugin parameter
     * such as its range and default value.
     */
    showParamDetails = (item) => {
        const params = item.parameters;
        let paramsTableRows = [];
        const defaultConfig = [
            `"title": "some title"`,
            `"method": "${item.name}"`,
        ];

        if (params) {
            paramsTableRows = params.map((d, i) =>
                <li key={i}>
                    {d.name}
                    <ul>
                        <li title='Description'>
                            <FontAwesomeIcon icon={faInfo} />
                            {d.description}
                        </li>
                        <li title='Type'>
                            <FontAwesomeIcon icon={faMicrochip} />
                            {d.type.toString()}
                        </li>
                        <li title='Default'>
                            <FontAwesomeIcon icon={faFile} />
                            {d.default_value.toString()}
                        </li>
                        {d.range &&
                            <li title='Range'>
                                <FontAwesomeIcon icon={faArrowsAltH} />
                                {Array.isArray(d.range) ? d.range.join(', ') : d.range.toString()}
                            </li>
                        }
                    </ul>
                </li>
            );

            params.forEach(d => {
                let line = `"${d.name}": `;
                if (d.type === 'string') {
                    line += `"${d.default_value}"`;
                }
                if (d.type === 'boolean') {
                    line += d.default_value === 'true' ? 'True' : 'False';
                }
                if (['integer', 'float', 'array'].includes(d.type)) {
                    line += `${d.default_value.toString()}`;
                }
                defaultConfig.push(line);
            });
        }

        const details = (
            <div className='HelpDetails'>
                <h2>{item.short}</h2>

                <p>
                    Description: <span className='accent'>{item.description}</span>
                </p>

                <p>
                    Method / plugin name: <span className='accent'>{item.name}</span>
                </p>

                <h3>Parameters</h3>
                <ul>
                    {paramsTableRows}
                </ul>

                <h3>Default</h3>
                <textarea
                    key={item.name}
                    readOnly
                    value={`{\n${defaultConfig.join(',\n')}\n}`}
                >
                </textarea>
            </div >
        );
        this.props.showDetails(details);
    }

    render() {
        // lists of classifier and projecion plugins
        const clfAndProjDisplay = (d, i) => {
            return (
                <li
                    key={i}
                    className='hoverable'
                    title={d.name}
                    onMouseOver={() => this.showParamDetails(d)}
                >
                    <span className='accent'>
                        {d.short}
                    </span>
                    &nbsp;• {d.description}
                    {d.parameters &&
                        <span className='badge' title='Number of parameters'>
                            {d.parameters.length}
                        </span>
                    }
                </li>
            );
        };

        // shorthand for view changing function
        const sv = this.props.showView;

        return (
            <div className='Help'>
                <div style={{ gridColumn: '1 / -1' }}>
                    <h2>Usage</h2>
                </div>
                <div>
                    The toolbar at the top contains options for sorting <FontAwesomeIcon icon={faSortAmountUp} /> and colorizing <FontAwesomeIcon icon={faPalette} /> classifiers when the current view makes use of those features. By default, the sorting direction is <span className='accent'>best at the top</span> (or alphanumeric ascending for text), but you can reverse it via the <FontAwesomeIcon icon={faSortAmountUp} />/<FontAwesomeIcon icon={faSortAmountDown} /> button.
                </div>
                <div>
                    <FontAwesomeIcon icon={faColumns} /> You can show two views next to each other, by pressing the <FontAwesomeIcon icon={faColumns} /> button while clicking on a view. Return to a single view layout by clicking this button again.
                </div>
                <div>
                    <FontAwesomeIcon icon={faSun} /> You can switch between a bright and a dark theme and change color maps in the <FontAwesomeIcon icon={faCog} /> settings any time.
                </div>
                <div>
                    The statusbar shows the title of the current job, the number total and filtered classifiers, the number of classses, training samples and test samples in the dataset, a color map legend and the current highlight. The color legend shows one segment for each classifier, they are ordered and colored by the current sorting and coloring options.
                </div>
                <div>
                    <FontAwesomeIcon icon={faMousePointer} /> Many views support <span className='accent'>highlighting</span> by hovering, some support <span className='accent'>zooming</span> by scrolling and <span className='accent'>panning</span> by dragging with the mouse.
                </div>
                <div>
                    <FontAwesomeIcon icon={faThLarge} /> Clicking on <span className='accent'>confusion matrices</span> toggles between the number of samples and percentages. The matrix itself will contain the percentage of samples of the respective class, while the class totals at the bottom will be in percent of the total number of samples in the test set. You can also click the diagonal button at the top to ignore the diagonal (correct predictions) when coloring, so errors are more pronounced.
                </div>
                <div>
                    <FontAwesomeIcon icon={faSearchPlus} /> Since this frontend is just like any website, you can scale it by pressing <code>CTRL</code>+<code>+</code> and <code>CTRL</code>+<code>-</code> and reset the zoom via <code>CTRL</code>+<code>0</code>. <code>F11</code> toggles fullscreen. You can reset the frontend by reloading the page (<code>F5</code>), for example to update the menu. If you want to compare two jobs, you can open the frontend in two different tabs or windows.
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <h2>Views</h2>
                    Short explanations on each view.
                </div>

                <div>
                    <h3>Menu</h3>
                    <p>
                        The <button onClick={() => sv('menu')}><FontAwesomeIcon icon={faBars} /> menu</button> shows all results grouped by dataset. Click on a dataset and then select some classifiers and one projection. The projection is only relevant for the <button onClick={() => sv('data')}><FontAwesomeIcon icon={faDatabase} /> data</button> view and can be changed there later.
                    </p>
                    <p>
                        After you selected the items you want to analyse, click the start button to load the data. This may take some time because the classifier projections that are needed for the <button onClick={() => sv('map')}><FontAwesomeIcon icon={faMap} /> map</button> view are created in this step.
                    </p>
                </div>

                <div>
                    <h3>Filter</h3>
                    <p>
                        You can use the <button onClick={() => sv('filter')}><FontAwesomeIcon icon={faFilter} /> filter</button> view to limit the classifiers that are displayed in the other views in order to focus on those that are important for you right now.
                    </p>
                </div>

                <div>
                    <h3>Ranking</h3>
                    <p>
                        The <button onClick={() => sv('ranking')}><FontAwesomeIcon icon={faSortNumericDown} /> ranking</button> view shows all selected classifiers ranked by the current sorting order (which can be changed in the toolbar <FontAwesomeIcon icon={faSortAmountUp} />).
                    </p>
                    <p>
                        You can aggregate classifiers by different variables and choose how to represent each group. Clicking on a representant shows all classifiers of its group.
                    </p>
                </div>

                <div>
                    <h3>Map</h3>
                    <p>
                        The <button onClick={() => sv('map')}><FontAwesomeIcon icon={faMap} /> map</button> view shows a projection of the classifiers' predictions or confusion matrix values to a 2D plane.
                    </p>
                </div>

                <div>
                    <h3>Plot</h3>
                    <p>
                        The <button onClick={() => sv('plot')}><FontAwesomeIcon icon={faCircle} /> plot</button> view shows a scatterplot where classifiers are positioned depending on two variables of you choice.
                    </p>
                    <p>
                        A correlation matrix on the right shows the correlation between parameters and scores.
                    </p>
                </div>

                <div>
                    <h3>Summary</h3>
                    <p>
                        The <button onClick={() => sv('summary')}><FontAwesomeIcon icon={faAlignLeft} /> summary</button> view shows scores, confusion matrix, parameters and (if available) history of all classifiers.
                    </p>
                </div>

                <div>
                    <h3>History</h3>
                    <p>
                        The <button onClick={() => sv('history')}><FontAwesomeIcon icon={faClock} /> history</button> view shows the training history of all classifiers in a combined chart at the top.
                    </p>
                    <p>
                        You can toggle between accuracy and loss values by using the dropdown.
                    </p>
                </div>

                <div>
                    <h3>Comparison</h3>
                    <p>
                        In <button onClick={() => sv('comparison')}><FontAwesomeIcon icon={faLessThanEqual} /> comparison</button> view you can select two classifiers to compare.
                    </p>
                </div>

                <div>
                    <h3>Data</h3>
                    <p>
                        The <button onClick={() => sv('data')}><FontAwesomeIcon icon={faDatabase} /> data</button> view shows statistics on the dataset.
                    </p>
                    <p>
                        The class distributions of training and test set are visualized in two bar charts.
                    </p>
                    <p>
                        The scatterplot shows a projection of the data, the method of the projection can be changed using the dropdown on the upper left.
                    </p>
                </div>

                <div>
                    <h3>General</h3>
                    <p>
                        The <span className='accent'>test time</span> value combines the time taken for predicting the class labels for both training and test set.
                    </p>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <h2>Info &amp; About</h2>
                    Links to resources and information about this project.
                </div>

                <div>
                    <h3>About</h3>
                    Created in a cooperation of two institutes of the <a href='https://www.uni-stuttgart.de/en/'>University of Stuttgart</a>:
                    <ul>
                        <li>
                            <a href='https://www.visus.uni-stuttgart.de/en/index.html'>Visualization Research Center (VISUS)</a>
                        </li>
                        <li>
                            <a href='https://www.ims.uni-stuttgart.de/index.en.html'>Institute for Natural Language Processing (IMS)</a>
                        </li>
                    </ul>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <h2>Server Info</h2>
                    Hover available classifiers and projections to see more information in the details panel.
                </div>

                <div>
                    <h3>Available Datasets</h3>
                    <span className='badge'>Number of classes</span>
                    <ul>
                        {this.props.serverInfo.datasets.datasets.map((d, i) => {
                            return (
                                <li
                                    key={i}
                                    title={`Plugin name: ${d.name}`}
                                >
                                    <span className='accent'>
                                        {d.name}
                                    </span>
                                    &nbsp;• {d.description}
                                    <span className='badge' title='Number of classes'>
                                        {d.class_names.length}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div>
                    <h3>Available Classifiers</h3>
                    <span className='badge'>Number of parameters</span>
                    <ul>
                        {this.props.serverInfo.classifiers.methods.map(clfAndProjDisplay)}
                    </ul>
                </div>

                <div>
                    <h3>Available Projections</h3>
                    <span className='badge'>Number of parameters</span>
                    <ul>
                        {this.props.serverInfo.projections.methods.map(clfAndProjDisplay)}
                    </ul>
                </div>
            </div>
        );
    }
}
