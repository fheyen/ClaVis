from os.path import join
from keras.datasets import fashion_mnist


def get_info():
    return {
        'name': 'keras_fashion_mnist',
        'description': 'Keras | Fashion MNIST',
        'class_names': ["T-shirt/top",
                        "Trouser",
                        "Pullover",
                        "Dress",
                        "Coat",
                        "Sandal",
                        "Shirt",
                        "Sneaker",
                        "Bag",
                        "Ankle boot"]
    }


def get_data(datasets_path):
    (X_train, y_train), (X_test, y_test) = fashion_mnist.load_data()

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
        'class_names': ["T-shirt/top",
                        "Trouser",
                        "Pullover",
                        "Dress",
                        "Coat",
                        "Sandal",
                        "Shirt",
                        "Sneaker",
                        "Bag",
                        "Ankle boot"],
        # CNNs need to know the original shape
        'specs': {
            'original_shape': original_shape
        }
    }
