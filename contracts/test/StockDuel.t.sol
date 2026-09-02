// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StockDuel, IUniswapV3Pool} from "../src/StockDuel.sol";
import {IERC20} from "../src/HoodBet.sol";

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

/// Uniswap v3 pool stand-in whose TWAP always equals a settable tick.
contract MockPool {
    address public token0;
    address public token1;
    int24 public tick;

    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
    }

    function setTick(int24 t) external {
        tick = t;
    }

    function liquidity() external pure returns (uint128) {
        return 1e18;
    }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) {
        return (0, tick, 0, 1500, 1500, 0, true);
    }

    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory cum, uint160[] memory liq)
    {
        // cumulative = tick * (T0 - ago) with an arbitrary T0 — the delta over
        // any window then averages exactly to `tick`.
        cum = new int56[](secondsAgos.length);
        liq = new uint160[](secondsAgos.length);
        for (uint256 i = 0; i < secondsAgos.length; i++) {
            cum[i] = int56(tick) * int56(uint56(10_000_000 - secondsAgos[i]));
        }
    }
}

contract StockDuelTest is Test {
    StockDuel duel;
    TestUSDG usdg;
    MockPool poolA; // stock is token1 (USDG token0): tick down = price up
    MockPool poolB; // stock is token0: tick up = price up

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        usdg = new TestUSDG();
        duel = new StockDuel(IERC20(address(usdg)));
        poolA = new MockPool(address(usdg), address(0xAAA1));
        poolB = new MockPool(address(0xBBB1), address(usdg));

        usdg.mint(alice, 1_000e6);
        usdg.mint(bob, 1_000e6);
        vm.prank(alice);
        usdg.approve(address(duel), type(uint256).max);
        vm.prank(bob);
        usdg.approve(address(duel), type(uint256).max);
    }

    function _start() internal returns (uint256 id) {
        vm.prank(alice);
        id = duel.create(IUniswapV3Pool(address(poolA)), 100e6, 1 days);
        vm.prank(bob);
        duel.accept(id, IUniswapV3Pool(address(poolB)));
    }

    function test_winner_takes_pot_minus_fee() public {
        uint256 id = _start();
        // Alice's stock (token1): tick falling = price rising. +50 tick move for her.
        poolA.setTick(-50);
        // Bob's stock (token0): +20 tick move.
        poolB.setTick(20);
        vm.warp(block.timestamp + 1 days);
        uint256 ownerBefore = usdg.balanceOf(address(this));
        duel.settle(id);
        // Pot 200, fee 2% = 4, winner (alice) gets 196.
        assertEq(usdg.balanceOf(alice), 900e6 + 196e6);
        assertEq(usdg.balanceOf(bob), 900e6);
        assertEq(usdg.balanceOf(address(this)) - ownerBefore, 4e6);
    }

    function test_draw_refunds_both_without_fee() public {
        uint256 id = _start();
        poolA.setTick(-30); // alice move +30
        poolB.setTick(30); // bob move +30
        vm.warp(block.timestamp + 1 days);
        duel.settle(id);
        assertEq(usdg.balanceOf(alice), 1_000e6);
        assertEq(usdg.balanceOf(bob), 1_000e6);
    }

    function test_cancel_open_refunds_creator() public {
        vm.prank(alice);
        uint256 id = duel.create(IUniswapV3Pool(address(poolA)), 100e6, 1 days);
        vm.prank(alice);
        duel.cancel(id);
        assertEq(usdg.balanceOf(alice), 1_000e6);
        vm.prank(bob);
        vm.expectRevert(bytes("not open"));
        duel.accept(id, IUniswapV3Pool(address(poolB)));
    }

    function test_settle_before_end_reverts() public {
        uint256 id = _start();
        vm.expectRevert(bytes("early"));
        duel.settle(id);
    }

    function test_cannot_accept_own_duel_or_same_stock() public {
        vm.prank(alice);
        uint256 id = duel.create(IUniswapV3Pool(address(poolA)), 100e6, 1 days);
        vm.prank(alice);
        vm.expectRevert(bytes("own duel"));
        duel.accept(id, IUniswapV3Pool(address(poolB)));
        vm.prank(bob);
        vm.expectRevert(bytes("same stock"));
        duel.accept(id, IUniswapV3Pool(address(poolA)));
    }

    function test_emergency_cancel_refunds_both() public {
        uint256 id = _start();
        duel.emergencyCancel(id);
        assertEq(usdg.balanceOf(alice), 1_000e6);
        assertEq(usdg.balanceOf(bob), 1_000e6);
    }
}
