// Mantiene cache y configuracion de Hardhat dentro del proyecto (util en laboratorios).
const path = require("node:path");
process.env.APPDATA = path.join(__dirname, "../.local/config");
process.env.LOCALAPPDATA = path.join(__dirname, "../.local/cache");
process.env.HARDHAT_DISABLE_TELEMETRY_PROMPT = "true";
require("hardhat/internal/cli/cli");
