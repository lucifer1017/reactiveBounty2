// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IReactive.sol";
import "./interfaces/IMorpho.sol";

/**
 * @title ReactiveMorphoShield
 * @notice Automated Leverage Vault using Morpho Blue on Ethereum Sepolia
 * @dev Integrates with real Morpho Blue protocol using mock tokens
 * 
 * Architecture:
 * - Protocol: Morpho Blue (0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb)
 * - Collateral: MockWETH (18 decimals)
 * - Loan: MockUSDC (6 decimals)
 * - Oracle: MockOracle (controllable price)
 * - Automation: Reactive Network
 * 
 * Flow:
 * 1. User deposits WETH collateral
 * 2. Reactive Network triggers executeLoop():
 *    - Borrow USDC from Morpho
 *    - "Swap" USDC → WETH (mint for demo)
 *    - Supply WETH back to Morpho
 *    - Repeat until target leverage reached
 * 3. On price crash, Reactive Network triggers unwind():
 *    - "Flash loan" USDC (mint for demo)
 *    - Repay all debt
 *    - Withdraw all collateral
 */
contract ReactiveMorphoShield is IPayer {
    // ============ Constants ============
    
    /// @notice Morpho Blue protocol address on Sepolia
    address public constant MORPHO = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;
    
    /// @notice Reactive Network Callback Proxy on Sepolia
    address public constant CALLBACK_PROXY = 0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA;
    
    // ============ Immutable State ============
    
    /// @notice Market parameters for this vault
    IMorpho.MarketParams public market;
    
    /// @notice Authorized Reactive VM ID (deployer of ShieldBrain)
    address public immutable reactiveVmId;
    
    /// @notice Collateral token (MockWETH)
    IERC20 public immutable collateralToken;
    
    /// @notice Loan token (MockUSDC)
    IERC20 public immutable loanToken;
    
    // ============ Strategy Parameters ============
    
    /// @notice Target Loan-to-Value ratio (70%)
    uint256 public constant TARGET_LTV = 70;
    
    /// @notice Liquidation Loan-to-Value (80% = 0.8e18)
    uint256 public constant LLTV = 800000000000000000;
    
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
     * @param _loanToken MockUSDC address
     * @param _collateralToken MockWETH address
     * @param _oracle MockOracle address
     * @param _reactiveVmId Authorized Reactive VM ID (ShieldBrain deployer)
     * 
     * @dev Constructs MarketParams for Morpho Blue:
     * - loanToken: USDC (what we borrow)
     * - collateralToken: WETH (what we supply)
     * - oracle: Price feed (WETH/USDC)
     * - irm: address(0) (no interest for demo simplicity)
     * - lltv: 0.8e18 (80% liquidation threshold)
     */
    constructor(
        address _loanToken,
        address _collateralToken,
        address _oracle,
        address _reactiveVmId
    ) {
        loanToken = IERC20(_loanToken);
        collateralToken = IERC20(_collateralToken);
        reactiveVmId = _reactiveVmId;
        
        // Initialize Morpho market parameters
        market = IMorpho.MarketParams({
            loanToken: _loanToken,
            collateralToken: _collateralToken,
            oracle: _oracle,
            irm: address(0), // No interest rate model for deterministic demo
            lltv: LLTV       // 80% liquidation threshold
        });
    }
    
    // ============ Market Initialization ============
    
    /**
     * @notice Initialize the Morpho market
     * @dev Must be called once before any deposits
     * @dev Morpho Blue requires markets to be explicitly created
     */
    function initializeMarket() external {
        // Create the market on Morpho Blue
        IMorpho(MORPHO).createMarket(market);
    }
    
    // ============ User Entry Point ============
    
    /**
     * @notice Deposit collateral to start leveraged position
     * @param amount Amount of WETH to deposit (18 decimals)
     * 
     * @dev Steps:
     * 1. Transfer WETH from user
     * 2. Approve Morpho to spend WETH
     * 3. Supply collateral to Morpho market
     * 4. Emit Deposit event → Triggers Reactive Network automation
     */
    function deposit(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        
        // Reset loop counter for new deposit
        loopCount = 0;
        
        // Transfer WETH from user to vault
        bool success = collateralToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        // Approve Morpho to spend WETH
        collateralToken.approve(MORPHO, amount);
        
        // Supply collateral to Morpho
        IMorpho(MORPHO).supplyCollateral(
            market,
            amount,
            address(this), // Supply on behalf of this vault
            ""            // No additional data
        );
        
        // Emit event to trigger Reactive Network
        emit Deposit(msg.sender, amount);
    }
    
    // ============ Reactive Automation ============
    
    /**
     * @notice Execute one leverage loop iteration
     * @param sender RVM ID (injected by Reactive Network)
     * 
     * @dev Called automatically by Reactive Network
     * 
     * Steps:
     * 1. Borrow USDC from Morpho (against WETH collateral)
     * 2. "Swap" USDC → WETH (simplified: mint WETH for demo)
     * 3. Supply new WETH as collateral
     * 4. Emit LoopStep event → Triggers next iteration or stops
     * 
     * Simplifications for Demo:
     * - Fixed borrow amount (1000 USDC) instead of dynamic calculation
     * - Mint WETH instead of real swap (no DEX liquidity needed)
     * - No slippage checks (not relevant for minting)
     */
    function executeLoop(address sender) external onlyReactive(sender) {
        // Check if max loops reached
        if (loopCount >= MAX_LOOPS) {
            revert MaxLoopsReached();
        }
        
        loopCount++;
        
        // Step 1: Borrow USDC from Morpho
        // Using fixed amount for demo simplicity (1000 USDC = 1000 * 1e6)
        uint256 borrowAmount = 1000 * 1e6; // 1000 USDC (6 decimals)
        
        // Borrow USDC (receive to this vault)
        IMorpho(MORPHO).borrow(
            market,
            borrowAmount,  // Amount of USDC to borrow
            0,             // Shares (0 = use assets mode)
            address(this), // Borrow on behalf of vault
            address(this)  // Receive borrowed USDC
        );
        
        // Step 2: "Swap" USDC → WETH
        // For demo, we simply mint equivalent WETH instead of using a real DEX
        // Assume price: 1 ETH = $3000, so 1000 USDC = 0.333... ETH
        // 1000 USDC (6 decimals) → 0.333... WETH (18 decimals)
        // Formula: wethAmount = (usdcAmount * 1e18) / 3000e6
        uint256 wethAmount = (borrowAmount * 1e18) / 3000e6;
        
        // Mint WETH to vault (simulates swap output)
        // Note: MockWETH has public mint() function
        (bool mintSuccess, ) = address(collateralToken).call(
            abi.encodeWithSignature("mint(address,uint256)", address(this), wethAmount)
        );
        require(mintSuccess, "Mint failed");
        
        // Step 3: Supply minted WETH back to Morpho
        collateralToken.approve(MORPHO, wethAmount);
        IMorpho(MORPHO).supplyCollateral(
            market,
            wethAmount,
            address(this),
            ""
        );
        
        // Emit event to trigger next iteration (ShieldBrain decides)
        emit LoopStep(loopCount, borrowAmount, wethAmount);
    }
    
    /**
     * @notice Emergency unwind: Close leveraged position
     * @param sender RVM ID (injected by Reactive Network)
     * 
     * @dev Called by Reactive Network when price crashes
     * 
     * Steps:
     * 1. "Flash loan" USDC (simplified: mint USDC for demo)
     * 2. Repay all debt to Morpho
     * 3. Withdraw all collateral from Morpho
     * 4. Cleanup (in production, would repay flash loan)
     * 
     * Simplifications for Demo:
     * - Mint USDC instead of real flash loan
     * - No flash loan fee
     * - No repayment needed (minted tokens)
     */
    function unwind(address sender) external onlyReactive(sender) {
        // Query current debt from Morpho
        // marketId = keccak256(abi.encode(market))
        bytes32 marketId = keccak256(abi.encode(market));
        
        (, uint128 borrowShares, uint128 collateralAmount) = IMorpho(MORPHO).position(
            marketId,
            address(this)
        );
        
        // If no debt, nothing to unwind
        if (borrowShares == 0) {
            emit Unwind(0, collateralAmount);
            return;
        }
        
        // Step 1: "Flash loan" USDC to repay debt
        // For demo, we mint USDC instead of using real flash loan
        // Estimate debt amount: 5000 USDC should be enough for 5 loops
        uint256 debtAmount = 5000 * 1e6; // 5000 USDC (6 decimals)
        
        // Mint USDC to vault (simulates flash loan)
        (bool mintSuccess, ) = address(loanToken).call(
            abi.encodeWithSignature("mint(address,uint256)", address(this), debtAmount)
        );
        require(mintSuccess, "Mint failed");
        
        // Step 2: Approve Morpho to spend USDC
        loanToken.approve(MORPHO, debtAmount);
        
        // Step 3: Repay all debt (use type(uint256).max for full repayment)
        IMorpho(MORPHO).repay(
            market,
            0,             // Assets (0 = use shares mode)
            type(uint256).max, // Repay all shares
            address(this), // Repay on behalf of vault
            ""            // No additional data
        );
        
        // Step 4: Withdraw all collateral
        IMorpho(MORPHO).withdrawCollateral(
            market,
            type(uint256).max, // Withdraw all collateral
            address(this),     // Withdraw on behalf of vault
            address(this)      // Receive collateral
        );
        
        // Reset loop counter
        loopCount = 0;
        
        // Remaining WETH stays in vault (user can withdraw manually or via another function)
        emit Unwind(debtAmount, collateralAmount);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get current position status
     * @return collateral Amount of collateral supplied
     * @return debt Amount of debt (borrow shares)
     * @return currentLoopCount Current loop iteration
     */
    function getPosition()
        external
        view
        returns (
            uint128 collateral,
            uint128 debt,
            uint8 currentLoopCount
        )
    {
        bytes32 marketId = keccak256(abi.encode(market));
        (, uint128 borrowShares, uint128 collateralAmount) = IMorpho(MORPHO).position(
            marketId,
            address(this)
        );
        
        return (collateralAmount, borrowShares, loopCount);
    }
    
    /**
     * @notice Get market ID
     * @return Market ID (bytes32 hash of MarketParams)
     */
    function getMarketId() external view returns (bytes32) {
        return keccak256(abi.encode(market));
    }
    
    // ============ Security ============
    
    /**
     * @notice Modifier to ensure only Reactive Network can call
     * @param sender RVM ID injected by Reactive Network
     * 
     * @dev Two-layer security:
     * 1. msg.sender must be Callback Proxy (on-chain verification)
     * 2. sender must match authorized RVM ID (off-chain injection)
     */
    modifier onlyReactive(address sender) {
        // Layer 1: Must be called by Callback Proxy
        if (msg.sender != CALLBACK_PROXY) revert UnauthorizedCaller();
        
        // Layer 2: RVM ID must match authorized ShieldBrain deployer
        if (sender != reactiveVmId) revert UnauthorizedCaller();
        
        _;
    }
    
    // ============ Funding ============
    
    /**
     * @notice Receive funding for callback gas
     * @dev Required by IPayer interface
     */
    function pay() external payable override {
        // Accepts ETH for callback execution gas
    }
    
    /**
     * @notice Allow contract to receive ETH
     */
    receive() external payable {}
}


