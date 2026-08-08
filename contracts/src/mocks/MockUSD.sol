// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "../ERC20.sol";

/**
 * @title MockUSD
 * @notice aUSDC stand-in for local tests (6 decimals, mintable/burnable).
 *         On Monad testnet the desk uses the real aUSDC via env config.
 */
contract MockUSD is ERC20 {
    constructor() ERC20("Mock Verified USD", "aUSDC", 6) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
