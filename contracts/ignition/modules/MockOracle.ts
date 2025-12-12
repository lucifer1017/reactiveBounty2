import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * @title MockOracle Deployment Module
 * @notice Deploys MockOracle with initial price
 * @dev Deploy this module second on Sepolia
 * 
 * Initial Price: $3000 per WETH (scaled to 36 decimals for Morpho)
 * Formula: 3000 * 1e36 = 3000000000000000000000000000000000000000
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/MockOracle.ts --network sepolia
 */
export default buildModule("MockOracleModule", (m) => {
  // Initial price: $3000 per WETH (36 decimals for Morpho Blue)
  const initialPrice = m.getParameter(
    "initialPrice",
    3000000000000000000000000000000000000000n // 3000 * 1e36
  );

  // Deploy MockOracle
  const mockOracle = m.contract("MockOracle", [initialPrice]);

  return { mockOracle };
});

