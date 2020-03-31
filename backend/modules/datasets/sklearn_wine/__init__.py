from sklearn import datasets
import numpy as np


def get_info():
    return {
        'name': 'sklearn_wine',
        'description': 'ScikitLearn | Wine',
        'class_names': [str(i) for i in range(1, 4)]
    }


def get_data(datasets_path):
    data = datasets.load_wine()

    return {
        'X_train': np.array(data.data),
        'y_train': np.array(data.target),
        'X_test': np.array([]),
        'y_test': np.array([]),
        'class_names': [str(i) for i in range(1, 4)]
    }
