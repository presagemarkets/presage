// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./HoodBet.sol";

interface IUniswapV3Pool {
    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function liquidity() external view returns (uint128);
    function slot0()
        external
        view
        returns (uint160, int24, uint16, uint16 observationCardinality, uint16, uint8, bool);
}

/// 1v1 stock duel with an open challenge lobby.
///
/// A creates a challenge: their champion stock, an equal-stakes wager (USDG)
/// and a duration. B accepts with their own champion. Both prices are
/// snapshotted (30-min TWAP) at the SAME moment — acceptance — and the clock
/// starts there. After the duration, the stock with the higher move wins and
/// the winner takes both stakes minus a 2% fee. An exact tie refunds both.
contract StockDuel {
    enum State {
        Open,
        Active,
        Settled,
        Canceled
    }

    struct Duel {
        address creator;
        address challenger;
        IUniswapV3Pool poolA;
        IUniswapV3Pool poolB;
        int24 refA; // creator stock TWAP at acceptance
        int24 refB; // challenger stock TWAP at acceptance
        bool aIsToken0;
        bool bIsToken0;
        uint128 stake; // per side
        uint32 duration;
        uint64 endTime; // set at acceptance
        State state;
        bool draw;
        address winner;
    }

    uint32 public constant MIN_DURATION = 1 hours;
    uint32 public constant MAX_DURATION = 30 days;
    uint16 public constant FEE_BPS = 200; // 2% of the pot, only when someone wins
    uint32 public constant TWAP_WINDOW = 30 minutes;
    uint16 public constant MIN_CARDINALITY = 100; // thin-history pools are gameable

    IERC20 public immutable usdg;
    address public owner;
    Duel[] private _duels;

    event DuelCreated(uint256 indexed id, address indexed creator, address poolA, uint128 stake, uint32 duration);
    event DuelAccepted(uint256 indexed id, address indexed challenger, address poolB, uint64 endTime);
    event DuelSettled(uint256 indexed id, address winner, bool draw, uint256 payout);
    event DuelCanceled(uint256 indexed id);

    constructor(IERC20 _usdg) {
        usdg = _usdg;
        owner = msg.sender;
    }

    // ---- lifecycle ----

    function create(IUniswapV3Pool pool, uint128 stake, uint32 duration) external returns (uint256 id) {
        require(stake > 0, "zero stake");
        require(duration >= MIN_DURATION && duration <= MAX_DURATION, "duration");
        bool aIsToken0 = _checkPool(pool);
        require(usdg.transferFrom(msg.sender, address(this), stake), "transfer");
        id = _duels.length;
        Duel storage d = _duels.push();
        d.creator = msg.sender;
        d.poolA = pool;
        d.aIsToken0 = aIsToken0;
        d.stake = stake;
        d.duration = duration;
        emit DuelCreated(id, msg.sender, address(pool), stake, duration);
    }

    /// Creator backs out while nobody has accepted.
    function cancel(uint256 id) external {
        Duel storage d = _duels[id];
        require(msg.sender == d.creator, "creator only");
        require(d.state == State.Open, "not open");
        d.state = State.Canceled;
        require(usdg.transfer(d.creator, d.stake), "refund");
        emit DuelCanceled(id);
    }

    function accept(uint256 id, IUniswapV3Pool poolB) external {
        Duel storage d = _duels[id];
        require(d.state == State.Open, "not open");
        require(msg.sender != d.creator, "own duel");
        require(address(poolB) != address(d.poolA), "same stock");
        bool bIsToken0 = _checkPool(poolB);
        require(usdg.transferFrom(msg.sender, address(this), d.stake), "transfer");
        d.challenger = msg.sender;
        d.poolB = poolB;
        d.bIsToken0 = bIsToken0;
        // Both champions measured from the exact same instant.
        d.refA = _twapTick(d.poolA);
        d.refB = _twapTick(poolB);
        d.endTime = uint64(block.timestamp) + d.duration;
        d.state = State.Active;
        emit DuelAccepted(id, msg.sender, address(poolB), d.endTime);
    }

    /// Anyone may settle once time is up — both players are motivated to.
    function settle(uint256 id) external {
        Duel storage d = _duels[id];
        require(d.state == State.Active, "not active");
        require(block.timestamp >= d.endTime, "early");
        // Tick deltas are log-returns; orientation flips when the stock is token1.
        int256 moveA = _move(_twapTick(d.poolA) - d.refA, d.aIsToken0);
        int256 moveB = _move(_twapTick(d.poolB) - d.refB, d.bIsToken0);
        d.state = State.Settled;
        uint256 pot = uint256(d.stake) * 2;
        if (moveA == moveB) {
            d.draw = true;
            require(usdg.transfer(d.creator, d.stake), "refund A");
            require(usdg.transfer(d.challenger, d.stake), "refund B");
            emit DuelSettled(id, address(0), true, 0);
            return;
        }
        address winner = moveA > moveB ? d.creator : d.challenger;
        d.winner = winner;
        uint256 fee = (pot * FEE_BPS) / 10_000;
        require(usdg.transfer(owner, fee), "fee");
        require(usdg.transfer(winner, pot - fee), "payout");
        emit DuelSettled(id, winner, false, pot - fee);
    }

    /// Escape hatch for a duel whose pool died mid-flight: refund both sides.
    function emergencyCancel(uint256 id) external {
        require(msg.sender == owner, "owner only");
        Duel storage d = _duels[id];
        require(d.state == State.Active, "not active");
        d.state = State.Canceled;
        require(usdg.transfer(d.creator, d.stake), "refund A");
        require(usdg.transfer(d.challenger, d.stake), "refund B");
        emit DuelCanceled(id);
    }

    function setOwner(address newOwner) external {
        require(msg.sender == owner, "owner only");
        owner = newOwner;
    }

    // ---- views ----

    function duelCount() external view returns (uint256) {
        return _duels.length;
    }

    function getDuel(uint256 id) external view returns (Duel memory) {
        return _duels[id];
    }

    // ---- internals (same guards as TwapResolver) ----

    function _checkPool(IUniswapV3Pool pool) internal view returns (bool stockIsToken0) {
        bool usdgIs0 = pool.token0() == address(usdg);
        require(usdgIs0 || pool.token1() == address(usdg), "not a USDG pool");
        stockIsToken0 = !usdgIs0;
        require(pool.liquidity() > 0, "no liquidity");
        (,,, uint16 cardinality,,,) = pool.slot0();
        require(cardinality >= MIN_CARDINALITY, "thin history");
    }

    function _move(int256 tickDelta, bool stockIsToken0) internal pure returns (int256) {
        return stockIsToken0 ? tickDelta : -tickDelta;
    }

    function _twapTick(IUniswapV3Pool pool) internal view returns (int24) {
        uint32[] memory ago = new uint32[](2);
        ago[0] = TWAP_WINDOW;
        ago[1] = 0;
        (int56[] memory cum,) = pool.observe(ago);
        int56 delta = cum[1] - cum[0];
        int24 avg = int24(delta / int56(uint56(TWAP_WINDOW)));
        // Solidity division truncates toward zero; TWAP must floor.
        if (delta < 0 && delta % int56(uint56(TWAP_WINDOW)) != 0) avg--;
        return avg;
    }
}
