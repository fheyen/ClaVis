from os import listdir, remove, makedirs
from os.path import isfile, join, exists
import shutil
import joblib
from termcolor import cprint
import json
from pathlib import Path


_cache_path = None
_log_actions = True


def init(cache_path, log_actions=True):
    """
    Initializes the cache.

    Keyword Arguments:
    - cache_path: directory where cached files are saved
    - log_actions: when true, all actions are logged
    """
    global _cache_path, _log_actions
    _log_actions = log_actions
    _cache_path = cache_path

    try:
        if not exists(cache_path):
            makedirs(cache_path)
    except Exception as e:
        cprint(e, 'red')


def write(filename, data):
    """
    Pickles a file and writes it to the cache.

    Keyword Arguments:
    - filename: name of the file to write to
    - data: object to cache
    """
    if _log_actions:
        cprint('Writing to cache: "{}"'.format(filename), 'green')
    joblib.dump(data, join(_cache_path, filename))


def write_plain(filename, data, add_extension=True):
    """
    Simply writes the textual data to a file.
    """
    if _log_actions:
        cprint('Writing to cache (plain): "{}"'.format(filename), 'green')
    if add_extension:
        filename += '.json'
    with open(join(_cache_path, filename), 'w') as f:
        f.write(data)


def write_dict_json(filename, data, add_extension=True):
    """
    Writes a dictionary to file using JSON format.
    """
    if _log_actions:
        cprint('Writing to cache (json): "{}"'.format(filename), 'green')
    json_string = json.dumps(data, sort_keys=False, indent=4)
    if add_extension:
        filename += '.json'
    with open(join(_cache_path, filename), 'w') as f:
        f.write(json_string)


def read(filename):
    """
    Reads a file from the cache and unpickles it.

    Keyword Arguments:
    - filename: name of the file to read

    Returns:
    - data: unpickled object
    """
    if _log_actions:
        cprint('Loading from cache: "{}"'.format(filename), 'green')
    return joblib.load(join(_cache_path, filename))


def read_multiple(filenames):
    """
    Reads multiple file from the cache and unpickles them.

    Keyword Arguments:
    - filenames: names of the files to read

    Returns:
    - result: unpickled object
    - success_files: list of successful filenames
    - errors: filenames for which exceptions happened
    """
    result = []
    success_files = []
    errors = []
    for f in filenames:
        try:
            result.append(read(f))
            success_files.append(f)
        except Exception as e:
            cprint(f'Loading {f} failed!', 'red')
            cprint(e, 'red')
            errors.append(f)
    return result, success_files, errors


def read_plain(filename):
    """
    Reads a file from the cache and unpickles it.

    Keyword Arguments:
    - filename: name of the file to read

    Returns:
    - data: unpickled object
    """
    if _log_actions:
        cprint('Loading from cache: "{}"'.format(filename), 'green')
    return Path(join(_cache_path, filename)).read_text()


def delete(filename):
    """
    Removes all files from the cache that have names starting with filename.
    """
    deleted = 0
    errors = 0
    for f in entries():
        try:
            if f.startswith(filename):
                remove(join(_cache_path, f))
                deleted += 1
        except:
            cprint(f'Cannot remove from cache: {filename}', 'red')
            errors += 1
    cprint(f'Removed from cache all files starting with {filename}', 'green')
    msg = f'Removed {deleted} files, {errors} errors'
    cprint(msg, 'yellow')
    return {
        'type': 'success' if errors == 0 else 'error',
        'msg': msg
    }


def delete_all_clf_projs():
    """
    Deletes all classifier projections
    """
    deleted = 0
    errors = 0
    for f in entries():
        try:
            if '__clf_proj_' in f:
                remove(join(_cache_path, f))
                deleted += 1
        except:
            cprint(f'Cannot remove from cache: {f}', 'red')
            errors += 1
    cprint(f'Removed from cache all classifier projections', 'green')
    msg = f'Removed {deleted} files, {errors} errors'
    cprint(msg, 'yellow')
    return {
        'type': 'success' if errors == 0 else 'error',
        'msg': msg
    }


def clear():
    """
    Deletes the cache.
    """
    cprint('Clearing cache', 'yellow')
    shutil.rmtree(_cache_path, ignore_errors=True)


def entries():
    """
    Lists all files in the cache.

    Returns:
    - list of all file names in the cache directory
    """
    return [f for f in listdir(_cache_path) if isfile(join(_cache_path, f))]


def content():
    """
    Returns all .json files in the cache to allow showing what
    classifiers etc. have been trained so far.

    Returns:
    - a dictionary containing all files' contents
    """
    cached_files = entries()
    json_files = [f for f in cached_files if f.endswith('_args.json')]
    datasets = []
    classifiers = []
    projections = []
    classifier_projections = []

    for f in json_files:
        try:
            filepath = join(_cache_path, f)
            contents = Path(filepath).read_text()
            json_dict = {
                'file': f,
                'args': json.loads(contents)
            }

            if '__proj_' in f:
                projections.append(json_dict)

            elif '__clf_proj_' in f:
                classifier_projections.append(json_dict)

            elif '__clf_' in f:
                # send scores for cached classifications
                score_file = f.replace('_args.json', '_scores.json')
                scores = Path(join(_cache_path, score_file)).read_text()
                json_dict['scores'] = json.loads(scores)
                classifiers.append(json_dict)

            elif f.startswith('data_'):
                datasets.append(json_dict)
        except Exception as e:
            cprint(
                f'Error: Some related files may be missing for file {f}, check if you copied files correctly or run you jobs again!', 'red')
            cprint(e, 'red')

    return {
        'datasets': datasets,
        'classifiers': classifiers,
        'projections': projections,
        'classifier_projections': classifier_projections
    }
