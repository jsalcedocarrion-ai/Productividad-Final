# Backend API Documentation

## Overview
This document provides instructions for setting up and running the backend of the my-fullstack-app project. The backend is built using Node.js and Express, and it connects to a PostgreSQL database to handle task queries.

## Prerequisites
- Node.js (version 14 or higher)
- PostgreSQL (version 12 or higher)

## Installation
1. Navigate to the backend directory:
   ```
   cd my-fullstack-app/backend
   ```

2. Install the required dependencies:
   ```
   npm install
   ```

## Configuration
Before running the server, ensure that the database connection details in `src/API-REST.js` are correctly configured:
- `host`: The IP address or hostname of your PostgreSQL server.
- `port`: The port number for PostgreSQL (default is 5432).
- `user`: Your PostgreSQL username.
- `password`: Your PostgreSQL password.
- `database`: The name of your PostgreSQL database.

## Running the Server
To start the backend server, run the following command:
```
npm start
```

The server will be running at `http://localhost:3000`.

## API Endpoints
### GET /tareas
This endpoint retrieves tasks based on the provided query parameters.

#### Query Parameters
- `assignee`: The assignee of the task.
- `taskKey`: The key of the task.
- `fechaInicio`: The start date for filtering tasks.
- `fechaFin`: The end date for filtering tasks.

#### Response
- Returns a JSON array of tasks if found.
- Returns a 404 status with a message if no tasks are found.
- Returns a 400 status if required parameters are missing.
- Returns a 500 status if there is an error in the query.

## License
This project is licensed under the MIT License.