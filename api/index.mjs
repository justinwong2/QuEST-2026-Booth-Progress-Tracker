// Vercel serverless entry point for the Express api-server.
//
// This is intentionally plain JavaScript (not TypeScript): it re-exports the
// Express app from a pre-bundled, self-contained ESM bundle produced by the
// api-server's esbuild build (see artifacts/api-server/build.mjs). Keeping this
// file as JS ensures @vercel/node does NOT type-check the api-server source
// (which is authored for esbuild bundling, not for tsc's nodenext resolution).
//
// The Express app instance is itself a (req, res) handler, so exporting it as
// the default export makes it the serverless function handler. All /api/*
// requests are rewritten to this function (see vercel.json); Express then
// handles routing internally (routes are mounted under /api).
export { default } from "../artifacts/api-server/dist/app.mjs";
