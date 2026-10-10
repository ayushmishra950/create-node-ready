import express from 'express';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logger.middleware';
import { cors, securityHeaders } from './middlewares/security.middleware';
import { apiRoutes } from './routes';

// Builds the Express app. The order of app.use() lines matters: they run top to bottom.
export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(requestLogger);
  app.use(securityHeaders);
  app.use(cors);
  app.use(express.json({ limit: '100kb' })); // reads JSON request bodies

  // Used by load balancers and uptime monitors.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler); // no route matched
  app.use(errorHandler); // must be last
  return app;
}
