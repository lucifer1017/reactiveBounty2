import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * @title MockLendingPool Deployment Module
 * @notice Deploys the mock lending protocol
 * @dev Deploy this after MockOracle
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/MockLendingPool.ts \
 *     --network sepolia \
 *     --parameters ignition/parameters/pool.json
 */
export default buildModule("MockLendingPoolModule", (m) => {
  // Get oracle address from parameters
  const oracle = m.getParameter<string>("oracle");

  // Deploy MockLendingPool
  const pool = m.contract("MockLendingPool", [oracle]);

  return { pool };
});

