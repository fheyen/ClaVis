#!./venv/bin/python3

# initialize keras already here
import keras
import json
from termcolor import cprint
from modules.classifiers import get_classifier_info
from modules.datasets import get_datasets_info
from modules import cache, data, projection, tools
from flask_restful import Resource, Api
from flask_jsonpify import jsonify, jsonpify
from flask_cors import CORS
from flask import Flask, request
from datetime import datetime
import colorama
colorama.init()

"""
┌───────────────────────────────────────────────────┐
│ API server that handles requests from the client. │
│ It reads cached results and computes classifier   │
│ projections when they are not already cached.     │
│                                                   │
│ Usage:                                            │
│     python3 main.py                               │
│                                                   │
└───────────────────────────────────────────────────┘
"""

########### CONFIG ###########
host = '127.0.0.1'
port = '12345'
debug = True
# when True, exceptions are catched and sent to the client
send_on_exception = False
log_cache_actions = False
cache_path = 'cache/'
show_request_args = False
##############################

print("""
    ┌────────────────┐
    │ Backend Server │
    └────────────────┘
""")

tools.version_checks()

# flask setup
app = Flask(__name__)
api = Api(app)
CORS(app)


@app.route('/', methods=('get', 'post'))
def rest():
    # initialize server
    cache.init(cache_path, log_actions=log_cache_actions)
    cprint('─' * 80, 'cyan')

    # parse JSON args
    try:
        args = json.loads(request.args['args'])
        if show_request_args:
            print('\nRequest arguments:')
            print(json.dumps(args, sort_keys=False, indent=4))
        actions = ('get_clf_results',
                   'project',
                   'batch_project_classifiers',
                   'delete_cache',
                   'delete_cache_files',
                   'delete_all_clf_projs',
                   'cache_content',
                   'info')
        action = args['action']
        tools.check_arg('action', action, str, actions)
    except:
        cprint('Invalid or no arguments, sending error.', 'red')
        return jsonify({
            'type': 'error',
            'msg': 'Missing arguments or invalid action!'
        })

    # API actions
    try:
        # cache actions
        if action == 'delete_cache':
            cache.clear()
            return jsonify({
                'type': 'success',
                'msg': 'Cache has been cleared.'
            })

        elif action == 'delete_cache_files':
            errors = []
            for f in args['files']:
                try:
                    cache.delete(f)
                except:
                    errors.append(f)
            if len(errors) == 0:
                return jsonpify({
                    'type': 'success',
                    'msg': 'Files have been deleted.'
                })
            else:
                return jsonpify({
                    'type': 'error',
                    'msg': 'Could not delete some files!',
                    'files': errors
                })

        elif action == 'delete_all_clf_projs':
            return jsonpify(cache.delete_all_clf_projs())

        elif action == 'cache_content':
            cprint('Sending cache content', 'green')
            return jsonpify(cache.content())

        # server info
        elif action == 'info':
            cprint('Sending server info', 'green')
            return jsonify({
                'type': 'info',
                'msg': 'Information on available plugins etc.',
                'actions': actions,
                'datasets': get_datasets_info(),
                'classifiers': get_classifier_info(),
                'projections': projection.info()
            })

        # classifier projection with all possible parameters
        # this is fast compared to loading clfs from cache every time
        elif action == 'batch_project_classifiers':
            projs = projection.batch_project_classifiers(args)
            return jsonpify(projs)

        # all classifications at once
        elif action == 'get_clf_results':
            files = args['files']
            cprint('Sending classification results', 'green')
            results, success_files, errors = cache.read_multiple(files)
            return jsonpify({
                'files': success_files,
                'classifiers': results,
                'errors': errors
            })

        # data projection
        elif action == 'project':
            proj_args = args['projection']
            if 'file' in proj_args and proj_args['file'] in cache.entries():
                cprint('Sending projected data', 'green')
                return jsonpify(cache.read(proj_args['file']))
            else:
                cprint('Projection is missing!', 'red')
                print(json.dumps(proj_args, sort_keys=False, indent=4))
                return jsonify({
                    'type': 'error',
                    'msg': 'Projection is missing!'
                })

    except Exception as e:
        cprint(e, 'red')
        if send_on_exception:
            return jsonify({
                'type': 'error',
                'msg': str(e.args[0])
            })
        else:
            raise


# start server when program starts
if __name__ == '__main__':
    cprint('Server is running at http://{}:{}/\n'.format(host, port), 'green')
    if not debug:
        cprint(
            'Debug mode is disabled, server will not detect changes in code.', 'yellow')
    app.run(host=host, port=port, debug=debug)
