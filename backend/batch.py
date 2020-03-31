#!./venv/bin/python3

"""
┌─────────────────────────────────────────────────────────────┐
│ Python frontend for running batch classification.           │
│ All results will be written to the cache directory          │
│ where it will be accessed by other parts.                   │
│                                                             │
│ Usage:                                                      │
│     python3 batch.py batchfiles [-break|-b]                 │
│                                                             │
│     batchfiles    files with batch configuration            │
│     -break, -b    if this is given, the programm will break │
│                     when an exception is encountered        │
└─────────────────────────────────────────────────────────────┘
"""

# limit GPU usage
import traceback
import sys
from datetime import datetime
from modules import cache, data, classification, projection, tools, job_compiler
from termcolor import cprint, colored
import json
# import keras to initialize it before loading plugins
import keras
from os import environ
import colorama

colorama.init()
print('Setting environ["CUDA_VISIBLE_DEVICES"] = "0"')
environ['CUDA_VISIBLE_DEVICES'] = '0'


########### CONFIG ###########

# If False, an exception in one classifier or projection will
# not cause the batch job to be stopped
# (can be set to True by -break argument)
break_on_exception = False

# Display the content of the batch job file when it is loaded?
# (useful for logs)
show_batch_config = False

# If True, cache reads and writes will be logged to the console
# (useful for debugging)
cache_log = False
cache_path = 'cache/'

##############################

tools.version_checks()
cache.init(cache_path, log_actions=cache_log)


def run_job(batch_file, current_job, n_jobs, t0):
    """
    Runs one batch job as defined in a .json file.
    """
    t_start = datetime.now()
    errors = []

    # read json config
    print('\n')
    cprint('─' * 80, 'green')
    cprint(f'\nLoading batch job {current_job} of {n_jobs}', 'cyan')
    cprint(f'  Reading from {batch_file}')
    with open(batch_file) as json_data:
        args = json.load(json_data)
        if show_batch_config:
            print(json.dumps(args, sort_keys=False, indent=4))
        # compile meta configs
        args = job_compiler.compile(args, break_on_exception=True)

    # use hashes for cache entries
    data_args = args['data']
    cprint(f'\n\nRunning batch job {data_args["title"]}', 'cyan')
    data_cache = tools.hash(data_args, 'data_')
    cache_entries = cache.entries()

    # get data
    print(colored('\n\nLoading data', 'cyan'), end='')
    tools.print_time_elapsed(t0)
    data_bundle = data.get_data(data_args,
                                data_cache,
                                read_from_cache=False,
                                write_to_cache=False,
                                write_args_to_cache=True)

    # project
    cprint('\n\n\nProjecting data', 'cyan')
    projs = args['projections']
    current = 1
    for proj_args in projs:
        try:
            print(
                f'\n\nJob {current_job} of {n_jobs}, projection {current} of {len(projs)} ', end='')
            current += 1
            # cache lookup
            proj_cache = '{}__proj_{}'.format(
                data_cache, tools.hash(proj_args))
            if proj_cache in cache_entries:
                cprint('already cached!', 'green')
            else:
                tools.print_time_elapsed(t0, end='\n')
                # projection
                projection.project(proj_args, proj_cache, data_bundle)
        except KeyboardInterrupt:
            cprint('\nKeyboardInterrupt, exiting', 'yellow')
            exit()
        except Exception as e:
            errors.append(f'Projection: {proj_args["title"]}')
            cprint(e, 'red')
            if break_on_exception:
                raise

    # classify
    cprint('\n\n\nRunning classifiers', 'cyan')
    clfs = args['classifiers']
    current = 1
    for clf_args in clfs:
        try:
            print(
                f'\n\nJob {current_job} of {n_jobs}, classifier {current} of {len(clfs)} ', end='')
            current += 1
            # cache lookup
            clf_cache = '{}__clf_{}'.format(data_cache, tools.hash(clf_args))
            if clf_cache in cache_entries:
                cprint('already cached!', 'green')
            else:
                tools.print_time_elapsed(t0, end='\n')
                # classification
                classification.classify(clf_args, clf_cache, data_bundle)
        except KeyboardInterrupt:
            cprint('\nKeyboardInterrupt, exiting', 'yellow')
            exit()
        except Exception as e:
            errors.append(f'Classifier: {clf_args["title"]}')
            cprint(e, 'red')
            if break_on_exception:
                raise

    tools.print_time_elapsed(t0, prefix=colored(
        f'\n\nFinished job {current_job} of {n_jobs}', 'green'), end='\n\n')

    # print errors if any happened
    if len(errors) > 0:
        cprint(
            f'{len(errors)} errors! The following classifier configurations failed:', 'red')
        for error in errors:
            print(error)

    # return summary
    return {
        'title': data_args["title"],
        'dataset': data_args["dataset"],
        'n_clfs': len(clfs),
        'n_projs': len(projs),
        'errors': errors,
        'time': datetime.now() - t_start
    }


def print_summary(summaries):
    """
    Prints a ummary of all batch jobs that have been run
    """
    print("""
    ┌───────────┐
    │  SUMMARY  │
    └───────────┘
    """)
    # print summary for all jobs
    format_str = '{:40}  {:20}  {:8}  {:8}  {:8}  {:10}'
    cprint(format_str.format('Title', 'Dataset',
                             '#Clfs', '#Projs', '#Errors', 'Time'), 'cyan')
    total_clfs = 0
    total_projs = 0
    total_errors = 0
    total_time = None
    for summary in summaries:
        # color red when there where errors
        n_errors = len(summary['errors'])
        col = 'green'
        if n_errors > 0:
            col = 'red'

        # print stats
        cprint(format_str.format(
            summary['title'][:40],
            summary['dataset'][:20],
            summary['n_clfs'],
            summary['n_projs'],
            n_errors,
            str(summary['time']).split('.', 2)[0]
        ), col)

        # sum up values
        total_clfs += summary['n_clfs']
        total_projs += summary['n_projs']
        total_errors += n_errors
        if total_time == None:
            total_time = summary['time']
        else:
            total_time += summary['time']

    # print sums
    print(format_str.format(
        'TOTAL',
        f'{len(summaries)} jobs',
        total_clfs,
        total_projs,
        total_errors,
        str(total_time).split('.', 2)[0]
    ))

    # print errors for each job
    if total_errors == 0:
        cprint('\nNo errors in the above jobs!', 'green')
    else:
        cprint(f'\n{total_errors} errors!', 'red')
        for summary in summaries:
            if len(summary['errors']) > 0:
                cprint(
                    f'\n{summary["title"]}: {len(summary["errors"])} errors', 'red')
                for error in summary['errors']:
                    print(f'  {error}')


def show_help():
    print("""
    Usage:
        python3 batch.py jobfile1 [jobfile2 [jobfile...]] [-b|-break]

        Make sure you have installed all packages and are inside the virtual environment!
        See README.md for information on how to create batch jobs.

    Arguments:
        jobfiles    Batch job configs in JSON format, one or more

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
    t0 = datetime.now()

    # get files and arguments
    jobs = []
    should_show_help = False
    for arg in sys.argv[1:]:
        # arguments
        if arg in ['-b', '-break']:
            break_on_exception = True
        elif arg in ['-h', '-help']:
            should_show_help = True
        # files
        else:
            cprint(f'added job: {arg}', 'green')
            jobs.append(arg)

    # check if there are any jobs
    if should_show_help or len(jobs) == 0:
        show_help()
        return

    # exception handling
    if break_on_exception:
        cprint('[break on] Programm will stop when an exception occurs (restart without -break to change this)', 'yellow')
    else:
        cprint('[break off] Programm will continue when an exception occurs (restart with -break to change this)', 'yellow')

    # run all jobs and show summary
    i = 0
    summaries = []
    failed_jobs = []
    errors_happened = False
    try:
        for job in jobs:
            i += 1
            summary = run_job(job, i, len(jobs), t0)
            summaries.append(summary)
            if len(summary['errors']) > 0:
                errors_happened = True

    except Exception as e:
        print(e)
        traceback.print_exc()
        failed_jobs.append(job)
        cprint(
            f'\nAn exception occured in job {job}, here is the summary until now:', 'red')

    print_summary(summaries)

    # list failed jobs
    if len(failed_jobs) > 0:
        cprint('\nThe following jobs failed. Check for classifier errors first and then for missing or invalid .json files and problems within the dataset plugins.', 'red')
        for failed in failed_jobs:
            print(f'  {failed}')

    # remind to turn on break mode when errors happened
    if (errors_happened or len(failed_jobs) > 0) and not break_on_exception:
        cprint(
            '\nRestart with -break (or -b) to break on exceptions and see the traceback', 'yellow')


if __name__ == '__main__':
    main()
