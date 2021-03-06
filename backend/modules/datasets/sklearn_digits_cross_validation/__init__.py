from sklearn import datasets
import numpy as np


def get_info():
    return {
        'name': 'sklearn_digits_cross_validation',
        'description': 'ScikitLearn | Digits (Cross Validation)',
        'class_names': [str(i) for i in range(10)]
    }


def get_data(datasets_path):
    digits = datasets.load_digits(n_class=10)

    # cross validation folds
    n_folds = 4
    cv_folds = np.array([i % n_folds for i in range(len(digits.data))])

    return {
        'X_train': np.array(digits.data),
        'y_train': np.array(digits.target),
        'X_test': np.array([]),
        'y_test': np.array([]),
        'class_names': [str(i) for i in range(10)],
        # CNNs need to know the original shape
        # This is not the shape in the dataset but the shape of the images
        'specs': {
            'original_shape': (digits.data.shape[0],) + (8, 8),
            'cv_folds': cv_folds
        }
    }
