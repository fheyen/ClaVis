# Tutorial

Follow these steps to get the full system up and running.

The most recent master branch commits may break stuff, check out a tagged version (same version for front- and backend) to make sure everything works.

## Setup

1. Setup the backend: Follow the instructions in the [backend readme](../backend/README.md) (Setup)
2. Setup the frontend: Follow the instructions in the [frontend readme](../frontend/README.md) or simply
   1. Install NodeJS if not yet installed
   2. `cd frontend` (from the project root)
   3. `npm i`
   4. `npm start`

## Classification

Run a batch job

1. `cd backend` (from the project root)
2. `source /venv/bin/activate` (if not already activated)
3. `python3 batch.py jobs/iris.json` (or use any other batch job file instead of `iris.json`)
4. Wait until the job has finished (should be less than 2 minutes for `iris.json`)

## Visualization

5. Start the backend (if it is not yet running)
   1. `cd backend` (if not already here)
   2. `source /venv/bin/activate` (if not already activated)
   3. `python3 main.py`
6. Start the frontend
   1. `cd frontend` (from the project root)
   2. `npm start`
   3. Open a browser and go to [localhost:3000](http://localhost:3000/)
7. Load data
   1. Select a dataset
   2. Select some classifiers or just keep all selected
   3. Press the start button
   4. Wait until the data has loaded
   5. When the data has loaded, the ranking visualization will be displayed
8. Use the frontend
   1. You can change views at the top
   2. The *Help* view contains useful tips and an explanation of all views
   3. The toolbar (top) provides options depending on the current view, like sorting or coloring
   4. The status bar (bottom) shows information on data and current filter and highlight
   5. Some views support zooming and panning via scrolling and dragging
   6. Most views support highlighting via hovering

## Other Example Batch Jobs

Run the most important example batch jobs in one go (should not take more than 20 minutes):

```batch
python batch.py jobs/breast_cancer.json jobs/digits.json jobs/iris.json jobs/wine.json jobs/tests/scaling/iris1000.json jobs/tests/multi_label.json
```

## Adding own Plugins and Batch Jobs

See [getting started](./getting_started.md) for a step-by-step guide on plugins and batch jobs.

## Feedback

If you encounter bugs or have ideas, you can mail me, create a text file here or open an issue.
