# Datasets

Each dataset is stored in its own directory.

An `__init__.py` file has to be implemented that reads the dataset. It has to provide a `get_info()` and a `get_data()` function.

**The server must be restarted to use new or changed plugins.**

## Data Format

The `get_data()` function must return data structured like this:

```python
{
    'X_train': [],
    'y_train': [],
    'X_test': [],
    'y_test': [],
    'class_names': []
}
```

`X_train` and `X_test` must be Numpy arrays containing numbers (text must be vectorized or handled through a word emmbedding).

`y_train` and `y_test` must contain the index of the respective class in `class_names`.
Vectorization (one hot coding) may be performed by the classifier before training and testing.

`class_names` is a list of strings where each string contains the name of the class at the corresponding list index.

## Example

See also the other examples in this directory.

```python
from sklearn import datasets
import numpy as np

def get_info():
    return {
        # the name must only contain [a-Z][0-9] and - or _
        'name': 'sklearn_iris',
        # The description is shown to the user and may contain any unicode characters
        'description': 'ScikitLearn | Iris',
        'class_names': ['Iris Setosa', 'Iris Versicolor', 'Iris Virginica']
    }

def get_data(datasets_path):
    data = datasets.load_iris()

    return {
        'X_train': np.array(data.data),
        'y_train': np.array(data.target),
        'X_test': np.array([]),
        'y_test': np.array([]),
        'class_names': ['Iris Setosa', 'Iris Versicolor', 'Iris Virginica']
        'specs': {
            # You can pass any data onto the classifier plugins in here.
            # They will receive as the data_specs dictionary
            # dataset_name (name of the dataset plugin) and num_classes (number of classes)
            # are always provided.
        }
    }
```
