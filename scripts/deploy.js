const { ethers, network, artifacts } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("Configura PRIVATE_KEY en .env con una cuenta de pruebas.");
  const token = await ethers.deployContract("MockUSD");
  await token.waitForDeployment();
  const factory = await ethers.deployContract("FabricaCirculos", [await token.getAddress()]);
  await factory.waitForDeployment();
  const deployment = {
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    network: network.name, token: await token.getAddress(), factory: await factory.getAddress(),
    deployer: deployer.address,
    tokenAbi: (await artifacts.readArtifact("MockUSD")).abi,
    factoryAbi: (await artifacts.readArtifact("FabricaCirculos")).abi,
    circleAbi: (await artifacts.readArtifact("CirculoAhorro")).abi
  };
  fs.mkdirSync(path.join(__dirname, "../deployments"), { recursive: true });
  const json = JSON.stringify(deployment, null, 2);
  fs.writeFileSync(path.join(__dirname, `../deployments/${network.name}.json`), json);
  fs.mkdirSync(path.join(__dirname, "../frontend/public"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "../frontend/public/deployment.json"), json);
  if (deployment.chainId === 11155111) {
    // Solo informacion publica: este archivo si se sube al repositorio.
    fs.writeFileSync(path.join(__dirname, "../frontend/public/sepolia.json"), json);
    console.log("Configuracion publica guardada en frontend/public/sepolia.json. Incluirla en Git.");
  }
  console.log(`Red: ${network.name} (${deployment.chainId})`);
  console.log(`MockUSD: ${deployment.token}\nFabrica: ${deployment.factory}`);
  console.log("Configuracion y ABI exportados a frontend/public/deployment.json");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
