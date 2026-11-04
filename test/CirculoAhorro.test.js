const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

const Q = 100_000_000n;
describe("Natillera comunitaria", function () {
  let people, token, circle, address;
  async function setup({ mode = 0, lottery = false, rate = 100, fund = true } = {}) {
    people = (await ethers.getSigners()).slice(0, 4);
    token = await ethers.deployContract("MockUSD");
    circle = await ethers.deployContract("CirculoAhorro", [await token.getAddress(), people[0].address, Q, 3, 60, 500, rate, 3600, 600, mode, lottery]);
    await circle.waitForDeployment(); address = await circle.getAddress();
    for (const p of people) {
      await token.connect(p).faucet();
      await token.connect(p).approve(address, ethers.MaxUint256);
    }
    if (fund && rate > 0) await circle.financiarRendimientos(await circle.reservaNecesaria());
  }
  async function join() { for (const p of people.slice(0, 3)) await circle.connect(p).inscribirse(ethers.ZeroHash); }
  async function pay(skip = []) {
    for (let i = 0; i < 3; i++) if (!skip.includes(i)) await circle.connect(people[i]).aportar();
  }
  async function close() {
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(await circle.vencimiento())]);
    await circle.connect(people[3]).cerrarRonda();
  }
  async function withdrawAll() {
    for (const p of people) if (await circle.saldoRetirable(p.address) > 0n) await circle.connect(p).retirar();
    assert.equal(await token.balanceOf(address), 0n, "Conservacion de todos los tokens");
  }
  it("liquida todos los turnos y devuelve garantias y reserva sobrante", async function () {
    await setup(); await join();
    for (let i = 0; i < 3; i++) { await pay(); await close(); }
    assert.equal(await circle.estado(), 3n);
    assert.equal(await circle.puntualidades(people[0].address), 3n);
    assert.equal(await circle.capitalBloqueado(), 0n);
    await withdrawAll();
  });
  it("cubre al que recibe primero y luego incumple; premia solo a puntuales", async function () {
    await setup({ rate: 0 }); await join();
    await pay(); await close();
    const firstBalance = await circle.saldoRetirable(people[0].address);
    await pay([0]); await close();
    assert.equal(await circle.moras(people[0].address), 1n);
    assert.equal(await circle.saldoRetirable(people[0].address), firstBalance);
    assert.equal(await circle.saldoRetirable(people[1].address), 3n * Q + 2_500_000n);
    assert.equal(await circle.garantia(people[0].address), 210_000_000n);
    await pay([0]); await close(); await withdrawAll();
  });
  it("soporta que nadie pague ninguna ronda sin insolvencia", async function () {
    await setup(); await join();
    for (let i = 0; i < 3; i++) await close();
    for (const p of people.slice(0, 3)) assert.equal(await circle.moras(p.address), 3n);
    await withdrawAll();
  });
  it("conserva tokens con varias combinaciones de moras en ambas modalidades", async function () {
    for (const mode of [0, 1]) for (let pattern = 0; pattern < 8; pattern++) {
      await setup({ mode }); await join();
      for (let round = 0; round < 3; round++) {
        const skip = [0, 1, 2].filter(i => ((pattern + round) % 8 & (1 << i)) !== 0);
        await pay(skip); await close();
      }
      await withdrawAll();
    }
  });
  it("acumula el capital hasta el cierre y lo reparte equitativamente", async function () {
    await setup({ mode: 1, rate: 0 }); await join();
    await pay(); await close();
    assert.equal(await circle.ahorroAcumulado(), 3n * Q);
    assert.equal(await circle.saldoRetirable(people[1].address), 0n);
    for (let i = 1; i < 3; i++) { await pay(); await close(); }
    assert.equal(await circle.saldoRetirable(people[1].address), 615_000_000n);
    await withdrawAll();
  });
  it("rechaza aportes duplicados, de externos, fuera de plazo y cierres prematuros", async function () {
    await setup(); await join();
    await assert.rejects(circle.cerrarRonda(), /Aun no vence/);
    await assert.rejects(circle.connect(people[3]).aportar(), /Aporte invalido/);
    await circle.aportar();
    await assert.rejects(circle.aportar(), /Aporte invalido/);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(await circle.vencimiento())]);
    await ethers.provider.send("evm_mine", []);
    await assert.rejects(circle.connect(people[1]).aportar(), /Periodo cerrado/);
  });
  it("impide comenzar sin financiar el rendimiento prometido", async function () {
    await setup({ fund: false });
    await circle.inscribirse(ethers.ZeroHash);
    await circle.connect(people[1]).inscribirse(ethers.ZeroHash);
    await assert.rejects(circle.connect(people[2]).inscribirse(ethers.ZeroHash), /Financiar reserva primero/);
    await circle.financiarRendimientos(await circle.reservaNecesaria());
    await circle.connect(people[2]).inscribirse(ethers.ZeroHash);
    assert.equal(await circle.estado(), 2n);
  });
  it("cancela inscripciones incompletas y devuelve todos los fondos", async function () {
    await setup(); await circle.inscribirse(ethers.ZeroHash);
    await assert.rejects(circle.cancelarPorPlazo(), /No cancelable/);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(await circle.limiteInscripcion())]);
    await circle.connect(people[3]).cancelarPorPlazo();
    assert.equal(await circle.estado(), 4n); await withdrawAll();
  });
  async function commitAll() {
    const secrets = [1, 2, 3].map(n => ethers.zeroPadValue(ethers.toBeHex(n), 32));
    const chain = (await ethers.provider.getNetwork()).chainId;
    const coder = ethers.AbiCoder.defaultAbiCoder();
    for (let i = 0; i < 3; i++) {
      const commitment = ethers.keccak256(coder.encode(["bytes32", "address", "address", "uint256"], [secrets[i], people[i].address, address, chain]));
      await circle.connect(people[i]).inscribirse(commitment);
    }
    return secrets;
  }
  it("reproduce el sorteo fuera del contrato y rechaza secretos incorrectos", async function () {
    await setup({ lottery: true }); const secrets = await commitAll();
    await assert.rejects(circle.revelar(ethers.ZeroHash), /Secreto incorrecto/);
    for (const i of [2, 0, 1]) await circle.connect(people[i]).revelar(secrets[i]);
    let seed = 0n; for (const secret of secrets) seed ^= BigInt(secret);
    const finalSeed = ethers.zeroPadValue(ethers.toBeHex(seed), 32);
    const expected = people.slice(0, 3).map(p => p.address);
    for (let i = 2; i > 0; i--) {
      const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "uint256"], [finalSeed, i]));
      const j = Number(BigInt(hash) % BigInt(i + 1));
      [expected[i], expected[j]] = [expected[j], expected[i]];
    }
    assert.equal(await circle.semillaFinal(), finalSeed);
    assert.deepEqual(Array.from(await circle.obtenerOrden()), expected);
  });
  it("permite recuperar depositos si alguien no revela", async function () {
    await setup({ lottery: true }); await commitAll();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(await circle.limiteRevelacion())]);
    await circle.cancelarPorPlazo(); await withdrawAll();
  });
  it("permite retirar una sola vez, sin privilegios para el creador", async function () {
    await setup({ rate: 0 }); await join(); await pay(); await close();
    await circle.retirar();
    await assert.rejects(circle.retirar(), /Sin saldo/);
    await assert.rejects(circle.connect(people[3]).retirar(), /Sin saldo/);
    await assert.rejects(circle.cancelarPorPlazo(), /No cancelable/);
  });
  it("crea y registra circulos parametrizados en la fabrica", async function () {
    await setup();
    const factory = await ethers.deployContract("FabricaCirculos", [await token.getAddress()]);
    await factory.connect(people[1]).crearCirculo(Q, 3, 60, 500, 100, 3600, 600, 0, false);
    const list = await factory.obtenerCirculos(); assert.equal(list.length, 1);
    const created = await ethers.getContractAt("CirculoAhorro", list[0]);
    assert.equal(await created.creador(), people[1].address);
    await assert.rejects(factory.crearCirculo(Q, 1, 60, 500, 100, 3600, 600, 0, false), /Cuota o cupos invalidos/);
  });
  it("permite desembolso por un ejecutor sin poder redirigir el dinero", async function () {
    await setup({ rate: 0 }); await join(); await pay(); await close();
    const recipientBefore = await token.balanceOf(people[0].address);
    const executorBefore = await token.balanceOf(people[3].address);
    await circle.connect(people[3]).retirarPara(people[0].address);
    assert.equal(await token.balanceOf(people[0].address), recipientBefore + 3n * Q);
    assert.equal(await token.balanceOf(people[3].address), executorBefore);
    assert.equal(await circle.saldoRetirable(people[0].address), 0n);
    await assert.rejects(circle.retirarPara(people[0].address), /Sin saldo/);
  });
});
