# Frontend

1. [Frontend](#frontend)
   1. [Run (Production Build)](#run-production-build)
   2. [Run (Development Mode)](#run-development-mode)
   3. [Development Tools](#development-tools)
   4. [NodeJS](#nodejs)
   5. [Create React App Info](#create-react-app-info)

## Run (Production Build)

The production build will be optimized and therefore faster than the development mode.
If this does not work or you cannot or do not want to install anything, try the development build instead.

1. Start the backend server (as described in the [backend readme](../backend/README.md))
2. Install [NodeJS](#nodejs) if not yet installed
3. `npm i`
4. `npm run build`
5. `npm install -g serve`
6. `serve -s build -l 3000`
7. Open [localhost:3000](http://localhost:3000/)

## Run (Development Mode)

1. Start the backend server (as described in the [backend readme](../backend/README.md))
2. Install [NodeJS](#nodejs) if not yet installed
3. `npm i`
4. `npm start`
5. Open [localhost:3000](http://localhost:3000/)

## Development Tools

- React Dev Tools: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi?hl=en
- Redux Dev Tools: https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd/related?hl=en

## NodeJS

https://github.com/nodesource/distributions/blob/master/README.md

```bash
curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Create React App Info

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

`npm run build` builds the app for production to the `build` folder.
See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).
To learn React, check out the [React documentation](https://reactjs.org/).
