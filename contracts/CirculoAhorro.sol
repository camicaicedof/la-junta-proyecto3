// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Una instancia = una natillera. Sin administrador con permiso de retirar ahorros.
contract CirculoAhorro is ReentrancyGuard {
    using SafeERC20 for IERC20;
    enum Estado { Inscripcion, Revelacion, Activo, Finalizado, Cancelado }
    enum Modalidad { Turnos, Cierre }

    IERC20 public immutable token;
    address public immutable creador;
    uint256 public immutable cuota;
    uint256 public immutable participantes;
    uint256 public immutable periodo;
    uint256 public immutable multa;
    uint256 public immutable tasaBps; // 100 puntos basicos = 1% por periodo (simulado).
    uint256 public immutable limiteInscripcion;
    uint256 public immutable ventanaRevelacion;
    Modalidad public immutable modalidad;
    bool public immutable sortear;

    Estado public estado;
    uint256 public limiteRevelacion;
    uint256 public vencimiento;
    uint256 public ronda;
    uint256 public revelados;
    uint256 public reservaRendimientos;
    uint256 public capitalBloqueado; // Garantias + aportes. Excluye reservas y saldos retirables.
    uint256 public ahorroAcumulado;
    bytes32 public semillaFinal;
    address[] public miembros;
    address[] public orden;

    mapping(address => bool) public esMiembro;
    mapping(address => bytes32) public compromiso;
    mapping(address => bool) public revelo;
    mapping(address => uint256) public garantia;
    mapping(address => uint256) public saldoRetirable;
    mapping(uint256 => mapping(address => bool)) public pago;
    mapping(address => uint256) public puntualidades;
    mapping(address => uint256) public moras;

    event Inscrito(address indexed miembro, bytes32 compromiso);
    event Revelado(address indexed miembro, bytes32 secreto);
    event Iniciado(bytes32 semilla, address[] orden, uint256 vencimiento);
    event Aporte(uint256 indexed ronda, address indexed miembro);
    event Mora(uint256 indexed ronda, address indexed miembro, uint256 multa);
    event RondaCerrada(uint256 indexed ronda, address beneficiario, uint256 capital, uint256 rendimiento);
    event Retiro(address indexed miembro, uint256 monto);
    event Cancelado();

    constructor(
        address token_, address creador_, uint256 cuota_, uint256 participantes_,
        uint256 periodo_, uint256 multaBps_, uint256 tasaBps_, uint256 plazoInscripcion_,
        uint256 ventanaRevelacion_, Modalidad modalidad_, bool sortear_
    ) {
        require(token_.code.length > 0 && creador_ != address(0), "Direccion invalida");
        require(cuota_ > 0 && participantes_ >= 2 && participantes_ <= 30, "Cuota o cupos invalidos");
        require(periodo_ >= 60 && plazoInscripcion_ >= 60 && ventanaRevelacion_ >= 60, "Plazo corto");
        require(multaBps_ <= 2000 && tasaBps_ <= 1000, "Tasa fuera de rango");
        token = IERC20(token_); creador = creador_; cuota = cuota_;
        participantes = participantes_; periodo = periodo_;
        multa = cuota_ * multaBps_ / 10_000; tasaBps = tasaBps_;
        limiteInscripcion = block.timestamp + plazoInscripcion_;
        ventanaRevelacion = ventanaRevelacion_; modalidad = modalidad_; sortear = sortear_;
    }

    function obtenerMiembros() external view returns (address[] memory) { return miembros; }
    function obtenerOrden() external view returns (address[] memory) { return orden; }

    // Reserva suficiente incluso si todos incumplen todas las rondas.
    function garantiaInicial() public view returns (uint256) { return participantes * (cuota + multa); }

    // Cota superior del capital bloqueado: garantias + todos los aportes del ciclo.
    function reservaNecesaria() public view returns (uint256) {
        uint256 maxCapital = participantes * garantiaInicial() + participantes * participantes * cuota;
        return participantes * (maxCapital * tasaBps / 10_000);
    }

    function financiarRendimientos(uint256 monto) external nonReentrant {
        require(msg.sender == creador && (estado == Estado.Inscripcion || estado == Estado.Revelacion), "No disponible");
        require(monto > 0, "Monto cero");
        reservaRendimientos += monto;
        token.safeTransferFrom(msg.sender, address(this), monto);
    }

    function inscribirse(bytes32 hashSecreto) external nonReentrant {
        require(estado == Estado.Inscripcion && block.timestamp < limiteInscripcion, "Inscripcion cerrada");
        require(!esMiembro[msg.sender] && miembros.length < participantes, "Sin cupo o ya inscrito");
        require(!sortear || hashSecreto != bytes32(0), "Falta compromiso");
        esMiembro[msg.sender] = true; compromiso[msg.sender] = hashSecreto;
        miembros.push(msg.sender);
        garantia[msg.sender] = garantiaInicial(); capitalBloqueado += garantiaInicial();
        token.safeTransferFrom(msg.sender, address(this), garantiaInicial());
        emit Inscrito(msg.sender, hashSecreto);
        if (miembros.length == participantes) {
            if (sortear) {
                estado = Estado.Revelacion;
                limiteRevelacion = block.timestamp + ventanaRevelacion;
            } else { _iniciar(); }
        }
    }

    // hash = keccak256(abi.encode(secreto, billetera, direccionCirculo, chainId)).
    function revelar(bytes32 secreto) external {
        require(estado == Estado.Revelacion && block.timestamp < limiteRevelacion, "Fuera de revelacion");
        require(esMiembro[msg.sender] && !revelo[msg.sender], "Miembro invalido");
        require(keccak256(abi.encode(secreto, msg.sender, address(this), block.chainid)) == compromiso[msg.sender], "Secreto incorrecto");
        revelo[msg.sender] = true; revelados++;
        // XOR hace que el resultado no dependa del orden de las revelaciones.
        semillaFinal = semillaFinal ^ secreto;
        emit Revelado(msg.sender, secreto);
        if (revelados == participantes) { _iniciar(); }
    }

    function _iniciar() private {
        require(reservaRendimientos >= reservaNecesaria(), "Financiar reserva primero");
        for (uint256 i; i < participantes; i++) { orden.push(miembros[i]); }
        if (sortear) {
            // Fisher-Yates: cualquier persona puede reconstruir la permutacion.
            for (uint256 i = participantes - 1; i > 0; i--) {
                uint256 j = uint256(keccak256(abi.encode(semillaFinal, i))) % (i + 1);
                (orden[i], orden[j]) = (orden[j], orden[i]);
            }
        }
        estado = Estado.Activo; vencimiento = block.timestamp + periodo;
        emit Iniciado(semillaFinal, orden, vencimiento);
    }

    function aportar() external nonReentrant {
        require(estado == Estado.Activo && block.timestamp < vencimiento, "Periodo cerrado");
        require(esMiembro[msg.sender] && !pago[ronda][msg.sender], "Aporte invalido");
        pago[ronda][msg.sender] = true; puntualidades[msg.sender]++;
        capitalBloqueado += cuota;
        token.safeTransferFrom(msg.sender, address(this), cuota);
        emit Aporte(ronda, msg.sender);
    }

    /// @notice Cualquiera puede ejecutar al vencer el plazo: no depende del creador.
    function cerrarRonda() external nonReentrant {
        require(estado == Estado.Activo && block.timestamp >= vencimiento, "Aun no vence");
        uint256 multas;
        uint256 puntuales;
        for (uint256 i; i < participantes; i++) {
            address miembro = miembros[i];
            if (pago[ronda][miembro]) { puntuales++; }
            else {
                garantia[miembro] -= cuota + multa;
                capitalBloqueado -= multa; // La cuota pasa de garantia a aporte.
                multas += multa; moras[miembro]++;
                emit Mora(ronda, miembro, multa);
            }
        }
        uint256 rendimiento = capitalBloqueado * tasaBps / 10_000;
        reservaRendimientos -= rendimiento;
        uint256 premio = multas + rendimiento;
        if (puntuales > 0) {
            uint256 porPersona = premio / puntuales;
            for (uint256 i; i < participantes; i++) {
                if (pago[ronda][miembros[i]]) { saldoRetirable[miembros[i]] += porPersona; }
            }
            // Polvo de redondeo: permanece en reserva y se devuelve al financiador.
            reservaRendimientos += premio % puntuales;
        } else { reservaRendimientos += premio; }

        uint256 fondo = cuota * participantes;
        address beneficiario;
        if (modalidad == Modalidad.Turnos) {
            beneficiario = orden[ronda]; saldoRetirable[beneficiario] += fondo;
            capitalBloqueado -= fondo;
        } else { ahorroAcumulado += fondo; }
        emit RondaCerrada(ronda, beneficiario, fondo, rendimiento);
        ronda++;
        if (ronda == participantes) { _finalizar(); }
        else {
            // Cada ronda tiene una ventana completa, aunque el ejecutor llegue tarde.
            vencimiento = block.timestamp + periodo;
        }
    }

    function _finalizar() private {
        estado = Estado.Finalizado;
        for (uint256 i; i < participantes; i++) {
            address miembro = miembros[i];
            uint256 devolucion = garantia[miembro]; garantia[miembro] = 0;
            if (modalidad == Modalidad.Cierre) { devolucion += ahorroAcumulado / participantes; }
            saldoRetirable[miembro] += devolucion;
        }
        ahorroAcumulado = 0; capitalBloqueado = 0;
        _devolverReserva();
    }

    function cancelarPorPlazo() external {
        bool inscripcionVencida = estado == Estado.Inscripcion && block.timestamp >= limiteInscripcion;
        bool revelacionVencida = estado == Estado.Revelacion && block.timestamp >= limiteRevelacion;
        require(inscripcionVencida || revelacionVencida, "No cancelable");
        estado = Estado.Cancelado;
        for (uint256 i; i < miembros.length; i++) {
            address miembro = miembros[i];
            saldoRetirable[miembro] += garantia[miembro]; garantia[miembro] = 0;
        }
        capitalBloqueado = 0; _devolverReserva();
        emit Cancelado();
    }

    function _devolverReserva() private {
        saldoRetirable[creador] += reservaRendimientos; reservaRendimientos = 0;
    }

    // Patron pull-payment: cada persona retira su saldo sin bloquear a las demas.
    function retirar() external nonReentrant {
        _retirar(msg.sender);
    }

    // Un ejecutor puede pagar el gas por otro, pero nunca cambiar el destinatario.
    function retirarPara(address miembro) external nonReentrant {
        _retirar(miembro);
    }

    function _retirar(address miembro) private {
        uint256 monto = saldoRetirable[miembro];
        require(monto > 0, "Sin saldo");
        saldoRetirable[miembro] = 0;
        token.safeTransfer(miembro, monto);
        emit Retiro(miembro, monto);
    }
}
