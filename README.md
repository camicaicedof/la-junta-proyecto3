# La Junta — Ahorro comunitario en blockchain

La Junta es un prototipo académico inspirado en las natilleras y cadenas de ahorro de Colombia. Un grupo define sus cuotas y plazos, y un contrato inteligente registra los aportes, aplica las reglas de mora y asigna los saldos que corresponden a cada participante.

El proyecto utiliza **tokens ficticios y redes de prueba**. No se debe utilizar con dinero real.

- **Aplicación:** [la-junta-proyecto3.vercel.app](https://la-junta-proyecto3.vercel.app/)
- **Código fuente:** [camicaicedof/la-junta-proyecto3](https://github.com/camicaicedof/la-junta-proyecto3)
- **Instalación, código y despliegue:** [Guía del desarrollador](DESARROLLADOR.md)

## Estado actual

Estado documentado al **4 de noviembre de 2026**.

| Parte del proyecto | Estado |
| --- | --- |
| Página web compartible | Publicada en Vercel y comprobada sin iniciar sesión. |
| Código fuente | Publicado en GitHub. |
| Contratos y reglas de ahorro | Implementados y probados en una red local. |
| Pruebas de contratos | 13 pruebas aprobadas en la verificación de desarrollo. |
| Contratos públicos en Sepolia | Pendientes de financiación con ETH de prueba y despliegue. |
| Operaciones en la web pública | Deshabilitadas hasta configurar los contratos de Sepolia. |
| Liquidación periódica sin intervención | Existe un ejecutor; todavía no está alojado ni programado. |

**La página publicada es una vista previa.** Se puede consultar su diseño y calcular las condiciones de un círculo, pero todavía no permite crear círculos ni realizar transacciones públicas. El recorrido completo se puede demostrar en el entorno local preparado para desarrollo.

## Qué incluye

| Función | Qué permite hacer |
| --- | --- |
| Crear un círculo | Definir cuota, participantes, duración del periodo, multa, rendimiento simulado y modalidad de entrega. |
| Participar con una billetera | Conectar MetaMask, solicitar mUSD ficticio e inscribirse depositando una garantía. |
| Registrar aportes | Pagar una cuota por periodo y consultar si se registró a tiempo. |
| Custodiar los depósitos | Guardar los tokens en el contrato; el creador no puede retirarlos a discreción ni cambiar las reglas. |
| Cubrir incumplimientos | Descontar de la garantía la cuota pendiente y la multa. |
| Premiar la puntualidad | Distribuir las multas y el rendimiento simulado entre quienes aportaron a tiempo en cada periodo. |
| Entregar por turnos | Asignar el fondo de cada periodo a un participante diferente. |
| Entregar al cierre | Acumular el capital y repartirlo por igual al terminar el ciclo. |
| Elegir el orden | Utilizar el orden de inscripción o un sorteo con compromiso y revelación de semillas. |
| Consultar cuentas | Ver participantes, garantías, cuotas del periodo, puntualidades, moras, orden y saldos retirables. |
| Recuperar depósitos si no se inicia | Cancelar después del plazo si faltan inscripciones o revelaciones, y habilitar la devolución. |
| Liquidar y retirar | Liquidar periodos vencidos y retirar los saldos asignados. Un ejecutor también puede pagar el gas para enviar el saldo al beneficiario. |

Cada círculo admite **entre 2 y 30 billeteras**, y dura tantos periodos como participantes tenga. Las condiciones quedan fijas al crearlo. La cuota debe ser positiva; el periodo y los plazos de inscripción y revelación son de al menos 60 segundos. La multa admite hasta 20% de la cuota y el rendimiento simulado hasta 10% por periodo.

## Qué no incluye y qué limitaciones tiene

- **Dinero real, pesos colombianos ni una stablecoin respaldada.** mUSD tiene seis decimales y se entrega gratuitamente para la demostración. No tiene valor comercial ni se puede cambiar por dinero mediante esta aplicación.
- **Conexión con bancos, Nequi, Daviplata o pasarelas de pago.** Todos los aportes del prototipo se realizan con el token de prueba.
- **Rendimientos financieros reales.** El creador deposita una reserva de mUSD ficticio que financia los premios simulados. No existe una inversión DeFi ni protección garantizada frente a la inflación.
- **Crédito sin garantía.** Cada participante debe bloquear previamente todas sus cuotas y las multas máximas posibles. Esta exigencia protege los desembolsos, pero limita la utilidad para personas sin capital inicial.
- **Identificación de personas.** Una billetera no equivale a una persona; no se verifica identidad ni se impide que alguien utilice varias cuentas.
- **Grupos privados por invitación.** La inscripción está abierta a cualquier billetera que deposite la garantía mientras haya cupo y plazo. No hay lista de miembros autorizados.
- **Un sistema de evaluación crediticia.** La puntualidad y la mora son contadores públicos de cada círculo; no hay un modelo de crédito ni reputación compartida entre círculos.
- **Un sorteo resistente a cualquier manipulación.** Se puede verificar el cálculo, pero alguien puede negarse a revelar su semilla y forzar una cancelación. No se ha integrado un servicio externo de aleatoriedad verificable.
- **Pagos que se ejecuten solos por el paso del tiempo.** Alguien debe enviar una transacción para liquidar. El ejecutor disponible puede automatizar las llamadas si se programa y dispone de gas.
- **Salida libre durante un ciclo activo.** No se pueden cambiar las condiciones, abandonar retirando la garantía ni cancelar un ciclo activo a voluntad.
- **Recuperación de claves o soporte de custodia.** Cada persona controla su billetera. El proyecto no puede recuperar una clave privada perdida.
- **Auditoría de seguridad ni preparación para producción.** Las pruebas realizadas no sustituyen una auditoría. No se ha completado una demostración de transacciones con MetaMask en Sepolia.

## Cómo funciona el dinero de prueba

Hay tres depósitos distintos:

1. **Garantía de cada participante:** se deposita al inscribirse. Cubre todas sus cuotas y multas máximas. La parte no consumida se devuelve al finalizar.
2. **Cuotas periódicas:** se pagan durante el ciclo y son adicionales a la garantía. Si una persona no paga, el contrato utiliza su garantía para cubrir la cuota y la multa.
3. **Reserva del creador:** financia el rendimiento simulado. El sobrante vuelve al creador al finalizar o cancelar.

Ejemplo con **3 participantes, cuota de 100 mUSD y multa de 5%**:

| Concepto | Monto |
| --- | --- |
| Garantía inicial por persona | 315 mUSD |
| Aporte por persona en cada periodo | 100 mUSD |
| Multa por una cuota incumplida | 5 mUSD |
| Fondo de cada periodo | 300 mUSD |
| Garantía restante tras una mora | 210 mUSD |

Con rendimiento simulado de 1%, el creador debe financiar inicialmente una reserva de **55,35 mUSD** para ese ejemplo. La interfaz calcula los depósitos antes de crear el círculo.

En la modalidad por turnos, una persona recibe el fondo de cada periodo. Al cierre, cada participante recibe el mismo capital acumulado: en este ejemplo, 300 mUSD por persona. En ambos casos, las garantías restantes y los premios se contabilizan por separado.

**mUSD y ETH de prueba cumplen funciones diferentes:** mUSD sirve para garantías, cuotas y premios; ETH de la red de prueba sirve para pagar las transacciones de la billetera.

## Cómo usar la aplicación cuando los contratos estén habilitados

Para la versión compartida se necesita un navegador con MetaMask, la red Sepolia y una cuenta con ETH de Sepolia para gas. Para la demostración local, seguir la [guía del desarrollador](DESARROLLADOR.md#3-ejecutar-en-local).

1. Conectar MetaMask en la red que indique la página.
2. Solicitar mUSD con **Recibir 100.000 mUSD de prueba**.
3. Crear un círculo o seleccionar uno disponible en esa fábrica y red.
4. Si eres el creador, financiar la reserva antes de iniciar el ciclo.
5. Depositar la garantía e inscribirte. MetaMask puede pedir primero autorización del token y después confirmar el depósito.
6. Si hay sorteo, guardar la semilla y revelarla cuando estén completos los cupos. La semilla del sorteo es distinta de la frase de recuperación de MetaMask.
7. Aportar la cuota antes del vencimiento de cada periodo.
8. Después del vencimiento, pulsar **Liquidar periodo vencido**. Cualquier billetera puede hacerlo, aunque no sea el creador.
9. Pulsar **Retirar mi saldo** cuando haya un monto disponible.

La liquidación asigna el saldo en el contrato. Los tokens llegan a la billetera cuando se ejecuta el retiro, desde la interfaz o mediante el ejecutor. Si una cuota no llega antes del plazo, se cubre desde la garantía al liquidar; no hay un pago tardío de esa ronda para eliminar la multa.

Si se cambia de cuenta o de red, la página se recarga y puede ser necesario conectar de nuevo. Conservar una copia de la semilla del sorteo: se guarda en el navegador, pero puede perderse al borrar sus datos o cambiar de equipo.

## Preguntas frecuentes

**¿Por qué los botones de la página pública están deshabilitados?**  
Porque todavía no se han desplegado y configurado los contratos de Sepolia. Publicar la página y desplegar los contratos son pasos diferentes.

**¿Qué pasa si alguien cobra su turno y deja de aportar?**  
Sus siguientes cuotas pendientes y multas se descuentan de la garantía depositada al inscribirse. La garantía no se libera por haber recibido el turno.

**¿Qué pasa si no se completa el grupo o alguien no revela?**  
Al vencer el plazo correspondiente, cualquier cuenta puede cancelar y habilitar la devolución de garantías y reserva. Cada devolución debe retirarse o ser enviada por el ejecutor.

**¿El creador puede llevarse el ahorro del grupo?**  
El contrato no ofrece un retiro arbitrario ni permite modificar las condiciones. El creador solo recibe los saldos que le correspondan y el sobrante de la reserva que financió. Esto no elimina los riesgos de errores del código.

**¿Dónde están las instrucciones para instalar o modificar el proyecto?**  
En [DESARROLLADOR.md](DESARROLLADOR.md).

## Contexto académico

Proyecto #3 de Tecnologías Emergentes: ahorro comunitario, reglas anti-mora y transparencia mediante blockchain. El recurso de [Berkeley Haas sobre reputación y acceso al crédito](https://haas.berkeley.edu/ibsi/research/good-reputation-expanding-access-to-credit-leveraging-reputational-and-social-network-data/) se utiliza como contexto; el prototipo no implementa ni valida un modelo crediticio basado en esa investigación.
