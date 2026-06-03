import { createServer } from "node:http";
import { createApp } from "./app.js";
import { readServerConfig } from "./config/env.js";

try {
  const { host, port } = readServerConfig();
  const server = createServer(createApp());

  server.listen(port, host, () => {
    console.log(`myClawTeam API listening on http://${host}:${port}`);
  });

  server.on("error", (error) => {
    console.error("Failed to start myClawTeam API", error);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Failed to start myClawTeam API");
  process.exitCode = 1;
}
