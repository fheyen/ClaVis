from . import tools, cache
from .datasets import get_dataset, get_datasets_info
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from termcolor import cprint
import numpy as np


def get_data(data_args,
             data_cache,
             read_from_cache=True,
             write_to_cache=True,
             write_args_to_cache=True):
    """
    Prepares the raw data, if it is not yet cached.
    """
    random_state = tools.check_arg(
        'random_state', data_args['random_state'], int, (0, 10000))

    print(f'\n  Dataset: {data_args["dataset"]}\n  Hash: {data_cache}')

    if read_from_cache and data_cache in cache.entries():
        data_bundle = cache.read(data_cache)
        print_data_stats(data_bundle)
    else:
        # get data
        data = get_dataset(data_args)
        X_train = data['X_train']
        y_train = data['y_train']
        X_test = data['X_test']
        y_test = data['y_test']
        class_names = data['class_names']

        # split if data has not been split yet
        if len(X_test) == 0:
            test_size = tools.check_arg(
                'test_size', data_args['test_size'], float, (0, 1))
            if test_size == 0:
                cprint('Empty test set', 'yellow')
            elif test_size == 1:
                cprint(
                    'Putting all data in the test set, training set will be empty', 'yellow')
                X_test = X_train
                y_test = y_train
            else:
                print('  Splitting data with test set ratio {}'.format(test_size))
                # stratifying will make the test set look like the training set
                X_train, X_test, y_train, y_test = train_test_split(
                    X_train, y_train, test_size=float(test_size), stratify=y_train, random_state=random_state)

        # scale data to 0 mean and 1 variance
        scale = tools.check_arg('scale', data_args['scale'], bool)
        if scale:
            cprint('Scaling data with Scikit-Learn StandardScaler', 'cyan')
            sc = StandardScaler()
            if len(X_train) > 0:
                # fit only to training data, to avoid information from
                # the training data to leak into the test data
                X_train = sc.fit_transform(X_train)
                if len(X_test) > 0:
                    X_test = sc.transform(X_test)
            else:
                # if there is no train set, only fit on and transform test set
                X_test = sc.fit_transform(X_test)

        # sub sample
        X_train, y_train, X_test, y_test = sub_sample(
            data_args, X_train, y_train, X_test, y_test)

        data_bundle = data
        data_bundle['X_train'] = X_train
        data_bundle['y_train'] = y_train
        data_bundle['X_test'] = X_test
        data_bundle['y_test'] = y_test
        data_bundle['type'] = 'data'
        data_bundle['hash'] = data_cache
        data_bundle['args'] = data_args

        # some classifiers need information on the data
        if 'specs' in data_bundle:
            data_specs = data_bundle['specs']
        else:
            data_specs = dict()
        data_specs['num_classes'] = len(class_names)
        data_specs['job_title'] = data_args['title']
        data_specs['dataset_name'] = data_args['dataset']
        data_bundle['specs'] = data_specs

        # show info on data
        print_data_stats(data_bundle)

        # cross validation checks and options
        if 'cv_folds' in data_specs:
            cv_on_test_set = 'cv_folds_for_test_only' in data_specs \
                and data_specs['cv_folds_for_test_only']

            # check if it is disabled
            cv_disabled = 'disable_cross_validation' in data_args \
                and data_args['disable_cross_validation'] == True
            if cv_disabled:
                cprint(
                    'The dataset plugin supports cross validation but it was disabled in the batch job', 'yellow')
            else:
                cv_folds = data_specs['cv_folds']

                # type must be np.array
                if type(cv_folds) != np.ndarray:
                    raise Exception(
                        f'Error: cv_folds must be of type numpy.ndarray but is {type(cv_folds)}', 'red')

                # check if cross valiation is only for the test set
                if cv_on_test_set:
                    # cv_folds length must be equal to test data length
                    if len(X_test) != len(cv_folds):
                        raise Exception(
                            f'Error: Length of cv_folds ({len(cv_folds)}) is different than X_test length ({len(X_test)})!')
                else:
                    # test set must be empty
                    if len(data_bundle['y_test']) > 0:
                        raise Exception(
                            f'Error: Test set must be empty for cross validation!', 'red')

                    # cv_folds length must be equal to training data length
                    if len(X_train) != len(cv_folds):
                        raise Exception(
                            f'Error: Length of cv_folds ({len(cv_folds)}) is different than X_train length ({len(X_train)})!')

                # show info on cv folds (folds may be numbered starting with 0 or 1)
                show_fold_sizes(cv_folds, cv_on_test_set)

        if write_to_cache:
            cache.write(data_cache, data_bundle)
        if write_args_to_cache:
            cache.write_dict_json(f'{data_cache}_args', data_args)

    return data_bundle


def print_data_stats(data_bundle):
    """
    Prints some data statistics
    """
    X_train = data_bundle['X_train']
    y_train = data_bundle['y_train']
    X_test = data_bundle['X_test']
    y_test = data_bundle['y_test']
    class_names = data_bundle['class_names']
    print(f'\nNumber of classes: {len(class_names)}')
    print(f'\n{X_train.shape[0]} training samples')
    print(f'{X_test.shape[0]} test samples')
    try:
        print(
            f'\nData shapes:\n  X_train: {X_train.shape}\n  y_train: {y_train.shape}\n  X_test: {X_test.shape}\n  y_test: {y_test.shape}')
    except:
        cprint('Cannot get shape of data, make sure it is a numpy array!', 'red')
        raise
    # do not print, it might be huge
    # print('\nData specs:')
    # for key, value in data_bundle['specs'].items():
    #     print(f'  {key}: {value}')


def sub_sample(args, X_train, y_train, X_test, y_test):
    """
    Subsamples the train and test set separately
    depending on args['subset_train'] and args['subset_test'].
    """
    # TODO: randomize, but with random_state!
    # check arguments
    subset_train = args['subset_train']
    tools.check_arg('subset_train', subset_train, float, (0, 1))
    subset_test = args['subset_test']
    tools.check_arg('subset_test', subset_test, float, (0, 1))

    # check if anything is sampled at all
    if subset_train >= 1 and subset_test >= 1:
        return X_train, y_train, X_test, y_test

    # extract subset of the data
    if subset_train < 1:
        to_keep_train = round(len(X_train) * subset_train)
        print(
            f'Creating training subset with factor {subset_train}\nkeeping {to_keep_train} of {len(X_train)} items')
        cprint('this will not be randomized!', 'red')
        X_train = X_train[:to_keep_train]
        y_train = y_train[:to_keep_train]

    if subset_test < 1:
        to_keep_test = round(len(X_test) * subset_test)
        print(
            f'Creating test subset with factor {subset_test}\nkeeping {to_keep_test} of {len(X_test)} items')
        cprint('this will not be randomized!', 'red')
        X_test = X_test[:to_keep_test]
        y_test = y_test[:to_keep_test]

    return X_train, y_train, X_test, y_test


def show_fold_sizes(cv_folds, cv_on_test_set):
    """
    Shows a list of all folds with training and test size for each fold.
    """
    start = np.min(cv_folds)
    end = np.max(cv_folds)
    num_folds = end - start + 1
    cprint(
        f'\nUsing cross validation with {num_folds} folds from {start} to {end}')

    if cv_on_test_set:
        print(f'  Fold sizes (splits of original test set):')
        for current_fold in range(start, end + 1):
            size = 0
            for i in range(len(cv_folds)):
                if cv_folds[i] == current_fold:
                    size += 1
            print(f'    {current_fold:2} {size:7}')

    else:
        print(f'  Fold sizes (train and test):')
        for current_fold in range(start, end + 1):
            train_size = 0
            test_size = 0
            for i in range(len(cv_folds)):
                if cv_folds[i] == current_fold:
                    test_size += 1
                else:
                    train_size += 1
            print(f'    {current_fold:2} {train_size:7} {test_size:7}')
