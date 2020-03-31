# Backend

1. [Backend](#backend)
   1. [Requirements](#requirements)
   2. [Setup](#setup)
   3. [Development](#development)

## Requirements

This system should work on any system that runs Python and with any browser, but we only tested it on Linux and Mac OS with Opera, Safari, Chrome and Firefox.

## Setup

You need to have Python 3.6 or higher installed.

The backend is only tested on Linux, but works also on Windows when run in the Windows Subsystem for Linux (WSL).

```bash
# Create new virtual environment if not yet done so
virtualenv -p python3 venv

# Activate the virtual environment
source venv/bin/activate

# Run pip to install all required packages
# Or replace tensorflow by tensorflow-gpu if your system is set up to support this
pip3 install --upgrade pandas xarray joblib flask flask_restful flask_jsonpify flask_cors termcolor colorama sklearn keras tensorflow umap-learn netcdf4 tables

# If there are problems, try to use the exact package versions by deleting and re-creating the virtual environment and running
# pip install -r requirements.txt

# Start server (needed for the frontend)
python3 main.py

# Run a batch job (in another terminal)
source venv/bin/activate
python3 batch.py jobs/iris.json
```

## Development

```bash
# Add pip packages
pip3 install --upgrade --user <packagename>
```
