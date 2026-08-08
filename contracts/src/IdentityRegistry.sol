// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./Ownable.sol";

contract IdentityRegistry is Ownable {
    enum Status { Unverified, Active, Frozen, Revoked, Expired }

    struct Profile {
        Status status;
        uint8 tier; // 1 (basic) .. 3 (well verified)
        uint64 expiry; // A-Pass expiration time (unix)
        bytes32 cvRecordId; // Cleanverse identity record
    }

    address public relay;

    // tier -> haircut in basis points. 3 -> 200 (2%), 2 -> 500 (5%), 1 -> 1000 (10%)
    mapping(uint8 => uint16) public haircutBps;
    mapping(address => Profile) public profiles;

    event ProfileUpdated(address indexed account, Status status, uint8 tier, uint64 expiry, bytes32 cvRecordId);
    event RelayChanged(address indexed relay);
    event HaircutSet(uint8 indexed tier, uint16 bps);

    error NotRelay();
    error InvalidTier(uint8 tier);
    error ZeroAddress();

    constructor() Ownable(msg.sender) {
        haircutBps[3] = 200;
        haircutBps[2] = 500;
        haircutBps[1] = 1000;
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

    function setHaircut(uint8 tier, uint16 bps) external onlyOwner {
        if (tier < 1 || tier > 3) revert InvalidTier(tier);
        haircutBps[tier] = bps;
        emit HaircutSet(tier, bps);
    }

    function setProfile(address account, Status status, uint8 tier, uint64 expiry, bytes32 cvRecordId) external onlyRelay {
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

    function haircutOf(address account) public view returns (uint16) {
        uint8 tier = profiles[account].tier;
        if (tier < 1 || tier > 3) return 1000;
        return haircutBps[tier];
    }
}
