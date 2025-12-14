import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * @title ShieldBrain Deployment Module
 * @notice Deploys the Reactive Network logic controller
 * @dev Deploy this module last on Reactive Network (after ReactiveVault)
 * 
 * Prerequisites:
 *   1. Deploy MockOracle.ts on Sepolia → Get MockOracle address
 *   2. Deploy ReactiveVault.ts on Sepolia → Get vault address
 * 
 * System Contract: 0x0000000000000000000000000000000000fffFfF (hardcoded on Reactive Network)
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/ShieldBrain.ts \
 *     --network reactiveVm \
 *     --parameters parameters/reactive.json
 * 
 * parameters/reactive.json example:
 * {
 *   "ShieldBrainModule": {
 *     "vaultContract": "0x...",  // ReactiveVault address on Sepolia
 *     "oracleContract": "0x...", // MockOracle address on Sepolia
 *     "systemContract": "0x0000000000000000000000000000000000fffFfF"
 *   }
 * }
 */
export default buildModule("ShieldBrainModule", (m) => {
  // Get parameters (must be provided via --parameters flag)
  const vaultContract = m.getParameter<string>("vaultContract");
  const oracleContract = m.getParameter<string>("oracleContract");
  const systemContract = m.getParameter(
    "systemContract",
    "0x0000000000000000000000000000000000fffFfF" // Default: System Contract address
  );

  // Deploy ShieldBrain
  const brain = m.contract("ShieldBrain", [
    vaultContract,
    oracleContract,
    systemContract,
  ]);

  return { brain };
});

