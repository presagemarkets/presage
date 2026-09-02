// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {StockDuel} from "../src/StockDuel.sol";
import {IERC20} from "../src/HoodBet.sol";

contract DuelDeploy is Script {
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    function run() external {
        vm.startBroadcast();
        new StockDuel(IERC20(USDG));
        vm.stopBroadcast();
    }
}
