from sklearn.gaussian_process import GaussianProcessClassifier
from ...tools import check_argument as check


CLF_INFO = {
    'name': 'gaussianprocess',
    'short': 'GP',
    'description': 'Gaussian Process Classifier',
    'parameters': [
        {
            'name': 'random_state',
            'description': 'Random seed',
            'type': 'integer',
            'range': [0, 1000000],
            'default_value': 0
        }
    ]
}


def get_clf(args, data_specs):
    return Classifier(args, data_specs)


def get_info():
    return CLF_INFO


class Classifier():
    def __init__(self, args, data_specs):
        random_state = check('random_state', args, CLF_INFO)

        self.clf = GaussianProcessClassifier(random_state=random_state)

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        return self.clf.fit(X_train, y_train)

    def predict(self, X_test, y_test):
        return self.clf.predict(X_test)

    def predict_proba(self, X_test, y_test):
        return self.clf.predict_proba(X_test)
