# lab_28 - Static HTML Express API (Dockerized)

This folder contains a single-file Node.js Express API that serves `index.html`.

## Files

- `server.js`: Express app
- `index.html`: static HTML content
- `Dockerfile`: container build/run instructions

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start server:

```bash
npm start
```

3. Open:

- `http://localhost:3000/`
- `http://localhost:3000/health`

## Build Docker image

From inside `lab_28`:

```bash
docker build -t lab-28-static-api .
```

## Run Docker container

```bash
docker run --rm -p 3000:3000 lab-28-static-api
```

Then open:

- `http://localhost:3000/`
- `http://localhost:3000/health`
