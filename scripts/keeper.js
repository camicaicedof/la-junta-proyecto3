const { ethers, network } = require("hardhat");
const fs = require("node:fs");

// Una sola pasada. Repetir desde un programador de tareas para automatizacion real.
async function main() {
  const config = JSON.parse(fs.readFileSync(`deployments/${network.name}.json`, "utf8"));
  const factory = await ethers.getContractAt("FabricaCirculos", config.factory);
  for (const address of await factory.obtenerCirculos()) {
    try {
      const circle = await ethers.getContractAt("CirculoAhorro", address);
      const state = Number(await circle.estado());
      const now = BigInt((await ethers.provider.getBlock("latest")).timestamp);
      if (state === 2 && now >= await circle.vencimiento()) {
        await (await circle.cerrarRonda()).wait();
        console.log(`Ronda liquidada: ${address}`);
      } else if ((state === 0 && now >= await circle.limiteInscripcion()) ||
                 (state === 1 && now >= await circle.limiteRevelacion())) {
        await (await circle.cancelarPorPlazo()).wait();
        console.log(`Circulo cancelado por plazo: ${address}`);
      }
      // Desembolso: pagar el gas sin poder redirigir los tokens del beneficiario.
      const recipients = new Set([...(await circle.obtenerMiembros()), await circle.creador()]);
      for (const member of recipients) {
        if (await circle.saldoRetirable(member) > 0n) {
          await (await circle.retirarPara(member)).wait();
          console.log(`Saldo enviado a ${member}`);
        }
      }
    } catch (error) { console.error(`No se pudo procesar ${address}:`, error.shortMessage || error.message); process.exitCode = 1; }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
