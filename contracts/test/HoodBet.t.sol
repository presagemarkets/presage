// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HoodBet, IERC20, IResolver} from "../src/HoodBet.sol";
import {AdminResolver} from "../src/AdminResolver.sol";

/// Fake 6-decimal USDG for tests.
contract TestUSDG {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract HoodBetTest is Test {
    HoodBet hood;
    TestUSDG usdg;
    AdminResolver admin;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint64 closeT;
    uint64 resolveT;

    function setUp() public {
        usdg = new TestUSDG();
        hood = new HoodBet(IERC20(address(usdg)));
        admin = new AdminResolver(hood);
        hood.setResolver(address(admin), true);

        closeT = uint64(block.timestamp + 1 days);
        resolveT = closeT + 2 hours;

        usdg.mint(alice, 1_000e6);
        usdg.mint(bob, 1_000e6);
        vm.prank(alice);
        usdg.approve(address(hood), type(uint256).max);
        vm.prank(bob);
        usdg.approve(address(hood), type(uint256).max);
    }

    function _newMarket() internal returns (uint256) {
        return admin.create(closeT, resolveT, "AAPL di atas $250?");
    }

    function test_parimutuel_payout_and_fee() public {
        uint256 id = _newMarket();
        vm.prank(alice);
        hood.bet(id, 1, 100e6); // YES
        vm.prank(bob);
        hood.bet(id, 0, 300e6); // NO

        vm.warp(resolveT);
        admin.setOutcome(id, 1); // YES wins
        uint256 ownerBefore = usdg.balanceOf(address(this));
        hood.resolve(id);
        // 2% fee on the losing pot (300) = 6 USDG to owner.
        assertEq(usdg.balanceOf(address(this)) - ownerBefore, 6e6);

        // Alice: stake 100 + the entire net losing pot (294) = 394.
        vm.prank(alice);
        hood.claim(id);
        assertEq(usdg.balanceOf(alice), 900e6 + 394e6);

        // Bob lost everything: claim reverts since there is nothing.
        vm.prank(bob);
        vm.expectRevert(bytes("nothing"));
        hood.claim(id);
    }

    function test_no_winners_refunds_losers() public {
        uint256 id = _newMarket();
        vm.prank(alice);
        hood.bet(id, 0, 50e6); // everyone on NO

        vm.warp(resolveT);
        admin.setOutcome(id, 1); // YES wins but is empty
        hood.resolve(id);

        vm.prank(alice);
        hood.claim(id); // full refund, no fee
        assertEq(usdg.balanceOf(alice), 1_000e6);
    }

    function test_cancel_refunds_everyone() public {
        uint256 id = _newMarket();
        vm.prank(alice);
        hood.bet(id, 1, 70e6);
        vm.prank(bob);
        hood.bet(id, 0, 30e6);

        hood.cancel(id);
        vm.prank(alice);
        hood.claim(id);
        vm.prank(bob);
        hood.claim(id);
        assertEq(usdg.balanceOf(alice), 1_000e6);
        assertEq(usdg.balanceOf(bob), 1_000e6);
    }

    function test_bet_rejected_after_close() public {
        uint256 id = _newMarket();
        vm.warp(closeT);
        vm.prank(alice);
        vm.expectRevert(bytes("closed"));
        hood.bet(id, 1, 10e6);
    }

    function test_resolve_rejected_before_resolveTime() public {
        uint256 id = _newMarket();
        admin.setOutcome(id, 0);
        vm.warp(resolveT - 1);
        vm.expectRevert(bytes("early"));
        hood.resolve(id);
    }

    function test_lock_gap_enforced() public {
        vm.expectRevert(bytes("lock gap"));
        admin.create(closeT, closeT + 30 minutes, "jeda kependekan");
    }

    function test_double_claim_rejected() public {
        uint256 id = _newMarket();
        vm.prank(alice);
        hood.bet(id, 1, 10e6);
        vm.warp(resolveT);
        admin.setOutcome(id, 1);
        hood.resolve(id);
        vm.startPrank(alice);
        hood.claim(id);
        vm.expectRevert(bytes("claimed"));
        hood.claim(id);
        vm.stopPrank();
    }

    function test_random_address_cannot_create() public {
        vm.prank(alice);
        vm.expectRevert(bytes("resolver only"));
        hood.create(closeT, resolveT, "market liar");
    }
}
