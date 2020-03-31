import numpy as np

CLF_INFO = {
    'name': 'optimal_multi_label',
    'short': 'Optimal',
    'description': 'Optimal classifier that labels each sample with the correct label by cheating (multi-label version)',
    'parameters': None
}


def get_clf(args, data_specs):
    return Classifier(args, data_specs)


def get_info():
    return CLF_INFO


class Classifier():
    def __init__(self, args, data_specs):
        self.num_classes = data_specs['num_classes']

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        pass

    def predict(self, X_test, y_test):
        # simply return the correct labels
        return y_test

    def predict_proba(self, X_test, y_test):
        return y_test
