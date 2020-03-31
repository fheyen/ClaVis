const Api = {
    callServerApi: callServerApi,
    loadClassificationResults: loadClassificationResults,
}

export default Api;

/**
 * Loads datasets from the server.
 * @param {string} baseUrl protocol, host and port of the server, e.g. 'http://127.0.0.1:12345/'
 * @param {object[]} argsList an array of JSON commands.
 * @param {string} description title for the console group
 * @param {Function} callbackSuccess function called on success for each command
 * @param {Function} callbackError function called on error for each command
 * @returns {object[]} the response data
 */
async function callServerApi(
    baseUrl,
    argsList,
    description = 'Request',
) {
    const dataArray = [];
    for (let args of argsList) {
        const encoded = encodeURIComponent(JSON.stringify(args));
        const url = `${baseUrl}?args=${encoded}`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const result = {
                request: args,
                data
            };
            console.log(`${description}:`);
            console.log(result);
            dataArray.push(result);
        } catch (e) {
            console.error(e);
            console.log(args);
        }
    }
    return dataArray;
}

/**
 * Loads all classification results in one request.
 * @param {string} baseUrl protocol, host and port of the server, e.g. 'http://127.0.0.1:12345/'
 * @param {string[]} files an array classification file names.
 * @returns {object[]} the response data
 */
async function loadClassificationResults(baseUrl, files) {
    console.log('Classification Results:');
    const args = {
        'action': 'get_clf_results',
        'files': files
    }
    const encoded = encodeURIComponent(JSON.stringify(args));
    const url = `${baseUrl}?args=${encoded}`;

    const response = await fetch(url);
    const data = await response.json();
    const { classifiers, errors } = data;

    if (!classifiers || (errors && errors.length > 0)) {
        console.error(`Error: Classification results could not be loaded!`);
        console.error(errors);
        alert(`Error: Classification results could not be loaded!`);
    }
    console.log(classifiers);
    return classifiers;
}
