import { scaleSequential } from 'd3-scale';
import { extent } from 'd3-array';
import { schemeCategory10, schemePaired, interpolateRdYlGn, schemeDark2, schemeAccent, interpolateYlGnBu, interpolateRdBu, interpolateViridis, interpolatePRGn, interpolateRdYlBu, interpolateSpectral, interpolateWarm, interpolateCool, interpolateYlGn } from 'd3-scale-chromatic';
import Tools from './Tools';


//  Define color map options
const continuousColorMaps = new Map([
    // [
    //     'themeColorToBlue',
    //     (theme) => {
    //         const startColor = theme === 'dark' ? 'white' : 'black';
    //         return scaleLinear().range([startColor, 'steelblue']);
    //     }
    // ],
    ['interpolateWarm', interpolateWarm],
    ['interpolateCool', interpolateCool],
    ['interpolateYlGn', interpolateYlGn],
    ['interpolateYlGnBu', interpolateYlGnBu],
    ['interpolateViridis', interpolateViridis]
]);
const categoricalColorMaps = new Map([
    ['schemeCategory10', schemeCategory10],
    ['schemePaired', schemePaired],
    ['schemeAccent', schemeAccent],
    ['schemeDark2', schemeDark2]
]);
const divergingColorMaps = new Map([
    ['interpolateRdYlGn', interpolateRdYlGn],
    ['interpolateRdYlBu', interpolateRdYlBu],
    ['interpolatePRGn', interpolatePRGn],
    ['interpolateRdBu', interpolateRdBu],
    ['interpolateSpectral', interpolateSpectral]
]);

// Export module
const Colormap = {
    // functions
    getClfColorMap,
    getCategoricalColorMap,
    getDivergingColorMap,
    getContinuousColorMap,
    // colr map options
    continuousColorMaps,
    categoricalColorMaps,
    divergingColorMaps
};
export default Colormap;

function getCategoricalColorMap(colorMapOptions) {
    return categoricalColorMaps.get(colorMapOptions.categorical);
}

function getDivergingColorMap(colorMapOptions) {
    return divergingColorMaps.get(colorMapOptions.diverging);
}

function getContinuousColorMap(colorMapOptions) {
    return continuousColorMaps.get(colorMapOptions.continuous);
}

/**
 * Computes a colormap for each item in clfResults.
 * The colormap is a Map: title->color.
 */
function getClfColorMap(clfResults, mode, colorMapOptions) {
    const scalarColorScheme = continuousColorMaps.get(colorMapOptions.continuous);
    const categoricalColorScheme = categoricalColorMaps.get(colorMapOptions.categorical);

    // get data accessor depending on mode
    let accessor;
    let scaleType = 'scalar';

    // reverse color map if higher values mean worse (e.g. time)
    let reverseColorMap = false;

    // get accessor depending on mode
    switch (mode) {
        case 'title':
            accessor = Tools.getClassifierBaseTitle;
            scaleType = 'categorical';
            break;
        case 'method':
            accessor = d => d.args.method;
            scaleType = 'categorical';
            break;
        case 'train_accuracy':
            accessor = d => d.train_scores.accuracy;
            break;
        case 'test_accuracy':
            accessor = d => d.test_scores.accuracy;
            break;
        case 'total_accuracy':
            accessor = d => d.train_scores.accuracy + d.test_scores.accuracy;
            break;
        case 'train_time':
            accessor = d => d.clf_time;
            reverseColorMap = true;
            break;
        case 'test_time':
            accessor = d => d.pred_time;
            reverseColorMap = true;
            break;
        case 'fold':
            accessor = Tools.getClassifierFoldNumber;
            scaleType = 'categorical';
            break;
        default:
            // coloring by parameter
            accessor = d => d.args[mode] !== undefined ? d.args[mode] : null;
            scaleType = 'categorical';
    }

    let domainExtent;
    // assign colors to clfs in a map
    const clfColorMap = new Map();
    const clfColorMapOpacity = new Map();

    if (scaleType === 'categorical') {
        // get data extent
        domainExtent = new Set();
        clfResults.forEach(d => domainExtent.add(accessor(d)));
        domainExtent = Array.from(domainExtent);
        const colorMap = new Map();
        let index = 0;
        clfResults.forEach(d => {
            const value = accessor(d);
            // each value gets its color set here
            if (!colorMap.has(value)) {
                const color = categoricalColorScheme[index % categoricalColorScheme.length];
                colorMap.set(value, color);
                index++;
            }
            // the color of a clf is accessed via its unique title
            const key = d.args.title;
            clfColorMap.set(key, colorMap.get(value));
        });

    } else if (scaleType === 'scalar') {
        domainExtent = extent(clfResults.map(accessor));
        domainExtent = reverseColorMap ? domainExtent.reverse() : domainExtent;
        const colorMapScalar = scaleSequential(scalarColorScheme).domain(domainExtent);
        clfResults.forEach(d => {
            const value = accessor(d);
            const key = d.args.title;
            const color = colorMapScalar(value);
            clfColorMap.set(key, color);
        });
    }

    // add opacity for semi-transparent colormap version
    for (const [key, value] of clfColorMap.entries()) {
        clfColorMapOpacity.set(key, Tools.addOpacity([value], 0.7));
    }

    return { clfColorMap, clfColorMapOpacity };
}
