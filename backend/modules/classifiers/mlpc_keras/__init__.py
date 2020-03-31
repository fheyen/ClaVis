import os
import numpy
from keras.models import Sequential
from keras.layers import Dropout, Dense, Activation
from keras import optimizers
from keras.callbacks import EarlyStopping
from termcolor import cprint
from ...tools import check_argument as check


CLF_INFO = {
    'name': 'mlpc_keras',
    'short': 'MLPC (k)',
    'description': 'Multi-layer Perceptron (Keras)',
    'parameters': [
        {
            'name': 'save_model',
            'description': 'Save model to file',
            'type': 'boolean',
            'default_value': False
        },
        {
            'name': 'activation',
            'description': 'Activation function',
            'type': 'string',
            'range': ['softmap', 'elu', 'selu', 'softplus', 'softsign', 'relu', 'tanh', 'sigmoid', 'hard_sigmoid', 'exponential', 'linear'],
            'default_value': 'relu'
        },
        {
            'name': 'hidden_layer_sizes',
            'description': 'Layer sizes',
            'type': 'array',
            'default_value': [100, 100]
        },
        # Allow to specify layers of the same size via a short string
        # Format: <n_layers>x<n_neurons>
        {
            'name': 'hidden_layer_sizes_short',
            'description': 'Layer sizes as string',
            'type': 'string',
            'range': [],
            'default_value': '2x100'
        },
        {
            'name': 'optimizer',
            'description': 'Optimizer',
            'type': 'string',
            'range': ['sgd', 'rmsprop', 'adagrad', 'adadelta', 'adam', 'adamax', 'nadam'],
            'default_value': 'adam'
        },
        {
            'name': 'learning_rate_init',
            'description': 'Initial learning rate',
            'type': 'float',
            'range': [0, 1],
            'default_value': 0.001
        },
        {
            'name': 'dropout',
            'description': 'Dropout',
            'type': 'float',
            'range': [0, 1],
            'default_value': 0.5
        },
        {
            'name': 'batch_size',
            'description': 'Batch size',
            'type': 'integer',
            'range': [1, 512],
            'default_value': 64
        },
        {
            'name': 'epochs',
            'description': 'Epochs',
            'type': 'integer',
            'range': [0, 10000],
            'default_value': 50
        },
        {
            'name': 'early_stopping',
            'description': 'Early stopping',
            'type': 'boolean',
            'default_value': False
        },
        {
            'name': 'early_stopping_patience',
            'description': 'Early stopping patience',
            'type': 'integer',
            'range': [0, 1000000],
            'default_value': 10
        },
        {
            'name': 'random_state',
            'description': 'Random seed',
            'type': 'integer',
            'range': [0, 1000000],
            'default_value': 0
        },
        {
            'name': 'verbose',
            'description': 'Verbosity',
            'type': 'integer',
            'range': [0, 10],
            'default_value': 1
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

        self.save_model = check('save_model', args, CLF_INFO)
        self.optimizer = check('optimizer', args, CLF_INFO)
        self.activation = check('activation', args, CLF_INFO)
        self.learning_rate_init = check('learning_rate_init', args, CLF_INFO)
        self.dropout = check('dropout', args, CLF_INFO)
        self.batch_size = check('batch_size', args, CLF_INFO)

        self.epochs = check('epochs', args, CLF_INFO)
        self.early_stopping = check('early_stopping', args, CLF_INFO)
        self.early_stopping_patience = check(
            'early_stopping_patience', args, CLF_INFO)

        self.random_state = check('random_state', args, CLF_INFO)
        self.verbose = check('verbose', args, CLF_INFO)

        # allow shortcut string for layer sizes
        if 'hidden_layer_sizes_short' in args:
            cprint(
                f'Using layer size template {args["hidden_layer_sizes_short"]}', 'cyan')
            hidden_layer_sizes_short = check(
                'hidden_layer_sizes_short', args, CLF_INFO)
            split = hidden_layer_sizes_short.split('x')
            n_layers = int(split[0])
            n_neurons = int(split[1])
            self.hidden_layer_sizes = [n_neurons for _ in range(n_layers)]
        else:
            self.hidden_layer_sizes = check(
                'hidden_layer_sizes', args, CLF_INFO)

        # save data parameters
        self.job_title = data_specs['job_title']
        self.dataset_name = data_specs['dataset_name']
        self.num_classes = data_specs['num_classes']

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        validation_split = 0.2

        numpy.random.seed(self.random_state)

        # create optimizer based on argument and initial learning rate
        if self.optimizer == 'sgd':
            opt = optimizers.SGD(lr=self.learning_rate_init)
        if self.optimizer == 'rmsprop':
            opt = optimizers.RMSprop(lr=self.learning_rate_init)
        if self.optimizer == 'adagrad':
            opt = optimizers.Adagrad(lr=self.learning_rate_init)
        if self.optimizer == 'adadelta':
            opt = optimizers.Adadelta(lr=self.learning_rate_init)
        if self.optimizer == 'adam':
            opt = optimizers.Adam(lr=self.learning_rate_init)
        if self.optimizer == 'adamax':
            opt = optimizers.Adamax(lr=self.learning_rate_init)
        if self.optimizer == 'nadam':
            opt = optimizers.Nadam(lr=self.learning_rate_init)

        # network architecture
        model = Sequential()
        model.add(Dense(self.hidden_layer_sizes[0],
                        activation=self.activation,
                        input_dim=X_train.shape[1]))
        model.add(Dropout(self.dropout))

        for layer_size in self.hidden_layer_sizes[1:]:
            model.add(Dense(layer_size,
                            activation=self.activation))
            model.add(Dropout(self.dropout))

        # output layer
        model.add(Dense(self.num_classes, activation='softmax'))

        model.compile(loss='sparse_categorical_crossentropy',
                      optimizer=opt,
                      metrics=['accuracy'])

        # early stopping
        callbacks = None
        if self.early_stopping:
            cprint(
                f'Using early stopping with patience {self.early_stopping_patience}', 'green')
            early_stopping = EarlyStopping(monitor='val_loss',
                                           patience=self.early_stopping_patience,
                                           restore_best_weights=True,
                                           verbose=2)
            callbacks = [early_stopping]
        else:
            cprint('Not using early stopping', 'yellow')

        # train network
        self.clf = model
        self.history = model.fit(X_train,
                                 y_train,
                                 batch_size=self.batch_size,
                                 epochs=self.epochs,
                                 verbose=self.verbose,
                                 validation_split=validation_split,
                                 callbacks=callbacks)

        # save model and weights
        if self.save_model:
            save_dir = os.path.join(
                os.getcwd(), 'saved_models', self.job_title)
            if not os.path.isdir(save_dir):
                os.makedirs(save_dir)
            model_path = os.path.join(save_dir, f'{self.title}.h5')
            model.save(model_path)
            cprint(f'Saved trained model at {model_path}', 'green')

    def get_history(self):
        return self.history.history

    def predict(self, X_test, y_test):
        return self.clf.predict_classes(X_test)

    def predict_proba(self, X_test, y_test):
        return self.clf.predict_proba(X_test)
