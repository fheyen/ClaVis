import numpy
import keras
from keras.models import Sequential
from keras.layers import Bidirectional, LSTM, Dropout, Dense
from keras.layers.embeddings import Embedding
from keras.callbacks import EarlyStopping
from termcolor import cprint
from ...tools import check_argument as check


CLF_INFO = {
    'name': 'lstm',
    'short': 'LSTM',
    'description': 'Long Short-term Memory',
    'parameters': [
        {
            'name': 'save_model',
            'description': 'Save model to file',
            'type': 'boolean',
            'default_value': False
        },
        {
            'name': 'layer_size',
            'description': 'Layer size',
            'type': 'integer',
            'range': [0, 100000],
            'default_value': 100
        },
        {
            'name': 'epochs',
            'description': 'Epochs',
            'type': 'integer',
            'range': [0, 10000],
            'default_value': 5
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
            'name': 'batch_size',
            'description': 'Batch size',
            'type': 'integer',
            'range': [0, 100000],
            'default_value': 32
        },
        {
            'name': 'learning_rate',
            'description': 'Learning rate',
            'type': 'float',
            'range': [0, 100],
            'default_value': 0.001
        },
        {
            'name': 'embedding_vector_length',
            'description': 'Embedding vector length',
            'type': 'integer',
            'range': [0, 100000],
            'default_value': 64
        },
        {
            'name': 'dropout',
            'description': 'Dropout',
            'type': 'float',
            'range': [0, 1],
            'default_value': 0
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
        self.layer_size = check('layer_size', args, CLF_INFO)
        self.embedding_vector_length = check(
            'embedding_vector_length', args, CLF_INFO)
        self.epochs = check('epochs', args, CLF_INFO)
        self.early_stopping = check('early_stopping', args, CLF_INFO)
        self.early_stopping_patience = check(
            'early_stopping_patience', args, CLF_INFO)
        self.batch_size = check('batch_size', args, CLF_INFO)
        self.learning_rate = check('learning_rate', args, CLF_INFO)
        self.dropout = check('dropout', args, CLF_INFO)
        self.random_state = check('random_state', args, CLF_INFO)

        # data specs
        self.job_title = data_specs['job_title']
        self.dataset_name = data_specs['dataset_name']
        self.num_classes = data_specs['num_classes']
        self.num_words = data_specs['num_words']
        cprint('num_words: {}'.format(self.num_words), 'cyan')

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        numpy.random.seed(self.random_state)
        input_length = X_train.shape[1]

        # loss function
        loss = 'binary_crossentropy'
        dense_size = 1
        if self.num_classes > 2:
            dense_size = self.num_classes
            loss = 'sparse_categorical_crossentropy'

        # model architecture
        model = Sequential()
        model.add(Embedding(self.num_words,
                            self.embedding_vector_length,
                            input_length=input_length))
        model.add(LSTM(self.layer_size, return_sequences=True))
        model.add(LSTM(self.layer_size))
        model.add(Dropout(self.dropout))
        model.add(Dense(dense_size, activation='sigmoid'))

        # optimizer
        opt = keras.optimizers.Adam(lr=self.learning_rate, beta_1=0.9, beta_2=0.999,
                                    epsilon=None, decay=0.0, amsgrad=False)

        # compile model
        model.compile(loss=loss,
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

        # train model
        self.clf = model
        self.history = model.fit(
            X_train, y_train, epochs=self.epochs, batch_size=self.batch_size, validation_split=0.2, callbacks=callbacks)

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
        pred = self.clf.predict_classes(X_test)
        # fix issues with lstm outputs
        # format should be [1, 0, 1, ...] but is [[1], [0], [1], ...]
        if self.num_classes == 2:
            pred = [int(p[0]) for p in pred]
        return pred

    def predict_proba(self, X_test, y_test):
        pred = self.clf.predict_proba(X_test)
        # fix issues with lstm outputs
        # output shape must be (num_samples, num_classes)
        # for binary classification the output is (num_samples,)
        # but should be (num_samples, 2)
        if self.num_classes == 2:
            pred_fixed = []
            for i in range(len(pred)):
                p = pred[i][0]
                pred_fixed.append([p, 1 - p])
            pred = pred_fixed
        return pred
