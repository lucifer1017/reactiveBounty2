// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockOracle
 * @notice Controllable price oracle for Morpho Blue markets
 * @dev Allows manual price updates for demo and testing
 * 
 * Price Format:
 * - Morpho Blue expects prices scaled to 36 decimals
 * - Example: If 1 WETH = $3000, price = 3000 * 1e36
 * - Scaling is handled off-chain when calling setPrice()
 * - This contract just stores/returns the raw uint256 value
 */
contract MockOracle {
    // ============ State ============
    
    uint256 private _price;
    
    // ============ Events ============
    
    event PriceUpdated(uint256 newPrice, uint256 timestamp);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize oracle with default price
     * @param initialPrice Initial price (36 decimals)
     * @dev Example: 3000 * 1e36 = $3000 per WETH
     */
    constructor(uint256 initialPrice) {
        _price = initialPrice;
        emit PriceUpdated(initialPrice, block.timestamp);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update the price (anyone can call for demo)
     * @param newPrice New price (36 decimals)
     * @dev In production, this would be restricted to authorized updaters
     * 
     * Example values:
     * - $3000 WETH: 3000 * 1e36 = 3000000000000000000000000000000000000000
     * - $2000 WETH: 2000 * 1e36 = 2000000000000000000000000000000000000000
     * - $1000 WETH: 1000 * 1e36 = 1000000000000000000000000000000000000000
     */
    function setPrice(uint256 newPrice) external {
        require(newPrice > 0, "Price must be positive");
        _price = newPrice;
        emit PriceUpdated(newPrice, block.timestamp);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get current price
     * @return Current price (36 decimals)
     * @dev This is the function Morpho Blue calls to get the price
     */
    function price() external view returns (uint256) {
        return _price;
    }
    
    /**
     * @notice Get current price (alternative name for compatibility)
     * @return Current price (36 decimals)
     */
    function getPrice() external view returns (uint256) {
        return _price;
    }
}


