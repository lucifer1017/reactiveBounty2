// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IReactive.sol";
import "./interfaces/ILendingPool.sol";

/**
 * @title ReactiveVault
 * @notice Automated DeFi Looping Vault using MockLendingPool
 * @dev Simplified architecture with mock lending protocol
 * 
 * Flow:
 * 1. User deposits WETH collateral
 * 2. Reactive Network triggers executeLoop():
 *    - Borrow USDC from pool
 *    - "Swap" USDC → WETH (mint for demo)
 *    - Supply WETH back to pool
 *    - Repeat up to 5 times
 * 3. On price crash, Reactive Network triggers unwind():
 *    - "Flash loan" USDC (mint for demo)
 *    - Repay all debt
 *    - Withdraw all collateral
 */
contract ReactiveVault is IPayer {
    // ============ Constants ============
    
    /// @notice Mock Lending Pool address
    address public immutable POOL;
    
    /// @notice Reactive Network Callback Proxy on Sepolia
    address public constant CALLBACK_PROXY = 0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA;
    
    // ============ Immutable State ============
    
    /// @notice Authorized Reactive VM ID (deployer of ShieldBrain)
    address public immutable reactiveVmId;
    
    /// @notice Collateral token (MockWETH)
    IERC20 public immutable collateralToken;
    
    /// @notice Loan token (MockUSDC)
    IERC20 public immutable loanToken;
    
    // ============ Strategy Parameters ============
    
    /// @notice Target Loan-to-Value ratio (70%)
    uint256 public constant TARGET_LTV = 70;
    
    /// @notice Maximum loop iterations
    uint8 public constant MAX_LOOPS = 5;
    
    /// @notice Loop iteration counter
    uint8 public loopCount;
    
    // ============ Events ============
    
    event Deposit(address indexed user, uint256 amount);
    event LoopStep(uint8 iteration, uint256 borrowedAmount, uint256 mintedCollateral);
    event Unwind(uint256 repaidDebt, uint256 withdrawnCollateral);
    
    // ============ Errors ============
    
    error UnauthorizedCaller();
    error TransferFailed();
    error MaxLoopsReached();
    error InvalidAmount();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize the vault
     * @param _pool MockLendingPool address
     * @param _collateralToken MockWETH address
     * @param _loanToken MockUSDC address
     * @param _reactiveVmId Authorized Reactive VM ID (ShieldBrain deployer)
     */
    constructor(
        address _pool,
        address _collateralToken,
        address _loanToken,
        address _reactiveVmId
    ) {
        POOL = _pool;
        collateralToken = IERC20(_collateralToken);
        loanToken = IERC20(_loanToken);
        reactiveVmId = _reactiveVmId;
    }
    
    // ============ User Entry Point ============
    
    /**
     * @notice Deposit collateral to start leveraged position
     * @param amount Amount of WETH to deposit (18 decimals)
     */
    function deposit(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        
        // Reset loop counter for new deposit
        loopCount = 0;
        
        // Transfer WETH from user to vault
        bool success = collateralToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        // Approve pool to spend WETH
        collateralToken.approve(POOL, amount);
        
        // Supply collateral to pool
        ILendingPool(POOL).supply(
            address(collateralToken),
            amount,
            address(this) // Supply on behalf of this vault
        );
        
        // Emit event to trigger Reactive Network
        emit Deposit(msg.sender, amount);
    }
    
    // ============ Reactive Automation ============
    
    /**
     * @notice Execute one leverage loop iteration
     * @param sender RVM ID (injected by Reactive Network)
     * 
     * Steps:
     * 1. Borrow USDC from pool (against WETH collateral)
     * 2. "Swap" USDC → WETH (mint for demo)
     * 3. Supply new WETH as collateral
     * 4. Emit LoopStep event
     */
    function executeLoop(address sender) external onlyReactive(sender) {
        // Check if max loops reached
        if (loopCount >= MAX_LOOPS) {
            revert MaxLoopsReached();
        }
        
        loopCount++;
        
        // Step 1: Check available borrow capacity
        (, , uint256 availableBorrow, uint256 healthFactor) = ILendingPool(POOL).getUserAccountData(
            address(this),
            address(collateralToken),
            address(loanToken)
        );
        
        // Safety check: Don't borrow if health factor too low
        if (healthFactor < 1200000000000000000) { // < 1.2
            revert MaxLoopsReached(); // Use this to stop looping
        }
        
        // Calculate safe borrow amount (80% of available)
        uint256 borrowAmount = (availableBorrow * 80) / 100;
        
        // Minimum borrow check
        if (borrowAmount < 100 * 1e6) { // Less than 100 USDC
            revert MaxLoopsReached(); // Stop looping
        }
        
        // Step 2: Borrow USDC from pool
        ILendingPool(POOL).borrow(
            address(collateralToken), // Collateral
            address(loanToken),       // Borrow token
            borrowAmount,             // Amount
            address(this),            // Borrow on behalf of vault
            address(this)             // Receive borrowed tokens
        );
        
        // Step 3: "Swap" USDC → WETH (mint for demo)
        // Assume price: 1 ETH = $3000
        // borrowAmount is in USDC (6 decimals)
        // wethAmount should be in WETH (18 decimals)
        uint256 wethAmount = (borrowAmount * 1e18) / 3000e6;
        
        // Mint WETH to vault (simulates swap)
        (bool mintSuccess, ) = address(collateralToken).call(
            abi.encodeWithSignature("mint(address,uint256)", address(this), wethAmount)
        );
        require(mintSuccess, "Mint failed");
        
        // Step 4: Supply minted WETH back to pool
        collateralToken.approve(POOL, wethAmount);
        ILendingPool(POOL).supply(
            address(collateralToken),
            wethAmount,
            address(this)
        );
        
        // Emit event to trigger next iteration
        emit LoopStep(loopCount, borrowAmount, wethAmount);
    }
    
    /**
     * @notice Emergency unwind: Close leveraged position
     * @param sender RVM ID (injected by Reactive Network)
     * 
     * Steps:
     * 1. "Flash loan" USDC (mint for demo)
     * 2. Repay all debt
     * 3. Withdraw all collateral
     */
    function unwind(address sender) external onlyReactive(sender) {
        // Get current position
        (uint256 collateral, uint256 debt) = ILendingPool(POOL).getPosition(
            address(this),
            address(collateralToken),
            address(loanToken)
        );
        
        // If no debt, nothing to unwind
        if (debt == 0) {
            emit Unwind(0, collateral);
            return;
        }
        
        // Step 1: "Flash loan" USDC to repay debt (mint for demo)
        // Add 10% buffer for safety
        uint256 repayAmount = (debt * 110) / 100;
        
        (bool mintSuccess, ) = address(loanToken).call(
            abi.encodeWithSignature("mint(address,uint256)", address(this), repayAmount)
        );
        require(mintSuccess, "Mint failed");
        
        // Step 2: Approve pool to spend USDC
        loanToken.approve(POOL, repayAmount);
        
        // Step 3: Repay all debt
        uint256 repaid = ILendingPool(POOL).repay(
            address(loanToken),
            type(uint256).max, // Repay all
            address(this)
        );
        
        // Step 4: Withdraw all collateral
        uint256 withdrawn = ILendingPool(POOL).withdraw(
            address(collateralToken),
            type(uint256).max, // Withdraw all
            address(this),
            address(this)
        );
        
        // Reset loop counter
        loopCount = 0;
        
        emit Unwind(repaid, withdrawn);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get current position status
     * @return collateral Amount of collateral supplied
     * @return debt Amount of debt
     * @return currentLoopCount Current loop iteration
     * @return healthFactor Current health factor
     */
    function getPosition()
        external
        view
        returns (
            uint256 collateral,
            uint256 debt,
            uint8 currentLoopCount,
            uint256 healthFactor
        )
    {
        uint256 availableBorrow;
        (collateral, debt, availableBorrow, healthFactor) = ILendingPool(POOL).getUserAccountData(
            address(this),
            address(collateralToken),
            address(loanToken)
        );
        
        return (collateral, debt, loopCount, healthFactor);
    }
    
    // ============ Security ============
    
    /**
     * @notice Modifier to ensure only Reactive Network can call
     * @param sender RVM ID injected by Reactive Network
     */
    modifier onlyReactive(address sender) {
        if (msg.sender != CALLBACK_PROXY) revert UnauthorizedCaller();
        if (sender != reactiveVmId) revert UnauthorizedCaller();
        _;
    }
    
    /**
     * @notice Receive funding for callback gas
     */
    function pay() external payable override {
        // Accepts ETH for callback execution gas
    }
    
    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {}
}

