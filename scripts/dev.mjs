import { spawn } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  spawn(npm, ["run", "dev", "-w", "server"], { stdio: "inherit" }),
  spawn(npm, ["run", "dev", "-w", "client"], { stdio: "inherit" })
];

const stop = () => children.forEach((child) => child.kill());
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach((child) => child.on("exit", (code) => {
  if (code) {
    stop();
    process.exitCode = code;
  }
}));
