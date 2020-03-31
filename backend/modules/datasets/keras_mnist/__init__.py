from keras.datasets import mnist


def get_info():
    return {
        'name': 'keras_mnist',
        'description': 'Keras | MNIST',
        'class_names': [str(i) for i in range(10)]
    }


def get_data(datasets_path):
    (X_train, y_train), (X_test, y_test) = mnist.load_data()

    X_train = X_train.astype('float32')
    X_test = X_test.astype('float32')

    original_shape = X_train.shape

    X_train = X_train.reshape(len(X_train), 784)
    X_test = X_test.reshape(len(X_test), 784)

    return {
        'X_train': X_train,
        'y_train': y_train,
        'X_test': X_test,
        'y_test': y_test,
        'class_names': [str(i) for i in range(10)],
        # CNNs need to know the original shape
        'specs': {
            'original_shape': original_shape
        }
    }
