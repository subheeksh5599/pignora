// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {RepoDesk} from "../src/RepoDesk.sol";
import {MockUSD} from "../src/mocks/MockUSD.sol";
import {MockBond} from "../src/mocks/MockBond.sol";

contract RepoDeskTest is Test {
    IdentityRegistry registry;
    RepoDesk desk;
    MockUSD cash;
    MockBond bond;

    address relay = address(0xA11CE);
    address borrower = address(0xB0B);
    address lender = address(0x1eD);
    address anyone = address(0xA11);

    uint256 constant BOND_AMOUNT = 1_000_000e6; // 1M bond units
    uint256 constant CASH_AMOUNT = 980_000e6; // 98% at tier-50 haircut (2%)

    event MarginCalled(uint256 indexed repoId, uint64 deadline);
    event EscrowClaimed(uint256 indexed repoId, address indexed claimant, uint256 amount);

    function setUp() public {
        registry = new IdentityRegistry();
        registry.setRelay(relay);

        cash = new MockUSD();
        bond = new MockBond(1e18); // 1 bond unit = 1 cash unit

        desk = new RepoDesk(address(registry));

        _setProfile(borrower, IdentityRegistry.Status.Active, 50, bytes32("cv-borrower"));
        _setProfile(lender, IdentityRegistry.Status.Active, 50, bytes32("cv-lender"));

        bond.mint(borrower, BOND_AMOUNT);
        cash.mint(lender, 10_000_000e6);
        vm.prank(borrower);
        bond.approve(address(desk), type(uint256).max);
        vm.prank(lender);
        cash.approve(address(desk), type(uint256).max);
    }

    function _setProfile(address who, IdentityRegistry.Status status, uint8 tier, bytes32 cv) internal {
        vm.prank(relay);
        registry.setProfile(who, status, tier, uint64(block.timestamp) + 365 days, cv);
    }

    function _open() internal returns (uint256) {
        vm.prank(lender);
        return desk.openRepo(
            borrower,
            address(bond),
            address(cash),
            BOND_AMOUNT,
            CASH_AMOUNT,
            50, // 0.5% fee
            7 days,
            bytes32("travel-rule-1")
        );
    }

    // ------------------------------------------------------------ happy path

    function test_OpenRepoHappyPath() public {
        uint256 repoId = _open();

        RepoDesk.Repo memory r = desk.getRepo(repoId);
        assertEq(r.borrower, borrower);
        assertEq(r.lender, lender);
        assertEq(r.collateralAmount, BOND_AMOUNT);
        assertEq(r.cashAmount, CASH_AMOUNT);
        assertEq(r.feeBps, 50);
        assertEq(desk.travelRuleHash(repoId), bytes32("travel-rule-1"));
        assertEq(bond.balanceOf(address(desk)), BOND_AMOUNT);
        assertEq(cash.balanceOf(address(desk)), CASH_AMOUNT);
    }

    function test_RepayHappyPath() public {
        uint256 repoId = _open();
        cash.mint(borrower, 1_000_000e6);
        vm.prank(borrower);
        cash.approve(address(desk), type(uint256).max);

        vm.prank(borrower);
        desk.repay(repoId);

        // fee = 0.5% of 980k = 4.9k; lender got 984.9k back
        assertEq(cash.balanceOf(lender), 10_000_000e6 - CASH_AMOUNT + 984_900e6);
        assertEq(bond.balanceOf(borrower), BOND_AMOUNT);
        assertEq(desk.getRepo(repoId).closed, true);
    }

    // ------------------------------------------------------------ identity gates

    function test_OpenRepoRevertsUnverifiedBorrower() public {
        _setProfile(borrower, IdentityRegistry.Status.Unverified, 0, bytes32(0));
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NotActive.selector, borrower));
        desk.openRepo(borrower, address(bond), address(cash), BOND_AMOUNT, CASH_AMOUNT, 50, 7 days, bytes32("x"));
    }

    function test_OpenRepoRevertsFrozenBorrower() public {
        _setProfile(borrower, IdentityRegistry.Status.Frozen, 50, bytes32("cv-borrower"));
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NotActive.selector, borrower));
        desk.openRepo(borrower, address(bond), address(cash), BOND_AMOUNT, CASH_AMOUNT, 50, 7 days, bytes32("x"));
    }

    function test_OpenRepoRevertsUnverifiedLender() public {
        _setProfile(lender, IdentityRegistry.Status.Unverified, 0, bytes32(0));
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NotVerified.selector, lender));
        desk.openRepo(borrower, address(bond), address(cash), BOND_AMOUNT, CASH_AMOUNT, 50, 7 days, bytes32("x"));
    }

    function test_OpenRepoRevertsHaircutExceeded() public {
        vm.prank(lender);
        vm.expectRevert(RepoDesk.BadHaircut.selector);
        desk.openRepo(borrower, address(bond), address(cash), BOND_AMOUNT, 999_000e6, 50, 7 days, bytes32("x"));
    }

    function test_TierPricedHaircut() public {
        // tier 5 -> 10% haircut -> max lend 90% of value
        _setProfile(borrower, IdentityRegistry.Status.Active, 5, bytes32("cv-low"));
        uint256 maxLend = (BOND_AMOUNT * 9000) / 10000;
        vm.prank(lender);
        uint256 repoId = desk.openRepo(borrower, address(bond), address(cash), BOND_AMOUNT, maxLend, 50, 7 days, bytes32("x"));
        assertEq(desk.getRepo(repoId).cashAmount, maxLend);
        // 91% would exceed tier-1 haircut -> revert
        vm.prank(lender);
        vm.expectRevert(RepoDesk.BadHaircut.selector);
        desk.openRepo(borrower, address(bond), address(cash), BOND_AMOUNT, (BOND_AMOUNT * 9100) / 10000, 50, 7 days, bytes32("x"));
    }

    // ------------------------------------------------------------- margin call

    function test_MarginCallOnPriceDrop() public {
        uint256 repoId = _open();
        bond.setPrice(0.95e18); // test contract is bond admin

        vm.expectEmit(true, true, false, true);
        emit MarginCalled(repoId, uint64(block.timestamp) + 1 hours);
        desk.markCollateral(repoId);
        assertTrue(desk.getRepo(repoId).marginDeadline != 0);
    }

    function test_AddCollateralClearsMarginCall() public {
        uint256 repoId = _open();
        bond.setPrice(0.95e18);
        desk.markCollateral(repoId);
        assertTrue(desk.getRepo(repoId).marginDeadline != 0);

        bond.mint(borrower, 100_000e6);
        vm.prank(borrower);
        bond.approve(address(desk), type(uint256).max);
        vm.prank(borrower);
        desk.addCollateral(repoId, 100_000e6);
        // value now (1.1M * 0.95) = 1,045k >= 1,029k -> cleared
        assertEq(desk.getRepo(repoId).marginDeadline, 0);
    }

    // ---------------------------------------------------------------- closeout

    function test_CloseoutOnCredentialRevocation() public {
        uint256 repoId = _open();

        // borrower's A-Pass revoked mid-term (relay pushes the event)
        _setProfile(borrower, IdentityRegistry.Status.Revoked, 50, bytes32("cv-borrower"));

        desk.executeCloseout(repoId);

        // obligation = 980k + 4.9k = 984.9k; cv = 1M -> lender gets 984,900 bonds;
        // borrower's 15,100 excess fails closed to escrow (borrower not Active)
        assertEq(bond.balanceOf(lender), 984_900e6);
        assertEq(bond.balanceOf(borrower), 0);
        assertEq(desk.escrowed(repoId, borrower), 15_100e6);
        assertEq(desk.getRepo(repoId).closed, true);
        assertEq(cash.balanceOf(address(desk)), CASH_AMOUNT); // cash stays: lender keeps collateral
    }

    function test_CloseoutExcessReturnedWhenActive() public {
        uint256 repoId = _open();
        // frozen borrower can still be closed out; excess is escrowed until active
        _setProfile(borrower, IdentityRegistry.Status.Frozen, 50, bytes32("cv-borrower"));
        desk.executeCloseout(repoId);
        assertEq(bond.balanceOf(lender), 984_900e6);
        assertEq(desk.escrowed(repoId, borrower), 15_100e6);

        // thaw -> claim excess
        _setProfile(borrower, IdentityRegistry.Status.Active, 50, bytes32("cv-borrower"));
        vm.expectEmit(true, true, false, true);
        emit EscrowClaimed(repoId, borrower, 15_100e6);
        vm.prank(borrower);
        desk.claimEscrow(repoId, address(bond));
        assertEq(bond.balanceOf(borrower), 15_100e6);
        assertEq(desk.escrowed(repoId, borrower), 0);
    }

    function test_CloseoutOnMarginDeadline() public {
        uint256 repoId = _open();
        bond.setPrice(0.5e18); // deep drop
        desk.markCollateral(repoId);
        vm.warp(block.timestamp + 2 hours);

        desk.executeCloseout(repoId);
        assertEq(desk.getRepo(repoId).closed, true);
        // shortfall: cv = 500k < 984.9k -> lender gets all collateral
        assertEq(bond.balanceOf(lender), BOND_AMOUNT);
    }

    function test_CloseoutOnOverdue() public {
        uint256 repoId = _open();
        vm.warp(block.timestamp + 8 days);
        desk.executeCloseout(repoId);
        assertEq(desk.getRepo(repoId).closed, true);
        assertEq(bond.balanceOf(lender), 984_900e6);
    }

    function test_CloseoutRevertsWhenNoBreach() public {
        uint256 repoId = _open();
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NoMarginCall.selector, repoId));
        desk.executeCloseout(repoId);
    }

    function test_RepayAfterMarginDeadlineReverts() public {
        uint256 repoId = _open();
        bond.setPrice(0.5e18);
        desk.markCollateral(repoId);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(borrower);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NoMarginCall.selector, repoId));
        desk.repay(repoId);
    }

    // ---------------------------------------------------------------- escrow

    function test_RepayByNonBorrowerReverts() public {
        uint256 repoId = _open();
        vm.prank(anyone);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NotBorrower.selector, repoId));
        desk.repay(repoId);
    }

    function test_AddCollateralByNonBorrowerReverts() public {
        uint256 repoId = _open();
        vm.prank(anyone);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NotBorrower.selector, repoId));
        desk.addCollateral(repoId, 1000);
    }

    function test_DoubleCloseoutReverts() public {
        uint256 repoId = _open();
        _setProfile(borrower, IdentityRegistry.Status.Revoked, 50, bytes32("cv-borrower"));
        desk.executeCloseout(repoId);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NotOpen.selector, repoId));
        desk.executeCloseout(repoId);
    }

    function test_RepayAfterCloseoutReverts() public {
        uint256 repoId = _open();
        _setProfile(borrower, IdentityRegistry.Status.Revoked, 50, bytes32("cv-borrower"));
        desk.executeCloseout(repoId);
        cash.mint(borrower, 1_000_000e6);
        vm.prank(borrower);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NotOpen.selector, repoId));
        desk.repay(repoId);
    }

    function test_OpenRepoZeroAmountReverts() public {
        vm.prank(lender);
        vm.expectRevert(RepoDesk.ZeroAmount.selector);
        desk.openRepo(borrower, address(bond), address(cash), 0, CASH_AMOUNT, 50, 7 days, bytes32("x"));
    }

    function test_UnregisteredCollateralReverts() public {
        // a token without valueOf() cannot be repo collateral
        MockUSD bogus = new MockUSD();
        vm.prank(lender);
        vm.expectRevert(RepoDesk.NotRegistered.selector);
        desk.openRepo(borrower, address(bogus), address(cash), BOND_AMOUNT, CASH_AMOUNT, 50, 7 days, bytes32("x"));
    }

    function test_LenderFrozenFailsClosedToEscrow() public {
        uint256 repoId = _open();
        _setProfile(borrower, IdentityRegistry.Status.Revoked, 50, bytes32("cv-borrower"));
        _setProfile(lender, IdentityRegistry.Status.Frozen, 50, bytes32("cv-lender"));

        desk.executeCloseout(repoId);

        // lender proceeds held in escrow, not sent
        assertEq(bond.balanceOf(lender), 0);
        assertEq(desk.escrowed(repoId, lender), 984_900e6);
        assertEq(desk.escrowed(repoId, borrower), 15_100e6);

        // cannot claim while frozen
        vm.prank(lender);
        vm.expectRevert(abi.encodeWithSelector(RepoDesk.NotActive.selector, lender));
        desk.claimEscrow(repoId, address(bond));

        // thaw -> claim
        _setProfile(lender, IdentityRegistry.Status.Active, 50, bytes32("cv-lender"));
        vm.prank(lender);
        desk.claimEscrow(repoId, address(bond));
        assertEq(bond.balanceOf(lender), 984_900e6);
        assertEq(desk.escrowed(repoId, lender), 0);
        // borrower escrow untouched
        assertEq(desk.escrowed(repoId, borrower), 15_100e6);
    }
}
