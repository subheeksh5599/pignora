// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IdentityRegistry} from "./IdentityRegistry.sol";

/**
 * @title RepoDesk
 * @notice Compliant repo rail for tokenized assets on Monad.
 *
 * Repo mechanics:
 *  - Lender lends `cashAmount` of aUSDC; borrower pledges `collateralAmount`
 *    of a tokenized bond/asset.
 *  - The haircut is priced by the borrower's Cleanverse A-Pass tier
 *    (IdentityRegistry): deeper verification -> thinner haircut.
 *  - Repo has a term and a fee (bps) paid by the borrower on repayment.
 *  - Collateral is marked to value via `valueOf(amount)` on the collateral
 *    token; when value falls below the maintenance level a margin call starts.
 *  - A credential event (revocation / freeze / expiry of either party) or an
 *    expired margin call enables anyone to execute a compliant closeout:
 *    collateral covers the obligation, excess returns to the borrower, and a
 *    frozen/revoked party cannot receive funds -- those fail closed to escrow.
 *
 * Identity is NOT a gate here: it is the pricing engine (haircut) and the
 * enforcement trigger (closeout on credential events).
 */
contract RepoDesk {
    struct Repo {
        address borrower;
        address lender;
        address collateralToken; // tokenized asset (bond wrapper)
        address cashToken; // aUSDC (verified asset)
        uint256 collateralAmount; // in collateral token units
        uint256 cashAmount; // in cash token units (6 dp)
        uint256 feeBps; // repo fee for the term, bps of cashAmount
        uint256 collateralValue; // last marked value in cash units
        uint64 termEnd; // unix; repo must be repaid by then
        uint64 marginDeadline; // 0 = not in margin call
        bool closed;
    }

    IdentityRegistry public immutable registry;
    uint256 public repoCounter;
    uint256 public constant MAINTENANCE_BPS = 10500; // 105% maintenance margin
    uint64 public constant GRACE_PERIOD = 1 hours;

    mapping(uint256 => Repo) public repos;
    mapping(uint256 => bytes32) public travelRuleHash; // per-repo attribution anchor
    mapping(uint256 => mapping(address => uint256)) public escrowed; // fail-closed funds per repo, per claimant

    function getRepo(uint256 repoId) external view returns (Repo memory) {
        return repos[repoId];
    }

    event RepoOpened(
        uint256 indexed repoId,
        address indexed borrower,
        address indexed lender,
        address collateralToken,
        uint256 collateralAmount,
        uint256 cashAmount,
        uint256 feeBps,
        uint64 termEnd,
        uint16 haircutBps,
        bytes32 travelRule
    );
    event CollateralMarked(uint256 indexed repoId, uint256 value);
    event CollateralAdded(uint256 indexed repoId, uint256 amount);
    event MarginCalled(uint256 indexed repoId, uint64 deadline);
    event Repaid(uint256 indexed repoId, uint256 repaidAmount);
    event RepoClosed(uint256 indexed repoId);
    event CloseoutExecuted(uint256 indexed repoId, address collateralRecipient, uint256 collateralToLender, uint256 collateralToBorrower, bool escrowed);
    event EscrowClaimed(uint256 indexed repoId, address indexed claimant, uint256 amount);

    error NotVerified(address account);
    error NotActive(address account);
    error BadParty();
    error ZeroAmount();
    error NotRegistered();
    error BadHaircut();
    error NotOpen(uint256 repoId);
    error NotBorrower(uint256 repoId);
    error NotLender(uint256 repoId);
    error NotYetDue(uint256 repoId);
    error Overdue(uint256 repoId);
    error NoMarginCall(uint256 repoId);
    error NothingEscrowed(uint256 repoId);
    error TransferFailed();

    constructor(address _registry) {
        registry = IdentityRegistry(_registry);
    }

    // ---------------------------------------------------------------- open

    /**
     * @dev Open a repo. Both parties must be verified; the borrower must be
     *      Active. `travelRule` is the backend-computed attribution hash.
     */
    function openRepo(
        address borrower,
        address collateralToken,
        address cashToken,
        uint256 collateralAmount,
        uint256 cashAmount,
        uint256 feeBps,
        uint64 term,
        bytes32 travelRule
    ) external returns (uint256 repoId) {
        if (collateralAmount == 0 || cashAmount == 0) revert ZeroAmount();
        if (!registry.isVerified(msg.sender)) revert NotVerified(msg.sender);
        if (!registry.isActive(borrower)) revert NotActive(borrower);

        uint16 haircut = registry.haircutOf(borrower);
        uint256 collateralValue = _valueOf(collateralToken, collateralAmount);
        // cash lent must be covered by collateral after haircut
        uint256 maxLend = (collateralValue * (10000 - haircut)) / 10000;
        if (cashAmount > maxLend) revert BadHaircut();

        repoId = ++repoCounter;
        repos[repoId] = Repo({
            borrower: borrower,
            lender: msg.sender,
            collateralToken: collateralToken,
            cashToken: cashToken,
            collateralAmount: collateralAmount,
            cashAmount: cashAmount,
            feeBps: feeBps,
            collateralValue: collateralValue,
            termEnd: uint64(block.timestamp) + term,
            marginDeadline: 0,
            closed: false
        });
        travelRuleHash[repoId] = travelRule;

        _pull(collateralToken, borrower, collateralAmount);
        _pull(cashToken, msg.sender, cashAmount);

        emit RepoOpened(repoId, borrower, msg.sender, collateralToken, collateralAmount, cashAmount, feeBps, repos[repoId].termEnd, haircut, travelRule);
    }

    // ----------------------------------------------------------- mark / margin

    function markCollateral(uint256 repoId) external {
        Repo storage r = repos[repoId];
        if (r.closed) revert NotOpen(repoId);
        r.collateralValue = _valueOf(r.collateralToken, r.collateralAmount);
        emit CollateralMarked(repoId, r.collateralValue);
        _maybeMarginCall(repoId, r);
    }

    function _maybeMarginCall(uint256 repoId, Repo storage r) internal {
        uint256 required = (r.cashAmount * MAINTENANCE_BPS) / 10000;
        if (r.collateralValue < required && r.marginDeadline == 0) {
            r.marginDeadline = uint64(block.timestamp) + GRACE_PERIOD;
            emit MarginCalled(repoId, r.marginDeadline);
        }
    }

    /// Borrowers can top up collateral (e.g. during a margin call).
    function addCollateral(uint256 repoId, uint256 amount) external {
        Repo storage r = repos[repoId];
        if (r.closed) revert NotOpen(repoId);
        if (msg.sender != r.borrower) revert NotBorrower(repoId);
        if (amount == 0) revert ZeroAmount();
        _pull(r.collateralToken, msg.sender, amount);
        r.collateralAmount += amount;
        r.collateralValue = _valueOf(r.collateralToken, r.collateralAmount);
        emit CollateralAdded(repoId, amount);
        emit CollateralMarked(repoId, r.collateralValue);
        if (r.collateralValue >= (r.cashAmount * MAINTENANCE_BPS) / 10000) {
            r.marginDeadline = 0;
        }
    }

    // -------------------------------------------------------------- repayment

    function repay(uint256 repoId) external {
        Repo storage r = repos[repoId];
        if (r.closed) revert NotOpen(repoId);
        if (msg.sender != r.borrower) revert NotBorrower(repoId);
        if (block.timestamp > r.termEnd) revert Overdue(repoId);
        if (r.marginDeadline != 0 && block.timestamp > r.marginDeadline) {
            // too late: closeout path only
            revert NoMarginCall(repoId);
        }

        uint256 fee = (r.cashAmount * r.feeBps) / 10000;
        uint256 total = r.cashAmount + fee;
        _pull(r.cashToken, msg.sender, total);
        _push(r.cashToken, r.lender, total);

        r.closed = true;
        _push(r.collateralToken, r.borrower, r.collateralAmount);
        emit Repaid(repoId, total);
        emit RepoClosed(repoId);
    }

    // --------------------------------------------------------------- closeout

    /**
     * @dev Compliant closeout, executable by anyone when:
     *  - the borrower's identity status is no longer Active (revoked/frozen/
     *    expired), or
     *  - a margin call deadline has passed, or
     *  - the repo term has passed without repayment (overdue).
     * Collateral covers the obligation (cash + fee) to the lender; excess
     * returns to the borrower. If the lender is frozen/revoked, the lender's
     * proceeds fail closed to escrow until the lender is Active again.
     */
    function executeCloseout(uint256 repoId) external {
        Repo storage r = repos[repoId];
        if (r.closed) revert NotOpen(repoId);

        bool borrowerBreach = !registry.isActive(r.borrower);
        bool marginExpired = r.marginDeadline != 0 && block.timestamp > r.marginDeadline;
        bool overdue = block.timestamp > r.termEnd;
        if (!borrowerBreach && !marginExpired && !overdue) {
            revert NoMarginCall(repoId);
        }

        uint256 fee = (r.cashAmount * r.feeBps) / 10000;
        uint256 obligation = r.cashAmount + fee;
        uint256 cv = _valueOf(r.collateralToken, r.collateralAmount);
        r.collateralValue = cv;

        uint256 collateralToLender;
        uint256 collateralToBorrower;
        if (cv >= obligation) {
            // full coverage: lender gets exactly obligation worth of collateral,
            // borrower gets the excess back in collateral units
            uint256 fraction = (obligation * 1e18) / cv;
            collateralToLender = (r.collateralAmount * fraction) / 1e18;
            collateralToBorrower = r.collateralAmount - collateralToLender;
        } else {
            // shortfall: lender gets everything
            collateralToLender = r.collateralAmount;
        }

        bool escrowLender = !registry.isActive(r.lender);
        r.closed = true;

        if (collateralToBorrower > 0) {
            if (registry.isActive(r.borrower)) {
                _push(r.collateralToken, r.borrower, collateralToBorrower);
            } else {
                escrowed[repoId][r.borrower] += collateralToBorrower;
            }
        }

        if (escrowLender) {
            escrowed[repoId][r.lender] += collateralToLender;
            emit CloseoutExecuted(repoId, address(0), collateralToLender, collateralToBorrower, true);
        } else {
            _push(r.collateralToken, r.lender, collateralToLender);
            emit CloseoutExecuted(repoId, r.lender, collateralToLender, collateralToBorrower, false);
        }
    }

    /// Claim this caller's escrowed proceeds once the account is Active again.
    function claimEscrow(uint256 repoId, address token) external {
        uint256 amount = escrowed[repoId][msg.sender];
        if (amount == 0) revert NothingEscrowed(repoId);
        if (!registry.isActive(msg.sender)) revert NotActive(msg.sender);
        escrowed[repoId][msg.sender] = 0;
        _push(token, msg.sender, amount);
        emit EscrowClaimed(repoId, msg.sender, amount);
    }

    // ---------------------------------------------------------------- utils

    function _valueOf(address token, uint256 amount) internal view returns (uint256) {
        (bool ok, bytes memory ret) = token.staticcall(
            abi.encodeWithSignature("valueOf(uint256)", amount)
        );
        if (!ok || ret.length < 32) revert NotRegistered();
        return abi.decode(ret, (uint256));
    }

    function _pull(address token, address from, uint256 amount) internal {
        (bool ok, ) = token.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, address(this), amount));
        if (!ok) revert TransferFailed();
    }

    function _push(address token, address to, uint256 amount) internal {
        (bool ok, ) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
        if (!ok) revert TransferFailed();
    }
}
