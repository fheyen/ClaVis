from sklearn.decomposition import PCA
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn import manifold
import umap
from . import tools, cache, classification
from .tools import check_arg as check
import numpy as np
from scipy.spatial import distance
from termcolor import cprint
import json


def get_projection(args):
    """
    Returns a projection as specified in args.

    Keyword arguments:
    - args: arguments as dict

    Returns:
    - a projection object with fit_transform(X) method
    """
    # get and check arguments
    method = args['method']
    random_state = args['random_state']
    check('random_state', random_state, int, (0, 100000))

    # does not work when flask (main.py) is used, only with batch_job.py
    # -1 means using all processors
    jobs = -1
    n_components = 2

    if method == 'pca':
        return PCA(n_components,
                   random_state=random_state)

    elif method == 'mds':
        return manifold.MDS(n_components,
                            random_state=random_state,
                            n_jobs=jobs)

    elif method == 'isomap':
        n_neighbors = check('n_neighbors', args['n_neighbors'], int, (1, 1000))
        return manifold.Isomap(n_neighbors=n_neighbors,
                               n_components=n_components,
                               n_jobs=jobs)

    elif method == 'spectral_embedding':
        return manifold.SpectralEmbedding(n_components=n_components,
                                          random_state=random_state,
                                          n_jobs=jobs)

    elif method == 'tsne':
        perplexity = check('perplexity', args['perplexity'], float, (1, 100))
        # return manifold.TSNE(n_components=n_components, perplexity=perplexity, verbose=2, random_state=random_state)
        return manifold.TSNE(n_components=n_components,
                             perplexity=perplexity,
                             random_state=random_state)

    elif method == 'lle':
        lle_method = check('lle_method', args['lle_method'], str,
                           ('standard', 'ltsa', 'hessian', 'modified'))
        n_neighbors = check(
            'n_neighbors', args['n_neighbors'], int, (1, 1000))
        return manifold.LocallyLinearEmbedding(n_neighbors,
                                               n_components,
                                               eigen_solver='auto',
                                               method=lle_method,
                                               random_state=random_state)

    elif method == 'umap':
        # https://umap-learn.readthedocs.io/en/latest/api.html
        n_neighbors = check(
            'n_neighbors', args['n_neighbors'], int, (1, 1000))
        min_dist = check(
            'min_dist', args['min_dist'], float, (0, 1000))
        spread = check('spread', args['spread'], float, (0, 1000))
        metric = check('metric', args['metric'], str, [
            'euclidean', 'manhattan', 'chebyshev', 'minkowski', 'canberra',
            'braycurtis', 'mahalanobis', 'wminkowski', 'seuclidean', 'cosine',
            'correlation', 'haversine', 'hamming', 'jaccard', 'dice',
            'russelrao', 'kulsinski', 'rogerstanimoto', 'sokalmichener',
            'sokalsneath', 'yule'])
        # return umap.UMAP(n_neighbors=n_neighbors, min_dist=min_dist, spread=spread, metric=metric, verbose=True, random_state=random_state)
        return umap.UMAP(n_neighbors=n_neighbors,
                         min_dist=min_dist,
                         spread=spread,
                         metric=metric,
                         random_state=random_state)

    else:
        raise Exception(f'Invalid projection method parameter "{method}"!')


def project(proj_args, proj_cache, data_bundle):
    """
    Projects the data.

    Keyword arguments:
    - proj_args: projection arguments as dict
    - proj_cache: hash of the projection args
    - data_bundle: data to project given as dict
        (format as output from dataset plugins)

    Side effects:
    - caches the projection
    """
    if 'title' in proj_args:
        cprint(f'  Title: {proj_args["title"]}', 'cyan')
    print(f'  Method: {proj_args["method"]} ...')
    print(f'  Args:\n{json.dumps(proj_args, sort_keys=False, indent=4)}')
    try:
        proj = get_projection(proj_args)

        X_train = data_bundle['X_train']
        X_test = data_bundle['X_test']

        # fit on train and test (therefore combine them)
        train_len = len(X_train)
        if len(X_test) == 0:
            X_combined = X_train
        else:
            X_combined = np.concatenate((X_train, X_test), axis=0)

        # transform together
        transformed = proj.fit_transform(X_combined)

        # then cut
        X_train_trans = transformed[:train_len]
        X_test_trans = transformed[train_len:]

        # bundle only what is needed (e.g. not the original data)
        proj_bundle = {
            'type': 'data',
            'hash': data_bundle['hash'],
            'X_train': tools.tolist(X_train_trans),
            'y_train': tools.tolist(data_bundle['y_train']),
            'X_test': tools.tolist(X_test_trans),
            'y_test': tools.tolist(data_bundle['y_test']),
            'class_names': tools.tolist(data_bundle['class_names']),
            'shape_train': X_train.shape,
            'shape_test': X_test.shape
        }

        cache.write(proj_cache, proj_bundle)
        cache.write_dict_json(f'{proj_cache}_args', proj_args)

    except Exception as e:
        cprint('Error while projecting with {}'.format(
            proj_args['method']), 'red')
        cprint(e, 'red')
        raise


def get_clf_distances(data_flat, distance_function='euclidean'):
    """
    Computes the distance matrix between all classifiers
    (their predictions, probabilities, ...) given as an array
    with shape (num_clfs, num_values_per_clf).

    Distances are normalized to [0, 1]

    Only values for entries where i > j will be calculated since
    distances are symmetric.

    Keyword arguments:
    - data_flat: 2D array with shape (num_clfs, num_values_per_clf)
    - distance_function: distance function, one of euclidean, cosine,
        correlation, hamming

    Returns:
    - distances: distance matrix, normalized to [0, 1]
    """
    print(f'  Calculating distances with metric {distance_function}')
    try:
        distances = []
        max_dist = 0
        n = range(len(data_flat))
        # calculate distance matrix
        distances = []
        for i in n:
            # do not create the full matrix (since it is symmetric)
            row = [0 for _ in range(i)]
            distances.append(row)
            d_i = data_flat[i]
            for j in n:
                if i > j:
                    try:
                        if distance_function == 'euclidean':
                            dist = distance.euclidean(d_i, data_flat[j])
                        elif distance_function == 'cosine':
                            dist = distance.cosine(d_i, data_flat[j])
                        elif distance_function == 'correlation':
                            dist = distance.correlation(d_i, data_flat[j])
                        elif distance_function == 'hamming':
                            dist = distance.hamming(d_i, data_flat[j])
                        distances[i][j] = dist
                        if dist > max_dist:
                            max_dist = dist
                    except:
                        # TODO:fix bug with some data
                        # print(d_i)
                        # print(data_flat[j])
                        # print(d_i.shape)
                        # print(data_flat[j].shape)
                        # print(i, j)
                        raise
        # normalize distances to [0, 1]
        if max_dist > 0:
            distances = [[x / max_dist for x in row] for row in distances]
        return distances
    except Exception as e:
        cprint('Projection.py get_clfs_distances: Cannot calculate distances!', 'red')
        cprint(e, 'red')
        return [[0 for _ in range(i)] for i in n]


def all_clf_projections_cached(confs, base_conf, data_cache, cache_entries):
    """
    Checks if all classifier projections are already cached
    """
    for data_type in confs['data_types']:
        for use_t in confs['use_training_data']:
            for clf_proj in confs['projections']:
                clf_proj_args = base_conf.copy()
                clf_proj_args['data_type'] = data_type
                clf_proj_args['use_training_data'] = use_t
                clf_proj_args['projection'] = clf_proj
                clf_proj_args['projection']['random_state'] = 42
                # check cache
                clf_proj_cache = f'{data_cache}__clf_proj_{tools.hash(clf_proj_args)}'
                if clf_proj_cache not in cache_entries:
                    return False
    return True


def batch_project_classifiers(args):
    """
    Projects classifiers with multiple projection configurations at once.
    This saves time, as most time is spent loading classification results
    from cache while projecting is relatively fast.
    """
    cprint('Projecting classifiers', 'cyan')
    classifiers = args['classifier_hashes']

    confs = {
        'use_training_data': [True, False],
        'data_types': ['scores', 'pred_proba'],
        'projections': [
            {
                'title': 'PCA',
                'method': 'pca'
            },
            {
                'title': 'MDS',
                'method': 'mds'
            },
            {
                'title': 't-SNE p20',
                'method': 'tsne',
                'perplexity': 20.0
            },
            {
                'title': 't-SNE p30',
                'method': 'tsne',
                'perplexity': 30.0
            }
        ]
    }

    # create all projection configs and check cache for all of them
    projs = []
    cache_entries = cache.entries()
    base_conf = {
        'action': 'project_classifiers',
        'classifier_hashes': classifiers,
        'data_hash': args['data_hash'],
        'projection': None,
        'data_type': None,
        'use_training_data': None
    }

    all_cached = all_clf_projections_cached(
        confs, base_conf, args["data_hash"], cache_entries)

    # read clfs and and optimal clf if projections are not all cached already
    if not all_cached:
        cprint(
            f'Loading {len(classifiers)} classification results from cache', 'cyan')
        clfs = []
        current = 1
        for c in classifiers:
            # read clf bundle and prediction bundle
            clf = cache.read(c)
            pred = cache.read(f'{c}_proba')
            # merge bundles
            clf = {**clf, **pred}
            clfs.append(clf)
            print(current, end='\r')
            current += 1

    # create all projections that are missing
    errors = 0
    done = 0
    cached = 0
    for data_type in confs['data_types']:
        for use_train in confs['use_training_data']:
            if not all_cached:
                # get data
                cprint(
                    f'\n\nPreparing data for\n  data_type: {data_type}\n  use_train: {use_train}', 'cyan')
                data = []
                if data_type == 'scores':
                    data = []
                    for c in clfs:
                        data.append([
                            c['test_scores']['accuracy'],
                            c['pred_time']
                        ])
                elif data_type == 'pred_proba':
                    data = [c['y_pred_proba_test'] for c in clfs]
                else:
                    raise Exception(
                        f'Wrong data type! Must be in ["scores", "conf_matrix", "pred_proba", "pred"] but was {data_type}')
                data = np.array(data)
                data = data.reshape(data.shape[0], -1)
                if use_train:
                    # append training predictions to each test prediction
                    if data_type == 'scores':
                        data2 = []
                        for c in clfs:
                            data2.append([
                                c['train_scores']['accuracy'],
                                c['clf_time']
                            ])
                    else:
                        data2 = [c['y_pred_proba_train'] for c in clfs]
                    data2 = np.array(data2)
                    data2 = data2.reshape(data2.shape[0], -1)
                    # fix errors with cross validation
                    if data2.shape[1] > 1:
                        data = np.concatenate((data, data2), axis=1)
                    else:
                        print('Training result set is empty, data shape:')
                        print(data2.shape)

                # flatten data to get a vector
                data_flat = data.reshape(data.shape[0], -1)

                # get distances
                distances = get_clf_distances(data_flat)

            # run all projections for the current data_type and use_train values
            for clf_proj in confs['projections']:
                clf_proj_args = base_conf.copy()
                clf_proj_args['projection'] = clf_proj
                clf_proj_args['projection']['random_state'] = 42
                clf_proj_args['data_type'] = data_type
                clf_proj_args['use_training_data'] = use_train

                # check cache
                # TODO: add hashed clfs hashes to hash
                # clf_hashes = args['classifier_hashes']
                # clf_hashes_hash = tools.hash({'ch': clf_hashes})

                clf_proj_cache = f'{args["data_hash"]}__clf_proj_{tools.hash(clf_proj_args)}'

                if clf_proj_cache in cache_entries:
                    projs.append(cache.read(clf_proj_cache))
                    cached += 1
                else:
                    try:
                        # project
                        cprint(
                            f'Projecting with: {clf_proj["method"]}', 'cyan')
                        proj = get_projection(clf_proj)
                        transformed = proj.fit_transform(data_flat)

                        clf_proj_bundle = {
                            'type': 'projected_classifiers',
                            'projected_data': tools.tolist(transformed),
                            'clf_hashes': [c['hash'] for c in clfs],
                            'use_training_data': use_train,
                            'data_type': data_type,
                            'projection': clf_proj,
                            'distances': tools.tolist(distances)
                        }

                        # write to cache
                        cache.write(clf_proj_cache, clf_proj_bundle)
                        # TODO: do we need the arguments?
                        cache.write_dict_json(
                            f'{clf_proj_cache}_args', clf_proj_args)

                        projs.append(clf_proj_bundle)
                        done += 1
                    except Exception as e:
                        cprint(e, 'red')
                        errors += 1
                        # raise

    cprint(
        f'\nCreated {done} new classifier projections, {cached} were already cached', 'green')
    if errors > 0:
        cprint(f'{errors} errors', 'red')

    # TODO:
    # return {
    #     'projections': projs,
    #     'distances': dists
    # }
    return projs


def info():
    """
    Lists all projections, parameters, types, ranges and defaults.
    """
    return {
        'type': 'info',
        'message': 'List of all projections and their parameters.',
        'methods': [
            {
                'name': 'pca',
                'short': 'PCA',
                'description': 'Principal Component Analysis',
                'parameters': None
            },
            {
                'name': 'mds',
                'short': 'MDS',
                'description': 'Multi-dimensional Scaling',
                'parameters': None
            },
            {
                'name': 'lle',
                'short': 'LLE',
                'description': 'Locally Linear Embedding',
                'parameters': [
                    {
                        'name': 'lle_method',
                        'description': 'LLE method',
                        'type': 'string',
                        'range': ['standard', 'ltsa', 'hessian', 'modified'],
                        'default_value': 'standard'
                    },
                    {
                        'name': 'n_neighbors',
                        'description': 'Number of neighbors',
                        'type': 'integer',
                        'range': [1, 1000],
                        'default_value': 10
                    }
                ]
            },
            {
                'name': 'isomap',
                'short': 'Isomap',
                'description': 'Isomap',
                'parameters': [
                    {
                        'name': 'n_neighbors',
                        'description': 'Number of neighbors',
                        'type': 'integer',
                        'range': [1, 1000],
                        'default_value': 10
                    }
                ]
            },
            {
                'name': 'spectral_embedding',
                'short': 'SE',
                'description': 'Spectral Embedding',
                'parameters': None
            },
            {
                'name': 'tsne',
                'short': 't-SNE',
                'description': 'T-distributed Stochastic Neighbor Embedding',
                'parameters': [
                    {
                        'name': 'perplexity',
                        'description': 'Perplexity',
                        'type': 'float',
                        'range': [1, 100],
                        'default_value': 50
                    }
                ]
            },
            {
                'name': 'umap',
                'short': 'UMAP',
                'description': 'Uniform Manifold Approximation and Projection',
                'parameters': [
                    {
                        'name': 'n_neighbors',
                        'description': 'Number of neighbors',
                        'type': 'integer',
                        'range': [2, 100],
                        'default_value': 15
                    },
                    {
                        'name': 'min_dist',
                        'description': 'Minimum distance',
                        'type': 'float',
                        'range': [0, 100],
                        'default_value': 0.1
                    },
                    {
                        'name': 'spread',
                        'description': 'Spread',
                        'type': 'float',
                        'range': [0, 100],
                        'default_value': 1.0
                    },
                    {
                        'name': 'metric',
                        'description': 'Metric',
                        'type': 'string',
                        'range': [
                            'euclidean',
                            'manhattan',
                            'chebyshev',
                            'minkowski',
                            'canberra',
                            'braycurtis',
                            'mahalanobis',
                            'wminkowski',
                            'seuclidean',
                            'cosine',
                            'correlation',
                            'haversine',
                            'hamming',
                            'jaccard',
                            'dice',
                            'russelrao',
                            'kulsinski',
                            'rogerstanimoto',
                            'sokalmichener',
                            'sokalsneath',
                            'yule'
                        ],
                        'default_value': 'euclidean'
                    }
                ]
            }
        ]
    }
