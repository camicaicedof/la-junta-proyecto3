const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const publicConfig = path.join(root, "frontend/public/sepolia.json");
let deployment;
if (fs.existsSync(publicConfig)) {
  deployment = JSON.parse(fs.readFileSync(publicConfig, "utf8"));
  if (deployment.chainId !== 11155111 ||
      !/^0x[0-9a-fA-F]{40}$/.test(deployment.token) ||
      !/^0x[0-9a-fA-F]{40}$/.test(deployment.factory) ||
      !Array.isArray(deployment.tokenAbi) || !Array.isArray(deployment.factoryAbi) ||
      !Array.isArray(deployment.circleAbi)) {
    throw new Error("La configuracion publica debe corresponder al despliegue de Sepolia.");
  }
}

execFileSync(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "build", "frontend"], {
  cwd: root, stdio: "inherit"
});
const output = path.join(root, "frontend/dist/deployment.json");
if (deployment) {
  fs.writeFileSync(output, JSON.stringify(deployment, null, 2));
  console.log("Sitio configurado para los contratos publicos de Sepolia.");
} else {
  // Nunca publicar las direcciones del nodo local. La pagina informa el paso pendiente.
  if (fs.existsSync(output)) fs.unlinkSync(output);
  console.log("Vista previa lista. Falta desplegar en Sepolia para habilitar transacciones.");
}
