import { createServer } from "node:http";
import { createApp } from "./app.js";

function readPort(value: string | undefined): number {
  const rawPort = value ?? "8080";
  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535; received "${rawPort}"`);
  }

  return port;
}

try {
  const host = process.env.HOST ?? "0.0.0.0";
  const port = readPort(process.env.PORT);
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
