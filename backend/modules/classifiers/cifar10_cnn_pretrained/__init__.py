from keras.models import load_model
from termcolor import cprint
from ...tools import check_argument as check


CLF_INFO = {
    'name': 'cifar10_cnn_pretrained',
    'short': 'C10 CNN (pre-tr)',
    'description': 'Cifar10 Convolutional Neural Network (pretrained)',
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

        # save data parameters
        self.original_shape = data_specs['original_shape']
        if len(self.original_shape) == 3:
            # Conv layer needs 4 dimensions
            self.original_shape += (1,)

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
        # same format as X_train
        X_test = X_test.astype('float32')
        X_test /= 255

        # adapt shape for test set
        new_shape = (len(X_test),) + self.original_shape[1:]
        X_test = X_test.reshape(new_shape)

        return self.clf.predict_classes(X_test)

    def predict_proba(self, X_test, y_test):
        # same format as X_train
        X_test = X_test.astype('float32')
        X_test /= 255

        # adapt shape for test set
        new_shape = (len(X_test),) + self.original_shape[1:]
        X_test = X_test.reshape(new_shape)

        return self.clf.predict_proba(X_test)
