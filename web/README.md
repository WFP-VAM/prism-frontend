# WFP PRISM Frontend

This project is the front-end interface for the World Food Programme's [PRISM project](https://innovation.wfp.org/project/prism). It displays data, forecasts, and impact projections on a configurable map interface.

![](/assets/prism_frontend.png)

## Functionalities

The new PRISM frontend is built as a static website to minimize cross dependencies and simplify deployments as much as possible. Currently, PRISM frontend provides the ability to:

- Load administrative boundaries as GeoJSON (`src/config/admin_boundaries.json`)
- Load baseline data as JSON, and link it to administrative boundaries
- Display WMS layers from Geoserver or Open Data Cube endpoints, with date selection capabilities
- Display CSV tables in a left side panel

To chose which country to run PRISM for, you can set the environment variable `REACT_APP_COUNTRY`. Defaulting to `mongolia`, configurations currently available are:

- `indonesia`
- `mongolia`
- `mozambique`
- `myanmar`

## Configuration

The configuration is split into four files that you can find in `src/config`:

- 1. `prism.json`
- 2. `layers.json`
- 3. `tables.json`
- 4. `baseline.ts`

### prism.json

This is the primary configuration file. You can define:

- The server endpoints
- Map settings (starting point, zoom)
- Categories

The default categories are `baseline`, `climate`, `impact` and `tables`.
For each categories, you can define sub categories as "subcategorie_name": [layers], a list of layers from `layers.json`.

### layers.json

There are 3 main types of layers:

#### raster

These layers are simply processed as raster images from a server.

```
"pasture_anomaly": {
    "title": "Pasture anomaly",
    "server_type": "wms",
    "server_layer": "ModisAnomaly",
    "server_uri": "https://mongolia.sibelius-datacube.org:5000/wms?layers=ModisAnomaly",
    "has_date": true,
    "date_interval": "days",
    "opacity": 0.3,
    "legend_text": "Converts  NDVI to pasture (kg/ha) values and divides the current period by the long term average to calculate pasture anomaly.",
    "legend": [
        { "value": "12000", "color": "#ff0000" },
        { "value": "14000", "color": "#ff5900" },
        { "value": "16000", "color": "#ff8400" },
        { "value": "18000", "color": "#ffce63" },
        { "value": "19000", "color": "#ffdd94" },
        { "value": "20000", "color": "#ffffbf" },
        { "value": "21000", "color": "#dee09f" },
        { "value": "22000", "color": "#bbbf7c" },
        { "value": "24000", "color": "#9da360" },
        { "value": "26000", "color": "#7e8745" },
        { "value": "28000", "color": "#5b6e00" }
    ]
}
```

#### baseline

The layers are obtained by matching data from the `data` field with the administrative boundaries.
The `data` field should point to a dataset defined in `baseline.ts`

```
"population_below_poverty": {
    "title": "Population below national poverty line (%)",	    "title": "Poverty Headcount",
    "server_type": "wms",	    "type": "json",
    "server_uri": "https://mng-wfp.ovio.org:8443/geoserver/prism/wms?service=WMS&layers=poverty_HC",	    "data": "nsoPoverty",
    "admin_code": "CODE1",
    "has_date": false,	    "has_date": false,
    "opacity": 0.3,	    "opacity": 0.3,
    "legend_text": "Source: Susenas"	    "legend": [
      { "value": "25", "color": "#fef0d9" },
      { "value": "30", "color": "#fdcc8a" },
      { "value": "35", "color": "#fc8d59" },
      { "value": "40", "color": "#e34a33" },
      { "value": "45", "color": "#b30000" }
    ],
    "legend_text": "The poverty headcount is the share of the population whose consumption / expenditure is below the poverty line by Aimag. Year: 2018. Source: National Statistics Office"
}
```

#### impact

```
"herd_pasture_impact": {
    "title": "Number of herder households exposed to severe pasture anomaly",
    "hazard_layer": "pasture_anomaly",
    "baseline_layer": "nsoHerders",
    "threshold": " <= 25000",
    "opacity": 0.3,
    "legend_text": "Number of herder households within ADMIN2 in an area where the median pasture anomaly is <= -50%",
    "legend": [
      { "value": "25", "color": "#ffeda0”" },
      { "value": "30", "color": "#feb24c”" },
      { "value": "35", "color": "#f03b20”" }
    ]
}
```

### baseline.ts

This file is used to pre-load datasets and make sure that they are formatted properly. Thanks to TypeScript, this is limitting the potential for mismatch and failed loads.

## Technical - Packages/Dependencies

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app), using the [Redux](https://redux.js.org/) and [Redux Toolkit](https://redux-toolkit.js.org/) template with TypeScript.

- **Styling & UI Library** Use [Material UI](https://material-ui.com/). Note that to use the [styles API](https://material-ui.com/styles/basics/) you can `import @material-ui/core/styles`.
- **Routing** Uses [React Router](https://reacttraining.com/react-router/web/guides/quick-start).
- **Mapping** Uses [MapBox](https://docs.mapbox.com/mapbox.js/api/v3.2.1/). To use the app, you will need to create a token and add it as `REACT_APP_MAPBOX_TOKEN` in a `.env` file at the root folder.
- **Monitoring** Uses [Sentry.io](https://sentry.io). To send monitoring info to Sentry, simply set the `Sentry` url by adding it as `REACT_APP_SENTRY_URL` in a `.env` file at the root folder.
- **State Management** Uses [Redux](https://redux.js.org/introduction/getting-started)
- **Testing** Uses [Jest](https://jestjs.io/) with [Enzyme](https://enzymejs.github.io/enzyme/)

### Available Scripts

In the project directory, you can run:

#### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

#### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

#### `yarn lint`

Runs `eslint` for all the source files. We use a custom Eslint configuration in `./eslintrc` along with [`prettier`](https://prettier.io/) (configured with `./.prettierrc`) to enforce consistency and code quality. If you would like eslint to try to automatically "fix" files if it can, run `yarn lint --fix`.

### Committing Code

By default, a pre-commit hook is defined to run linting tasks on all _staged_ code before allowing a commit. This occurs using the [lint-staged](https://github.com/okonet/lint-staged) package, and can be configured in `./package.json#lint-staged`. The precommit task can be run manually using `yarn precommit`.
