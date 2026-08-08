// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {RepoDesk} from "../src/RepoDesk.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {MockBond} from "../src/mocks/MockBond.sol";

/**
 * @notice Deploys the Pignora stack.
 *
 *   anvil (local):  forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
 *   monad testnet: forge script script/Deploy.s.sol --rpc-url $MONAD_RPC --broadcast
 *
 * Outputs the deployed addresses; copy them into backend/.env
 * (IDENTITY_REGISTRY_ADDRESS, REPO_DESK_ADDRESS, plus the token addresses).
 *
 * NOTE: on Monad testnet the desk must settle in the REAL aUSDC
 * (0xaC0893567D43C3E7e6e35a72803df05416C1f20D). MockUSD/MockBond are for
 * local anvil runs only.
 */
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        IdentityRegistry registry = new IdentityRegistry();
        registry.setRelay(vm.addr(pk)); // relay = deployer EOA (msg.sender in scripts is the script contract)
        RepoDesk desk = new RepoDesk(address(registry));

        console2.log("IdentityRegistry:", address(registry));
        console2.log("RepoDesk:", address(desk));

        // Local anvil only: mintable stand-ins. On Monad testnet the real
        // aUSDC (0xaC0893567D43C3E7e6e35a72803df05416C1f20D) is used as cash
        // and the collateral is a deployed bond wrapper (MockBond here).
        MockUSD cash = new MockUSD();
        MockBond bond = new MockBond(1e18);
        console2.log("MockUSD (aUSDC stand-in):", address(cash));
        console2.log("MockBond:", address(bond));

        vm.stopBroadcast();
    }
}
