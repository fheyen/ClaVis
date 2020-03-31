import importlib
from os import listdir
from os.path import isdir, join
from termcolor import cprint


plugins = []


def _get_plugins():
    path = join('modules', 'classifiers')
    print('\nImporting classifier plugins')
    plugins = {}
    # each plugin is represented by a directory containing a __init__.py file
    for item in listdir(path):
        plugin_dir = join(path, item)
        if isdir(plugin_dir) and '__init__.py' in listdir(plugin_dir):
            try:
                mod = importlib.import_module('.' + item, __name__)
                # store plugins in a dict {name: plugin}
                name = mod.get_info()['name']
                cprint(f'  imported: {name}', 'green')
                plugins[name] = mod
            except Exception as e:
                cprint(e, 'red')
                cprint(f'Error while importing {item}', 'red')

    return plugins


# import plugin datasets when this package is imported
if len(plugins) == 0:
    plugins = _get_plugins()


def get_classifier_info():
    """
    Lists all classifiers, parameters, types, ranges and defaults.
    """
    plugin_info = [v.get_info() for k, v in plugins.items()]
    return {
        'type': 'info',
        'message': 'List of all classifiers',
        'methods': plugin_info
    }


def get_classifier(args, data_specs):
    method = args['method']
    if method in plugins:
        return plugins[method].get_clf(args, data_specs)
    else:
        raise Exception(f'Invalid classifier method "{method}"!')
