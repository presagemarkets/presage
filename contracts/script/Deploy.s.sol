// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {HoodBet, IERC20} from "../src/HoodBet.sol";
import {TwapResolver} from "../src/TwapResolver.sol";
import {AdminResolver} from "../src/AdminResolver.sol";

contract Deploy is Script {
    address constant USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;

    function run() external {
        vm.startBroadcast();
        HoodBet hood = new HoodBet(IERC20(USDG));
        TwapResolver twap = new TwapResolver(hood, USDG);
        AdminResolver admin = new AdminResolver(hood);
        hood.setResolver(address(twap), true);
        hood.setResolver(address(admin), true);
        vm.stopBroadcast();
    }
}
