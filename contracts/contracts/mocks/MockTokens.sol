// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockTokens
 * @notice Mock ERC20 tokens for testing and demo purposes
 * @dev Includes unlimited minting capability for liquidity control
 */

/**
 * @title MockWETH
 * @notice Mock Wrapped ETH token (18 decimals)
 * @dev Used as collateral in Morpho Blue markets
 */
contract MockWETH {
    string public constant name = "Mock Wrapped Ether";
    string public constant symbol = "WETH";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @notice Mint tokens to any address (faucet)
     * @param to Recipient address
     * @param amount Amount to mint (18 decimals)
     * @dev Public function - anyone can mint for demo purposes
     */
    function mint(address to, uint256 amount) public {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Transfer tokens
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success True if transfer succeeded
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Approve spender
     * @param spender Spender address
     * @param amount Amount to approve
     * @return success True if approval succeeded
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfer from another address
     * @param from Source address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success True if transfer succeeded
     */
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}

/**
 * @title MockUSDC
 * @notice Mock USD Coin token (6 decimals)
 * @dev Used as loan token in Morpho Blue markets
 */
contract MockUSDC {
    string public constant name = "Mock USD Coin";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @notice Mint tokens to any address (faucet)
     * @param to Recipient address
     * @param amount Amount to mint (6 decimals)
     * @dev Public function - anyone can mint for demo purposes
     */
    function mint(address to, uint256 amount) public {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Transfer tokens
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success True if transfer succeeded
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Approve spender
     * @param spender Spender address
     * @param amount Amount to approve
     * @return success True if approval succeeded
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Transfer from another address
     * @param from Source address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success True if transfer succeeded
     */
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
}


