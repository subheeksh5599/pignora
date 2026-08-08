// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "../ERC20.sol";

/**
 * @title MockBond
 * @notice Tokenized bond wrapper used as repo collateral in tests.
 *         Exposes `valueOf(amount)` so RepoDesk can mark collateral
 *         deterministically (in production this is a NAV-anchored oracle /
 *         on-chain accrual).
 */
contract MockBond is ERC20 {
    // price in 1e18 per whole token
    uint256 public price;
    address public admin;

    event PriceSet(uint256 price);

    error NotAdmin();

    constructor(uint256 _price) ERC20("Mock Tokenized Bond", "BOND", 6) {
        price = _price;
        admin = msg.sender;
    }

    function setAdmin(address _admin) external {
        admin = _admin;
    }

    function setPrice(uint256 _price) external {
        if (msg.sender != admin) revert NotAdmin();
        price = _price;
        emit PriceSet(_price);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// Value of `amount` bond units in cash units (6 dp), deterministic.
    function valueOf(uint256 amount) external view returns (uint256) {
        // amount (6dp) * price (1e18) / 1e18 = amount * price / 1e18
        return (amount * price) / 1e18;
    }
}
