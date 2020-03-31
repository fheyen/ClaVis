import json
from hashlib import md5
from termcolor import colored, cprint
from datetime import datetime
import sys
import math
from sklearn.metrics import accuracy_score
from sklearn.metrics import confusion_matrix
from sklearn.metrics import precision_recall_fscore_support
from sklearn.metrics import classification_report
from . import cache


def version_checks():
    print('Running Python version {}'.format(sys.version))
    try:
        assert sys.version_info >= (3, 6)
    except:
        cprint('Need at least Python 3.6!', 'red')
    if round(math.log(sys.maxsize, 2)+1) != 64:
        cprint('Not running as 64 bit!', 'yellow')


def check_arg(name, value, exp_type, exp_range=()):
    """
    Checks a value against an expected type and range.
    Used for data preprocessign and projections.

    Keyword Arguments:
    - name: name of the argument, for error messages
    - value: value
    - exp_type: the type that the value should have
    - exp_range: in case of number a tuple or list with (min, max)
                 in case of strings a tuple or list with all options
                 if empty (default), all values of the correct type will be allowed
    Returns:
    - Value if valid
    Raises:
    - Exception if invalid
    """
    # check if None
    if value == None:
        raise Exception('Missing argument "{}"'.format(name))

    # check type
    if not isinstance(value, exp_type):
        # accept ints for floats
        if not (exp_type is float and type(value) is int):
            raise Exception('Invalid argument "{}" with value "{}", should be {} but is "{}"'.format(
                name, value, exp_type, type(value)))

    # check range for strings and numbers
    if exp_type == str and len(exp_range) != 0 and value not in exp_range:
        raise Exception(
            'Invalid argument "{}", value must be in {}'.format(name, exp_range))
    elif exp_type == int or exp_type == float:
        if len(exp_range) != 0 and not exp_range[0] <= value <= exp_range[1]:
            raise Exception(
                'Invalid argument "{}", value must be in {}'.format(name, exp_range))
    return value


def check_argument(name, args, clf_info):
    """
    Checks a value against an expected type and range.
    Used for classifier plugins.

    Keyword Arguments:
    - name: name of the argument, for error messages
    - value: value
    - clf

    Returns:
    - Value if valid
    - Default value otherwise

    Raises:
    - Exception if no type or default value is specified in clf_info
    """
    # get type, range and default
    found = False
    for param in clf_info['parameters']:
        if param['name'] == name:
            found = True
            arg_type = param['type']
            arg_default = param['default_value']
            break

    if not found:
        raise Exception(
            f'Plugin error: Parameter {name} is not defined in classifier info!')

    # get value
    if not name in args:
        cprint(
            f'Argument {name} not specified, using default: {arg_default}', 'yellow')
        return arg_default
    else:
        value = args[name]

        # check type
        if arg_type in ['other', 'array']:
            cprint(
                f'Argument {name} is of type "{arg_type}" and will not be checked! Value is {value}', 'yellow')
            return value
        else:
            type_map = {
                'integer': int,
                'float': float,
                'string': str,
                'boolean': bool
            }

            if not arg_type in type_map:
                raise Exception(
                    f'Argument {name}: Type must be integer, float, string, boolean, array or other but was {arg_type}')

            exp_type = type_map[arg_type]
            if not isinstance(value, exp_type):
                # accept ints for floats (but not the other way)
                if not (exp_type is float and type(value) is int):
                    cprint(
                        f'Invalid argument {name} with value {value}', 'red')
                    cprint(
                        f'Should be type {exp_type} but is {type(value)}', 'red')
                    cprint(f'Using default instead: {arg_default}', 'red')
                    return arg_default

            # check range for strings and numbers
            if exp_type == bool:
                param['range'] = [True, False]
            if not 'range' in param or len(param['range']) == 0:
                cprint(
                    f'Argument {name} has no specified range, so it cannot be checked! Value is {value}.', 'yellow')
            else:
                arg_range = param['range']
                valid = True
                if exp_type == str or exp_type == bool:
                    if value not in arg_range:
                        valid = False

                elif exp_type == int or exp_type == float:
                    if not arg_range[0] <= value <= arg_range[1]:
                        valid = False

                if not valid:
                    cprint(
                        f'Invalid argument {name} with value {value}', 'red')
                    cprint(f'Must be in range {arg_range}', 'red')
                    cprint(f'Using default instead: {arg_default}', 'red')
                    return arg_default

    # everything is fine, so return the value
    return value


def tolist(listlike):
    """
    Turns a list-like object into a list,
    if it not already is one.
    """
    if type(listlike) == type(None):
        return listlike
    if type(listlike) is list:
        return listlike
    else:
        return listlike.tolist()


def hash(args, prefix=''):
    """
    Generates a prefixed hash of a dictionary.
    The dictionary's keys are sorted to avoid getting
    different hashes for the same data.
    """
    try:
        sorted_json = json.dumps(args, sort_keys=True)
        md5_hash = md5(str(sorted_json).encode()).hexdigest()
        return f'{prefix}{md5_hash}'
    except Exception as e:
        cprint('Cannot create hash', 'red')
        print(args)
        raise


def print_time_elapsed(t0, prefix='', end=''):
    """
    Prints the formatted time current and elapsed time.

    If a newline should be printed, set end='\\n'
    """
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    elapsed = str(datetime.now() - t0).split('.', 2)[0]
    print(f'{prefix} Time: {now} elapsed: {elapsed} ', end=end)


def add_vector(vector1, vector2):
    """
    Adds vector1 and vector2 component-wise
    """
    summed = [x for x in vector1]
    for i in range(len(vector1)):
        summed[i] += vector2[i]
    return summed


def add_matrix(matrix1, matrix2):
    """
    Adds matrix2 to matrix1 in place
    """
    size = len(matrix1)
    for i in range(size):
        for j in range(size):
            matrix1[i][j] += matrix2[i][j]
    return matrix1


def get_scores(y_true, y_pred, class_names):
    """
    Calculates various classifier scores.
    """
    conf_matrix = None
    try:
        conf_matrix = tolist(confusion_matrix(y_true, y_pred))
    except Exception as e:
        # TODO: handle multi-label here
        cprint('Cannot calculate confusion matrix (disabled for multi-label)', 'yellow')
        cprint(e, 'yellow')

    return {
        'accuracy': accuracy_score(y_true, y_pred),
        'conf_matrix': conf_matrix,
        'pre_rec_fs_supp': precision_recall_fscore_support(
            y_true, y_pred, average='weighted')
    }


def get_mean_scores(scores):
    """
    Calculates the mean of all scores
    """
    num = len(scores)
    acc = scores[0]['accuracy']
    conf_matrix = scores[0]['conf_matrix']
    pre_rec_fs_supp = scores[0]['pre_rec_fs_supp'][:3]

    # add
    for i in range(1, num):
        score = scores[i]
        acc += score['accuracy']
        conf_matrix = add_matrix(conf_matrix, score['conf_matrix'])
        pre_rec_fs_supp = add_vector(
            pre_rec_fs_supp, score['pre_rec_fs_supp'][:3])

    # divide by num
    acc /= num
    conf_matrix = [[round(x/num, 1) for x in row] for row in conf_matrix]
    pre_rec_fs_supp = [x/num for x in pre_rec_fs_supp]

    return {
        'accuracy': acc,
        'conf_matrix': conf_matrix,
        'pre_rec_fs_supp': pre_rec_fs_supp
    }


def check_datasets_compatible(dataset1, dataset2):
    """
    Used for cross-corpus datasets that are combined
    from two datasets.
    Checks if two datasets have the same class names
    and original shape.
    The first entry of the original shape is ignored,
    since the number of samples does not matter.

    Returns: class_names, original_shape
    Raises: Exception if datasets are not compatible
    """
    # check class names
    class_names1 = dataset1['class_names']
    class_names2 = dataset2['class_names']

    msg = f'Class names are not equal: {class_names1}, {class_names2}'
    e = Exception(f'Datasets are not compatible!\n{msg}')
    if len(class_names1) != len(class_names2):
        raise e
    for i in range(len(class_names1)):
        if class_names1[i] != class_names2[i]:
            raise e

    # check if both have a shape or not
    has_shape1 = has_shape2 = False
    if 'specs' in dataset1 and 'original_shape' in dataset1['specs']:
        has_shape1 = True
    if 'specs' in dataset2 and 'original_shape' in dataset2['specs']:
        has_shape2 = True
    if has_shape1 and not has_shape2:
        raise Exception(
            'Dataset 1 has a original_shape but dataset 2 does not!')
    if has_shape2 and not has_shape1:
        raise Exception(
            'Dataset 2 has a original_shape but dataset 1 does not!')

    #  check shapes
    original_shape = None
    if has_shape1 and has_shape2:
        shape1 = dataset1['specs']['original_shape']
        shape2 = dataset2['specs']['original_shape']
        msg = f'Shapes are not equal: {shape1}, {shape2}'
        e = Exception(f'Datasets are not compatible!\n{msg}')
        if len(shape1) != len(shape2):
            raise e
        for i in range(1, len(shape1)):
            if shape1[i] != shape2[i]:
                raise e
        original_shape = shape1

    return class_names1, original_shape
