const { ethers } = require("hardhat");

async function main() {
  const [ana, bruno, carla] = await ethers.getSigners();
  const token = await ethers.deployContract("MockUSD");
  const circle = await ethers.deployContract("CirculoAhorro", [
    await token.getAddress(), ana.address, 100_000_000n, 3, 60, 500, 100, 3600, 600, 0, false
  ]);
  await circle.waitForDeployment();
  const address = await circle.getAddress();
  for (const person of [ana, bruno, carla]) {
    await (await token.connect(person).faucet()).wait();
    await (await token.connect(person).approve(address, ethers.MaxUint256)).wait();
  }
  await (await circle.financiarRendimientos(await circle.reservaNecesaria())).wait();
  for (const person of [ana, bruno, carla]) await (await circle.connect(person).inscribirse(ethers.ZeroHash)).wait();
  for (let round = 0; round < 3; round++) {
    for (const person of [ana, bruno, carla]) {
      // Bruno recibe el segundo turno y luego deja de pagar la ultima cuota.
      if (round === 2 && person === bruno) continue;
      await (await circle.connect(person).aportar()).wait();
    }
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(await circle.vencimiento())]);
    await (await circle.cerrarRonda()).wait();
    console.log(`Ronda ${round + 1} liquidada. Moras de Bruno: ${await circle.moras(bruno.address)}`);
  }
  for (const person of [ana, bruno, carla]) {
    console.log(`${person.address}: ${ethers.formatUnits(await circle.saldoRetirable(person.address), 6)} mUSD retirables`);
    await (await circle.connect(person).retirar()).wait();
  }
  console.log(`Saldo final del contrato: ${await token.balanceOf(address)} (debe ser 0)`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
