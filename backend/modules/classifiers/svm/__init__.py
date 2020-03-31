from sklearn import svm
from ...tools import check_argument as check


CLF_INFO = {
    'name': 'svm',
    'short': 'SVM',
    'description': 'Support Vector Machine',
    'parameters': [
        {
            'name': 'kernel',
            'description': 'Kernel',
            'type': 'string',
            'range': ['linear', 'poly', 'rbf', 'sigmoid'],
            'default_value': 'rbf'
        },
        {
            'name': 'degree',
            'description': 'Degree',
            'type': 'integer',
            'range': [0, 10],
            'default_value': 3
        },
        {
            'name': 'C',
            'description': 'Penalty (C)',
            'type': 'float',
            'range': [0, 100],
            'default_value': 1.0
        },
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
        kernel = check('kernel', args, CLF_INFO)
        degree = check('degree', args, CLF_INFO)
        C = check('C', args, CLF_INFO)

        self.clf = svm.SVC(C=C,
                           kernel=kernel,
                           degree=degree,
                           gamma='scale',
                           random_state=random_state)

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        return self.clf.fit(X_train, y_train)

    def predict(self, X_test, y_test):
        return self.clf.predict(X_test)

    def decision_function(self, X_test, y_test):
        return self.clf.decision_function(X_test)
