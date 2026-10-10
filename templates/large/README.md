# {{name}}

An Express + TypeScript + MongoDB (Mongoose) API with a modular layout and Docker. Created with [create-node-ready](https://www.npmjs.com/package/create-node-ready).

## Run it

**1. Start MongoDB.** Either run one locally with Docker:

```bash
docker compose up -d mongo
```

or create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and put its connection string in `.env` as `MONGODB_URI`.

**2. Start the API:**

```bash
npm run dev        # http://localhost:5000, restarts when you save a file
```

Other commands:

```bash
npm test           # run the tests
npm run build      # compile to dist/
npm start          # run the compiled build (production)
npm run typecheck  # check the types without building
docker compose up --build   # run the API and MongoDB together in containers
```

Settings live in `.env` (a random `JWT_SECRET` was generated for you; `.env.example` lists every variable). The server tells you clearly if a setting is missing or wrong.

## Try it

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Amit","email":"amit@example.com","password":"password123"}'
```

| Method | Path | What it does |
| --- | --- | --- |
| GET | `/health` | Is the server up? |
| POST | `/api/auth/register` | `{ name, email, password }` gives `{ user, token }` |
| POST | `/api/auth/login` | `{ email, password }` gives `{ user, token }` |
| GET | `/api/auth/me` | The logged-in user |
| GET | `/api/users`, `/api/users/:id` | Users (login required) |
| GET, POST | `/api/orders` | Your orders, or create one: `{ item, quantity }` |
| GET | `/api/orders/:id` | One of your orders |
| POST | `/api/orders/:id/cancel` | Cancel an order |

Send `Authorization: Bearer <token>` on private routes. Errors always look like `{ "error": { "message": "..." } }` (with `fields` when specific fields are wrong).

## Where things are

```
src/
  server.ts        starts everything (database, jobs, server) and stops it cleanly
  app.ts           the Express app: the list of middleware, in order
  routes.ts        mounts every module under /api
  config/          env.ts reads and checks .env, database.ts connects to MongoDB
  core/            shared helpers that do not belong to one feature
    middlewares/     errors, request logging, security headers, CORS
    utils/           logger, errors, input checks, password hashing, tokens
  modules/         one folder per feature. Each has the same files:
    <feature>/       x.model.ts      the MongoDB collection (fields and rules)
                     x.service.ts    the business rules
                     x.controller.ts reads the request, calls the service, sends the response
                     x.routes.ts     which URL goes to which controller
  jobs/            background jobs that run on a timer
  integrations/    helpers for calling other services
  @types/          extra TypeScript types (req.user)
docker/            Dockerfile (builds a small image and runs as a non-root user)
```

A request flows like this: **routes** find the controller, the **controller** calls the **service**, and the service uses the **model** to read or write MongoDB.

## Add a feature (for example "posts")

1. Copy the `src/modules/orders` folder to `src/modules/posts` and rename the files.
2. In `post.model.ts`, change the fields. In the service, change the rules.
3. In `src/routes.ts`, add `apiRoutes.use('/posts', postsRoutes)`.

## Tests

`npm test` runs the tests that need no database. To run all of them, give a **test** database (its name must end with `_test`; it is deleted when the tests finish):

```bash
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/{{dbname}}_test npm test
```

## Before you go live

- Use a hosted MongoDB (such as Atlas) and set its connection string as `MONGODB_URI` on the server.
- Add rate limiting on `/api/auth/*` (at your reverse proxy or API gateway).
- Serve the API over HTTPS and set `CORS_ORIGIN` to your frontend's address.
- Use a long random `JWT_SECRET` (32+ characters) and keep `.env` out of git (already in `.gitignore`).
