# {{name}}

An Express + TypeScript + MongoDB (Mongoose) API with an MVC layout. Created with [create-node-ready](https://www.npmjs.com/package/create-node-ready).

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
| GET | `/api/auth/me` | The logged-in user. Send `Authorization: Bearer <token>` |

Errors always look like `{ "error": { "message": "..." } }` (with `fields` when specific fields are wrong).

## Where things are

```
src/
  index.ts       starts everything (database, then server) and stops it cleanly
  app.ts         the Express app: the list of middleware, in order
  config/        env.ts reads and checks .env, database.ts connects to MongoDB
  models/        one file per MongoDB collection (User.ts)
  controllers/   what happens for each request: read input, use the model, send the response
  routes/        which URL goes to which controller
  middlewares/   code that runs around requests: login check, errors, logging, security
  utils/         small helpers: logger, errors, input checks, password hashing, tokens
  types/         extra TypeScript types (req.user)
```

A request flows like this: **route** finds the controller, the **controller** uses a **model** to read or write MongoDB, and sends the answer.

## Add a feature (for example "posts")

1. `src/models/Post.ts`: copy `User.ts` and change the fields.
2. `src/controllers/post.controller.ts`: write the functions (`Post.find()`, `Post.create(...)`).
3. `src/routes/post.routes.ts`: connect URLs to those functions. Use `requireAuth` for private routes.
4. `src/routes/index.ts`: add `apiRoutes.use('/posts', postRoutes)`.

## Tests

`npm test` runs the tests that need no database. To run all of them, give a **test** database (its name must end with `_test`; it is deleted when the tests finish):

```bash
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/{{dbname}}_test npm test
```

## Before you go live

- Use a hosted MongoDB (such as Atlas) and put its string in the server's `MONGODB_URI`.
- Add rate limiting on `/api/auth/*` (at your reverse proxy or API gateway).
- Serve the API over HTTPS and set `CORS_ORIGIN` to your frontend's address.
- Use a long random `JWT_SECRET` (32+ characters) and keep `.env` out of git (already in `.gitignore`).
