import { color } from 'd3-color';
import { extent } from 'd3-array';
import Correlation from 'correlation-rank';

/**
 * Some tools for varius purposes.
 * Only pure functions (no side effects).
 */
class Tools {
    /**
     * Clones an object via JSON.stringify, does not work with functions!
     * @param {object} object some object
     * @returns {object} clone
     */
    clone(object) {
        return JSON.parse(JSON.stringify(object));
    }

    /**
     * Converts a list of hex-coded colors to rgba with opacity.
     * Some code from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb#5624139
     * @param {string[]} colors list of hex-coded colors
     * @param {number} opacity opacity
     * @returns {string[]} processed colors
     */
    addOpacity(colors, opacity) {
        return colors.map(c => {
            const col = color(c);
            col.opacity = opacity;
            return col.toString();
        });
    }

    /**
     * Converts a color from rgba to rgb by dropping opacity.
     * @param {string} rgba rgba color string
     * @returns {string} rgb color string
     */
    makeOpaque(rgba) {
        const c = color(rgba);
        c.opacity = 1;
        return c.toString();
    }

    getBrigthness(colorString) {
        const { r, g, b } = color(colorString);
        return (r + r + b + g + g + g) / 6;
    }

    /**
     * Computes the range of various classification result properties.
     */
    getDataStats(clfResults) {
        return {
            trainAccuracy: extent(clfResults.map(d => d.train_scores.accuracy)),
            testAccuracy: extent(clfResults.map(d => d.test_scores.accuracy)),
            trainTime: extent(clfResults.map(d => d.clf_time)),
            testTime: extent(clfResults.map(d => d.pred_time))
        };
    }

    /**
     * Extracts the fold number from a classifier's title,
     * or -1 if not found.
     */
    getClassifierFoldNumber(clfResult) {
        // return -1 when clf has no fold, otherwise return fold number
        const splitted = clfResult.args.title.split(' ');
        if (splitted.length < 2) {
            return -1;
        }
        const lastPart = splitted[splitted.length - 1];
        if (!lastPart.includes('fold')) {
            return -1;
        } else {
            return +lastPart.replace('fold', '');
        }
    }

    /**
     * Return base title without fold suffix
     */
    getClassifierBaseTitle(clfResult) {
        const splitted = clfResult.args.title.split(' ');
        if (splitted.length < 2) {
            return clfResult.args.title;
        }
        const lastPart = splitted[splitted.length - 1];
        if (!lastPart.includes('fold')) {
            return clfResult.args.title;
        } else {
            // has fold in its name, remove the last part
            splitted.pop();
            return splitted.join(' ');
        }
    }

    /**
     * Returns an array with the sorted parameter names
     * that occur in any of the classification results
     * @param clfResults clfResults
     * @returns parameter names as sorted array
     */
    getParameterNames(clfResults) {
        const paramNames = new Set();
        clfResults.forEach(d => {
            const params = d.args;
            for (const p in params) {
                if (params.hasOwnProperty(p)) {
                    if (!['title', 'file', 'model_file', 'method'].includes(p)) {
                        paramNames.add(p);
                    }
                }
            }
        });
        return Array.from(paramNames).sort();
    }

    /**
     * Computes the mean of all test confusion matrices
     * from the given classification results.
     *
     * @param {object[]} clfResult classification results
     *
     * @returns {number[][]} mean test confusion matrix
     */
    getMeanTestConfMatrix(clfResults) {
        if (clfResults.length < 1) {
            return [];
        }
        // initialize result
        const rows = clfResults[0].test_scores.conf_matrix.length;
        const cols = clfResults[0].test_scores.conf_matrix[0].length;
        const result = new Array(rows).fill(0).map(() => new Array(cols).fill(0));
        // add matrices
        clfResults.forEach(d => {
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    result[row][col] += d.test_scores.conf_matrix[row][col];
                }
            }
        });
        // divide by number of clfResults
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                result[row][col] /= clfResults.length;
            }
        }
        return result;
    }

    /**
     * Formats time to be displayed in seconds, minutes or hours
     * depending on how many seconds it it.
     * @param {number} seconds number of seconds (float)
     * @returns {string} formatted time string
     */
    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds.toFixed(2)}s`;
        } else if (seconds < 3600) {
            return `${(seconds / 60).toFixed(2)}m`;
        } else if (seconds < 7 * 24 * 3600) {
            return `${(seconds / 3600).toFixed(2)}h`;
        } else {
            return `${(seconds / (24 * 3600)).toFixed(2)}d`;
        }
    }

    formatAccuracy(accuracy) {
        return `${(accuracy * 100).toFixed(0)}%`;
    }

    /**
     * https://www.npmjs.com/package/correlation-rank
     * @param {number[]} independent independent data
     * @param {number[]} dependent dependent data
     */
    pearsonCorrelation(independent, dependent) {
        try {
            return Correlation.rank(independent, dependent);
        } catch (e) {
            // console.log(e);
            // happens when all values in either in- or dependent are 0,
            // return 0 for no correlation in this case
            return 0;
        }
    }

    /**
     * Returns the history depending on the variable
     * @param clfResults classification results
     * @param variable either 'Accuracy' or 'Loss'
     */
    getClfHistories = (clfResults, variable) => {
        const clfs = clfResults;
        switch (variable) {
            case 'Loss':
                return {
                    val: clfs.map(d => d.history_smoothed.val_loss ? d.history_smoothed.val_loss : []),
                    train: clfs.map(d => d.history_smoothed.loss)
                };
            case 'Accuracy':
                return {
                    val: clfs.map(d => d.history_smoothed.val_acc ? d.history_smoothed.val_acc : []),
                    train: clfs.map(d => d.history_smoothed.acc)
                };
            default:
                console.error(`Invalid variable for axis: ${variable}`);
        }
    }

    /**
     * Smoothing of the history chart like in TensorBoard
     * https://github.com/tensorflow/tensorboard/blob/f801ebf1f9fbfe2baee1ddd65714d0bccc640fb1/tensorboard/plugins/scalar/vz_line_chart/vz-line-chart.ts#L55
     * https://github.com/tensorflow/tensorboard/blob/f801ebf1f9fbfe2baee1ddd65714d0bccc640fb1/tensorboard/plugins/scalar/vz_line_chart/vz-line-chart.ts#L704
     * @param {number[]} data data to smooth
     * @param {number} smoothingWeight smoothing weight in [0, 1]
     */
    smoothHistoryChart(data, smoothingWeight) {
        if (data === undefined || data === null || data.length < 2) {
            return data;
        }
        let last = data[0];
        return data.map(d => {
            let smoothed = last * smoothingWeight + (1 - smoothingWeight) * d;
            last = smoothed;
            return smoothed;
        });
    }

    smoothClfHistory(clfResult, smoothingWeight) {
        const w = smoothingWeight;
        if (clfResult.history) {
            // fallback for old format
            const acc = clfResult.history.accuracy ? clfResult.history.accuracy : clfResult.history.acc;
            const val_acc = clfResult.history.val_accuracy ? clfResult.history.val_accuracy : clfResult.history.val_acc;
            clfResult.history_smoothed = {
                acc: this.smoothHistoryChart(acc, w),
                val_acc: this.smoothHistoryChart(val_acc, w),
                loss: this.smoothHistoryChart(clfResult.history.loss, w),
                val_loss: this.smoothHistoryChart(clfResult.history.val_loss, w)
            };
        }
        return clfResult;
    }


    /**
     * Groups classification results, one group for each value of the specified attribute.
     * @param {object[]} clfs classification results
     * @param {String} groupingAttribute attribute to group by, there will be one group for every value
     * @returns {object} {
     *       aggregatedMap,   a map [attribute value]->[array with classification results]
     *       accessor
     * }
     */
    groupClassifiersByAttribute(clfs, groupingAttribute) {
        // get data accessor depending on attribute
        let accessor;
        if (groupingAttribute === 'method') {
            accessor = d => d.args.method;
        }
        else if (groupingAttribute === 'fold') {
            accessor = d => {
                const fold = this.getClassifierFoldNumber(d);
                return fold === -1 ? 'Summary' : fold;
            };
        }
        else if (groupingAttribute === 'clf_with_fold') {
            // return base title without fold suffix
            accessor = this.getClassifierBaseTitle;
        }
        else {
            // mode is parameter name
            accessor = d => d.args[groupingAttribute] !== undefined ? `${d.args[groupingAttribute]}` : 'none';
        }
        // aggregate by value
        const aggregatedMap = new Map();
        clfs.forEach(d => {
            const value = accessor(d);
            if (!aggregatedMap.has(value)) {
                aggregatedMap.set(value, [d]);
            }
            else {
                aggregatedMap.get(value).push(d);
            }
        });
        return { aggregatedMap, accessor };
    }
};

export default new Tools();
