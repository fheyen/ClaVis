from sklearn import datasets
import numpy as np


def get_info():
    return {
        'name': 'sklearn_breast_cancer',
        'description': 'ScikitLearn | Breast Cancer',
        'class_names': ['malignant', 'benign']
    }


def get_data(datasets_path):
    data = datasets.load_breast_cancer()

    return {
        'X_train': np.array(data.data),
        'y_train': np.array(data.target),
        'X_test': np.array([]),
        'y_test': np.array([]),
        'class_names': ['malignant', 'benign']
    }
