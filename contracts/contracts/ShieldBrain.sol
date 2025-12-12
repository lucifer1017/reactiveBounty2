// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IReactive.sol";

/**
 * @title ShieldBrain
 * @notice Reactive Network Logic Controller for ReactiveMorphoShield
 * @dev Deployed on Reactive Network (Chain ID: 5318007)
 * 
 * Monitors two event sources:
 * 1. ReactiveMorphoShield.Deposit → Triggers executeLoop to build leverage
 * 2. ReactiveMorphoShield.LoopStep → Continues looping or stops
 * 3. MockOracle.PriceUpdated → Triggers unwind if price crashes
 * 
 * Logic:
 * - On Deposit: Start looping (send executeLoop callback)
 * - On LoopStep: Check if max iterations reached, if not continue looping
 * - On PriceUpdated: Check if price below crash threshold, trigger emergency unwind
 */
contract ShieldBrain is IReactive {
    // ============ Immutable Configuration ============
    
    address public immutable vaultContract;      // ReactiveMorphoShield address on Sepolia
    address public immutable oracleContract;     // MockOracle address on Sepolia
    address public immutable systemContract;     // Reactive System Contract
    
    // ============ Constants ============
    
    // Chain IDs
    uint256 public constant ORIGIN_CHAIN_ID = 11155111; // Ethereum Sepolia
    uint256 public constant DEST_CHAIN_ID = 11155111;   // Same chain (Sepolia)
    
    // Event signatures (Topic 0)
    uint256 public constant TOPIC_DEPOSIT = 
        uint256(keccak256("Deposit(address,uint256)"));
    
    uint256 public constant TOPIC_LOOP_STEP = 
        uint256(keccak256("LoopStep(uint8,uint256,uint256)"));
    
    uint256 public constant TOPIC_PRICE_UPDATED = 
        uint256(keccak256("PriceUpdated(uint256,uint256)"));
    
    // Strategy parameters
    uint8 public constant MAX_LOOP_ITERATIONS = 5;       // Max loops per deposit
    uint256 public constant CRASH_PRICE_THRESHOLD = 2000 * 1e36; // $2000 (36 decimals)
    
    uint64 public constant CALLBACK_GAS_LIMIT = 1000000;  // 1M gas for Morpho operations
    
    // ============ Events ============
    
    event LoopTriggered(address indexed user, uint8 iteration);
    event UnwindTriggered(uint256 price, uint256 timestamp);
    event MaxIterationsReached(uint8 finalIteration);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize ShieldBrain with subscription setup
     * @param _vaultContract ReactiveMorphoShield address on Sepolia
     * @param _oracleContract MockOracle address on Sepolia
     * @param _systemContract Reactive System Contract address
     */
    constructor(
        address _vaultContract,
        address _oracleContract,
        address _systemContract
    ) {
        vaultContract = _vaultContract;
        oracleContract = _oracleContract;
        systemContract = _systemContract;
        
        // Always subscribe to events (regardless of deployment method)
        // Subscription 1: ReactiveMorphoShield Deposit events
        ISystemContract(systemContract).subscribe(
            ORIGIN_CHAIN_ID,
            vaultContract,
            TOPIC_DEPOSIT,
            REACTIVE_IGNORE,  // Don't filter by user
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        
        // Subscription 2: ReactiveMorphoShield LoopStep events
        ISystemContract(systemContract).subscribe(
            ORIGIN_CHAIN_ID,
            vaultContract,
            TOPIC_LOOP_STEP,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
        
        // Subscription 3: MockOracle PriceUpdated events
        ISystemContract(systemContract).subscribe(
            ORIGIN_CHAIN_ID,
            oracleContract,
            TOPIC_PRICE_UPDATED,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }
    
    // ============ Reactive Logic ============
    
    /**
     * @notice Main reactive function - processes subscribed events
     * @param log Event log from origin chain
     * @dev Called automatically by Reactive Network when subscribed event detected
     */
    function react(LogRecord calldata log) external override {
        // Validate origin chain
        require(log.chain_id == ORIGIN_CHAIN_ID, "ShieldBrain: wrong chain");
        
        // Route to appropriate handler based on event signature
        if (log.topic_0 == TOPIC_DEPOSIT) {
            _handleDeposit(log);
        } else if (log.topic_0 == TOPIC_LOOP_STEP) {
            _handleLoopStep(log);
        } else if (log.topic_0 == TOPIC_PRICE_UPDATED) {
            _handlePriceUpdate(log);
        } else {
            revert("ShieldBrain: unknown event");
        }
    }
    
    /**
     * @notice Handle Deposit event - initiate first loop
     * @param log Event log containing deposit data
     */
    function _handleDeposit(LogRecord calldata log) internal {
        require(log._contract == vaultContract, "ShieldBrain: wrong vault");
        
        // Decode event: Deposit(address indexed user, uint256 amount)
        address user = address(uint160(log.topic_1)); // First indexed param
        // amount is in log.data but we don't need it
        
        // Trigger first loop iteration
        _sendLoopCallback();
        
        emit LoopTriggered(user, 1);
    }
    
    /**
     * @notice Handle LoopStep event - continue or stop looping
     * @param log Event log containing loop step data
     */
    function _handleLoopStep(LogRecord calldata log) internal {
        require(log._contract == vaultContract, "ShieldBrain: wrong vault");
        
        // Decode event: LoopStep(uint8 iteration, uint256 borrowedAmount, uint256 mintedCollateral)
        (uint8 iteration, uint256 borrowedAmount, ) = 
            abi.decode(log.data, (uint8, uint256, uint256));
        
        // Decision logic: Should we continue looping?
        
        // Stop if max iterations reached
        if (iteration >= MAX_LOOP_ITERATIONS) {
            emit MaxIterationsReached(iteration);
            return;
        }
        
        // Stop if borrowed amount is too small (indicates we're hitting limits)
        if (borrowedAmount < 100 * 1e6) { // Less than 100 USDC
            return;
        }
        
        // Continue looping
        _sendLoopCallback();
        
        emit LoopTriggered(address(0), iteration + 1);
    }
    
    /**
     * @notice Handle price update - check for crash
     * @param log Event log containing price data
     */
    function _handlePriceUpdate(LogRecord calldata log) internal {
        require(log._contract == oracleContract, "ShieldBrain: wrong oracle");
        
        // Decode event: PriceUpdated(uint256 newPrice, uint256 timestamp)
        (uint256 newPrice, uint256 timestamp) = abi.decode(log.data, (uint256, uint256));
        
        // Emergency trigger: If price crashes below threshold
        if (newPrice < CRASH_PRICE_THRESHOLD) {
            _sendUnwindCallback();
            emit UnwindTriggered(newPrice, timestamp);
        }
    }
    
    // ============ Callback Helpers ============
    
    /**
     * @notice Send callback to execute one loop iteration
     */
    function _sendLoopCallback() internal {
        bytes memory payload = abi.encodeWithSignature(
            "executeLoop(address)",
            address(0) // Will be replaced with RVM ID by Reactive Network
        );
        
        emit Callback(
            DEST_CHAIN_ID,
            vaultContract,
            CALLBACK_GAS_LIMIT,
            payload
        );
    }
    
    /**
     * @notice Send callback to unwind position (emergency)
     */
    function _sendUnwindCallback() internal {
        bytes memory payload = abi.encodeWithSignature(
            "unwind(address)",
            address(0) // Will be replaced with RVM ID by Reactive Network
        );
        
        emit Callback(
            DEST_CHAIN_ID,
            vaultContract,
            CALLBACK_GAS_LIMIT,
            payload
        );
    }
    
    // ============ Funding ============
    
    /**
     * @notice Receive funding for RVM execution gas
     */
    function pay() external payable override {
        // Accepts ETH/lReact for RVM transaction costs
    }
    
    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {}
}
