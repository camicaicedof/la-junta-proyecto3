// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./CirculoAhorro.sol";

/// @notice Registro publico de circulos que usan el mismo token de prueba.
contract FabricaCirculos {
    address public immutable token;
    address[] public circulos;
    event CirculoCreado(address indexed circulo, address indexed creador);

    constructor(address token_) { token = token_; }

    function obtenerCirculos() external view returns (address[] memory) { return circulos; }

    function crearCirculo(
        uint256 cuota, uint256 participantes, uint256 periodo, uint256 multaBps,
        uint256 tasaBps, uint256 plazoInscripcion, uint256 ventanaRevelacion,
        CirculoAhorro.Modalidad modalidad, bool sortear
    ) external returns (address) {
        CirculoAhorro circulo = new CirculoAhorro(
            token, msg.sender, cuota, participantes, periodo, multaBps, tasaBps,
            plazoInscripcion, ventanaRevelacion, modalidad, sortear
        );
        circulos.push(address(circulo));
        emit CirculoCreado(address(circulo), msg.sender);
        return address(circulo);
    }
}
