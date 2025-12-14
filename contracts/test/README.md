# ReactiveVault Test Suite

Comprehensive test suite for ReactiveVault smart contracts with transaction hash logging.

## Overview

This test suite covers:
- ✅ Full deposit flow
- ✅ Loop execution (all 5 loops)
- ✅ Unwind flow
- ✅ Price crash scenarios
- ✅ Edge cases (insufficient liquidity, max loops, health factor protection)
- ✅ Invalid input handling

All transaction hashes are automatically logged and saved to JSON files in `test-results/`.

## Running Tests

### Run All Tests
```bash
npx hardhat test
```

### Run Specific Test File
```bash
npx hardhat test test/ReactiveVault.test.ts
npx hardhat test test/EdgeCases.test.ts
```

### Run with Verbose Output
```bash
npx hardhat test --verbose
```

## Test Files

### `ReactiveVault.test.ts`
Main integration tests covering:
- Contract deployment
- Deposit flow with event verification
- Complete loop execution (5 loops)
- Unwind flow
- Price crash and emergency unwind

**Output:** `test-results/ReactiveVault-Integration-TX-Hashes.json`

### `EdgeCases.test.ts`
Edge case and error condition tests:
- Insufficient liquidity handling
- Max loops limit enforcement
- Health factor protection
- Invalid input validation
- Unwind with zero debt

**Output:** `test-results/ReactiveVault-EdgeCases-TX-Hashes.json`

### `utils/txLogger.ts`
Utility class for logging and saving transaction hashes to JSON files.

## Transaction Hash Logging

All tests automatically log transaction hashes with the following information:
- Test name and description
- Chain (local/hardhat for tests)
- Transaction hash
- Block number
- Gas used
- Status (success/failed)
- Explorer URL (if applicable)

### Example Output

```json
{
  "testSuite": "ReactiveVault-Integration",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalTransactions": 15,
  "transactions": [
    {
      "testName": "setup",
      "description": "Deploy MockOracle",
      "chain": "local",
      "txHash": "0xabc123...",
      "blockNumber": 1,
      "gasUsed": 500000,
      "status": "success"
    },
    ...
  ]
}
```

## Test Network

Tests run on **Hardhat's local network** by default. This means:
- ✅ Fast execution
- ✅ No gas costs
- ✅ Deterministic results
- ✅ All TX hashes are logged

**Note:** For Reactive Network transaction hashes (ShieldBrain events), you'll need to run tests on actual testnets or document them separately from manual testnet runs.

## Important Notes

### CALLBACK_PROXY Impersonation

The tests impersonate the Reactive Network Callback Proxy address (`0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA`) to satisfy the `onlyReactive` modifier. This allows testing of `executeLoop()` and `unwind()` functions without deploying ShieldBrain on Reactive Network.

In production:
- ShieldBrain on Reactive Network detects events
- ShieldBrain emits Callback events
- Reactive Network Callback Proxy calls `executeLoop()` or `unwind()`

### Mock Contracts

All tests use mock contracts:
- `MockWETH` - Mock Wrapped ETH (18 decimals)
- `MockUSDC` - Mock USD Coin (6 decimals)
- `MockOracle` - Controllable price oracle
- `MockLendingPool` - Simplified lending protocol

These mocks allow:
- Unlimited minting for testing
- Fixed price oracle for predictable behavior
- Simplified lending logic for faster tests

## Coverage

The test suite covers:
- ✅ All core functionality (deposit, loop, unwind)
- ✅ Event emissions
- ✅ State changes
- ✅ Edge cases and error conditions
- ✅ Security checks (unauthorized access, health factor)

## Troubleshooting

### Tests Fail with "UnauthorizedCaller"
- Ensure CALLBACK_PROXY impersonation is working
- Check that Hardhat's `hardhat_impersonateAccount` is available

### No TX Hashes in Output
- Check that `test-results/` directory exists
- Verify `txLogger.saveToFile()` is called at the end of tests

### Tests Timeout
- Increase timeout in test configuration
- Check for infinite loops in test logic

## Next Steps

After running tests:
1. Review transaction hashes in `test-results/` directory
2. Use hashes for documentation in root README
3. For Reactive Network TX hashes, run manual tests on testnet using `scripts/test-vault.ts`

---

**Note:** These tests cover Sepolia (Origin chain) transactions. Reactive Network transaction hashes come from actual testnet deployments and should be documented separately.

