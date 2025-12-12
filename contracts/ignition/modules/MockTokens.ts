import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * @title MockTokens Deployment Module
 * @notice Deploys MockWETH and MockUSDC tokens
 * @dev Deploy this module first on Sepolia
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/MockTokens.ts --network sepolia
 */
export default buildModule("MockTokensModule", (m) => {
  // Deploy MockWETH (18 decimals)
  const mockWETH = m.contract("MockWETH");

  // Deploy MockUSDC (6 decimals)
  const mockUSDC = m.contract("MockUSDC");

  return { mockWETH, mockUSDC };
});

