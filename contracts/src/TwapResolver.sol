// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HoodBet, IResolver} from "./HoodBet.sol";

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
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
}

/// Automated resolver for stock-price markets. Three templates, anyone may create:
///  - OverUnder : "stock above price X on date T?"          (side 1 = YES)
///  - UpDown    : "stock up between now and T?"             (side 1 = UP)
///  - Duel      : "stock A gains more than stock B?"        (side 0 = A, side 1 = B; tie = B)
///
/// Price is read as a 30-minute TWAP from a Uniswap v3 pool — not a spot price,
/// so it can't be gamed by pushing the price a second before resolution.
/// All comparisons happen in tick space (1 tick = 0.01% of price), so strikes
/// are passed as ticks, computed from the price on the app side.
contract TwapResolver is IResolver {
    enum Kind {
        OverUnder,
        UpDown,
        Duel
    }

    struct Cfg {
        Kind kind;
        IUniswapV3Pool pool; // stock/USDG pool
        IUniswapV3Pool pool2; // duel only
        int24 refTick; // OverUnder: strike; UpDown & Duel: pool TWAP at market creation
        int24 refTick2; // Duel: pool2 TWAP at market creation
        bool stockIsToken0; // orientation: tick up = stock price up?
        bool stock2IsToken0;
    }

    uint32 public constant TWAP_WINDOW = 30 minutes;
    /// A pool with a 1-slot history buffer fails observe exactly when busy, and
    /// its TWAP is easy to game. Chain survey: decent pools have 1400+;
    /// 100 already filters out all thin pools without excluding healthy ones.
    uint16 public constant MIN_CARDINALITY = 100;

    HoodBet public immutable hood;
    address public immutable usdg;
    mapping(uint256 => Cfg) public cfg;

    constructor(HoodBet _hood, address _usdg) {
        hood = _hood;
        usdg = _usdg;
    }

    // ---- market creation templates ----

    function createOverUnder(IUniswapV3Pool pool, int24 strikeTick, uint64 closeTime, uint64 resolveTime, string calldata question)
        external
        returns (uint256 id)
    {
        bool stockIsToken0 = _checkPool(pool);
        id = hood.create(closeTime, resolveTime, question);
        cfg[id] = Cfg(Kind.OverUnder, pool, IUniswapV3Pool(address(0)), strikeTick, 0, stockIsToken0, false);
    }

    function createUpDown(IUniswapV3Pool pool, uint64 closeTime, uint64 resolveTime, string calldata question)
        external
        returns (uint256 id)
    {
        bool stockIsToken0 = _checkPool(pool);
        id = hood.create(closeTime, resolveTime, question);
        cfg[id] = Cfg(Kind.UpDown, pool, IUniswapV3Pool(address(0)), _twapTick(pool), 0, stockIsToken0, false);
    }

    function createDuel(IUniswapV3Pool poolA, IUniswapV3Pool poolB, uint64 closeTime, uint64 resolveTime, string calldata question)
        external
        returns (uint256 id)
    {
        bool aIsToken0 = _checkPool(poolA);
        bool bIsToken0 = _checkPool(poolB);
        id = hood.create(closeTime, resolveTime, question);
        cfg[id] = Cfg(Kind.Duel, poolA, poolB, _twapTick(poolA), _twapTick(poolB), aIsToken0, bIsToken0);
    }

    // ---- resolution ----

    function outcome(uint256 id) external view returns (uint8) {
        Cfg storage c = cfg[id];
        require(address(c.pool) != address(0), "unknown market");
        if (c.kind == Kind.Duel) {
            // Compare log-returns since market creation (tick deltas are already logarithmic).
            int256 moveA = _priceMove(_twapTick(c.pool) - c.refTick, c.stockIsToken0);
            int256 moveB = _priceMove(_twapTick(c.pool2) - c.refTick2, c.stock2IsToken0);
            return moveA > moveB ? 0 : 1; // tie = B wins (stated in the template rules)
        }
        // OverUnder & UpDown: side 1 wins if price is STRICTLY above the reference.
        int256 move = _priceMove(_twapTick(c.pool) - c.refTick, c.stockIsToken0);
        return move > 0 ? 1 : 0;
    }

    // ---- internal ----

    /// Pool must be paired with USDG and have active liquidity — a filter
    /// against dead/out-of-range pools with bogus prices (old HoodStock trap).
    function _checkPool(IUniswapV3Pool pool) internal view returns (bool stockIsToken0) {
        bool usdgIs0 = pool.token0() == usdg;
        require(usdgIs0 || pool.token1() == usdg, "not a USDG pool");
        stockIsToken0 = !usdgIs0;
        require(pool.liquidity() > 0, "no liquidity");
        (,,, uint16 cardinality,,,) = pool.slot0();
        require(cardinality >= MIN_CARDINALITY, "thin history");
    }

    /// Direction of stock price movement from the tick delta, corrected for pool
    /// orientation: if the stock is token1, a rising tick means a falling price.
    function _priceMove(int256 tickDelta, bool stockIsToken0) internal pure returns (int256) {
        return stockIsToken0 ? tickDelta : -tickDelta;
    }

    /// Average tick over the last 30 minutes (standard Uniswap v3 method).
    function _twapTick(IUniswapV3Pool pool) internal view returns (int24) {
        uint32[] memory ago = new uint32[](2);
        ago[0] = TWAP_WINDOW;
        ago[1] = 0;
        (int56[] memory cum,) = pool.observe(ago);
        int56 delta = cum[1] - cum[0];
        int24 avg = int24(delta / int56(uint56(TWAP_WINDOW)));
        // Solidity division rounds toward zero; TWAP must round down.
        if (delta < 0 && delta % int56(uint56(TWAP_WINDOW)) != 0) avg--;
        return avg;
    }
}
