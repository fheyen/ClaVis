from os.path import join
from keras.datasets import imdb
from keras.preprocessing import sequence


def get_info():
    return {
        'name': 'keras_imdb',
        'description': 'Keras | IMDB (top 20000 words, sequence length 500)',
        'class_names': ['negative', 'positive']
    }


def get_data(datasets_path):
    # load the dataset but only keep the top n words, zero the rest
    num_words = 20000
    max_review_length = 500

    (X_train, y_train), (X_test, y_test) = imdb.load_data(num_words=num_words)

    X_train = sequence.pad_sequences(X_train, maxlen=max_review_length)
    X_test = sequence.pad_sequences(X_test, maxlen=max_review_length)

    return {
        'X_train': X_train,
        'y_train': y_train,
        'X_test': X_test,
        'y_test': y_test,
        'class_names': ['negative', 'positive'],
        # Classifiers need to know the number of words
        'specs': {
            'num_words': num_words
        }
    }
