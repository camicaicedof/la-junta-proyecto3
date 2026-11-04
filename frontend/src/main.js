import { ethers } from "ethers";
import "./style.css";

const $ = id => document.getElementById(id);
const amount = value => Number(ethers.formatUnits(value, 6)).toLocaleString("es-CO", { maximumFractionDigits: 6 });
const short = value => `${value.slice(0, 6)}…${value.slice(-4)}`;
const states = ["Inscripción", "Revelación", "Activo", "Finalizado", "Cancelado"];
let config, provider, signer, wallet, token, factory, circle, busy = false;

function notify(message, error = false) { $("notice").textContent = message; $("notice").className = error ? "error" : ""; }
function secretKey() { return `junta:${config.chainId}:${circle.target}:${wallet}`.toLowerCase(); }
function seedStored() { try { return localStorage.getItem(secretKey()) || ""; } catch { return ""; } }
function saveSeed(seed) { try { localStorage.setItem(secretKey(), seed); } catch { /* El campo permite copia manual. */ } }
function friendly(error) { return error.reason || error.shortMessage || error.message || "No se pudo completar la operación."; }

async function verifyNetwork() {
  // Consulta directa: evita usar una cadena cacheada al cambiar la red en MetaMask.
  const chainId = Number(await window.ethereum.request({ method: "eth_chainId" }));
  if (chainId !== config.chainId) throw new Error(`Cambia MetaMask a ${config.network} (chain ID ${config.chainId}).`);
}

async function run(action) {
  if (busy) return;
  busy = true; document.querySelectorAll("button").forEach(button => { button.disabled = true; });
  try {
    if (!signer) throw new Error("Conecta MetaMask primero.");
    await verifyNetwork();
    await action();
    await loadCircles();
    notify("Operación confirmada. Estado actualizado desde la cadena.");
  } catch (error) { notify(friendly(error), true); }
  finally { busy = false; enableButtons(); }
}

function enableButtons() {
  $("connect").disabled = busy || !config;
  ["faucet", "refresh"].forEach(id => { $(id).disabled = busy || !signer; });
  $("create").querySelector("button").disabled = busy || !signer;
  // Los permisos y plazos se refinan en renderCircle.
  if (circle && !busy) renderCircle().catch(error => notify(friendly(error), true));
}

async function tx(promise) {
  notify("Confirma la transacción en MetaMask…");
  const transaction = await promise;
  notify(`Esperando confirmación: ${transaction.hash}`);
  await transaction.wait();
}

async function approve(value) {
  if (await token.allowance(wallet, circle.target) < value) {
    notify("Primero se autoriza al círculo a transferir el monto exacto en mUSD.");
    await tx(token.approve(circle.target, value));
  }
}

async function connect() {
  try {
    if (!config) throw new Error("Despliega los contratos antes de conectar.");
    if (!window.ethereum) throw new Error("Instala MetaMask para usar esta aplicación.");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await verifyNetwork();
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner(); wallet = await signer.getAddress();
    token = new ethers.Contract(config.token, config.tokenAbi, signer);
    factory = new ethers.Contract(config.factory, config.factoryAbi, signer);
    if (await provider.getCode(config.factory) === "0x") throw new Error("No hay contratos en esta dirección. Si reiniciaste el nodo, vuelve a desplegar.");
    $("connect").textContent = short(wallet);
    await loadCircles(); notify("Billetera conectada. Los montos están expresados en mUSD de prueba.");
  } catch (error) { signer = null; notify(friendly(error), true); }
  enableButtons();
}

async function loadCircles() {
  const selected = $("circles").value;
  const addresses = await factory.obtenerCirculos();
  $("circles").replaceChildren(new Option("Selecciona un círculo", ""));
  addresses.forEach((address, i) => $("circles").add(new Option(`Junta ${i + 1} · ${address}`, address)));
  if (addresses.includes(selected)) $("circles").value = selected;
  else if (addresses.length) $("circles").value = addresses[addresses.length - 1];
  $("wallet").textContent = `${short(wallet)} · ${amount(await token.balanceOf(wallet))} mUSD · ${config.network}`;
  await selectCircle();
}

async function selectCircle() {
  const address = $("circles").value;
  circle = address ? new ethers.Contract(address, config.circleAbi, signer) : null;
  $("actions").hidden = !circle;
  if (!circle) return;
  $("secret").value = seedStored();
  await renderCircle();
}

async function renderCircle() {
  if (!circle) return;
  const activeCircle = circle;
  const [state, quota, count, round, due, guarantee, reserve, needed, creator, list, order,
    balance, mode, lottery, deadline, revealDeadline, isMember, revealed, paid, fee, rate] = await Promise.all([
    circle.estado(), circle.cuota(), circle.participantes(), circle.ronda(), circle.vencimiento(),
    circle.garantiaInicial(), circle.reservaRendimientos(), circle.reservaNecesaria(), circle.creador(),
    circle.obtenerMiembros(), circle.obtenerOrden(), circle.saldoRetirable(wallet), circle.modalidad(),
    circle.sortear(), circle.limiteInscripcion(), circle.limiteRevelacion(), circle.esMiembro(wallet),
    circle.revelo(wallet), circle.pago(await circle.ronda(), wallet), circle.multa(), circle.tasaBps()
  ]);
  if (activeCircle !== circle) return;
  const block = await provider.getBlock("latest");
  const now = BigInt(block.timestamp);
  const n = Number(state);
  const time = n === 0 ? deadline : n === 1 ? revealDeadline : due;
  const date = Number(time) ? new Date(Number(time) * 1000).toLocaleString("es-CO") : "—";
  $("details").className = "";
  // Estos datos provienen de numeros y direcciones del contrato; no hay texto de usuarios.
  $("details").innerHTML = `<p class="contract-address">${circle.target}</p><div class="stats"><div class="stat"><span>Estado</span><strong>${states[n]}</strong></div><div class="stat"><span>Cuota mUSD</span><strong>${amount(quota)}</strong></div><div class="stat"><span>Miembros</span><strong>${list.length} / ${count}</strong></div><div class="stat"><span>Periodo</span><strong>${n >= 3 ? round : round + 1n} / ${count}</strong></div><div class="stat"><span>Mi saldo mUSD</span><strong>${amount(balance)}</strong></div><div class="stat"><span>Garantía inicial</span><strong>${amount(guarantee)}</strong></div></div><p>Modalidad: ${mode === 0n ? "por turnos" : "al cierre"} · Orden: ${lottery ? "sorteo verificable" : "inscripción"}<br>Multa: ${amount(fee)} mUSD · Tasa simulada: ${Number(rate) / 100}% por periodo<br>Reserva actual: ${amount(reserve)} / ${amount(needed)} mUSD requeridos al iniciar.<br>${n < 3 ? `Plazo actual: ${date} (hora local).` : "Ciclo terminado. Retira los saldos pendientes."}</p>`;
  const allowed = {
    fund: (n === 0 || n === 1) && creator === wallet && reserve < needed,
    join: n === 0 && !isMember && now < deadline && list.length < Number(count) && (list.length + 1 < Number(count) || reserve >= needed || lottery),
    reveal: n === 1 && isMember && !revealed && now < revealDeadline && (reserve >= needed),
    pay: n === 2 && isMember && !paid && now < due,
    close: n === 2 && now >= due,
    withdraw: balance > 0n,
    cancel: (n === 0 && now >= deadline) || (n === 1 && now >= revealDeadline)
  };
  for (const [id, enabled] of Object.entries(allowed)) $(id).disabled = busy || !enabled;
  const rows = await Promise.all(list.map(async member => {
    const [g, p, good, bad, b] = await Promise.all([
      activeCircle.garantia(member), activeCircle.pago(round, member), activeCircle.puntualidades(member),
      activeCircle.moras(member), activeCircle.saldoRetirable(member)
    ]);
    const tr = document.createElement("tr");
    [short(member), amount(g), n === 2 ? p ? "Pagada" : "Pendiente" : "—", `${good} / ${bad}`, amount(b)].forEach(text => {
      const td = document.createElement("td"); td.textContent = text; tr.append(td);
    });
    tr.title = member; return tr;
  }));
  if (activeCircle !== circle) return;
  $("members").replaceChildren(...rows);
  $("order").replaceChildren(...order.map(address => {
    const li = document.createElement("li"); li.textContent = address; return li;
  }));
  if (!order.length) { const li = document.createElement("li"); li.textContent = "Disponible al iniciar el ciclo."; $("order").append(li); }
}

$("connect").onclick = connect;
$("refresh").onclick = () => run(loadCircles);
$("faucet").onclick = () => run(() => tx(token.faucet()));
$("circles").onchange = () => selectCircle().catch(error => notify(friendly(error), true));
$("fund").onclick = () => run(async () => {
  const value = await circle.reservaNecesaria() - await circle.reservaRendimientos();
  if (value > 0n) { await approve(value); await tx(circle.financiarRendimientos(value)); }
});
$("join").onclick = () => run(async () => {
  let commitment = ethers.ZeroHash;
  if (await circle.sortear()) {
    const seed = $("secret").value.trim() || seedStored() || ethers.hexlify(ethers.randomBytes(32));
    if (!ethers.isHexString(seed, 32)) throw new Error("La semilla debe tener 32 bytes hexadecimales (0x y 64 caracteres).");
    $("secret").value = seed; saveSeed(seed);
    commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "address", "uint256"], [seed, wallet, circle.target, config.chainId]
    ));
  }
  await approve(await circle.garantiaInicial()); await tx(circle.inscribirse(commitment));
});
$("reveal").onclick = () => run(async () => {
  const seed = $("secret").value.trim() || seedStored();
  if (!ethers.isHexString(seed, 32)) throw new Error("Restaura tu semilla de 32 bytes antes de revelar.");
  await tx(circle.revelar(seed)); saveSeed(seed);
});
$("pay").onclick = () => run(async () => { await approve(await circle.cuota()); await tx(circle.aportar()); });
$("close").onclick = () => run(() => tx(circle.cerrarRonda()));
$("withdraw").onclick = () => run(() => tx(circle.retirar()));
$("cancel").onclick = () => run(() => tx(circle.cancelarPorPlazo()));

$("create").onsubmit = event => {
  event.preventDefault();
  run(async () => {
    const form = new FormData(event.target);
    const bps = name => Math.round(Number(form.get(name)) * 100);
    await tx(factory.crearCirculo(
      ethers.parseUnits(form.get("quota"), 6), Number(form.get("members")), Number(form.get("period")),
      bps("penalty"), bps("rate"), Number(form.get("enrollment")), Number(form.get("reveal")),
      Number(form.get("mode")), form.get("lottery") === "true"
    ));
  });
};

function estimate() {
  try {
    const form = new FormData($("create"));
    const quota = ethers.parseUnits(form.get("quota"), 6);
    const n = BigInt(form.get("members"));
    const fee = quota * BigInt(Math.round(Number(form.get("penalty")) * 100)) / 10000n;
    const guarantee = n * (quota + fee);
    const reserve = n * ((n * guarantee + n * n * quota) * BigInt(Math.round(Number(form.get("rate")) * 100)) / 10000n);
    $("estimate").textContent = `Garantía inicial por persona: ${amount(guarantee)} mUSD. Reserva que financia el creador: ${amount(reserve)} mUSD. Los aportes de cada periodo son adicionales; la garantía sobrante se devuelve al finalizar.`;
  } catch { $("estimate").textContent = "Completa los parámetros para calcular garantía y reserva."; }
}
$("create").oninput = estimate;
estimate();

async function init() {
  try {
    const response = await fetch(`/deployment.json?t=${Date.now()}`);
    if (!response.ok) throw new Error("Sin despliegue");
    config = await response.json();
    notify(`Configurado para ${config.network} · chain ID ${config.chainId}. Conecta MetaMask en esa red.`);
  } catch {
    config = null;
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    notify(local
      ? "Aún no hay despliegue. Ejecuta npm run node y, en otra terminal, npm run deploy:local. Después recarga esta página."
      : "Vista previa del proyecto. Los contratos de Sepolia aún no están configurados; las transacciones estarán disponibles después del despliegue.", true);
  }
  enableButtons();
}
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}
setInterval(() => { if (circle && !busy) renderCircle().catch(error => notify(friendly(error), true)); }, 12000);
init();
