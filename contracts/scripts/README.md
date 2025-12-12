# Funding Scripts for Reactive Morpho Shield

These scripts fund your deployed contracts so they can execute cross-chain callbacks via Reactive Network.

---

## 📋 Prerequisites

### 1. Install Dependencies

```bash
cd contracts
npm install
```

This will install:
- `dotenv` - Environment variable management
- `tsx` - TypeScript execution
- `viem` - Ethereum library

### 2. Setup Environment Variables

Copy `env.example` to `.env`:

```bash
cp env.example .env
```

Edit `.env` and fill in:

```bash
# Your wallet private key (DO NOT COMMIT THIS!)
PRIVATE_KEY=abc123...

# RPC endpoints
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
REACTIVE_RPC_URL=https://rpc.lasna.reactive.network

# Deployed contract addresses
SHIELD_VAULT_ADDRESS=0x...  # ReactiveMorphoShield on Sepolia
SHIELD_BRAIN_ADDRESS=0x...  # ShieldBrain on Reactive Network
```

### 3. Get Testnet Funds

**For Sepolia (Vault):**
- Get ETH from [Sepolia Faucet](https://sepoliafaucet.com)
- Need at least **0.03 ETH** (0.02 for funding + gas)

**For Reactive Network (Brain):**
- Get lReact from [Reactive Faucet](https://lasna.reactscan.net/faucet)
- Need at least **1.1 lReact** (1.0 for funding + gas)

---

## 🚀 Usage

### Fund the Vault (Sepolia)

The vault needs ETH to pay for callback execution gas on Sepolia.

```bash
npx tsx scripts/fund-vault.ts
```

**What it does:**
1. Connects to Sepolia via your RPC URL
2. Calls `CallbackProxy.depositTo()` with 0.02 ETH
3. The ETH is allocated to your vault for callback gas
4. Displays transaction hash and confirmation

**Output:**
```
🚀 Starting Vault Funding Process...

📋 Configuration:
   Network: Ethereum Sepolia (Chain ID: 11155111)
   Callback Proxy: 0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA
   Vault Address: 0x...
   Funding Amount: 0.02 ETH

👛 Wallet Address: 0x...

💰 Wallet Balance: 0.15 ETH

✅ Transaction submitted!
   TX Hash: 0x...
   Explorer: https://sepolia.etherscan.io/tx/0x...

🎉 Transaction confirmed!
   Block: 12345678

💎 Updated Vault Balance: 0.02 ETH
   Increase: +0.02 ETH

✅ Vault funding complete! Ready for callbacks.
```

---

### Fund the Brain (Reactive Network)

The brain needs lReact to pay for RVM execution gas.

```bash
npx tsx scripts/fund-brain.ts
```

**What it does:**
1. Connects to Reactive Network via RPC
2. Calls `SystemContract.depositTo()` with 1.0 lReact
3. The lReact is allocated to your brain for RVM execution
4. Displays transaction hash and confirmation

**Output:**
```
🧠 Starting Brain Funding Process...

📋 Configuration:
   Network: Reactive Lasna (Chain ID: 5318007)
   System Contract: 0x0000000000000000000000000000000000fffFfF
   Brain Address: 0x...
   Funding Amount: 1.0 lReact

👛 Wallet Address: 0x...

💰 Wallet Balance: 5.0 lReact

✅ Transaction submitted!
   TX Hash: 0x...
   Explorer: https://lasna.reactscan.net/tx/0x...

🎉 Transaction confirmed!
   Block: 987654

🧠 Updated Brain Balance: 1.0 lReact
   Increase: +1.0 lReact

✅ Brain funding complete! RVM ready for execution.

🔗 Check status: https://lasna.reactscan.net/address/0x...
```

---

## 🔍 Verification

### Check Vault Balance (Sepolia)

Visit Sepolia Etherscan:
```
https://sepolia.etherscan.io/address/YOUR_VAULT_ADDRESS
```

The vault should have **0.02 ETH** in its balance.

### Check Brain Balance (Reactive Network)

Visit Reactive Scan:
```
https://lasna.reactscan.net/address/YOUR_BRAIN_ADDRESS
```

The brain should show:
- Balance: **1.0 lReact**
- Status: **Active**
- Subscriptions: **3 active** (Deposit, LoopStep, PriceUpdated events)

---

## 📊 Funding Estimates

### Vault (Sepolia)

| Operation | Gas Cost | Frequency | Budget |
|-----------|----------|-----------|--------|
| executeLoop callback | ~300,000 gas | 5 times per deposit | 0.01 ETH |
| unwind callback | ~200,000 gas | 1 time per unwind | 0.005 ETH |
| **Total for ~2 full cycles** | - | - | **0.02 ETH** |

**Refund:** Add more ETH anytime via `fund-vault.ts`

### Brain (Reactive Network)

| Operation | Gas Cost | Frequency | Budget |
|-----------|----------|-----------|--------|
| react() execution | ~100,000 gas | Per event | - |
| Estimated per deposit | - | ~10 react() calls | 0.1 lReact |
| **Total for ~10 deposits** | - | - | **1.0 lReact** |

**Refund:** Add more lReact anytime via `fund-brain.ts`

---

## ⚠️ Troubleshooting

### Error: "PRIVATE_KEY not set in .env"

**Solution:** Copy `env.example` to `.env` and add your private key.

### Error: "Insufficient balance"

**Solution:** Get more testnet tokens from faucets (see Prerequisites above).

### Error: "SHIELD_VAULT_ADDRESS not set"

**Solution:** Deploy your contracts first and add addresses to `.env`.

### Transaction fails with "execution reverted"

**Possible causes:**
1. Contract address is wrong (double-check `.env`)
2. Contract not deployed yet
3. Insufficient gas in wallet

**Solution:** Verify contract addresses and ensure wallet has enough gas.

---

## 🎯 Next Steps

After funding both contracts:

1. ✅ **Deploy Mock Tokens** (MockWETH + MockUSDC)
2. ✅ **Mint tokens** to test wallet
3. ✅ **Test deposit** on ReactiveMorphoShield
4. ✅ **Watch automation** (ShieldBrain should trigger loops)
5. ✅ **Test price crash** (lower price via MockOracle)
6. ✅ **Watch unwind** (ShieldBrain should trigger unwind)

---

## 📚 Resources

- **Reactive Network Docs:** https://dev.reactive.network
- **Reactive Scan:** https://lasna.reactscan.net
- **Sepolia Etherscan:** https://sepolia.etherscan.io
- **Sepolia Faucet:** https://sepoliafaucet.com

---

**Note:** These scripts are for testnet only. Never use real private keys or mainnet funds for testing.


