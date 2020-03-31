import numpy
import keras
from keras.preprocessing.image import ImageDataGenerator
from keras.models import Sequential
from keras.layers import Dense, Dropout, Activation, Flatten
from keras.layers import Conv2D, MaxPooling2D
from keras.callbacks import EarlyStopping
import os
from ...tools import check_argument as check
from termcolor import cprint

"""
From https://keras.io/examples/cifar10_cnn/
"""

CLF_INFO = {
    'name': 'cifar10_cnn',
    'short': 'C10 CNN',
    'description': 'Cifar10 Convolutional Neural Network',
    'parameters': [
        {
            'name': 'save_model',
            'description': 'Save model to file',
            'type': 'boolean',
            'default_value': False
        },
        {
            'name': 'data_augmentation',
            'description': 'Data augmentation',
            'type': 'boolean',
            'default_value': True
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

        self.data_augmentation = check('data_augmentation', args, CLF_INFO)

        self.epochs = check('epochs', args, CLF_INFO)
        self.steps_per_epoch = check('steps_per_epoch', args, CLF_INFO)
        self.early_stopping = check('early_stopping', args, CLF_INFO)
        self.early_stopping_patience = check(
            'early_stopping_patience', args, CLF_INFO)

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
        print('Number of classes: {}'.format(self.num_classes))

        # Reshape data back to original
        new_shape = (len(X_train),) + self.original_shape[1:]
        cprint('Scaling and reshaping to {}'.format(new_shape))
        X_train = X_train.astype('float32')
        X_train /= 255
        X_train = X_train.reshape(new_shape)

        # Convert class vectors to binary class matrices.
        y_train = keras.utils.to_categorical(y_train, self.num_classes)

        # model architecture
        model = Sequential()
        model.add(Conv2D(32, (3, 3), padding='same',
                         input_shape=X_train.shape[1:]))
        model.add(Activation('relu'))
        model.add(Conv2D(32, (3, 3)))
        model.add(Activation('relu'))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))

        model.add(Conv2D(64, (3, 3), padding='same'))
        model.add(Activation('relu'))
        model.add(Conv2D(64, (3, 3)))
        model.add(Activation('relu'))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))

        model.add(Flatten())
        model.add(Dense(512))
        model.add(Activation('relu'))
        model.add(Dropout(0.5))
        model.add(Dense(self.num_classes))
        model.add(Activation('softmax'))

        # optimizer
        opt = keras.optimizers.rmsprop(lr=0.0001, decay=1e-6)

        # compile model
        model.compile(loss='categorical_crossentropy',
                      optimizer=opt,
                      metrics=['accuracy'])

        if not self.data_augmentation:
            cprint('Not using data augmentation (as specified in args).', 'cyan')

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
            history = model.fit(X_train, y_train,
                                batch_size=self.batch_size,
                                epochs=self.epochs,
                                validation_split=0.2,
                                shuffle=True,
                                callbacks=callbacks)
        else:
            cprint('Using real-time data augmentation.', 'cyan')
            # This will do preprocessing and realtime data augmentation:
            datagen = ImageDataGenerator(
                featurewise_center=False,  # set input mean to 0 over the dataset
                samplewise_center=False,  # set each sample mean to 0
                featurewise_std_normalization=False,  # divide inputs by std of the dataset
                samplewise_std_normalization=False,  # divide each input by its std
                zca_whitening=False,  # apply ZCA whitening
                zca_epsilon=1e-06,  # epsilon for ZCA whitening
                # randomly rotate images in the range (degrees, 0 to 180)
                rotation_range=0,
                # randomly shift images horizontally (fraction of total width)
                width_shift_range=0.1,
                # randomly shift images vertically (fraction of total height)
                height_shift_range=0.1,
                shear_range=0.,  # set range for random shear
                zoom_range=0.,  # set range for random zoom
                channel_shift_range=0.,  # set range for random channel shifts
                # set mode for filling points outside the input boundaries
                fill_mode='nearest',
                cval=0.,  # value used for fill_mode = "constant"
                horizontal_flip=True,  # randomly flip images
                vertical_flip=False,  # randomly flip images
                # set rescaling factor (applied before any other transformation)
                rescale=None,
                # set function that will be applied on each input
                preprocessing_function=None,
                # image data format, either "channels_first" or "channels_last"
                data_format=None,
                # fraction of images reserved for validation (strictly between 0 and 1)
                validation_split=0.1)

            # Compute quantities required for feature-wise normalization
            # (std, mean, and principal components if ZCA whitening is applied).
            datagen.fit(X_train)

            # Fit the model on the batches generated by datagen.flow().
            history = model.fit_generator(
                datagen.flow(X_train, y_train, batch_size=self.batch_size),
                epochs=self.epochs, steps_per_epoch=self.steps_per_epoch, workers=8
            )

        self.clf = model
        self.history = history

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
