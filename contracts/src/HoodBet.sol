// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// Decides the outcome of a market. Called by HoodBet during resolve.
interface IResolver {
    /// Winning side (0 or 1). Must revert if the outcome cannot be determined yet.
    function outcome(uint256 marketId) external view returns (uint8);
}

/// Parimutuel (shared pot) betting market on RH Chain. Bets are in USDG (6 decimals).
/// YES pot vs NO pot; winners split the losing pot pro rata to their stake, minus a 2% fee.
/// Markets can only be created by approved resolvers (templates live in the resolver).
contract HoodBet {
    struct Market {
        address resolver;
        uint64 closeTime; // betting closes
        uint64 resolveTime; // earliest resolution (>= closeTime + LOCK_GAP)
        bool resolved;
        bool canceled;
        uint8 winner;
        uint128[2] pool; // total staked per side
        string question;
    }

    /// Mandatory gap between betting close and resolution — prevents people
    /// from piling in at the last second when the outcome is nearly certain.
    uint64 public constant LOCK_GAP = 1 hours;
    uint16 public constant FEE_BPS = 200; // 2% of the losing pot

    IERC20 public immutable usdg;
    address public owner;
    mapping(address => bool) public approvedResolver;

    Market[] private _markets;
    mapping(uint256 => mapping(address => uint128[2])) public stakes;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event MarketCreated(uint256 indexed id, address indexed resolver, string question, uint64 closeTime, uint64 resolveTime);
    event Bet(uint256 indexed id, address indexed user, uint8 side, uint128 amount);
    event Resolved(uint256 indexed id, uint8 winner);
    event Canceled(uint256 indexed id);
    event Claimed(uint256 indexed id, address indexed user, uint256 payout);

    modifier onlyOwner() {
        require(msg.sender == owner, "owner only");
        _;
    }

    constructor(IERC20 _usdg) {
        usdg = _usdg;
        owner = msg.sender;
    }

    // ---- admin ----

    function setResolver(address resolver, bool ok) external onlyOwner {
        approvedResolver[resolver] = ok;
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    /// Emergency exit: a market that can never be resolved (e.g. its price
    /// pool is dead) gets canceled; everyone gets a full refund via claim().
    function cancel(uint256 id) external onlyOwner {
        Market storage m = _markets[id];
        require(!m.resolved && !m.canceled, "done");
        m.canceled = true;
        emit Canceled(id);
    }

    // ---- market flow ----

    /// Approved resolvers only. Users create markets via template functions on the resolver.
    function create(uint64 closeTime, uint64 resolveTime, string calldata question) external returns (uint256 id) {
        require(approvedResolver[msg.sender], "resolver only");
        require(closeTime > block.timestamp, "close in past");
        require(resolveTime >= closeTime + LOCK_GAP, "lock gap");
        id = _markets.length;
        Market storage m = _markets.push();
        m.resolver = msg.sender;
        m.closeTime = closeTime;
        m.resolveTime = resolveTime;
        m.question = question;
        emit MarketCreated(id, msg.sender, question, closeTime, resolveTime);
    }

    function bet(uint256 id, uint8 side, uint128 amount) external {
        Market storage m = _markets[id];
        require(side < 2, "bad side");
        require(amount > 0, "zero");
        require(!m.canceled && block.timestamp < m.closeTime, "closed");
        require(usdg.transferFrom(msg.sender, address(this), amount), "transfer");
        m.pool[side] += amount;
        stakes[id][msg.sender][side] += amount;
        emit Bet(id, msg.sender, side, amount);
    }

    /// Anyone may call once resolveTime has passed. Winners have an incentive
    /// to call ASAP; the app will also auto-resolve.
    function resolve(uint256 id) external {
        Market storage m = _markets[id];
        require(!m.resolved && !m.canceled, "done");
        require(block.timestamp >= m.resolveTime, "early");
        uint8 w = IResolver(m.resolver).outcome(id);
        require(w < 2, "bad outcome");
        m.resolved = true;
        m.winner = w;
        emit Resolved(id, w);
        // Fee only when there are winners to pay and the losing pot is non-empty.
        uint128 losing = m.pool[1 - w];
        if (m.pool[w] > 0 && losing > 0) {
            uint256 fee = (uint256(losing) * FEE_BPS) / 10000;
            require(usdg.transfer(owner, fee), "fee transfer");
        }
    }

    function claim(uint256 id) external {
        Market storage m = _markets[id];
        require(!claimed[id][msg.sender], "claimed");
        claimed[id][msg.sender] = true;
        uint128[2] storage s = stakes[id][msg.sender];
        uint256 payout;
        if (m.canceled || (m.resolved && m.pool[m.winner] == 0)) {
            // Canceled, or not a single bet on the winning side: full refund.
            payout = uint256(s[0]) + uint256(s[1]);
        } else {
            require(m.resolved, "unresolved");
            uint8 w = m.winner;
            uint256 prize = (uint256(m.pool[1 - w]) * (10000 - FEE_BPS)) / 10000;
            // Rounding remainder (dust) stays in the contract — worth < 1 micro-USDG per winner.
            payout = uint256(s[w]) + (prize * s[w]) / m.pool[w];
        }
        require(payout > 0, "nothing");
        require(usdg.transfer(msg.sender, payout), "payout");
        emit Claimed(id, msg.sender, payout);
    }

    // ---- view ----

    function marketCount() external view returns (uint256) {
        return _markets.length;
    }

    function getMarket(uint256 id)
        external
        view
        returns (
            address resolver,
            uint64 closeTime,
            uint64 resolveTime,
            bool resolved,
            bool canceled,
            uint8 winner,
            uint128 poolNo,
            uint128 poolYes,
            string memory question
        )
    {
        Market storage m = _markets[id];
        return (m.resolver, m.closeTime, m.resolveTime, m.resolved, m.canceled, m.winner, m.pool[0], m.pool[1], m.question);
    }
}
