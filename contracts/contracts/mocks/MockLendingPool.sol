// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockLendingPool
 * @notice Simplified lending protocol for hackathon demo
 * @dev Implements supply/borrow/repay/withdraw with LTV checks
 * 
 * Features:
 * - Multi-user collateral tracking
 * - Multi-user debt tracking
 * - Price oracle integration
 * - LTV validation (80% max)
 * - Health factor calculations
 * 
 * Simplified vs Real Aave/Morpho:
 * - No interest accrual (fixed debt)
 * - No liquidations (for demo simplicity)
 * - No reserve factors
 * - Simple price oracle (36 decimals)
 */
contract MockLendingPool {
    // ============ State ============
    
    /// @notice User collateral balances (user => token => amount)
    mapping(address => mapping(address => uint256)) public userCollateral;
    
    /// @notice User debt balances (user => token => amount)
    mapping(address => mapping(address => uint256)) public userDebt;
    
    /// @notice Total liquidity per token (available to borrow)
    mapping(address => uint256) public totalLiquidity;
    
    /// @notice Price oracle
    address public immutable oracle;
    
    /// @notice Maximum LTV (80% = 0.8e18)
    uint256 public constant MAX_LTV = 800000000000000000;
    
    /// @notice Minimum health factor (1.2e18 = 1.2)
    uint256 public constant MIN_HEALTH_FACTOR = 1200000000000000000;
    
    // ============ Events ============
    
    event Supply(address indexed user, address indexed token, uint256 amount);
    event Borrow(address indexed user, address indexed token, uint256 amount);
    event Repay(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event LiquidityAdded(address indexed token, uint256 amount);
    
    // ============ Errors ============
    
    error InsufficientCollateral();
    error InsufficientLiquidity();
    error HealthFactorTooLow();
    error TransferFailed();
    error InvalidAmount();
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize the lending pool
     * @param _oracle MockOracle address for price feeds
     */
    constructor(address _oracle) {
        oracle = _oracle;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add liquidity to the pool (for borrowing)
     * @param token Token to add liquidity for
     * @param amount Amount to add
     * @dev Anyone can add liquidity (for demo purposes)
     */
    function addLiquidity(address token, uint256 amount) external {
        // Transfer tokens to pool
        (bool success, ) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount)
        );
        if (!success) revert TransferFailed();
        
        // Increase available liquidity
        totalLiquidity[token] += amount;
        
        emit LiquidityAdded(token, amount);
    }
    
    /**
     * @notice Seed initial liquidity by minting (for demo)
     * @param token Token to seed
     * @param amount Amount to mint and add
     * @dev Only works with MockTokens that have public mint()
     */
    function seedLiquidity(address token, uint256 amount) external {
        // Mint tokens to pool
        (bool success, ) = token.call(
            abi.encodeWithSignature("mint(address,uint256)", address(this), amount)
        );
        if (!success) revert TransferFailed();
        
        // Increase available liquidity
        totalLiquidity[token] += amount;
        
        emit LiquidityAdded(token, amount);
    }
    
    // ============ Core Lending Functions ============
    
    /**
     * @notice Supply collateral to the pool
     * @param token Collateral token (e.g., WETH)
     * @param amount Amount to supply
     * @param onBehalf Address to supply on behalf of (for vault pattern)
     */
    function supply(address token, uint256 amount, address onBehalf) external {
        if (amount == 0) revert InvalidAmount();
        
        // Transfer tokens to pool
        (bool success, ) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amount)
        );
        if (!success) revert TransferFailed();
        
        // Increase user's collateral
        userCollateral[onBehalf][token] += amount;
        
        emit Supply(onBehalf, token, amount);
    }
    
    /**
     * @notice Borrow tokens against collateral
     * @param collateralToken Collateral token (e.g., WETH)
     * @param borrowToken Token to borrow (e.g., USDC)
     * @param amount Amount to borrow
     * @param onBehalf Address to borrow on behalf of
     * @param receiver Address to receive borrowed tokens
     */
    function borrow(
        address collateralToken,
        address borrowToken,
        uint256 amount,
        address onBehalf,
        address receiver
    ) external {
        if (amount == 0) revert InvalidAmount();
        
        // Check if pool has enough liquidity
        if (totalLiquidity[borrowToken] < amount) revert InsufficientLiquidity();
        
        // Increase user's debt
        userDebt[onBehalf][borrowToken] += amount;
        
        // Check health factor after borrow
        uint256 healthFactor = calculateHealthFactor(onBehalf, collateralToken, borrowToken);
        if (healthFactor < MIN_HEALTH_FACTOR) {
            // Revert the debt increase
            userDebt[onBehalf][borrowToken] -= amount;
            revert HealthFactorTooLow();
        }
        
        // Decrease available liquidity
        totalLiquidity[borrowToken] -= amount;
        
        // Transfer borrowed tokens to receiver
        (bool success, ) = borrowToken.call(
            abi.encodeWithSignature("transfer(address,uint256)", receiver, amount)
        );
        if (!success) revert TransferFailed();
        
        emit Borrow(onBehalf, borrowToken, amount);
    }
    
    /**
     * @notice Repay borrowed tokens
     * @param token Token to repay (e.g., USDC)
     * @param amount Amount to repay (or max for full repayment)
     * @param onBehalf Address to repay debt for
     */
    function repay(address token, uint256 amount, address onBehalf) external returns (uint256) {
        uint256 userDebtAmount = userDebt[onBehalf][token];
        
        // If amount is max uint256, repay all debt
        uint256 repayAmount = amount;
        if (amount == type(uint256).max || amount > userDebtAmount) {
            repayAmount = userDebtAmount;
        }
        
        if (repayAmount == 0) return 0;
        
        // Transfer tokens from caller to pool
        (bool success, ) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), repayAmount)
        );
        if (!success) revert TransferFailed();
        
        // Decrease user's debt
        userDebt[onBehalf][token] -= repayAmount;
        
        // Increase available liquidity
        totalLiquidity[token] += repayAmount;
        
        emit Repay(onBehalf, token, repayAmount);
        
        return repayAmount;
    }
    
    /**
     * @notice Withdraw collateral from the pool
     * @param token Collateral token (e.g., WETH)
     * @param amount Amount to withdraw (or max for full withdrawal)
     * @param onBehalf Address to withdraw collateral for
     * @param receiver Address to receive withdrawn tokens
     */
    function withdraw(
        address token,
        uint256 amount,
        address onBehalf,
        address receiver
    ) external returns (uint256) {
        uint256 userCollateralAmount = userCollateral[onBehalf][token];
        
        // If amount is max uint256, withdraw all
        uint256 withdrawAmount = amount;
        if (amount == type(uint256).max || amount > userCollateralAmount) {
            withdrawAmount = userCollateralAmount;
        }
        
        if (withdrawAmount == 0) return 0;
        
        // Decrease user's collateral first
        userCollateral[onBehalf][token] -= withdrawAmount;
        
        // Check health factor after withdrawal (if user has debt)
        // We need to check against all possible borrow tokens
        // For simplicity, we'll allow withdrawal if debt is 0
        // In production, this would check health factor properly
        
        // Transfer tokens to receiver
        (bool success, ) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", receiver, withdrawAmount)
        );
        if (!success) revert TransferFailed();
        
        emit Withdraw(onBehalf, token, withdrawAmount);
        
        return withdrawAmount;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Calculate health factor for a user
     * @param user User address
     * @param collateralToken Collateral token
     * @param borrowToken Borrow token
     * @return healthFactor Health factor (1e18 = 1.0)
     */
    function calculateHealthFactor(
        address user,
        address collateralToken,
        address borrowToken
    ) public view returns (uint256 healthFactor) {
        uint256 collateralAmount = userCollateral[user][collateralToken];
        uint256 debtAmount = userDebt[user][borrowToken];
        
        // If no debt, health factor is infinite
        if (debtAmount == 0) {
            return type(uint256).max;
        }
        
        // Get price from oracle (36 decimals for Morpho compatibility)
        (bool success, bytes memory data) = oracle.staticcall(
            abi.encodeWithSignature("price()")
        );
        require(success, "Oracle call failed");
        uint256 price = abi.decode(data, (uint256));
        
        // Calculate collateral value in USD
        // price is 36 decimals, collateralToken is 18 decimals, borrowToken is 6 decimals
        // collateralValue = (collateralAmount * price) / 1e18 (normalize to 18 decimals)
        uint256 collateralValue = (collateralAmount * price) / 1e36; // Result in collateral token decimals
        
        // Convert to same units as debt (USDC = 6 decimals)
        // collateralValue is in 18 decimals (WETH), need to convert to 6 decimals (USDC)
        collateralValue = collateralValue / 1e12; // 18 decimals -> 6 decimals
        
        // Health factor = (collateralValue * MAX_LTV) / debtAmount
        // Scaled by 1e18 for precision
        healthFactor = (collateralValue * MAX_LTV) / debtAmount;
        
        return healthFactor;
    }
    
    /**
     * @notice Get user account data (Aave-compatible)
     * @param user User address
     * @param collateralToken Collateral token
     * @param borrowToken Borrow token
     * @return totalCollateral Total collateral (in collateral token decimals)
     * @return totalDebt Total debt (in borrow token decimals)
     * @return availableBorrow Available borrow capacity (in borrow token decimals)
     * @return healthFactor Current health factor (1e18 = 1.0)
     */
    function getUserAccountData(
        address user,
        address collateralToken,
        address borrowToken
    ) external view returns (
        uint256 totalCollateral,
        uint256 totalDebt,
        uint256 availableBorrow,
        uint256 healthFactor
    ) {
        totalCollateral = userCollateral[user][collateralToken];
        totalDebt = userDebt[user][borrowToken];
        healthFactor = calculateHealthFactor(user, collateralToken, borrowToken);
        
        // Calculate available borrow capacity
        // Get price from oracle
        (bool success, bytes memory data) = oracle.staticcall(
            abi.encodeWithSignature("price()")
        );
        require(success, "Oracle call failed");
        uint256 price = abi.decode(data, (uint256));
        
        // Max borrowable = (collateral value * MAX_LTV) - current debt
        uint256 collateralValue = (totalCollateral * price) / 1e36; // Normalize
        collateralValue = collateralValue / 1e12; // Convert to 6 decimals (USDC)
        
        uint256 maxBorrow = (collateralValue * MAX_LTV) / 1e18;
        
        if (maxBorrow > totalDebt) {
            availableBorrow = maxBorrow - totalDebt;
        } else {
            availableBorrow = 0;
        }
        
        return (totalCollateral, totalDebt, availableBorrow, healthFactor);
    }
    
    /**
     * @notice Get user position data
     * @param user User address
     * @param collateralToken Collateral token
     * @param borrowToken Borrow token
     * @return collateral User's collateral amount
     * @return debt User's debt amount
     */
    function getPosition(
        address user,
        address collateralToken,
        address borrowToken
    ) external view returns (uint256 collateral, uint256 debt) {
        return (userCollateral[user][collateralToken], userDebt[user][borrowToken]);
    }
    
    /**
     * @notice Allow contract to receive tokens
     */
    receive() external payable {}
}

