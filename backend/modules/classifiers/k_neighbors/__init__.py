from sklearn.neighbors import KNeighborsClassifier
from ...tools import check_argument as check


CLF_INFO = {
    'name': 'kneighbors',
    'short': 'KNN',
    'description': 'k Nearest Neighbors Classifier',
    'parameters': [
        {
            'name': 'n_neighbors',
            'description': 'Number of neighbors',
            'type': 'integer',
            'range': [1, 1000],
            'default_value': 5
        }
    ]
}


def get_clf(args, data_specs):
    return Classifier(args, data_specs)


def get_info():
    return CLF_INFO


class Classifier():
    def __init__(self, args, data_specs):
        n_neighbors = check('n_neighbors', args, CLF_INFO)

        self.clf = KNeighborsClassifier(n_neighbors=n_neighbors, n_jobs=-1)

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        return self.clf.fit(X_train, y_train)

    def predict(self, X_test, y_test):
        return self.clf.predict(X_test)

    def predict_proba(self, X_test, y_test):
        return self.clf.predict_proba(X_test)
