// Vercel serverless entry point for the Express api-server.
// The Express app instance is itself a (req, res) request handler, so we can
// export it directly as the default handler for this serverless function.
// All requests to /api/* are rewritten to this function (see vercel.json),
// and Express handles routing internally (routes are mounted under /api).
import app from "../artifacts/api-server/src/app";

export default app;
