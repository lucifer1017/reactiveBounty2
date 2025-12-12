import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * @title ReactiveMorphoShield Deployment Module
 * @notice Deploys the leverage vault on Sepolia
 * @dev Deploy this module third on Sepolia (after MockTokens and MockOracle)
 * 
 * Prerequisites:
 *   1. Deploy MockTokens.ts first → Get MockWETH and MockUSDC addresses
 *   2. Deploy MockOracle.ts → Get MockOracle address
 *   3. Know your reactiveVmId (the address that will deploy ShieldBrain)
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/ReactiveMorphoShield.ts \
 *     --network sepolia \
 *     --parameters parameters/sepolia.json
 * 
 * parameters/sepolia.json example:
 * {
 *   "ReactiveMorphoShieldModule": {
 *     "loanToken": "0x...",      // MockUSDC address
 *     "collateralToken": "0x...", // MockWETH address
 *     "oracle": "0x...",          // MockOracle address
 *     "reactiveVmId": "0x..."     // ShieldBrain deployer address
 *   }
 * }
 */
export default buildModule("ReactiveMorphoShieldModule", (m) => {
  // Get parameters (must be provided via --parameters flag)
  const loanToken = m.getParameter<string>("loanToken");
  const collateralToken = m.getParameter<string>("collateralToken");
  const oracle = m.getParameter<string>("oracle");
  const reactiveVmId = m.getParameter<string>("reactiveVmId");

  // Deploy ReactiveMorphoShield
  const shield = m.contract("ReactiveMorphoShield", [
    loanToken,
    collateralToken,
    oracle,
    reactiveVmId,
  ]);

  return { shield };
});

