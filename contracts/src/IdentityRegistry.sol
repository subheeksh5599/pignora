// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./Ownable.sol";

/**
 * @title IdentityRegistry
 * @notice On-chain mirror of Cleanverse A-Pass compliance state, updated by a
 *         relay service that queries the Cleanverse API (verify_apass /
 *         query_apass). The registry is the single compliance source of truth
 *         for RepoDesk: identity tier prices the haircut, identity status
 *         drives closeout.
 */
contract IdentityRegistry is Ownable {
    enum Status { Unverified, Active, Frozen, Revoked, Expired }

    struct Profile {
        Status status;
        uint8 tier; // REAL A-Pass tier (0-99); >=50 deep, >=20 standard, >=10 basic
        uint64 expiry; // A-Pass expiration time (unix)
        bytes32 cvRecordId; // Cleanverse identity record
    }

    address public relay;

    // owner overrides per A-Pass tier (0-99); defaults computed in haircutOf
    mapping(uint8 => uint16) public haircutOverride;
    mapping(address => Profile) public profiles;

    event ProfileUpdated(address indexed account, Status status, uint8 tier, uint64 expiry, bytes32 cvRecordId);
    event RelayChanged(address indexed relay);
    event HaircutSet(uint8 indexed tier, uint16 bps);

    error NotRelay();
    error ZeroAddress();

    constructor() Ownable(msg.sender) {
        haircutOverride[50] = 200;
        haircutOverride[20] = 500;
        haircutOverride[10] = 800;
    }

    modifier onlyRelay() {
        if (msg.sender != relay) revert NotRelay();
        _;
    }

    function setRelay(address _relay) external onlyOwner {
        if (_relay == address(0)) revert ZeroAddress();
        relay = _relay;
        emit RelayChanged(_relay);
    }

    /// Owner can override the haircut for any A-Pass tier (0-99).
    function setHaircut(uint8 tier, uint16 bps) external onlyOwner {
        haircutOverride[tier] = bps;
        emit HaircutSet(tier, bps);
    }

    function setProfile(
        address account,
        Status status,
        uint8 tier,
        uint64 expiry,
        bytes32 cvRecordId
    ) external onlyRelay {
        profiles[account] = Profile(status, tier, expiry, cvRecordId);
        emit ProfileUpdated(account, status, tier, expiry, cvRecordId);
    }

    function statusOf(address account) external view returns (Status) {
        return profiles[account].status;
    }

    function tierOf(address account) external view returns (uint8) {
        return profiles[account].tier;
    }

    function isActive(address account) public view returns (bool) {
        return profiles[account].status == Status.Active;
    }

    function isVerified(address account) public view returns (bool) {
        Profile memory p = profiles[account];
        return p.status == Status.Active || p.status == Status.Frozen;
    }

    /// Haircut in bps for an account, from the REAL A-Pass tier scale (0-99):
    /// >=50 -> 2%, >=20 -> 5%, >=10 -> 8%, else 10%. Owner overrides win.
    function haircutOf(address account) public view returns (uint16) {
        uint8 tier = profiles[account].tier;
        if (haircutOverride[tier] != 0) return haircutOverride[tier];
        if (tier >= 50) return 200;
        if (tier >= 20) return 500;
        if (tier >= 10) return 800;
        return 1000;
    }
}
