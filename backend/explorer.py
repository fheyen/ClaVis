import json
from termcolor import cprint, colored
from modules import cache, tools
from datetime import datetime
import os
import colorama
colorama.init()

"""
┌───────────────────────────────────────────────────────────┐
│ This is a small tool to explore the content of the cache  │
│ directory.                                                │
│                                                           │
│ Usage:                                                    │
│     python3 explorer.py                                   │
│                                                           │
└───────────────────────────────────────────────────────────┘
"""

########### CONFIG ###########
log_cache_actions = False
cache_path = 'cache/'
##############################

tools.version_checks()
cache.init(cache_path, log_actions=log_cache_actions)


def filter_for_dataset(dataset_hash, items):
    """
    Return only the subset of items that is related to the dataset_hash
    """
    filtered = []
    for item in items:
        if item['file'].startswith(dataset_hash):
            filtered.append(item)
    return filtered


def show_conf_matrix(matrix):
    """
    Prints the confusion matrix
    """
    for row in matrix:
        print(' ' * 8, end='')
        for value in row:
            if type(value) == int:
                print(f'{value:8}', end='')
            else:
                print(f'{value:6.1f}', end='')
        print()


def show_args(item):
    """
    Print the formatted arguments dictionary
    """
    print('\nParameters')
    for key, value in item['args'].items():
        print('  {:15} : '.format(key[:15]), end='')
        cprint(value, 'cyan')

    if 'scores' in item:
        print('\nScores')
        for key, value in item['scores'].items():
            print('  {:15} : '.format(key[:15]), end='')
            if type(value) == dict:
                print()
                for k, v in value.items():
                    print('    {:15} : '.format(k[:15]), end='')
                    if k == 'conf_matrix':
                        show_conf_matrix(v)
                    else:
                        cprint(v, 'cyan')
                print()
            else:
                cprint(value, 'cyan')


def clear_screen():
    """
    Clears the console
    """
    os.system('cls' if os.name == 'nt' else 'clear')


def main():
    while(True):
        clear_screen()
        print("""
    ┌────────────────┐
    │ CACHE EXPLORER │
    └────────────────┘
        """)
        cache_content = cache.content()

        # show overview
        datasets = cache_content['datasets']
        datasets = sorted(datasets, key=lambda k: k['args']['title'])

        cprint(f'Datasets ({len(datasets)})', 'cyan')
        format_str = '{:3}  {:40}  {:20}  {:6}  {:6}  {}'
        cprint(format_str.format('#', 'Title',
                                 'Dataset', '#Clfs', '#Projs', 'Hash'), 'green')
        i = 0
        for d in datasets:
            # show title
            title = d['args']['title']
            # show number of items
            dataset_hash = d['file'].replace('_args.json', '')
            classifications = filter_for_dataset(
                dataset_hash, cache_content['classifiers'])
            projections = filter_for_dataset(
                dataset_hash, cache_content['projections'])
            text = format_str.format(i,
                                     title[:40],
                                     d['args']['dataset'][:20],
                                     len(classifications),
                                     len(projections),
                                     dataset_hash
                                     )
            if i % 2 == 0:
                print(text)
            else:
                cprint(text, 'white', 'on_grey')

            i += 1

        action = input(
            colored('\nAction: (s)how (d)elete (r)efresh (q)uit: ', 'yellow'))
        # refresh
        if action == 'r':
            continue

        # quit
        if action == 'q':
            print('bye!')
            clear_screen()
            exit()

        number = int(input(colored('Number of the dataset (#): ', 'yellow')))

        dataset = datasets[number]
        dataset_hash = dataset['file'].replace('_args.json', '')

        # show job
        if action == 's':
            clear_screen()
            cprint(f'Showing dataset {dataset["args"]["dataset"]}', 'cyan')

            # filter items to get only those related to the current dataset
            classifications = filter_for_dataset(
                dataset_hash, cache_content['classifiers'])
            classifications = sorted(
                classifications, key=lambda k: k['args']['title'])

            projections = filter_for_dataset(
                dataset_hash, cache_content['projections'])
            projections = sorted(
                projections, key=lambda k: k['args']['title'])

            clf_projections = filter_for_dataset(
                dataset_hash, cache_content['classifier_projections'])

            # show classifiers
            cprint(f'\nClassifiers ({len(classifications)})', 'cyan')
            cprint('{:3}  {:25}  {}'.format(
                '#', 'Title', 'Hash'), 'green')
            i = 0
            for c in classifications:
                print('{:3}  {:25}  {}'.format(i,
                                               c['args']['title'][:25],
                                               c['file'].replace('_args.json', '')))
                i += 1

            # show projections
            cprint(f'\nProjections ({len(projections)})', 'cyan')
            cprint('{:3}  {:25}  {}'.format(
                '#', 'Title', 'Hash'), 'green')
            i = 0
            for p in projections:
                print('{:3}  {:25}  {}'.format(i,
                                               p['args']['title'][:25],
                                               p['file'].replace('_args.json', '')))
                i += 1

            cprint(
                f'\nClassifier Projections ({len(clf_projections)})', 'cyan')

            # job menu
            while(True):
                action = input(
                    colored('\nAction: (s)how (d)elete (b)ack (q)uit: ', 'yellow'))
                if action == 'q':
                    print('bye!')
                    clear_screen()
                    exit()

                if action == 'b':
                    break

                try:
                    mode = input(colored(
                        '(c)lassifier (p)rojection (d)elete all classifier projections: ', 'yellow'))
                    if mode == 'd':
                        confirm = input(colored(
                            f'This will delete all classifier projections, are you sure? (Y/n): ', 'yellow'))
                        if confirm == 'y' or confirm.strip() == '':
                            cache.delete(
                                f'{dataset_hash}__clf_proj')
                            cprint('Deleted.', 'green')

                    else:
                        number = int(
                            input(colored('Number of the item (#): ', 'yellow')))
                        if mode == 'c':
                            item = classifications[number]
                        else:
                            item = projections[number]

                        #  show item
                        if action == 's':
                            show_args(item)

                        # delete item
                        elif action == 'd':
                            confirm = input(
                                colored(f'This will delete this item, are you sure? (Y/n): ', 'yellow'))
                            if confirm == 'y' or confirm.strip() == '':
                                cache.delete(
                                    item['file'].replace('_args.json', ''))
                                cprint('Deleted.', 'green')

                except Exception as e:
                    cprint(e, 'red')
                    cprint(
                        'Something went wrong, check your input and try again', 'red')

        # delete whole job
        elif action == 'd':
            confirm = input(
                f'This will delete everything related to the job {dataset["args"]["title"]} with dataset {dataset["args"]["dataset"]}, are you sure? (Y/n): ')
            if confirm == 'y' or confirm.strip() == '':
                cache.delete(dataset_hash)
                cprint('Deleted.', 'green')


if __name__ == '__main__':
    main()
