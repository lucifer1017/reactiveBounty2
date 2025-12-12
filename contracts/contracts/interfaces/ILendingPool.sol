// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILendingPool
 * @notice Interface for MockLendingPool
 */
interface ILendingPool {
    /**
     * @notice Supply collateral to the pool
     * @param token Collateral token address
     * @param amount Amount to supply
     * @param onBehalf Address to supply on behalf of
     */
    function supply(address token, uint256 amount, address onBehalf) external;
    
    /**
     * @notice Borrow tokens against collateral
     * @param collateralToken Collateral token address
     * @param borrowToken Token to borrow
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
    ) external;
    
    /**
     * @notice Repay borrowed tokens
     * @param token Token to repay
     * @param amount Amount to repay (use type(uint256).max for full repayment)
     * @param onBehalf Address to repay debt for
     * @return Amount actually repaid
     */
    function repay(address token, uint256 amount, address onBehalf) external returns (uint256);
    
    /**
     * @notice Withdraw collateral from the pool
     * @param token Collateral token address
     * @param amount Amount to withdraw (use type(uint256).max for full withdrawal)
     * @param onBehalf Address to withdraw collateral for
     * @param receiver Address to receive withdrawn tokens
     * @return Amount actually withdrawn
     */
    function withdraw(
        address token,
        uint256 amount,
        address onBehalf,
        address receiver
    ) external returns (uint256);
    
    /**
     * @notice Get user account data
     * @param user User address
     * @param collateralToken Collateral token
     * @param borrowToken Borrow token
     * @return totalCollateral Total collateral
     * @return totalDebt Total debt
     * @return availableBorrow Available borrow capacity
     * @return healthFactor Current health factor
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
    );
    
    /**
     * @notice Get user position
     * @param user User address
     * @param collateralToken Collateral token
     * @param borrowToken Borrow token
     * @return collateral User's collateral
     * @return debt User's debt
     */
    function getPosition(
        address user,
        address collateralToken,
        address borrowToken
    ) external view returns (uint256 collateral, uint256 debt);
    
    /**
     * @notice Seed liquidity (mint and add to pool)
     * @param token Token to seed
     * @param amount Amount to seed
     */
    function seedLiquidity(address token, uint256 amount) external;
}

/**
 * @title IERC20
 * @notice Minimal ERC20 interface
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

