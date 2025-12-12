// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMorpho
 * @notice Interface for Morpho Blue lending protocol
 * @dev Morpho Blue Sepolia: 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
 * 
 * Morpho Blue is a minimal, immutable lending primitive.
 * Markets are defined by 5 parameters (MarketParams).
 */
interface IMorpho {
    /**
     * @notice Market parameters that define a unique lending market
     * @param loanToken The loan token (asset to borrow, e.g., USDC)
     * @param collateralToken The collateral token (e.g., WETH)
     * @param oracle The price oracle address
     * @param irm Interest Rate Model address (use address(0) for fixed rate)
     * @param lltv Liquidation Loan-to-Value (e.g., 0.8e18 = 80%)
     */
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    /**
     * @notice Market ID (keccak256 hash of MarketParams)
     */
    struct Id {
        bytes32 value;
    }

    /**
     * @notice Create a new market
     * @param marketParams The market parameters
     * @dev Markets must be created before any operations can be performed
     */
    function createMarket(MarketParams memory marketParams) external;

    /**
     * @notice Supply collateral to a market
     * @param marketParams The market parameters
     * @param assets Amount of collateral to supply
     * @param onBehalf Address to supply on behalf of
     * @param data Additional data (use empty bytes for standard supply)
     */
    function supplyCollateral(
        MarketParams memory marketParams,
        uint256 assets,
        address onBehalf,
        bytes memory data
    ) external;

    /**
     * @notice Borrow assets from a market
     * @param marketParams The market parameters
     * @param assets Amount to borrow (0 if using shares)
     * @param shares Shares to borrow (0 if using assets)
     * @param onBehalf Address to borrow on behalf of
     * @param receiver Address to receive the borrowed assets
     * @return assetsOut Actual assets borrowed
     * @return sharesOut Actual shares borrowed
     */
    function borrow(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        address receiver
    ) external returns (uint256 assetsOut, uint256 sharesOut);

    /**
     * @notice Repay borrowed assets
     * @param marketParams The market parameters
     * @param assets Amount to repay (0 if using shares)
     * @param shares Shares to repay (0 if using assets)
     * @param onBehalf Address to repay on behalf of
     * @param data Additional data (use empty bytes)
     * @return assetsRepaid Actual assets repaid
     * @return sharesRepaid Actual shares repaid
     */
    function repay(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256 assetsRepaid, uint256 sharesRepaid);

    /**
     * @notice Withdraw collateral from a market
     * @param marketParams The market parameters
     * @param assets Amount of collateral to withdraw
     * @param onBehalf Address to withdraw on behalf of
     * @param receiver Address to receive the collateral
     */
    function withdrawCollateral(
        MarketParams memory marketParams,
        uint256 assets,
        address onBehalf,
        address receiver
    ) external;

    /**
     * @notice Get user position in a market
     * @param id Market ID (hash of MarketParams)
     * @param user User address
     * @return supplyShares User's supply shares
     * @return borrowShares User's borrow shares
     * @return collateral User's collateral amount
     */
    function position(bytes32 id, address user)
        external
        view
        returns (
            uint256 supplyShares,
            uint128 borrowShares,
            uint128 collateral
        );

    /**
     * @notice Compute market ID from parameters
     * @param marketParams The market parameters
     * @return Market ID (bytes32 hash)
     */
    function idToMarketParams(MarketParams memory marketParams)
        external
        pure
        returns (bytes32);
}

/**
 * @title IERC20
 * @notice Minimal ERC20 interface for token operations
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}


