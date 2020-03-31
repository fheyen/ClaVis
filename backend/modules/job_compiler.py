#!./venv/bin/python3

"""
Python frontend that may be used instead of the client to start classification etc.
and write all data to the cache, so the client has everything ready.

This way the data has to loaded only once and less requests and cache reads are needed.

When used as standalone compiler, run it via
    python3 job_compiler.py some_meta_config.json
"""

import json
from termcolor import cprint
from os.path import join
from datetime import datetime
import sys

########### CONFIG ###########

# If False, an exception in one classifier or projection will not cause the batch job to be stopped
# Should be set to True when debugging and False when running a job unattended
break_on_exception = True

# Display the content of the batch job file when it is loaded?
show_batch_config = False

##############################


def update_parameter(clf, key, value):
    """
    Copies clf to a new dict and updates
    clf_new[key] = value
    Also updates the title by replacing the
    placeholder '{key}' by value
    """
    # copy old keys and update the current one
    new_clf = clf.copy()
    new_clf[key] = value
    # set title
    if 'title' in new_clf:
        new_clf['title'] = clf['title'].replace(
            '{{{}}}'.format(key), str(value))
    return new_clf


def expand_clf(clf, new_clfs, recursion_depth):
    """
    Recursively expands configurations by creating and modifying copies.
    Only fully expanded configurations (no meta parameters left)
    will be appended to new_clfs.

    Keyword Arguments:
    - clf configuration to expand
    - new_clfs a list to which the results are appended
    - recursion_depth 0 or 1 when called outside itself
    """
    # for each key, check if it should be expanded
    at_bottom = True
    for key, value in clf.items():
        if type(value) is dict and 'is_meta' in value:
            at_bottom = False

            # using predefined values
            if 'values' in value:
                for v in value['values']:
                    new_clf = update_parameter(clf, key, v)
                    # continue with the other parameters recursively
                    expand_clf(new_clf, new_clfs, recursion_depth+1)
            else:
                # using min, max, step
                min_val = value['min']
                max_val = value['max']
                step_type = value['step']['type']
                step_value = value['step']['value']

                current_val = min_val
                while current_val <= max_val:
                    new_clf = update_parameter(clf, key, current_val)
                    # continue with the other parameters recursively
                    expand_clf(new_clf, new_clfs, recursion_depth+1)

                    # increase value
                    if step_type == 'add':
                        current_val += step_value
                    else:
                        current_val *= step_value

            # only expand the first parameter
            # others are taken care of in recursion
            break

    # only append fully expanded configurations
    if at_bottom:
        new_clfs.append(clf)


def compile(json_data, break_on_exception=False):
    """
    Takes a meta configuration and returns the compiled configuration.
    Both input and output are Python dictionaries that represent JSON objects.
    The data is modified in-place.
    """
    new_projs = []
    new_clfs = []
    num_meta_projs = len(json_data['projections'])
    num_meta_clfs = len(json_data['classifiers'])

    # projections
    print(
        f'  Expanding {num_meta_projs} meta projection configurations', end=' ')
    for proj in json_data['projections']:
        try:
            # expand the configuration recursively
            expand_clf(proj, new_projs, 1)

        except Exception as e:
            try:
                cprint(
                    f'  Error while expanding projection with title {proj["title"]}', 'red')
            except:
                pass
            cprint(e, 'red')
            if break_on_exception:
                raise
    cprint(f'got {len(new_projs)} projections', 'green')

    # classifiers
    print(
        f'  Expanding {num_meta_clfs} meta classifier configurations', end=' ')
    for clf in json_data['classifiers']:
        try:
            # expand the configuration recursively
            expand_clf(clf, new_clfs, 1)

        except Exception as e:
            try:
                cprint(
                    f'  Error while expanding classifier with title {clf["title"]}', 'red')
            except:
                pass
            cprint(e, 'red')
            if break_on_exception:
                raise
    cprint(f'got {len(new_clfs)} classifiers', 'green')

    json_data['projections'] = new_projs
    json_data['classifiers'] = new_clfs
    return json_data


def main():
    # read json config
    if len(sys.argv) == 2:
        batch_file = sys.argv[1]
        cprint('\nLoading batch job meta description', 'cyan')
        print(f'  Reading from {batch_file}')
        with open(batch_file) as json_data:
            json_data = json.load(json_data)
            if show_batch_config:
                print(json.dumps(json_data, sort_keys=False, indent=4))
    else:
        cprint('No batch job file specified!', 'red')
        exit()

    # expand all meta classifier configurations
    json_data = compile(json_data, break_on_exception)

    # save compiled file
    filename = batch_file.replace('.json', '.compiled.json')
    json_string = json.dumps(json_data, sort_keys=False, indent=4)
    with open(filename, 'w') as f:
        f.write(json_string)

    cprint(f'\nSaved output to {filename}', 'green')


if __name__ == '__main__':
    main()
