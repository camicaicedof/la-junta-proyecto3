# La Junta — Natillera comunitaria en blockchain

Prototipo académico del Proyecto #3. Contratos sencillos en Solidity, OpenZeppelin, Hardhat y una interfaz en JavaScript con ethers y MetaMask. No requiere base de datos ni servidor de aplicación.

**Usar únicamente tokens de prueba.** No es un producto financiero auditado. El token mUSD representa una unidad estable de cuenta para la demostración: cualquiera puede crearlo con el faucet y no tiene respaldo, precio garantizado ni valor real.

## 1. Qué incluye

| Requisito | Implementación |
| --- | --- |
| Crear círculos paramétricos | Una fábrica despliega un contrato nuevo por círculo. |
| Cuotas, participantes y periodicidad | Parámetros inmutables: entre 2 y 30 billeteras; periodos de al menos 60 segundos. |
| Bóveda sin tesorero | El contrato custodia tokens; el creador no puede extraer garantías ni cambiar las reglas. |
| Reglas anti-mora | Garantía previa que cubre todas las cuotas y multas máximas. |
| Premios a puntuales | Rendimientos simulados y multas repartidos solo entre quienes aportan antes del vencimiento. |
| Orden verificable | Orden de inscripción o sorteo con compromiso/revelación y Fisher-Yates. |
| Adjudicación | Fondo por turnos o reparto igual del capital al cierre de todos los periodos. |
| Estado de cuentas | Garantía, aporte del periodo, puntualidades, moras y saldo retirable por billetera. |
| Ejecución periódica | Cualquier cuenta puede liquidar; script keeper para invocar la operación. |

## 2. Instalación

Requisitos: **Node.js 22 o 24 LTS**, npm y MetaMask en un navegador con extensiones. Las dependencias están fijadas en `package.json`; se incluye `pnpm-lock.yaml` para instalaciones con pnpm.

En esta carpeta:

```powershell
npm install
npm test
npm run demo
```

La demostración ejecuta tres periodos, provoca una mora en el último y retira todos los saldos. Debe terminar con `Saldo final del contrato: 0`.

**Alternativa para este equipo, donde npm no está en PATH:** el archivo `proyecto.ps1` detecta también el Node/pnpm del entorno Codex.

```powershell
.\proyecto.ps1 install
.\proyecto.ps1 test
.\proyecto.ps1 demo
```

En la sesión de desarrollo las dependencias ya quedaron instaladas. Si PowerShell bloquea scripts, se pueden usar los comandos `npm` o `node scripts/hardhat.js test` directamente, sin modificar la política del sistema.

## 3. Despliegue local y aplicación

Abrir tres terminales en esta carpeta.

**Terminal 1: mantener el nodo encendido.**

```powershell
npm run node
# Alternativa: .\proyecto.ps1 node
```

**Terminal 2: desplegar token y fábrica.**

```powershell
npm run deploy:local
# Alternativa: .\proyecto.ps1 deploy:local
```

Esto escribe direcciones y ABI en `deployments/localhost.json` y `frontend/public/deployment.json`.

**Terminal 3: iniciar la interfaz.**

```powershell
npm run dev
# Alternativa: .\proyecto.ps1 dev
```

Abrir la dirección que imprime Vite, normalmente [http://127.0.0.1:5173](http://127.0.0.1:5173). Si el puerto está ocupado, Vite utiliza el siguiente libre.

Configurar una red personalizada en MetaMask:

| Campo | Valor |
| --- | --- |
| Nombre | Hardhat local |
| RPC | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Símbolo | `ETH` |

Importar tres cuentas de desarrollo usando las claves **públicas de prueba** que imprime Hardhat. Usarlas exclusivamente en la red local. Cada una ya tiene ETH ficticio para gas. No hace falta pegar claves en el código ni en la aplicación web.

Al reiniciar el nodo se pierde su estado. Volver a desplegar, recargar la página y, si MetaMask conserva nonces anteriores, borrar su actividad de la red local. La interfaz muestra las direcciones del último despliegue; cada despliegue crea una fábrica nueva.

## 4. Guion de demostración con MetaMask

1. Conectar la primera cuenta y pedir mUSD con el botón del faucet.
2. Crear un círculo: cuota 100 mUSD, 3 participantes, periodo 120 segundos, multa 5%, rendimiento simulado 1%, modalidad por turnos y orden de inscripción.
3. Con la cuenta creadora, **financiar la reserva**. La interfaz calcula 55,35 mUSD. MetaMask pedirá primero autorización del token y después la transacción de financiación.
4. Inscribir las tres cuentas, cambiando de cuenta en MetaMask. Cada una necesita solicitar sus tokens y depositar 315 mUSD de garantía. La última inscripción inicia el primer periodo.
5. Aportar 100 mUSD desde cada cuenta antes del plazo. La garantía y los aportes son depósitos distintos.
6. Una vez vencido, actualizar y pulsar **Liquidar periodo vencido**. Cualquier billetera puede hacerlo. El primer miembro recibe 300 mUSD en saldo retirable, además del premio que le corresponda.
7. Repetir en el segundo periodo. En el tercero, dejar sin aportar a quien ya recibió un turno. Al liquidar, su garantía cubrirá los 100 mUSD más 5 mUSD de multa.
8. Retirar los saldos desde cada cuenta. Al terminar, también se habilita la devolución de las garantías sobrantes y de la reserva no utilizada al creador.

No se puede pagar tarde una ronda cerrada: la mora se resuelve cobrando de la garantía. Los plazos usan el timestamp de la cadena; la interfaz muestra el vencimiento en la hora local del navegador. Si cambia de cuenta, conectar de nuevo. Con periodos muy cortos, preparar las cuentas y sus mUSD antes de completar la última inscripción.

Para mostrar la modalidad **al cierre**, crear otro círculo y seleccionarla: ningún participante recibe el capital de la ronda por adelantado. Los premios sí quedan retirables en cada liquidación. Al finalizar, cada miembro recibe `N × cuota` de ahorro, más su garantía restante y premios.

Para mostrar el **sorteo**, seleccionarlo antes de crear. Al inscribirse, cada billetera genera una semilla aleatoria de 32 bytes y registra únicamente su hash. Conservar la semilla visible como respaldo. Al llenarse los cupos, cada persona pulsa **Revelar mi semilla**. La última revelación inicia el ciclo y fija el orden. La semilla se guarda por cadena, contrato y cuenta en el navegador; si se pierde, puede restaurarse en el campo antes de revelar. No es una contraseña de la billetera y se hará pública en la revelación.

## 5. Desplegar en Sepolia

Sepolia permite demostrar contratos públicos sin utilizar dinero real. Se necesita una cuenta exclusiva de pruebas, ETH de Sepolia para gas y un RPC de Sepolia. No compartir claves privadas por chat.

1. Copiar `.env.example` como `.env`.
2. Completar `SEPOLIA_RPC_URL` y `PRIVATE_KEY` localmente. `.env` está excluido del control de versiones.
3. Ejecutar:

```powershell
npm run deploy:sepolia
# Alternativa: .\proyecto.ps1 deploy:sepolia
npm run dev
```

4. Seleccionar Sepolia (chain ID `11155111`) en MetaMask, conectar y pedir mUSD con el faucet. Cada cuenta necesita ETH de prueba para sus transacciones.

El despliegue exporta automáticamente la configuración de Sepolia para la interfaz. No se ha hecho un despliegue público durante la preparación: no se proporcionó una cuenta de pruebas financiada. No es necesario sustituir mUSD por un token real para sustentar el proyecto.

Para distribuir la interfaz estática después de desplegar:

```powershell
npm run build
```

Publicar el contenido de `frontend/dist` en un hosting estático HTTPS. El archivo `deployment.json` queda incluido; nunca publicar `.env`. Para una nueva red, volver a desplegar y construir. Un sitio público debe apuntar a Sepolia: la red local de una persona no es accesible desde los equipos de los demás.

Para publicar desde GitHub en Vercel, seguir `PUBLICAR.md`. El archivo `vercel.json` ya configura la construcción en nube y el script evita publicar direcciones del nodo local.

## 6. Reglas económicas y contabilidad

Variables: `N` participantes, `Q` cuota, `M = floor(Q × multaBps / 10.000)` multa por incumplimiento.

**Garantía por persona:** `G = N × (Q + M)`. Se bloquea al inscribirse. Cubre incluso el incumplimiento de todos durante todo el ciclo. Cada periodo tiene un aporte adicional `Q`: pagar mantiene la garantía intacta; incumplir reduce la garantía en `Q + M`.

Ejemplo: `N=3`, `Q=100`, multa 5% → `M=5`, `G=315 mUSD`. Con una mora quedan 210 de garantía; al finalizar se devuelve la parte no consumida. Esta garantía elevada resuelve la insolvencia del prototipo, pero **reduce la utilidad como crédito para personas sin capital inicial**. Una multa sin garantía no impide que alguien reciba su turno y abandone. La blockchain por sí sola no cobra deudas fuera de cadena.

**Rendimiento simulado:** al liquidar cada periodo se toma el capital bloqueado en ese momento, después de descontar las multas y antes de adjudicar el fondo: `R = floor(capitalBloqueado × tasaBps / 10.000)`. Incluye garantías y aportes acumulados. Excluye reserva de rendimientos y saldos ya adjudicados. Es una tasa didáctica por periodo, sin capitalización, no una tasa anual ni interés calculado segundo a segundo.

Los tokens del rendimiento salen de una **reserva real en mUSD ficticio**, financiada antes de iniciar. No se crean rendimientos de la nada ni se utilizan garantías ajenas para pagarlos. La reserva mínima usa la cota `maxCapital = N × G + N² × Q`; se financian `N × floor(maxCapital × tasaBps / 10.000)`. Es conservadora: el sobrante vuelve al creador al finalizar o cancelar.

**Premio de la ronda:** `multas + R`, repartido por igual entre los puntuales de esa ronda. Si no hubo puntuales, vuelve a la reserva. El polvo de redondeo también va a reserva. Las contribuciones pendientes se cubren con garantía y el fondo siempre es `N × Q`.

La contabilidad separa `capitalBloqueado`, `reservaRendimientos` y `saldoRetirable`. Tras retirar todos los saldos de un ciclo normal, el saldo del contrato queda en cero. Las transferencias directas de tokens al contrato no se contabilizan; utilizar exclusivamente las funciones previstas.

## 7. Sorteo y automatización: alcance honesto

- El compromiso liga la semilla a billetera, contrato y chain ID mediante `keccak256(abi.encode(...))`. Todos se comprometen antes de que empiece la revelación.
- La semilla final es el XOR de las semillas reveladas; no depende del orden de revelación. Fisher-Yates y sus hashes determinan la permutación pública. Las pruebas reconstruyen el orden fuera del contrato.
- **Limitación:** el último revelador puede conocer el resultado y negarse a revelar. No puede cambiar su semilla comprometida, pero puede forzar una cancelación selectiva y promover otro círculo. No se afirma que sea aleatoriedad imparcial resistente a adversarios. Para una versión real, integrar un servicio VRF con su verificación y gestión de disponibilidad; no usar `block.timestamp` como aleatoriedad.
- Si faltan inscripciones o revelaciones, cualquiera puede cancelar después del plazo; cada miembro recupera su garantía y el creador su reserva. Nadie puede cancelar un ciclo activo a discreción.
- Un contrato no se despierta solo por el paso del tiempo. `cerrarRonda()` aplica automáticamente las reglas cuando una transacción lo invoca y acredita los saldos. Cada persona puede retirar el suyo; también existe `retirarPara(miembro)` para que un ejecutor pague el gas. Los tokens siempre van a ese miembro, nunca al ejecutor. Cada transferencia es una operación independiente.
- `npm run keeper:local` o `npm run keeper:sepolia` revisa todos los círculos **una vez**, liquida los vencidos o cancela los abandonados, y desembolsa los saldos disponibles con `retirarPara`. Para ejecución continua, programar el comando periódicamente con un servicio externo y una cuenta con gas. La interfaz también permite liquidar y retirar manualmente. El siguiente periodo empieza al liquidar, para dar una ventana completa si el ejecutor llegó tarde.

## 8. Cómo leer el código

```text
contracts/
  MockUSD.sol           Token ERC20 de 6 decimales y faucet público
  CirculoAhorro.sol     Reglas, custodia, sorteo y contabilidad
  FabricaCirculos.sol   Creación y registro de círculos
scripts/
  deploy.js            Despliegue y exportación de ABI/direcciones
  demo.js              Demostración completa, red efímera independiente
  keeper.js            Una pasada de liquidación/cancelación
  hardhat.js           Adaptador para cache local en Windows
test/
  CirculoAhorro.test.js Casos de negocio, restricciones y conservación de tokens
frontend/
  index.html           Estructura de la aplicación
  src/main.js          Conexión con billetera y llamadas a los contratos
  src/style.css        Estilos responsivos
proyecto.ps1           Comandos alternativos para PowerShell
```

Estados: `Inscripcion → Revelacion (si sorteo) → Activo → Finalizado`. Desde inscripción/revelación se puede pasar a `Cancelado` al vencer sus plazos.

Se usa OpenZeppelin para `ERC20`, `SafeERC20` y `ReentrancyGuard`. Las transferencias aplican autorización previa `approve` y luego `transferFrom`. Los retiros ponen el saldo en cero antes de transferir, con protección de reentrada. No hay proxy actualizable, dueño con retiro arbitrario ni función para cambiar parámetros. Esto reduce superficies de riesgo, pero no equivale a una auditoría ni elimina errores de software.

## 9. Verificación realizada y límites

- Compilación de 12 archivos Solidity con solc 0.8.26.
- 13 pruebas exitosas: ambos modos, incumplimiento tras recibir turno, todos morosos, varias combinaciones de moras, prohibición de aportes inválidos, reserva, cancelaciones, reproducción del sorteo, retiros, desembolso mediante ejecutor y fábrica.
- Demostración completa: una mora y saldo final del contrato de cero.
- Despliegue de MockUSD y fábrica en red local; interfaz servida por HTTP y revisada visualmente.
- Build de producción de la interfaz. El navegador de revisión no dispone de MetaMask: el recorrido de transacciones de la interfaz con la extensión queda para la demostración en un navegador que la tenga. Las operaciones de contratos sí se probaron con cuentas de Hardhat.
- No se ejecutó despliegue ni verificación de fuente en un explorador de Sepolia.

No hay identificación de personas (una billetera no equivale a una persona), respaldo fiat, integración bancaria ni generación de rendimiento DeFi. La reputación son contadores públicos por círculo; no se entrenó un modelo crediticio ni se consulta información personal. El artículo de Berkeley sirve de contexto, no de validación de estas reglas.

## Referencias

- [Contexto: reputación, redes sociales y acceso al crédito — Berkeley Haas](https://haas.berkeley.edu/ibsi/research/good-reputation-expanding-access-to-credit-leveraging-reputational-and-social-network-data/).
- [OpenZeppelin Contracts 5.x — ERC20 y SafeERC20](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20).
- [Hardhat 2 — documentación del entorno utilizado](https://v2.hardhat.org/hardhat-runner/docs/getting-started).

Se fija Hardhat 2 para conservar configuración y scripts JavaScript cortos, y OpenZeppelin 5.0.2 para reproducibilidad. La documentación actual de Hardhat presenta también Hardhat 3, cuya configuración es diferente: no mezclar los ejemplos de ambas versiones.
