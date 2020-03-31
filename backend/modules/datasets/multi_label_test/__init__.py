from sklearn.datasets import make_multilabel_classification as make_ml_cl
import numpy as np
from termcolor import cprint

"""
Generates a dataset with multiple labels per sample, the format is like this:

Example with 3 classes:
    y_test = [
        [0, 1, 0], # only class 1
        [1, 1, 0], # classes 0 and 1
        [0, 0, 0], # no class assigned
        [1, 1, 1], # all classes assigned
        ...
    ]
"""

NUM_CLASSES = 4


def get_info():
    return {
        'name': 'multi_label_test',
        'description': 'Multi-label Generated Dataset',
        'class_names': [x for x in range(NUM_CLASSES)]
    }


def get_data(datasets_path):
    X, y = make_ml_cl(n_samples=500,
                      n_features=20,
                      n_classes=NUM_CLASSES,
                      n_labels=2,
                      length=50,
                      allow_unlabeled=True,
                      # TODO: test sparse=True
                      sparse=False,
                      return_indicator='dense',
                      random_state=42)

    return {
        'X_train': np.array(X),
        'y_train': np.array(y),
        'X_test': np.array([]),
        'y_test': np.array([]),
        'class_names': [x for x in range(NUM_CLASSES)]
    }
