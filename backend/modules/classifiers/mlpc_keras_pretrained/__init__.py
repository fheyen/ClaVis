from keras.models import load_model
from termcolor import cprint
from ...tools import check_argument as check


CLF_INFO = {
    'name': 'mlpc_keras_pretrained',
    'short': 'MLPC (k pre)',
    'description': 'Multi-layer Perceptron (Keras pretrained)',
    'parameters': [
        {
            'name': 'model_file',
            'description': 'Path of the saved model',
            'type': 'string',
            # path relative to batch.py
            'default_value': './saved_models/model.h5'
        }
    ]
}


def get_clf(args, data_specs):
    return Classifier(args, data_specs)


def get_info():
    return CLF_INFO


class Classifier():
    def __init__(self, args, data_specs):
        self.title = args['title']

        # check all params and save them
        self.model_file = check('model_file', args, CLF_INFO)

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        try:
            cprint('Loading model from file {}'.format(self.model_file), 'cyan')
            self.clf = load_model(self.model_file)
        except Exception as e:
            cprint(e, 'red')
            raise

    def predict(self, X_test, y_test):
        return self.clf.predict_classes(X_test)

    def predict_proba(self, X_test, y_test):
        return self.clf.predict_proba(X_test)
