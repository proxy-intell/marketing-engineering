// Runs once when the server starts, before it takes requests: make sure the tables exist.
export async function register() {
  // The literal check lets the bundler drop the node-only import from the edge build.
  if (process.env.NEXT_RUNTIME === "nodejs") await (await import("./lib/migrate")).migrate();
}
