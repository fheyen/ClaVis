import importlib
from os import listdir, chdir, getcwd
from os.path import isdir, join
from sklearn import datasets
import numpy as np
from termcolor import cprint
from .. import tools

plugins = []


def _get_plugins():
    path = join('modules', 'datasets')
    print('\nImporting dataset plugins')
    plugins = {}
    # each plugin is represented by a directory containing a __init__.py file
    for item in listdir(path):
        plugin_dir = join(path, item)
        if isdir(plugin_dir) and '__init__.py' in listdir(plugin_dir):
            try:
                mod = importlib.import_module('.' + item, __name__)
                # store plugins in a dict {name: plugin}
                info = mod.get_info()
                name = info['name']
                # check if plugin is valid
                if not 'class_names' in info or type(info['class_names']) != list:
                    raise Exception(
                        f'Invalid plugin {name}, class_names is invalid!')
                # add plugin to imported plugins
                cprint(f'  imported: {name}', 'green')
                plugins[name] = mod
            except Exception as e:
                cprint(e, 'red')
                cprint(f'Error while importing {item}', 'red')
    return plugins


# import plugin datasets when this package is imported
if len(plugins) == 0:
    plugins = _get_plugins()


def get_datasets_info():
    """
    Returns lists of all datasets.
    """
    plugin_info = [v.get_info() for k, v in plugins.items()]
    return {
        'type': 'info',
        'message': 'List of all datasets',
        'datasets': plugin_info
    }


def get_dataset(args):
    """
    Parses and returns a dataset.

    Keyword Arguments:
    - args: arguments for the specific dataset

    Returns a dictionary
    - X_train int[][]
    - y_train int[]
    - X_test int[][]
    - y_test int[]
    - class_names string[]
    """
    dataset = args['dataset']

    if dataset in plugins:
        return plugins[dataset].get_data(join('modules', 'datasets'))
    else:
        raise Exception(f'Invalid dataset "{dataset}"!')
