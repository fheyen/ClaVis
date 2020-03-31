import numpy as np

CLF_INFO = {
    'name': 'naive',
    'short': 'Naïve',
    'description': 'Naïve classifier that classifies every sample in the test set with the label of the biggest class from the training set (serves as majority class baseline).',
    'parameters': None
}


def get_clf(args, data_specs):
    return Classifier(args, data_specs)


def get_info():
    return CLF_INFO


class Classifier():
    def __init__(self, args, data_specs):
        self.num_classes = data_specs['num_classes']

    def get_info(self):
        return CLF_INFO

    def fit(self, X_train, y_train):
        # count labels in each class
        class_distribution = [0 for _ in range(self.num_classes)]
        for label in y_train:
            class_distribution[label] += 1
        # get biggest class
        max_value = max(class_distribution)
        self.biggest_class = class_distribution.index(max_value)
        print(f'Class distribution: {class_distribution}')
        print(f'Biggest class: {self.biggest_class}')

    def predict(self, X_test, y_test):
        # label every sample as the id of the biggest class
        return np.array([self.biggest_class for _ in X_test])

    def predict_proba(self, X_test, y_test):
        # give the biggest class a probability of 1 and the rest 0
        prob_array = [0 for _ in range(self.num_classes)]
        prob_array[self.biggest_class] = 1
        return np.array([prob_array for _ in X_test])
