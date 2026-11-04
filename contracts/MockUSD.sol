// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Dinero ficticio para la clase. No tiene respaldo ni valor comercial.
contract MockUSD is ERC20 {
    constructor() ERC20("Dolar de prueba", "mUSD") {}

    function decimals() public pure override returns (uint8) { return 6; }

    // Faucet publico: solo tiene sentido en una red de pruebas.
    function faucet() external { _mint(msg.sender, 100_000 * 10 ** 6); }
}
