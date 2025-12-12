# Deployment Guide - Reactive Morpho Shield

Step-by-step guide to deploy all contracts in the correct order.

---

## 📋 Prerequisites

### 1. Update Hardhat Config

Ensure your `hardhat.config.ts` has the required networks:

```typescript
networks: {
  sepolia: {
    type: "http",
    chainType: "l1",
    url: configVariable("SEPOLIA_RPC_URL"),
    accounts: [configVariable("PRIVATE_KEY")],
  },
  reactiveVm: {
    type: "http",
    url: configVariable("REACTIVE_RPC_URL"),
    accounts: [configVariable("PRIVATE_KEY")],
  },
}
```

### 2. Setup Environment Variables

Create `.env` file:

```bash
PRIVATE_KEY=your_private_key_without_0x
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
REACTIVE_RPC_URL=https://rpc.lasna.reactive.network
```

### 3. Get Testnet Funds

- **Sepolia:** Get ETH from https://sepoliafaucet.com
- **Reactive Network:** Get lReact from https://lasna.reactscan.net/faucet

---

## 🚀 Deployment Steps

### **Step 1: Deploy Mock Tokens (Sepolia)**

Deploy MockWETH and MockUSDC:

```bash
npx hardhat ignition deploy ignition/modules/MockTokens.ts --network sepolia
```

**Expected Output:**
```
✅ MockWETH deployed to: 0xABC...123
✅ MockUSDC deployed to: 0xDEF...456
```

**Save these addresses!** You'll need them for the next steps.

---

### **Step 2: Deploy Mock Oracle (Sepolia)**

Deploy MockOracle with initial price of $3000:

```bash
npx hardhat ignition deploy ignition/modules/MockOracle.ts --network sepolia
```

**Expected Output:**
```
✅ MockOracle deployed to: 0xGHI...789
   Initial Price: $3000 (3000 * 1e36)
```

**Save this address!**

---

### **Step 3: Prepare ReactiveMorphoShield Parameters**

Create `ignition/parameters/sepolia.json`:

```json
{
  "ReactiveMorphoShieldModule": {
    "loanToken": "0xDEF...456",      // MockUSDC address from Step 1
    "collateralToken": "0xABC...123", // MockWETH address from Step 1
    "oracle": "0xGHI...789",          // MockOracle address from Step 2
    "reactiveVmId": "0xYOUR_WALLET"   // Your wallet address (will deploy ShieldBrain)
  }
}
```

**Important:** Use YOUR wallet address as `reactiveVmId` (the same address you'll use to deploy ShieldBrain).

---

### **Step 4: Deploy ReactiveMorphoShield (Sepolia)**

Deploy the vault:

```bash
npx hardhat ignition deploy ignition/modules/ReactiveMorphoShield.ts \
  --network sepolia \
  --parameters ignition/parameters/sepolia.json
```

**Expected Output:**
```
✅ ReactiveMorphoShield deployed to: 0xJKL...012
   Market Parameters:
   - Loan Token: 0xDEF...456 (MockUSDC)
   - Collateral Token: 0xABC...123 (MockWETH)
   - Oracle: 0xGHI...789 (MockOracle)
   - LLTV: 80%
```

**Save this address!**

---

### **Step 5: Prepare ShieldBrain Parameters**

Create `ignition/parameters/reactive.json`:

```json
{
  "ShieldBrainModule": {
    "vaultContract": "0xJKL...012",    // ReactiveMorphoShield from Step 4
    "oracleContract": "0xGHI...789",   // MockOracle from Step 2
    "systemContract": "0x0000000000000000000000000000000000fffFfF"
  }
}
```

---

### **Step 6: Deploy ShieldBrain (Reactive Network)**

Deploy the brain:

```bash
npx hardhat ignition deploy ignition/modules/ShieldBrain.ts \
  --network reactiveVm \
  --parameters ignition/parameters/reactive.json
```

**Expected Output:**
```
✅ ShieldBrain deployed to: 0xMNO...345
   Subscriptions:
   - Deposit events from 0xJKL...012
   - LoopStep events from 0xJKL...012
   - PriceUpdated events from 0xGHI...789
```

**Save this address!**

---

### **Step 7: Update .env with Deployed Addresses**

Add the deployed addresses to your `.env`:

```bash
SHIELD_VAULT_ADDRESS=0xJKL...012  # ReactiveMorphoShield
SHIELD_BRAIN_ADDRESS=0xMNO...345  # ShieldBrain

# Also save token addresses for testing
MOCK_WETH_ADDRESS=0xABC...123
MOCK_USDC_ADDRESS=0xDEF...456
MOCK_ORACLE_ADDRESS=0xGHI...789
```

---

### **Step 8: Fund the Contracts**

Run the funding scripts:

```bash
# Fund vault on Sepolia (0.02 ETH for callbacks)
npx tsx scripts/fund-vault.ts

# Fund brain on Reactive Network (1.0 lReact for RVM)
npx tsx scripts/fund-brain.ts
```

---

### **Step 9: Verify Deployment**

#### Check Vault (Sepolia):
```bash
# Visit Sepolia Etherscan
https://sepolia.etherscan.io/address/YOUR_VAULT_ADDRESS

# Should show:
- Balance: 0.02 ETH
- Code: ✅ Verified contract
```

#### Check Brain (Reactive Network):
```bash
# Visit Reactive Scan
https://lasna.reactscan.net/address/YOUR_BRAIN_ADDRESS

# Should show:
- Balance: 1.0 lReact
- Status: Active
- Subscriptions: 3 (Deposit, LoopStep, PriceUpdated)
```

---

## 🧪 Testing the System

### **Test 1: Mint Tokens**

Mint MockWETH to your wallet:

```bash
# Using Hardhat console
npx hardhat console --network sepolia

> const MockWETH = await ethers.getContractAt("MockWETH", "0xABC...123")
> await MockWETH.mint(await ethers.getSigners()[0].getAddress(), ethers.parseEther("10"))
> console.log("Minted 10 WETH")
```

### **Test 2: Deposit and Watch Automation**

1. Approve vault to spend WETH:
   ```javascript
   await MockWETH.approve("0xJKL...012", ethers.parseEther("1"))
   ```

2. Deposit to vault:
   ```javascript
   const Vault = await ethers.getContractAt("ReactiveMorphoShield", "0xJKL...012")
   await Vault.deposit(ethers.parseEther("1"))
   ```

3. **Watch the magic happen:**
   - Deposit event emitted on Sepolia
   - ShieldBrain detects event on Reactive Network
   - executeLoop() callback triggered 5 times (every ~30 seconds)
   - Position leveraged to ~3x

### **Test 3: Price Crash & Unwind**

1. Crash the price via MockOracle:
   ```javascript
   const Oracle = await ethers.getContractAt("MockOracle", "0xGHI...789")
   await Oracle.setPrice(1000n * 10n**36n) // Set price to $1000
   ```

2. **Watch emergency unwind:**
   - PriceUpdated event emitted
   - ShieldBrain detects crash
   - unwind() callback triggered
   - Position deleveraged, collateral withdrawn

---

## 📊 Deployment Checklist

Use this checklist to track your deployment:

- [ ] ✅ Hardhat config updated with networks
- [ ] ✅ Environment variables set in `.env`
- [ ] ✅ Testnet funds acquired (Sepolia ETH + Reactive lReact)
- [ ] ✅ MockWETH deployed
- [ ] ✅ MockUSDC deployed
- [ ] ✅ MockOracle deployed
- [ ] ✅ Parameter files created (`sepolia.json`, `reactive.json`)
- [ ] ✅ ReactiveMorphoShield deployed
- [ ] ✅ ShieldBrain deployed
- [ ] ✅ Vault funded (0.02 ETH)
- [ ] ✅ Brain funded (1.0 lReact)
- [ ] ✅ Brain shows "Active" status on Reactive Scan
- [ ] ✅ Brain shows 3 subscriptions
- [ ] ✅ Test tokens minted
- [ ] ✅ Test deposit works
- [ ] ✅ Automation triggered (5 loops)
- [ ] ✅ Price crash test works
- [ ] ✅ Unwind triggered successfully

---

## 🔧 Troubleshooting

### Error: "Missing parameter: loanToken"

**Solution:** Create the parameter file (`sepolia.json` or `reactive.json`) with required addresses.

### Error: "Invalid address"

**Solution:** Double-check all addresses in parameter files. Ensure they start with `0x` and are 42 characters long.

### Error: "Insufficient funds"

**Solution:** Get more testnet tokens from faucets.

### ShieldBrain shows "Inactive" status

**Solution:** Fund the brain with lReact using `fund-brain.ts` script.

### No subscriptions showing on Reactive Scan

**Solution:** 
1. Verify brain deployment succeeded
2. Check constructor logic executed (vm flag should be true)
3. Ensure System Contract address is correct

---

## 📚 Deployment Summary

After completing all steps, you'll have:

| Contract | Network | Address | Status |
|----------|---------|---------|--------|
| MockWETH | Sepolia | 0xABC...123 | ✅ Deployed |
| MockUSDC | Sepolia | 0xDEF...456 | ✅ Deployed |
| MockOracle | Sepolia | 0xGHI...789 | ✅ Deployed |
| ReactiveMorphoShield | Sepolia | 0xJKL...012 | ✅ Deployed + Funded |
| ShieldBrain | Reactive Network | 0xMNO...345 | ✅ Deployed + Funded + Active |

**System is ready for automated leverage looping! 🚀**

---

## 🔗 Useful Commands

```bash
# Check deployment status
npx hardhat ignition status --network sepolia

# View deployments
ls -la ignition/deployments/

# Verify contract on Etherscan (after deployment)
npx hardhat verify --network sepolia 0xYOUR_ADDRESS "constructor_arg1" "constructor_arg2"

# Run Hardhat console
npx hardhat console --network sepolia

# Check contract code
npx hardhat ignition visualize ignition/modules/ShieldBrain.ts
```

---

**Congratulations! Your Reactive Morpho Shield is fully deployed and operational!** 🎉

