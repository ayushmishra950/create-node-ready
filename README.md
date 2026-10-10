# create-node-ready

Create a ready-to-run **TypeScript + Express + MongoDB** backend with one command.

```bash
npx create-node-ready
```

## The problem

Every new Node.js backend starts the same way: set up TypeScript, Express and the database, write login and register, handle errors, validate `.env`, add logging, a health route, tests, a Dockerfile. It takes hours, and each project ends up slightly different because you copy from the last one.

`create-node-ready` does all of that in about a minute, with working code you can read and change.

## Quick start

You need **Node.js 20.19 or newer** and a MongoDB (Docker for a local one, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

**1. Run the command** in the folder where you want the project:

```bash
npx create-node-ready
```

**2. Answer two questions.** The project name, then small or large (use the arrow keys and Enter):

```
Project name? (node-app) my-api
What are you building?
❯ A small project  MVC layout: controllers, models, routes. Good for MVPs and small APIs.
  A large project  Modular layout: users, orders, jobs, Docker. Good for big or growing teams.
```

It creates the files, installs the packages and runs `git init`.

**3. Start MongoDB:**

```bash
cd my-api
docker compose up -d mongo
```

No Docker? Put your Atlas connection string in `.env` as `MONGODB_URI`.

**4. Start the server:**

```bash
npm run dev
```

It runs on http://localhost:5000 and restarts when you save a file.

**5. Try it:**

```bash
curl http://localhost:5000/health

curl -X POST http://localhost:5000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Amit","email":"amit@example.com","password":"password123"}'
```

You get back the user and a login token. Send the token as `Authorization: Bearer <token>` to reach private routes such as `GET /api/auth/me`.

**6. Test, build and run for production:**

```bash
npm test            # tests that need no database
npm run build       # compile TypeScript to dist/
npm start           # run the compiled build
```

## Which size?

| | Small | Large |
| --- | --- | --- |
| Good for | MVPs, small APIs, learning | Bigger apps and teams |
| Request flow | route → controller → model | route → controller → service → model |
| Folders | `config` `models` `controllers` `routes` `middlewares` `utils` | `config` `core` `modules` (auth, users, orders) `jobs` `integrations` |
| Docker | MongoDB only | API and MongoDB, with a small non-root production image |
| Files created | 28 | 41 |

Not sure? Start with small. The code is plain Express and Mongoose, so you can grow it any way you like.

## What you get

- **Login system:** register, login and a private `/me` route. Passwords are hashed with scrypt and tokens are signed JWTs, both using Node's built-in `crypto`.
- **MongoDB with Mongoose:** a ready `User` model (the large project also has `Order`), a clear message if MongoDB is not running, and protection against query injection.
- **One error format:** `{ "error": { "message": "..." } }`. Validation errors, duplicate emails, bad ids and broken JSON become the right 400 / 409 / 413 responses, and production never leaks stack traces.
- **Checked settings:** `.env` is validated when the server starts, with a clear message for each problem. A random `JWT_SECRET` is created for every project.
- **Production basics:** `/health`, request logging (JSON lines in production), security headers, optional CORS, a body size limit, and a clean shutdown on Ctrl+C or `SIGTERM`.
- **Strict TypeScript and tests** with Node's built-in test runner. Tests that use the database run when you pass a test database:

```bash
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/my_api_test npm test
```

The database name must end with `_test`, because it is deleted when the tests finish.

Your new project depends on `express` and `mongoose` only (plus TypeScript tools for development). Each project's README explains its layout and how to add a feature.

## Options

```text
npx create-node-ready [name] [options]

  -s, --size <small|large>   skip the size question
  -y, --yes                  skip every question (name: node-app, size: small)
      --no-install           do not install dependencies
      --no-git               do not run "git init"
      --pm <npm|pnpm|yarn>   package manager (default: the one that started this command)
  -h, --help                 show help
  -v, --version              show the version
```

It also works without a terminal (scripts, CI):

```bash
npx create-node-ready my-api --size large --no-git
```

## How big is it?

| | Size |
| --- | --- |
| Download of `create-node-ready` | **26 KB** (0.03 MB) |
| On disk after install | **about 0.1 MB** of files, no dependencies |
| Time to create a project | **under 0.1 second**, plus the time `npm install` takes |
| Project files you get | 116 KB (small) / 176 KB (large) |
| Packages the new project installs | about **52 MB** for development, **15 MB** for production |

The tool itself is tiny and adds nothing to your computer's load: it runs for a fraction of a second and then exits. The 52 MB belongs to the project it creates (mostly TypeScript at 23 MB, esbuild at 10 MB, and the MongoDB driver at 4 MB), the same as any TypeScript + Mongoose project.

## Good to know

- It creates **Express + MongoDB** projects only, not other frameworks or databases.
- The `Dockerfile` assumes npm and a `package-lock.json`.
- Rate limiting, refresh tokens, email verification and password reset are not included. Add rate limiting at your proxy or API gateway before going live.
- The demo `User` and `Order` models are examples. Change them to fit your app.

## License

[MIT](./LICENSE) © Aayush Mishra
