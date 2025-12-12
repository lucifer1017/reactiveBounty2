import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * @title ReactiveVault Deployment Module
 * @notice Deploys the leverage vault
 * @dev Deploy this after MockLendingPool
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/ReactiveVault.ts \
 *     --network sepolia \
 *     --parameters ignition/parameters/vault.json
 */
export default buildModule("ReactiveVaultModule", (m) => {
  // Get parameters
  const pool = m.getParameter<string>("pool");
  const collateralToken = m.getParameter<string>("collateralToken");
  const loanToken = m.getParameter<string>("loanToken");
  const reactiveVmId = m.getParameter<string>("reactiveVmId");

  // Deploy ReactiveVault
  const vault = m.contract("ReactiveVault", [
    pool,
    collateralToken,
    loanToken,
    reactiveVmId,
  ]);

  return { vault };
});

