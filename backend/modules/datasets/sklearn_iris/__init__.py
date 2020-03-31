from sklearn import datasets
import numpy as np


def get_info():
    return {
        'name': 'sklearn_iris',
        'description': 'ScikitLearn | Iris',
        'class_names': ['Iris Setosa', 'Iris Versicolor', 'Iris Virginica']
    }


def get_data(datasets_path):
    data = datasets.load_iris()

    return {
        'X_train': np.array(data.data),
        'y_train': np.array(data.target),
        'X_test': np.array([]),
        'y_test': np.array([]),
        'class_names': ['Iris Setosa', 'Iris Versicolor', 'Iris Virginica']
    }
