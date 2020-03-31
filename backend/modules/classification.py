from . import tools, cache
from termcolor import cprint
from time import time
import numpy as np
import json
from .classifiers import get_classifier, get_classifier_info
from .tools import get_scores, get_mean_scores


def classify(clf_args, clf_cache, data_bundle, write_to_cache=True):
    """
    Classifies the data.
    """
    cprint(f'  Title: {clf_args["title"]}', 'cyan')
    print(f'  Plugin (method): {clf_args["method"]}')
    print(f'  Hash: {clf_cache}')
    print(f'  Dataset: {data_bundle["specs"]["dataset_name"]}')
    print(f'  Args:\n{json.dumps(clf_args, sort_keys=False, indent=4)}')

    # check cache here again (batch.py checks too)
    # since cache might have changed
    if clf_cache in cache.entries():
        cprint('Classifier already cached', 'green')
        return None

    try:
        # cross validation can be disabled
        cv_disabled = 'disable_cross_validation' in data_bundle[
            'args'] and data_bundle['args']['disable_cross_validation'] == True

        if not cv_disabled and 'cv_folds' in data_bundle['specs']:
            # classify with cross validation
            clf_result = classify_cv(data_bundle, clf_args, write_to_cache)
        else:
            # classify without cross validation
            X_train = data_bundle['X_train']
            y_train = data_bundle['y_train']
            X_test = data_bundle['X_test']
            y_test = data_bundle['y_test']
            clf_result = classify_simple(
                data_bundle, clf_args, X_train, y_train, X_test, y_test)

        # save data to cache
        if write_to_cache:
            save_clf_result(clf_args, clf_cache, clf_result, data_bundle)

        # return test scores for autotuning
        train_scores, test_scores, _, _, clf_time, \
            pred_time, _, _, _ = clf_result
        return train_scores, test_scores, clf_time, pred_time

    except Exception as e:
        cprint(f'Error while training classifier {clf_args["title"]}', 'red')
        cprint(e, 'red')
        raise


def save_clf_result(clf_args, clf_cache, clf_result, data_bundle):
    """
    Writes the classification result to cache
    """
    train_scores, test_scores, y_pred_test, y_pred_train, clf_time, \
        pred_time, history, y_prob_test, y_prob_train = clf_result

    # convert history so floats so jsonpify can handle it
    hist_new = None
    if history != None:
        hist_new = {}
        for key, value in history.items():
            hist_new[key] = [float(x) for x in value]

    clf_bundle = {
        'type': 'classifier_result',
        'args': clf_args,
        'train_scores': train_scores,
        'test_scores': test_scores,
        'hash': clf_cache,
        'data_hash': data_bundle['hash'],
        'clf_time': clf_time,
        'pred_time': pred_time,
        'history': hist_new
    }

    # store probabilities separately so frontend does not have to load them
    y_pred_bundle = {
        'y_pred_test': tools.tolist(y_pred_test),
        'y_pred_train': tools.tolist(y_pred_train),
        'y_pred_proba_test': tools.tolist(y_prob_test),
        'y_pred_proba_train': tools.tolist(y_prob_train)
    }

    # store scores for display in menu
    score_bundle = {
        'train_scores': train_scores,
        'test_scores': test_scores,
        'hash': clf_cache,
        'data_hash': data_bundle['hash'],
        'clf_time': clf_time,
        'pred_time': pred_time
    }

    # save data
    cache.write(clf_cache, clf_bundle)
    cache.write(f'{clf_cache}_proba', y_pred_bundle)

    # save args and scores
    cache.write_dict_json(f'{clf_cache}_args', clf_args)
    cache.write_dict_json(f'{clf_cache}_scores', score_bundle)


def classify_simple(data_bundle, clf_args, X_train, y_train, X_test, y_test):
    """
    Classification without cross validation
    """
    # create classifier
    clf = get_classifier(clf_args, data_bundle['specs'])

    # fit (train) classifier
    t0 = time()
    clf.fit(X_train, y_train)
    clf_time = time() - t0
    cprint('  Train time: {:.2f} minutes'.format(clf_time/60), 'green')

    # predict training and test data
    y_pred_test = y_pred_train = None
    y_prob_test = y_prob_train = None
    train_scores = test_scores = None
    pred_time = 0

    if len(X_test) == 0:
        cprint('No test set, skipping prediction and evaluation', 'yellow')

    else:
        t1 = time()
        print('  Predicting class labels...', end='\r')
        y_pred_test = clf.predict(X_test, y_test)
        y_pred_train = clf.predict(X_train, y_train)
        pred_time = time() - t1

        # also get probabilities if possible
        print('  Predicting probabilities...', end='\r')
        if hasattr(clf, 'predict_proba'):
            y_prob_test = clf.predict_proba(X_test, y_test)
            y_prob_train = clf.predict_proba(X_train, y_train)
        elif hasattr(clf, 'decision_function'):
            df_test = clf.decision_function(X_test, y_test)
            df_train = clf.decision_function(X_train, y_train)
            # normalize decision_function values to [0, 1]
            y_prob_test = (df_test - np.min(df_test)) / np.ptp(df_test)
            y_prob_train = (df_train - np.min(df_train)) / np.ptp(df_train)
            # if binary classification, make format match other classifiers
            if len(y_prob_test.shape) == 1:
                y_prob_test = [[x, 1-x] for x in y_prob_test]
                y_prob_train = [[x, 1-x] for x in y_prob_train]

        # score
        print('  Calculating scores...', end='\r')
        classes = data_bundle['class_names']
        test_scores = get_scores(y_test, y_pred_test, classes)
        train_scores = get_scores(y_train, y_pred_train, classes)

        # some stats (long enough to overwrite the lines before)
        train_acc = train_scores['accuracy'] * 100
        test_acc = test_scores['accuracy'] * 100
        cprint(f'  Test time:  {pred_time/60:.2f} minutes    ', 'green')
        cprint(f'  Train accuracy: {train_acc:3.2f} %        ', 'green')
        cprint(f'  Test accuracy:  {test_acc:3.2f} %         ', 'green')

    # history (Keras-like training history as dictionary with arrays)
    history = None
    if hasattr(clf, 'get_history'):
        history = clf.get_history()

    return (train_scores,
            test_scores,
            y_pred_test,
            y_pred_train,
            clf_time,
            pred_time,
            history,
            y_prob_test,
            y_prob_train)


def classify_cv(data_bundle, clf_args, write_to_cache=True):
    """
    Classification with cross validation

    - Scores are averaged
    - Predictions for each fold's test set are merged
    - History is not saved
    """
    print('Using cross validation')
    specs = data_bundle['specs']
    cv_folds = specs['cv_folds']
    cv_on_test_set = 'cv_folds_for_test_only' in specs and specs['cv_folds_for_test_only']

    # folds may be numbered starting with 0 or 1
    start = np.min(cv_folds)
    end = np.max(cv_folds)
    num_folds = end - start + 1

    # initialize mean scores
    train_scores_list = []
    test_scores_list = []
    clf_time_sum = pred_time_sum = 0
    merged_pred_test = merged_prob_test = None
    first_fold = True

    # run all folds
    for current_fold in range(start, end+1):
        # get data from data_bundle depending on fold specs
        X_train, y_train, X_test, y_test = get_data_for_fold(data_bundle,
                                                             cv_folds,
                                                             current_fold,
                                                             cv_on_test_set)
        cprint(f'\nFold {current_fold} / {num_folds}', 'cyan')
        print(f'Training samples: {len(y_train)} test samples: {len(y_test)}')

        # change title to contain fold number
        clf_args2 = clf_args.copy()
        clf_args2['title'] += f' fold{current_fold}'

        # run simple classification
        clf_result = classify_simple(data_bundle,
                                     clf_args2,
                                     X_train,
                                     y_train,
                                     X_test,
                                     y_test)
        train_scores, test_scores, y_pred_test, y_pred_train, clf_time, \
            pred_time, history, y_prob_test, y_prob_train = clf_result

        # store single results for each fold?
        if write_to_cache:
            if 'save_clfs_for_folds' in data_bundle['args']:
                if data_bundle['args']['save_clfs_for_folds'] == True:
                    clf_cache = f'{data_bundle["hash"]}__clf_{tools.hash(clf_args2)}'
                    save_clf_result(clf_args2,
                                    clf_cache,
                                    clf_result,
                                    data_bundle)

        # store mean of results
        train_scores_list.append(train_scores)
        test_scores_list.append(test_scores)
        clf_time_sum += clf_time
        pred_time_sum += pred_time

        # concat predictions (needed for clf projections)
        if first_fold:
            first_fold = False
            merged_pred_test = np.array(y_pred_test)
            merged_prob_test = np.array(y_prob_test)
        else:
            merged_pred_test = np.concatenate((merged_pred_test, y_pred_test))
            merged_prob_test = np.concatenate((merged_prob_test, y_prob_test))

    # get final mean scores
    train_scores = get_mean_scores(train_scores_list)
    test_scores = get_mean_scores(test_scores_list)
    clf_time = clf_time_sum / num_folds
    pred_time = pred_time_sum / num_folds

    # print summary
    print('\nAll folds finished!')
    cprint('  Mean train accuracy: {:.2f} %\n  Mean test accuracy: {:.2f} %'.format(
        train_scores['accuracy'] * 100, test_scores['accuracy'] * 100), 'green')
    cprint('  Mean training time: {:.2f} minutes'.format(clf_time/60), 'green')
    cprint('  Total training time: {:.2f} minutes'.format(
        clf_time_sum/60), 'green')

    history = None
    return (train_scores,
            test_scores,
            merged_pred_test,
            [],  # not train predictions
            clf_time,
            pred_time,
            history,
            merged_prob_test,
            [])  # no train probabilities


def get_data_for_fold(data_bundle, cv_folds, current_fold, cv_on_test_set):
    """
    Splits data into train and test set depending
    on the current fold and cross validation mode
    """
    X_train = []
    y_train = []
    X_test = []
    y_test = []

    if cv_on_test_set:
        # training data is in X_train
        X_train = data_bundle['X_train']
        y_train = data_bundle['y_train']
        # test data has to be splitted
        X_set = data_bundle['X_test']
        y_set = data_bundle['y_test']
        for i in range(len(X_set)):
            if cv_folds[i] == current_fold:
                X_test.append(X_set[i])
                y_test.append(y_set[i])

    else:
        # all data is in the train set,
        # the test set comes empty from the dataset
        X_set = data_bundle['X_train']
        y_set = data_bundle['y_train']
        # put data labelled with the current fold number
        # into test set and the rest into train set
        for i in range(len(X_set)):
            if cv_folds[i] == current_fold:
                X_test.append(X_set[i])
                y_test.append(y_set[i])
            else:
                X_train.append(X_set[i])
                y_train.append(y_set[i])

    return (np.array(X_train),
            np.array(y_train),
            np.array(X_test),
            np.array(y_test))
