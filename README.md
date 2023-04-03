# lukso-indexing

This repository contains the backend services of the [DROPPS](https://dropps.io/) indexing service for the [LUKSO](https://lukso.network/) network.

## Services

### **Indexing service**

The indexing app is a service responsible for querying, decoding, and indexing the data from the LUKSO blockchain into a database.

#### Configuration

Required configuration:

| name                                | comment                                           |
|-------------------------------------|---------------------------------------------------|
| `LUKSO_DATA_CONNECTION_STRING`      | Connection string of the lukso-data database      |
| `LUKSO_STRUCTURE_CONNECTION_STRING` | Connection string of the lukso-structure database |
| `RPC_URL`                           | Url of the LUKSO RPC node                         |

## Databases

The project needs 2 PG databases to work and 1 for testing:

- `indexing-lukso-data`, used to store all the data extracted from the LUKSO network.
- `indexing-lukso-structure`, used to store all the data related to the structure of the LUKSO network. This allows the app to know how to read data from the network.
- `indexing-lukso-test`, used for unit tests.

You can then update the connection strings accordingly.

#### Lukso structure database

![indexing-lukso-structure.png](docs%2Fimg%2Findexing-lukso-structure.png)

#### Lukso data database

![lukso-indexing-data.png](docs%2Fimg%2Flukso-indexing-data.png)

## Project Structure

| Name                | Description                                                                                                |
|---------------------|------------------------------------------------------------------------------------------------------------|
| **dist**            | Contains the distributable (or output) from your TypeScript build. This is the code you ship               |
| **node_modules**    | Contains all your npm dependencies                                                                         |
| **apps**            | Contains the source code of all the apps                                                                   |
| **logs**            | Contains application logs created during the app execution                                                 |
| **libs**            | Contains the services shared between the apps                                                              |
| **utils**           | Contains utility functions shared across all the apps                                                      |
| **scripts**         | Contains the scripts used to initialize the databases                                                      |
| **test**            | Contains test helpers used across the apps                                                                 |
| **docs**            | Contains docs about the application                                                                        |
| .env.example        | API keys, tokens, passwords, database URI. Clone this, but don't check it in to public repos.              |
| package.json        | File that contains npm dependencies as well as [build scripts](#what-if-a-library-isnt-on-definitelytyped) |
| tsconfig.json       | Config settings for compiling server code written in TypeScript                                            |
| .eslintrc.json      | Config settings for ESLint code style checking                                                             |


## Development

### Start the project

- `npm i`
- `cp .env.example .env`
- Create postgres databases and obtain connection strings. Set that to the env variable as `LUKSO_DATA_CONNECTION_STRING` and `LUKSO_STRUCTURE_CONNECTION_STRING` (in the `.env` and `.env.test` files)
- Populate databases: `npm run seed:populate`
- Run the indexing: `npm run indexing`
