// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ProfileRegistry} from "../src/ProfileRegistry.sol";

contract ProfileRegistryTest is Test {
    ProfileRegistry reg;
    address alice = address(0xA11CE);

    function setUp() public {
        reg = new ProfileRegistry();
    }

    function test_set_and_get() public {
        vm.prank(alice);
        reg.setProfile("Bold Lynx IRL", "https://example.com/a.png");
        (string memory name, string memory avatar) = reg.getProfile(alice);
        assertEq(name, "Bold Lynx IRL");
        assertEq(avatar, "https://example.com/a.png");
    }

    function test_clear() public {
        vm.startPrank(alice);
        reg.setProfile("X", "");
        reg.clearProfile();
        vm.stopPrank();
        (string memory name,) = reg.getProfile(alice);
        assertEq(name, "");
    }

    function test_limits() public {
        vm.startPrank(alice);
        vm.expectRevert(bytes("name too long"));
        reg.setProfile("123456789012345678901234567890123", "");
        vm.stopPrank();
    }

    function test_only_own_profile() public {
        vm.prank(alice);
        reg.setProfile("Alice", "");
        // Another wallet writing changes its OWN slot, never Alice's.
        reg.setProfile("Imposter", "");
        (string memory name,) = reg.getProfile(alice);
        assertEq(name, "Alice");
    }
}
