# Classifiers

Each classifier is represented by a directory containing an `__init__.py` file.
Its class has to implement some methods as shown below.

When a plugin is changed, all classifiers using it should be trained again to avoid errors in the frontend.

Make sure to specify all parameters in the `CLF_INFO` with all attributes.
Use the type `other` and an empty range `[]` if nothing else applies

## Data Format

The data has the same format as explained in [the datasets readme file](../datasets/README.md).

## Example

```python
# This function checks your classifier's parameters
# gainst the specification in CLF_INFO
from ...tools import check_argument as check

CLF_INFO = {
    # Name must only contain characters that are valid for variable names
    'name': 'example_classifier',
    # Short description, may contain any characters but no line breaks
    'short': 'example'
    'description': 'A custom classifier example',
    'parameters': [
        {
            # Name of the paramter must only contain characters
            # that are valid for variable names
            'name': 'activation',
            # A description that is shown in the frontend
            'description': 'Activation function',
            # Type must be string, integer, float, boolean, array, or other
            'type': 'string',
            # Range is either an array of strings (for string parameters)
            # or an array with [min, max] (for integer and float parameters)
            # The types array and other are not checked,
            # but the range may be specified as reference
            'range': ['identity', 'logistic', 'tanh', 'relu'],
            # The default value must be specified
            # It is used when the parameter value is invalid or missing
            'default_value': 'relu'
        },
        {
            'name': 'hidden_layer_sizes',
            'description': 'Layer sizes',
            'type': 'array',
            'range': [],
            'default_value': '[100, 100]'
        },
        {
            'name': 'batch_size',
            'description': 'Batch size',
            'type': 'int',
            'range': [1, 100000],
            'default_value': 32,
        },
        {
            'name': 'save_model',
            'description': 'Save model to file',
            'type': 'boolean',
            'default_value': False,
            # Parameters can be hidden in visualizations
            'hide_param_in_vis': True
        },
    ]
}

def get_clf(args, data_specs):
    return Classifier(args, data_specs)

def get_info(self):
        return CLF_INFO

class Classifier():
    def __init__(self, args, data_specs):
        """
        An example for the custom classifier interface.
        """
        # The title can be used to save the model to a recognizable file
        # This is the title that has been set in the .json batch job,
        # args contains everything that has been configured there
        self.title = args['title']

        # Use this to check args for data type and range
        self.batch_size = check('batch_size', args, CLF_INFO)

        # Datasets may provide information on their structure
        self.num_classes = data_specs['num_classes']

    def get_info(self):
        return CLF_INFO

    # Input and output formats are the same as in scikit-learn
    # X_train.shape: (n_samples, n_features)
    # y_train.shape: (n_samples,)
    # You may reshape it here based on data_specs
    def fit(self, X_train, y_train):
        # Train your classifier here
        # or load it from a file and maybe fine-tune it
        pass

    # This is optional, the format has to match the one Keras uses
    def get_history(self):
        return self.history

    # Don't forget to reshape the data the same way you did in fit().
    # y_test is passed in all prediction functions, but should only be used for
    # debugging!
    def predict(self, X_test, y_test):
        # Predict class labels here
        pass

    # Implement this if classifier supports probabilities
    def predict_proba(self, X_test, y_test):
        # Predict probabilities here
        pass

    # Implement this if classifier supports a decision function
    # (Will be used as substitute for probabilities and rescaled to [0, 1])
    def decision_function(self, X_test, y_test):
        # Predict decision function values here
        pass
```
