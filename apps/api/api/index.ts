import type { IncomingMessage, ServerResponse } from 'http';

// Imports the already-compiled bootstrap (dist/bootstrap.js), produced by the `vercel-build`
// script (`prisma generate && prisma migrate deploy && nest build`) before Vercel bundles this
// function. Decorator metadata requires tsc, not esbuild, so the Nest app itself is never
// compiled by the Vercel function builder — this file just wires the prebuilt app to a request.
type CreateApp = () => Promise<{
  init(): Promise<unknown>;
  getHttpAdapter(): { getInstance(): (req: IncomingMessage, res: ServerResponse) => void };
}>;

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cachedHandlerPromise: Promise<RequestHandler> | null = null;

async function buildHandler(): Promise<RequestHandler> {
  const { createApp } = (await import('../dist/bootstrap')) as { createApp: CreateApp };
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!cachedHandlerPromise) {
    cachedHandlerPromise = buildHandler().catch((error: unknown) => {
      cachedHandlerPromise = null;
      throw error;
    });
  }

  const expressHandler = await cachedHandlerPromise;
  expressHandler(req, res);
}
