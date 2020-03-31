from keras.datasets import cifar10
import numpy as np


def get_info():
    return {
        'name': 'keras_cifar10',
        'description': 'Keras | Cifar 10',
        'class_names': ['Airplane', 'Automobile', 'Bird', 'Cat', 'Deer',
                        'Dog', 'Frog', 'Horse', 'Ship', 'Truck']
    }


def get_data(datasets_path):
    (X_train, y_train), (X_test, y_test) = cifar10.load_data()

    original_shape = X_train.shape

    X_train = X_train.reshape(len(X_train), 32*32*3)
    X_test = X_test.reshape(len(X_test), 32*32*3)

    # change y format from [[1],[2],[3]] to [1, 2, 3,]
    y_train = np.array([x[0] for x in y_train])
    y_test = np.array([x[0] for x in y_test])

    return {
        'X_train': X_train,
        'y_train': y_train,
        'X_test': X_test,
        'y_test': y_test,
        'class_names': ['Airplane', 'Automobile', 'Bird', 'Cat', 'Deer',
                        'Dog', 'Frog', 'Horse', 'Ship', 'Truck'],
        # CNNs need to know the original shape
        'specs': {
            'original_shape': original_shape
        }
    }
