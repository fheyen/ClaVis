from sklearn.naive_bayes import GaussianNB
from ...tools import check_argument as check


CLF_INFO = {
    'name': 'gaussiannb',
    'short': 'GNB',
    'description': 'Gaussian Naive Bayes',
    'parameters': None
}


def get_clf(args, data_specs):
    return Classifier(args, data_specs)


def get_info():
    return CLF_INFO


class Classifier():
    def __init__(self, args, data_specs):
        self.clf = GaussianNB()

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        return self.clf.fit(X_train, y_train)

    def predict(self, X_test, y_test):
        return self.clf.predict(X_test)

    def predict_proba(self, X_test, y_test):
        return self.clf.predict_proba(X_test)
