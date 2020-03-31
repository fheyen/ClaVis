import numpy
import keras
from keras.preprocessing.image import ImageDataGenerator
from keras.models import Sequential
from keras.layers import Dense, Dropout, Activation, Flatten
from keras.layers import Conv2D, MaxPooling2D
from keras.callbacks import EarlyStopping
import os
from termcolor import cprint
from ...tools import check_argument as check

'''
From https://github.com/keras-team/keras/blob/master/examples/mnist_cnn.py

Trains a simple convnet on the MNIST dataset.
Gets to 99.25% test accuracy after 12 epochs
(there is still a lot of margin for parameter tuning).
16 seconds per epoch on a GRID K520 GPU.
'''


CLF_INFO = {
    'name': 'mnist_cnn',
    'short': 'MNIST CNN',
    'description': 'MNIST Convolutional Neural Network',
    'parameters': [
        {
            'name': 'save_model',
            'description': 'Save model to file',
            'type': 'boolean',
            'default_value': False
        },
        {
            'name': 'early_stopping',
            'description': 'Early stopping',
            'type': 'boolean',
            'default_value': True
        },
        {
            'name': 'early_stopping_patience',
            'description': 'Early stopping patience',
            'type': 'integer',
            'range': [0, 1000000],
            'default_value': 10
        },
        {
            'name': 'epochs',
            'description': 'Epochs',
            'type': 'integer',
            'range': [0, 10000],
            'default_value': 20
        },
        {
            'name': 'steps_per_epoch',
            'description': 'Steps per epoch',
            'type': 'integer',
            'range': [0, 1000000],
            'default_value': 1000
        },
        {
            'name': 'batch_size',
            'description': 'Batch size',
            'type': 'integer',
            'range': [0, 100000],
            'default_value': 32
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
        self.title = args['title']

        # check all params and save them
        self.save_model = check('save_model', args, CLF_INFO)

        self.epochs = check('epochs', args, CLF_INFO)
        self.early_stopping = check('early_stopping', args, CLF_INFO)
        self.early_stopping_patience = check(
            'early_stopping_patience', args, CLF_INFO)

        self.steps_per_epoch = check('steps_per_epoch', args, CLF_INFO)
        self.batch_size = check('batch_size', args, CLF_INFO)

        self.random_state = check('random_state', args, CLF_INFO)

        # save data parameters
        self.job_title = data_specs['job_title']
        self.dataset_name = data_specs['dataset_name']
        self.num_classes = data_specs['num_classes']
        self.original_shape = data_specs['original_shape']
        if len(self.original_shape) == 3:
            # Conv layer needs 4 dimensions
            self.original_shape += (1,)

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        numpy.random.seed(self.random_state)
        cprint('Number of classes: {}'.format(self.num_classes), 'cyan')

        # reshape data back to original
        new_shape = (len(X_train),) + self.original_shape[1:]
        cprint('Scaling and reshaping to {}'.format(new_shape), 'cyan')
        X_train = X_train.astype('float32')
        X_train /= 255
        X_train = X_train.reshape(new_shape)

        # convert class vectors to binary class matrices.
        y_train = keras.utils.to_categorical(y_train, self.num_classes)

        # model architecture
        model = Sequential()
        model.add(Conv2D(32, kernel_size=(3, 3),
                         activation='relu',
                         input_shape=X_train.shape[1:]))
        model.add(Conv2D(64, (3, 3), activation='relu'))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))
        model.add(Flatten())
        model.add(Dense(128, activation='relu'))
        model.add(Dropout(0.5))
        model.add(Dense(self.num_classes, activation='softmax'))

        # compile model
        model.compile(loss=keras.losses.categorical_crossentropy,
                      optimizer=keras.optimizers.Adadelta(),
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

        # train model
        self.history = model.fit(X_train, y_train,
                                 batch_size=self.batch_size,
                                 epochs=self.epochs,
                                 validation_split=0.2,
                                 shuffle=True,
                                 callbacks=callbacks)
        self.clf = model

        # save model and weights
        if self.save_model:
            save_dir = os.path.join(
                os.getcwd(), 'saved_models', self.job_title)
            if not os.path.isdir(save_dir):
                os.makedirs(save_dir)
            model_path = os.path.join(save_dir, f'{self.title}.h5')
            model.save(model_path)
            cprint('Saved trained model at {}'.format(model_path), 'green')

    def get_history(self):
        return self.history.history

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
