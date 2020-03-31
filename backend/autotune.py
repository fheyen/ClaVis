#!./venv/bin/python3

"""
┌─────────────────────────────────────────────────────────────┐
│ Auto-tuning tool for batch jobs.                            │
│                                                             │
│ Usage:                                                      │
│     python3 batch.py batchfile [-break|-b]                  │
│                                                             │
│     batchfile    files with batch configuration             │
│     -break, -b    if this is given, the programm will break │
│                     when an exception is encountered        │
└─────────────────────────────────────────────────────────────┘
"""

import colorama
import numpy as np
import traceback
import sys
from datetime import datetime, timedelta
from modules import cache, data, classification, tools
from termcolor import cprint, colored
import json
# import keras to initialize it before loading plugins
import keras
from random import random, randint
from os import environ

# limit GPU usage
print('Setting environ["CUDA_VISIBLE_DEVICES"] = "0"')
environ['CUDA_VISIBLE_DEVICES'] = '0'

colorama.init()

break_on_exception = False
cache_path = 'cache/'

tools.version_checks()
cache.init(cache_path, log_actions=False)


def choose_param_numerical(min_val, max_val, param_type, sigma, current):
    """
    Chooses a numerical parameter value via a uniformly or
    normally distributed random choice.
    Which one is used is determined at random.
    """
    r = random()
    # sometimes choose value uniformly to avoid being stuck in some range
    if r < 0.5:
        s = min_val + random() * (max_val - min_val)
    else:
        s = np.random.normal(current, sigma)
        # cutoff at min and max
        s = max(min_val, min(max_val, s))
    if param_type == 'int':
        s = round(s)
    return s


def choose_param_categorical(possibilities):
    """
    Chooses one of multiple possible values uniformly at random.
    """
    index = randint(0, len(possibilities)-1)
    return possibilities[index]


def create_variation(clf, tuning_config, initial=False):
    """
    Creates a variation of clf using the tuning_config.
    If initial=True, it simply takes the intitial values from the
    tuning_config.
    """
    new_clf = tuning_config.copy()
    # for each key, check if it should be tuned
    for key, value in tuning_config.items():
        if type(value) is dict and 'tune' in value:
            # take initial value or choose new value based on type
            if initial:
                new_value = value['initial']
            elif random() < 0.2:
                # keep parameter value
                new_value = clf[key]
            elif value['type'] == 'categorical':
                new_value = choose_param_categorical(value['values'])
            else:
                current_value = clf[key]
                new_value = choose_param_numerical(value['min'],
                                                   value['max'],
                                                   value['type'],
                                                   value['sigma'],
                                                   current_value)
            new_clf[key] = new_value
            # set title
            new_clf['title'] = new_clf['title'].replace(
                '{{{}}}'.format(key), str(new_value))
    return new_clf


def get_offspring(clf, n_offspring):
    """
    Creates n_offspring new classifier configs based on clf and tuning_config.
    """
    # clf_config, tuning_config, result_scores
    clf, tuning_config, result = clf
    # keep original clf
    offspring = [(clf, tuning_config, result)]
    # add offspring
    for _ in range(n_offspring - 1):
        new_clf = create_variation(clf, tuning_config)
        offspring.append((new_clf, tuning_config, None))
    return offspring


def remove_doubles(clfs):
    """
    Sometimes the same clf confog is created twice
    (since creation is random).
    This function removes them before training.
    """
    print('Checking for doubles', end=' ')
    # hash all clfs
    hashes = [tools.hash(c[0]) for c in clfs]
    # then compare all hashes
    filtered = []
    doubles = 0
    for i in range(len(clfs)):
        is_double = False
        for j in range(i):
            if hashes[i] == hashes[j]:
                is_double = True
                doubles += 1
        if not is_double:
            filtered.append(clfs[i])
    cprint(f'Removed {doubles} doubles, {len(filtered)} left', 'green')
    return filtered


def write_report(job_file, content, append=True, print_to_console=True):
    """
    Writes a report to the job_name.report.md file
    and logs it to the console.
    """
    if print_to_console:
        print(content)
    filename = job_file.replace('.json', '.report.md')
    if append:
        with open(filename, 'a') as f:
            f.write(content)
    else:
        with open(filename, 'w') as f:
            f.write(content)


def run_round(clfs, data_cache, data_bundle, data_args, job, t0, current_round):
    """
    Runs a single tuning round. All classifiers are trained and
    sorted by their test accuracy. The best are kept and returned.
    """
    start_time = datetime.now()
    population = data_args['tuning_population']

    current = 1
    results = []
    errors = []

    interrupted = False

    # train all classifiers
    for clf_args, tuning_config, result in clfs:
        try:
            print(
                f'\n\nRound {current_round} classifier {current} of {len(clfs)} ', end='')
            current += 1
            # cache lookup
            clf_cache = '{}__clf_{}'.format(data_cache, tools.hash(clf_args))
            tools.print_time_elapsed(t0, end='\n')
            # check if already trained
            if type(result) != type(None):
                cprint(f'  Title: {clf_args["title"]}', 'cyan')
                cprint('  Already trained!', 'green')
            if type(result) == type(None):
                # classification without saving
                result = classification.classify(clf_args,
                                                 clf_cache,
                                                 data_bundle,
                                                 write_to_cache=False)
            results.append((clf_args, tuning_config, result))

        except KeyboardInterrupt:
            cprint('\nKeyboardInterrupt, stopping current round', 'yellow')
            interrupted = True
            break

        except Exception as e:
            errors.append(f'Classifier: {clf_args["title"]}')
            cprint(e, 'red')
            if break_on_exception:
                raise

    tools.print_time_elapsed(t0, prefix=colored(
        f'\n\nFinished round {current_round}', 'green'), end='\n\n')

    # print errors if any happened
    if len(errors) > 0:
        cprint(
            f'{len(errors)} errors! The following classifiers failed:', 'red')
        for error in errors:
            print(error)

    # get best classifiers (cut to population size)
    results = sorted(results,
                     key=lambda k: k[2][1]['accuracy'],
                     reverse=True)
    best = results[:population]

    # print top list
    elapsed = str(datetime.now() - start_time).split('.', 2)[0]
    index = 1
    mean_accuracy = 0
    report = ''
    for clf, tuning_config, result in best:
        title = clf['title']
        # train_acc = result[0]['accuracy']
        test_acc = result[1]['accuracy']
        clf_time = result[2]
        pred_time = result[3]
        total_time = str(timedelta(seconds=clf_time + pred_time))
        total_time = total_time.split('.', 2)[0]
        report += f'| {index:4} | {title[:50]:50} |  {test_acc:7.05}  | {total_time} |\n'
        index += 1
        mean_accuracy += test_acc

    # get best and mean accuracy
    try:
        best_accuracy = best[0][2][1]['accuracy']
        mean_accuracy = mean_accuracy / len(best)
    except:
        best_accuracy = mean_accuracy = 0
        cprint(f'Cannot get best and mean accuracy of {len(best)} classifiers',
               'yellow')

    report = f'''
## Round {current_round}

- Finished at: {str(datetime.now()).split('.', 2)[0]}
- Time: {elapsed}
- Interrupted: {interrupted}

### Best {population} Classifiers

| Nr.  | {"Title"[:50]:50} | Test acc. | Time    |
|------|{"-"*52}|-----------|---------|
{report}
### Summary

Accuracy:
- Best: {best_accuracy:6.5}
- Mean: {mean_accuracy:6.5}
'''
    write_report(job, report, append=True, print_to_console=True)

    return best, best_accuracy, mean_accuracy, interrupted, elapsed


def run_job(batch_file):
    """
    Runs one batch job as defined in a .json file.
    """
    t0 = datetime.now()

    # read json config
    cprint(f'Reading from {batch_file}')
    with open(batch_file) as json_data:
        args = json.load(json_data)

    # use hashes for cache entries
    data_args = args['data']
    cprint(f'\n\nRunning batch job {data_args["title"]}', 'cyan')
    data_cache = tools.hash(data_args, 'data_')

    # get data
    print(colored('\n\nLoading data', 'cyan'), end='')
    data_bundle = data.get_data(data_args,
                                data_cache,
                                read_from_cache=False,
                                write_to_cache=False,
                                write_args_to_cache=False)

    meta_clfs = args['classifiers']

    # get initial classifiers
    clfs = []
    for m in meta_clfs:
        new_clf = create_variation({}, m, initial=True)
        clfs.append((new_clf, m, None))

    # begin new log file
    report = f'# Report for Job {data_args["title"]}\n\n'
    report += f'- File: {batch_file}\n'
    report += f'- Rounds: {data_args["tuning_rounds"]}\n'
    report += f'- Population: {data_args["tuning_population"]}\n'
    report += f'- Offspring: {data_args["tuning_offspring"]}\n\n'
    write_report(batch_file, report, append=False, print_to_console=False)

    # run round after round of tuning
    rounds = data_args['tuning_rounds']
    history = []
    for r in range(rounds):
        cprint(f'\n\n\nRunning round {r+1} of {rounds}', 'cyan')
        # mutate clfs
        new_clfs = []
        for clf in clfs:
            new_clfs += get_offspring(clf, data_args['tuning_offspring'])
        # remove doubles
        clfs = remove_doubles(new_clfs)
        # train clfs and get best
        result = run_round(clfs,
                           data_cache,
                           data_bundle,
                           data_args,
                           batch_file,
                           t0,
                           r+1)
        clfs, best_acc, mean_acc, interr, elapsed = result
        history.append((best_acc, mean_acc, elapsed))
        # stop on keyboard interrupt
        if interr:
            break

    tools.print_time_elapsed(t0,
                             prefix=colored(f'\n\nFinished job', 'green'),
                             end='\n\n')

    # print accuracy history
    report = '## History\n\n'
    report += f'| Round | Time    | Best Acc. | Mean Acc. |\n'
    report += f'|-------|---------|-----------|-----------|\n'
    index = 1
    for best, mean, t in history:
        report += f'| {index:5} | {t} | {best:9.7} | {mean:9.7} |\n'
        index += 1

    # write history to log
    write_report(batch_file, report, append=True, print_to_console=True)

    # return best classifiers
    return clfs


def show_help():
    print("""
    Usage:
        python3 autotune.py jobfile rounds population [-b|-break]

    Example:
        python3 autotune.py job.json -b

        Make sure you have installed all packages and are inside the virtual environment!
        See README.md for information on how to create batch jobs.

    Arguments:
        jobfile     Batch job config in JSON format

        -b -break   If this argument is given, the program will stop
                    once an exception is encountered. By default
                    it will ignore exceptions when possible and
                    continue the current job or start the next one.

        -h -help    Shows this information and exits.
    """)


def main():
    """
    Checks arguments and runns all jobs, then shows a summary.
    """
    print("""
    ┌─────────────────────┐
    │ BATCH CONFIG RUNNER │
    └─────────────────────┘
    """)
    global break_on_exception

    # get files and arguments
    job = None
    show_help = False
    job = sys.argv[1]
    for arg in sys.argv[1:]:
        # arguments
        if arg in ['-b', '-break']:
            break_on_exception = True
        elif arg in ['-h', '-help']:
            show_help = True

    # check if there are any jobs
    if show_help or job == None:
        show_help()
        return

    # exception handling
    if break_on_exception:
        cprint('[break on] Programm will stop when an exception occurs (restart without -break to change this)', 'yellow')
    else:
        cprint('[break off] Programm will continue when an exception occurs (restart with -break to change this)', 'yellow')

    # run job
    try:
        best = run_job(job)

        # save best classifier configs to a new job
        filename = job.replace('.json', '.result.json')
        best_clfs_only = [b[0] for b in best]
        json_string = json.dumps(best_clfs_only, sort_keys=False, indent=4)
        cprint(f'Saving results to {filename}', 'green')
        with open(filename, 'w') as f:
            f.write(json_string)
    except:
        cprint(
            '\nRestart with -break (or -b) to break on exceptions and see the traceback', 'yellow')
        raise


if __name__ == '__main__':
    main()
