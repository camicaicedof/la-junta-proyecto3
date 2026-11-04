const fs = require("node:fs");
const path = require("node:path");
const { ethers } = require("ethers");
const dotenv = require("dotenv");

async function main() {
  const envPath = path.join(__dirname, "../.env");
  const current = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const config = dotenv.parse(current);
  let wallet;
  if (config.PRIVATE_KEY) {
    wallet = new ethers.Wallet(config.PRIVATE_KEY.startsWith("0x") ? config.PRIVATE_KEY : `0x${config.PRIVATE_KEY}`);
  } else {
    wallet = ethers.Wallet.createRandom();
    const lines = current.split(/\r?\n/).filter(line => !/^\s*(PRIVATE_KEY|SEPOLIA_RPC_URL)\s*=/.test(line));
    lines.push(`SEPOLIA_RPC_URL=${config.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"}`);
    lines.push(`PRIVATE_KEY=${wallet.privateKey.slice(2)}`);
    fs.writeFileSync(envPath, lines.join("\n") + "\n", { mode: 0o600 });
    console.log("Billetera exclusiva de pruebas creada. Clave guardada localmente en .env; no subir ni compartir.");
  }
  console.log(`Direccion publica: ${wallet.address}`);
  const updated = dotenv.parse(fs.readFileSync(envPath, "utf8"));
  const provider = new ethers.JsonRpcProvider(updated.SEPOLIA_RPC_URL);
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error("El RPC configurado no corresponde a Sepolia.");
  console.log(`Red verificada: Sepolia (${network.chainId})`);
  console.log(`Saldo de gas: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH de prueba`);
  provider.destroy();
}
main().catch(error => { console.error(error.shortMessage || error.message); process.exitCode = 1; });
