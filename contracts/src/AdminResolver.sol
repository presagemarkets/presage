// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HoodBet, IResolver} from "./HoodBet.sol";

/// Manual resolver for freeform markets (sports, politics, news) — Phase 3.
/// Only the owner can create markets and finalize outcomes.
contract AdminResolver is IResolver {
    HoodBet public immutable hood;
    address public owner;
    mapping(uint256 => uint8) private _answer; // 0 = not decided yet, 1 = side 0, 2 = side 1

    constructor(HoodBet _hood) {
        hood = _hood;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "owner only");
        _;
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function create(uint64 closeTime, uint64 resolveTime, string calldata question) external onlyOwner returns (uint256) {
        return hood.create(closeTime, resolveTime, question);
    }

    function setOutcome(uint256 id, uint8 side) external onlyOwner {
        require(side < 2, "bad side");
        _answer[id] = side + 1;
    }

    function outcome(uint256 id) external view returns (uint8) {
        uint8 a = _answer[id];
        require(a != 0, "not decided");
        return a - 1;
    }
}
