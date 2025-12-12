# ReactiveLink Implementation Reference

**Status:** Specification Phase - Not Yet Implemented  
**Current State:** Starter template (Counter.sol + Next.js boilerplate)  
**Target:** Cross-chain Chainlink price feed mirror using Reactive Network

---

## PROJECT GOAL

Mirror Chainlink-style price feeds from Polygon Amoy (origin) to Ethereum Sepolia (destination) using Reactive Network's event-driven architecture. Destination exposes AggregatorV3Interface for DApp consumption.

---

## ARCHITECTURE OVERVIEW

### Three-Chain System

1. **Origin Chain: Polygon Amoy (Chain ID: 80002)**
   - Hosts MockFeed (simulates Chainlink aggregator)
   - Emits AnswerUpdated events on price changes
   - Read interface: AggregatorV3Interface

2. **Reactive Network (Chain ID: 5318007)**
   - Event monitoring infrastructure
   - ReactiveMirror contract (bridge logic)
   - System Contract at 0x0000000000000000000000000000000000fffFfF
   - RVM execution environment

3. **Destination Chain: Ethereum Sepolia (Chain ID: 11155111)**
   - FeedProxy (Chainlink-compatible price feed)
   - Receives callbacks via Callback Proxy (0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA)
   - Exposes latestRoundData() for DApps

### Data Flow Sequence

```
MockFeed.updatePrice()
  → AnswerUpdated event (Topic 0: 0x0559884f...)
  → Reactive Network detects event
  → ReactiveMirror.react() triggered
  → Callback event emitted
  → Reactive Network processes callback
  → CallbackProxy executes on Sepolia
  → FeedProxy.updatePrice() called
  → Price available via latestRoundData()
```

**Expected Latency:** 15-20 seconds end-to-end

---

## SMART CONTRACTS TO IMPLEMENT

### 1. MockFeed.sol (Polygon Amoy)

**Purpose:** Origin chain price feed simulator

**Key Features:**
- Implements AggregatorV3Interface
- Maintains round data (roundId, answer, timestamps)
- Emits AnswerUpdated(int256 current, uint256 roundId, uint256 updatedAt)

**Critical Specifications:**
```solidity
// Event signature MUST match
event AnswerUpdated(int256 current, uint256 roundId, uint256 updatedAt);
// Topic 0: 0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f

// State
uint80 roundId;
int256 answer;         // 8 decimals
uint256 startedAt;
uint256 updatedAt;
uint80 answeredInRound;

// Functions
constructor(int256 _initialPrice)  // e.g., 3100000000000 = $31,000
updatePrice(int256 _newPrice)      // Increments roundId, emits event
latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)
decimals() view returns (uint8)    // Return 8
description() view returns (string) // "BTC/USD Price Feed"
version() view returns (uint256)   // 1
```

**Deployment:**
- Network: Polygon Amoy
- Initial price: 3100000000000 ($31,000 with 8 decimals)
- Ignition module: `ignition/modules/MockFeed.ts`

---

### 2. IReactive.sol (Interface Library)

**Purpose:** Define Reactive Network integration interfaces

**Required Interfaces:**

```solidity
// Core interface all reactive contracts must implement
interface IReactive {
    struct LogRecord {
        uint256 chain_id;
        address _contract;
        uint256 topic_0;
        uint256 topic_1;
        uint256 topic_2;
        uint256 topic_3;
        bytes data;
        uint256 block_number;
        uint256 op_code;
        uint256 block_hash;
        uint256 tx_hash;
        uint256 log_index;
    }
    
    event Callback(
        uint256 indexed chain_id,
        address indexed _contract,
        uint64 indexed gas_limit,
        bytes payload
    );
    
    function react(LogRecord calldata log) external;
}

// Payer interface for funding
interface IPayer {
    function pay() external payable;
}

// System contract interface for subscriptions
interface ISystemContract {
    function subscribe(
        uint256 chain_id,
        address contract_address,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;
    
    function unsubscribe(
        uint256 chain_id,
        address contract_address,
        uint256 topic_0,
        uint256 topic_1,
        uint256 topic_2,
        uint256 topic_3
    ) external;
}
```

**Constants:**
```solidity
uint256 constant REACTIVE_IGNORE = 0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;
```

---

### 3. ReactiveMirror.sol (Reactive Network)

**Purpose:** Event listener and cross-chain bridge

**Critical Implementation Details:**

```solidity
// Immutable addresses (set in constructor)
address public immutable originFeed;     // MockFeed address
address public immutable destContract;   // FeedProxy address
address public immutable systemContract; // 0x0000...fffFfF
bool public immutable vm;                // Environment detection

// Constants
uint256 public constant ORIGIN_CHAIN_ID = 80002;
uint256 public constant DEST_CHAIN_ID = 11155111;
uint256 public constant TOPIC_0 = 0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f;
bytes32 public constant DOMAIN_SEPARATOR = keccak256("REACTIVE_ORACLE_V1");
uint64 public constant CALLBACK_GAS_LIMIT = 500000;
```

**Constructor Logic:**
1. Store originFeed, destContract, systemContract addresses
2. Detect environment (vm = true if msg.sender == address(0))
3. If in VM, auto-subscribe to MockFeed AnswerUpdated events:
   ```solidity
   ISystemContract(systemContract).subscribe(
       ORIGIN_CHAIN_ID,
       originFeed,
       TOPIC_0,
       REACTIVE_IGNORE,
       REACTIVE_IGNORE,
       REACTIVE_IGNORE
   );
   ```

**react() Function - Heart of the System:**
```solidity
function react(LogRecord calldata log) external override {
    // 1. VALIDATION
    require(vm, "ReactiveMirror: VM only");
    require(log.chain_id == ORIGIN_CHAIN_ID, "wrong chain");
    require(log._contract == originFeed, "wrong feed");
    require(log.topic_0 == TOPIC_0, "wrong event");
    
    // 2. DECODE EVENT DATA
    int256 answer;
    uint256 roundId;
    uint256 updatedAt;
    
    // Handle both indexed and non-indexed formats
    if (log.topic_1 != 0 && log.topic_2 != 0) {
        // Indexed format
        answer = int256(log.topic_1);
        roundId = log.topic_2;
        updatedAt = abi.decode(log.data, (uint256));
    } else {
        // Non-indexed format (MockFeed uses this)
        (answer, roundId, updatedAt) = abi.decode(
            log.data,
            (int256, uint256, uint256)
        );
    }
    
    // 3. ENCODE CALLBACK PAYLOAD
    bytes memory payload = abi.encodeWithSignature(
        "updatePrice(address,bytes32,uint80,int256,uint256,uint256,uint80)",
        address(0),           // Placeholder - replaced with RVM ID
        DOMAIN_SEPARATOR,
        uint80(roundId),
        answer,
        updatedAt,            // startedAt
        updatedAt,            // updatedAt
        uint80(roundId)       // answeredInRound
    );
    
    // 4. EMIT CALLBACK
    emit Callback(
        DEST_CHAIN_ID,
        destContract,
        CALLBACK_GAS_LIMIT,
        payload
    );
}
```

**Deployment:**
- Network: Reactive Network
- Constructor args: [originFeed address, destContract address, systemContract address]
- Ignition module: `ignition/modules/ReactiveMirror.ts`
- Post-deployment: Fund with 0.5 lReact via System Contract

**RVM ID:** The deployer address of ReactiveMirror becomes its RVM ID (critical for FeedProxy authorization)

---

### 4. FeedProxy.sol (Ethereum Sepolia)

**Purpose:** Destination chain price feed with Chainlink-compatible interface

**State Storage:**
```solidity
struct RoundData {
    uint80 roundId;
    int256 answer;
    uint256 startedAt;
    uint256 updatedAt;
    uint80 answeredInRound;
}

RoundData public latestRound;
uint8 public constant decimals = 8;
string public description = "BTC/USD (Reactive Mirror)";
uint256 public version = 1;

// Authorization
address public constant CALLBACK_PROXY = 0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA;
bytes32 public constant DOMAIN_SEPARATOR = keccak256("REACTIVE_ORACLE_V1");
address public immutable reactiveVmId;  // Set in constructor
```

**Constructor:**
```solidity
constructor(address _reactiveVmId) {
    reactiveVmId = _reactiveVmId;
}
```
**Critical:** _reactiveVmId MUST be the deployer address of ReactiveMirror (RVM ID)

**updatePrice() - Callback Entry Point:**
```solidity
function updatePrice(
    address sender,              // Injected by Reactive Network
    bytes32 _domainSeparator,
    uint80 _roundId,
    int256 _answer,
    uint256 _startedAt,
    uint256 _updatedAt,
    uint80 _answeredInRound
) external onlyReactive {
    // FOUR-LAYER SECURITY
    require(msg.sender == CALLBACK_PROXY, "not Reactive proxy");
    require(sender == reactiveVmId, "unauthorized sender");
    require(_domainSeparator == DOMAIN_SEPARATOR, "invalid domain");
    require(_updatedAt > latestRound.updatedAt, "stale price");
    
    // UPDATE STATE
    latestRound = RoundData({
        roundId: _roundId,
        answer: _answer,
        startedAt: _startedAt,
        updatedAt: _updatedAt,
        answeredInRound: _answeredInRound
    });
    
    emit PriceUpdated(_roundId, _answer, _startedAt, _updatedAt, _answeredInRound);
}

modifier onlyReactive() {
    require(msg.sender == CALLBACK_PROXY, "FeedProxy: not Reactive proxy");
    _;
}
```

**Public Interface (Chainlink Compatible):**
```solidity
function latestRoundData() external view returns (
    uint80 roundId,
    int256 answer,
    uint256 startedAt,
    uint256 updatedAt,
    uint80 answeredInRound
) {
    return (
        latestRound.roundId,
        latestRound.answer,
        latestRound.startedAt,
        latestRound.updatedAt,
        latestRound.answeredInRound
    );
}

function getRoundData(uint80 _roundId) external view returns (...) {
    require(_roundId == latestRound.roundId, "only latest round");
    return latestRoundData();
}

function decimals() external pure returns (uint8) { return 8; }
function description() external pure returns (string memory) { 
    return "BTC/USD (Reactive Mirror)"; 
}
function version() external pure returns (uint256) { return 1; }
```

**Funding Interface:**
```solidity
function pay() external payable override {
    // Receives funding from Callback Proxy
}
```

**Deployment:**
- Network: Ethereum Sepolia
- Constructor arg: reactiveVmId (ReactiveMirror deployer address)
- Ignition module: `ignition/modules/FeedProxy.ts`
- Post-deployment: Fund with 0.01 ETH via Callback Proxy

---

## DEPLOYMENT SEQUENCE (CRITICAL ORDER)

### Phase 1: Initial Deployments

**Step 1: Deploy MockFeed to Polygon Amoy**
```bash
npx hardhat ignition deploy ignition/modules/MockFeed.ts --network polygonAmoy
```
- Record deployed address (e.g., 0x70cF2C2703D2Dc02f5c0A1C3b9B430F1A1E9D359)
- Verify event signature matches TOPIC_0

**Step 2: Deploy FeedProxy to Ethereum Sepolia**
- **IMPORTANT:** Use correct reactiveVmId (must match ReactiveMirror deployer)
- For new deployment, use deployer's account address as placeholder
- May need to redeploy after getting actual RVM ID
```bash
npx hardhat ignition deploy ignition/modules/FeedProxy.ts --network sepolia
```
- Record deployed address (e.g., 0xae7bFF837C0E6Df30c337CDaA0f2E46f32309D57)

**Step 3: Update ReactiveMirror Configuration**
Edit `ignition/modules/ReactiveMirror.ts`:
- Set ORIGIN_FEED = MockFeed address from Step 1
- Set DEST_CONTRACT = FeedProxy address from Step 2
- Set SYSTEM_CONTRACT = 0x0000000000000000000000000000000000fffFfF

**Step 4: Deploy ReactiveMirror to Reactive Network**
```bash
npx hardhat ignition deploy ignition/modules/ReactiveMirror.ts --network reactiveVm
```
- Record deployed address and deployer address (this is RVM ID)
- Constructor automatically subscribes to events
- Verify subscription on Reactive Scan: https://lasna.reactscan.net

**Step 5: Verify RVM ID Match**
- If FeedProxy.reactiveVmId doesn't match ReactiveMirror deployer, redeploy FeedProxy

### Phase 2: Funding

**Fund ReactiveMirror (Reactive Network):**
Create script: `scripts/deposit-to-reactive-mirror.ts`
```typescript
const SYSTEM_CONTRACT = "0x0000000000000000000000000000000000fffFfF";
const REACTIVE_MIRROR_ADDRESS = "<deployed_address>";

const systemContract = getContract({
    address: SYSTEM_CONTRACT,
    abi: SYSTEM_CONTRACT_ABI,
});

await systemContract.write.depositTo([REACTIVE_MIRROR_ADDRESS], {
    value: parseEther("0.5") // 0.5 lReact
});
```
Run: `npx tsx scripts/deposit-to-reactive-mirror.ts`

**Fund FeedProxy (Ethereum Sepolia):**
Create script: `scripts/fund-feedproxy.ts`
```typescript
const CALLBACK_PROXY = "0xc9f36411C9897e7F959D99ffca2a0Ba7ee0D7bDA";
const FEED_PROXY_ADDRESS = "<deployed_address>";

const callbackProxy = getContract({
    address: CALLBACK_PROXY,
    abi: CALLBACK_PROXY_ABI,
});

await callbackProxy.write.depositTo([FEED_PROXY_ADDRESS], {
    value: parseEther("0.01") // 0.01 ETH
});
```
Run: `npx tsx scripts/fund-feedproxy.ts`

### Phase 3: Verification

1. **Check Subscription Status:**
   - Visit https://lasna.reactscan.net
   - Search for ReactiveMirror RVM ID
   - Verify subscription is active

2. **Test Price Update:**
   ```solidity
   // Call on Polygon Amoy
   MockFeed.updatePrice(3110000000000); // $31,100
   ```

3. **Monitor Event Flow:**
   - Check Polygon Amoy explorer for AnswerUpdated event
   - Check Reactive Scan for react() execution
   - Check Sepolia explorer for callback transaction
   - Verify FeedProxy.latestRoundData() returns new price

4. **Expected Timeline:**
   - Origin tx confirmation: ~2s
   - Reactive processing: ~1-2s
   - Destination tx confirmation: ~12s
   - Total: ~15-20s

---

## FRONTEND IMPLEMENTATION

### Tech Stack
- Next.js 14+ (App Router)
- wagmi v2 + viem
- RainbowKit (wallet connection)
- TailwindCSS

### Required Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "@rainbow-me/rainbowkit": "^2.0.0"
  }
}
```

### Configuration Files

**config.ts:**
```typescript
export const MOCK_FEED_ADDRESS = "0x..." as const;
export const FEED_PROXY_ADDRESS = "0x..." as const;

export const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  rpcUrls: { default: { http: ['https://rpc-amoy.polygon.technology'] } }
};

export const sepolia = {
  id: 11155111,
  name: 'Ethereum Sepolia',
  rpcUrls: { default: { http: ['https://sepolia.infura.io/v3/...'] } }
};
```

**abis.ts:**
```typescript
export const MOCK_FEED_ABI = [
  {
    inputs: [{ name: "_newPrice", type: "int256" }],
    name: "updatePrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" }
    ],
    stateMutability: "view",
    type: "function"
  },
  // ... decimals, description, version
] as const;

export const FEED_PROXY_ABI = [
  // Same as MOCK_FEED_ABI (Chainlink interface)
] as const;
```

### Main Dashboard (app/page.tsx)

**Required Features:**

1. **Origin Chain Card:**
   - Display: MockFeed price, roundId, updatedAt
   - Read using: `useReadContract` from wagmi
   - Network: Polygon Amoy
   - Button: "Force Price Update" (calls updatePrice with +$100)

2. **Destination Chain Card:**
   - Display: FeedProxy price, roundId, updatedAt
   - Read using: `useReadContract` with refetchInterval: 2000
   - Network: Ethereum Sepolia
   - Status Badge: "Synced ✅" / "Bridging... ⏳" / "Initializing..."

3. **Sync Status Logic:**
   ```typescript
   const isSynced = originRoundId === destRoundId && originRoundId > 0n;
   const isBridging = originRoundId > destRoundId;
   ```

4. **Live Terminal:**
   - Log price updates from both chains
   - Timestamp each event
   - Auto-scroll to latest
   - Format: `[HH:MM:SS] [ORIGIN/DESTINATION] Message`

5. **Force Update Handler:**
   ```typescript
   const handleUpdatePrice = async () => {
     const newPrice = currentPrice + 10000000000n; // +$100
     
     writeContract({
       address: MOCK_FEED_ADDRESS,
       abi: MOCK_FEED_ABI,
       functionName: "updatePrice",
       args: [newPrice],
       chainId: polygonAmoy.id,
     });
   };
   ```

6. **Price Formatting:**
   ```typescript
   const formatPrice = (answer: bigint) => {
     return (Number(answer) / 1e8).toFixed(2); // 8 decimals
   };
   ```

**UI/UX Requirements:**
- Responsive design (mobile + desktop)
- Dark mode support
- Real-time updates (polling every 2s)
- Loading states
- Error handling
- Wallet connection via RainbowKit
- Multi-chain support (Polygon Amoy + Sepolia)

---

## NETWORK CONFIGURATIONS

### Hardhat Config Updates

**Required Networks:**
```typescript
networks: {
  polygonAmoy: {
    type: "http",
    chainType: "l1",
    url: configVariable("POLYGON_AMOY_RPC_URL"),
    accounts: [configVariable("POLYGON_AMOY_PRIVATE_KEY")],
  },
  sepolia: {
    type: "http",
    chainType: "l1",
    url: configVariable("SEPOLIA_RPC_URL"),
    accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
  },
  reactiveVm: {
    type: "http",
    url: configVariable("REACTIVE_RPC_URL"), // https://rpc.lasna.reactive.network
    accounts: [configVariable("REACTIVE_PRIVATE_KEY")],
  },
}
```

### Required Environment Variables

Create `.env` file:
```bash
# Polygon Amoy
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_AMOY_PRIVATE_KEY=0x...

# Ethereum Sepolia
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
SEPOLIA_PRIVATE_KEY=0x...

# Reactive Network
REACTIVE_RPC_URL=https://rpc.lasna.reactive.network
REACTIVE_PRIVATE_KEY=0x...
```

### RPC Endpoints

| Network | RPC URL | Explorer |
|---------|---------|----------|
| Polygon Amoy | https://rpc-amoy.polygon.technology | https://amoy.polygonscan.com |
| Ethereum Sepolia | https://sepolia.infura.io/v3/... | https://sepolia.etherscan.io |
| Reactive Network | https://rpc.lasna.reactive.network | https://lasna.reactscan.net |

---

## SECURITY CONSIDERATIONS

### Authorization Flow
```
ReactiveMirror (deployed by address X)
  → X becomes RVM ID
  → Reactive Network injects X into callback payload
  → FeedProxy validates sender == reactiveVmId (X)
  → Authorization confirmed ✅
```

### Attack Vectors & Defenses

| Attack | Defense | Location |
|--------|---------|----------|
| Fake callback | msg.sender check (CALLBACK_PROXY only) | FeedProxy.updatePrice |
| Unauthorized RVM | sender validation (reactiveVmId match) | FeedProxy.updatePrice |
| Domain spoofing | DOMAIN_SEPARATOR validation | FeedProxy.updatePrice |
| Stale price | Timestamp comparison | FeedProxy.updatePrice |
| External react() call | vm flag check | ReactiveMirror.react |
| Wrong chain event | chain_id validation | ReactiveMirror.react |
| Wrong contract event | _contract validation | ReactiveMirror.react |

### Critical Security Rules

1. **RVM ID MUST match:** FeedProxy.reactiveVmId == ReactiveMirror deployer address
2. **Never skip validation:** All four layers in FeedProxy.updatePrice are mandatory
3. **VM-only execution:** ReactiveMirror.react can ONLY run in ReactVM
4. **Event signature match:** TOPIC_0 must exactly match AnswerUpdated signature
5. **No address(0) bypass:** Reactive Network MUST inject RVM ID before callback execution

---

## FUNDING & ECONOMICS

### Reserve Requirements

| Contract | Network | Initial | Per Update | Frequency |
|----------|---------|---------|------------|-----------|
| ReactiveMirror | Reactive Network | 0.5 lReact | ~0.001 lReact | Every 500 updates (~2-3 weeks) |
| FeedProxy | Ethereum Sepolia | 0.01 ETH | ~0.00015 ETH | Every 66 updates (~1-2 weeks) |

### Gas Costs

| Operation | Network | Gas Used | Estimated Cost |
|-----------|---------|----------|----------------|
| updatePrice (origin) | Polygon Amoy | ~50,000 | ~$0.001 |
| react (RVM) | Reactive Network | ~100,000 | Paid from reserves |
| updatePrice (callback) | Ethereum Sepolia | ~150,000 | Paid from reserves |
| **Total per update** | - | ~300,000 | ~$0.05-0.10 |

### Monitoring Balances

**ReactiveMirror:**
```bash
# Check balance on Reactive Network
curl -X POST https://rpc.lasna.reactive.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["<REACTIVE_MIRROR_ADDRESS>","latest"],"id":1}'
```

**FeedProxy:**
- Check on Sepolia Etherscan: https://sepolia.etherscan.io/address/<FEED_PROXY_ADDRESS>
- Or via Callback Proxy contract balance query

---

## TESTING STRATEGY

### Unit Tests (Solidity)

1. **MockFeed.t.sol:**
   - Test updatePrice increments roundId
   - Verify AnswerUpdated event emission
   - Check latestRoundData returns correct values
   - Test negative prices (if supported)

2. **ReactiveMirror.t.sol:**
   - Mock LogRecord creation
   - Test react() validation logic
   - Verify Callback event emission
   - Test both indexed/non-indexed formats
   - Check payload encoding

3. **FeedProxy.t.sol:**
   - Test updatePrice authorization (all 4 layers)
   - Verify stale price rejection
   - Check latestRoundData view function
   - Test pay() funding

### Integration Tests (TypeScript)

1. **End-to-End Flow:**
   - Deploy all contracts (testnet or fork)
   - Fund contracts
   - Trigger price update
   - Monitor event propagation
   - Verify destination update
   - Measure latency

2. **Frontend Tests:**
   - Wallet connection
   - Multi-chain reading
   - Transaction submission
   - Sync status display
   - Error handling

### Manual Testing Checklist

- [ ] Deploy MockFeed to Polygon Amoy
- [ ] Deploy FeedProxy to Sepolia
- [ ] Deploy ReactiveMirror to Reactive Network
- [ ] Verify RVM ID matches
- [ ] Fund ReactiveMirror (0.5 lReact)
- [ ] Fund FeedProxy (0.01 ETH)
- [ ] Check subscription status on Reactive Scan
- [ ] Trigger price update from frontend
- [ ] Verify AnswerUpdated event on Amoy
- [ ] Verify react() execution on Reactive Network
- [ ] Verify callback transaction on Sepolia
- [ ] Verify price appears in FeedProxy
- [ ] Check latency (should be 15-20s)
- [ ] Test multiple updates in succession
- [ ] Monitor reserve balances
- [ ] Test negative price (if applicable)
- [ ] Verify sync status badge updates

---

## DEBUGGING TOOLS & RESOURCES

### Block Explorers

1. **Polygon Amoy:** https://amoy.polygonscan.com
   - Check AnswerUpdated events
   - Verify MockFeed transactions

2. **Ethereum Sepolia:** https://sepolia.etherscan.io
   - Check callback transactions
   - Verify FeedProxy updates
   - Monitor PriceUpdated events

3. **Reactive Scan:** https://lasna.reactscan.net
   - Check contract status (Active/Inactive)
   - Verify subscriptions
   - View react() executions
   - Monitor reserves
   - Search by RVM ID

### Event Signature Calculator

```javascript
// Verify event signature
const eventSig = "AnswerUpdated(int256,uint256,uint256)";
const topic0 = ethers.utils.id(eventSig);
// Should equal: 0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f
```

### Common Error Messages

```
"ReactiveMirror: VM only"
→ react() called externally (should never happen in production)

"ReactiveMirror: wrong chain"
→ Event came from wrong chain (check subscription)

"ReactiveMirror: wrong feed"
→ Event came from different contract (verify originFeed address)

"FeedProxy: not Reactive proxy"
→ Caller is not CALLBACK_PROXY (security violation)

"FeedProxy: unauthorized sender"
→ RVM ID mismatch (verify reactiveVmId in constructor)

"FeedProxy: invalid domain"
→ Domain separator mismatch (check DOMAIN_SEPARATOR constant)

"FeedProxy: stale price"
→ Old timestamp (protection working correctly)

"insufficient funds"
→ Contract reserves depleted (run funding script)
```

---

## IMPLEMENTATION CHECKLIST

### Contracts (Priority Order)

- [ ] IReactive.sol (interfaces)
  - [ ] IPayer interface
  - [ ] IReactive interface with LogRecord and Callback event
  - [ ] ISystemContract interface
  - [ ] REACTIVE_IGNORE constant

- [ ] MockFeed.sol
  - [ ] Constructor with initial price
  - [ ] updatePrice function
  - [ ] latestRoundData view
  - [ ] AnswerUpdated event (exact signature)
  - [ ] decimals, description, version getters

- [ ] FeedProxy.sol
  - [ ] Constructor with reactiveVmId
  - [ ] RoundData struct
  - [ ] updatePrice with 4-layer security
  - [ ] latestRoundData view
  - [ ] getRoundData view
  - [ ] pay function
  - [ ] PriceUpdated event

- [ ] ReactiveMirror.sol
  - [ ] Constructor with auto-subscription
  - [ ] react function with validation
  - [ ] Event decoding (both formats)
  - [ ] Callback emission
  - [ ] pay function

### Deployment Scripts

- [ ] MockFeed.ts Ignition module
- [ ] FeedProxy.ts Ignition module
- [ ] ReactiveMirror.ts Ignition module
- [ ] deposit-to-reactive-mirror.ts funding script
- [ ] fund-feedproxy.ts funding script

### Frontend

- [ ] Setup wagmi + RainbowKit
- [ ] config.ts (addresses, chains)
- [ ] abis.ts (contract ABIs)
- [ ] ConnectWallet component
- [ ] Origin chain card (read + update)
- [ ] Destination chain card (read + status)
- [ ] Live terminal component
- [ ] Sync status logic
- [ ] Price formatting utilities
- [ ] Error handling

### Configuration

- [ ] Update hardhat.config.ts (3 networks)
- [ ] Create .env file (6 variables)
- [ ] Add .env.example
- [ ] Update package.json scripts
- [ ] Configure RPC providers

### Documentation

- [ ] README.md (setup instructions)
- [ ] CONTRACT_ADDRESSES.md
- [ ] TRANSACTION_HASHES.md
- [ ] SOLUTION_AND_WORKFLOW.md

### Testing

- [ ] MockFeed unit tests
- [ ] ReactiveMirror unit tests
- [ ] FeedProxy unit tests
- [ ] End-to-end integration test
- [ ] Frontend manual testing

---

## KEY IMPLEMENTATION NOTES

### Critical Path Dependencies

1. MockFeed address → ReactiveMirror constructor
2. FeedProxy address → ReactiveMirror constructor
3. ReactiveMirror deployer address (RVM ID) → FeedProxy constructor
4. All deployed contracts → Frontend config

### Non-Obvious Requirements

1. **Event Format:** MockFeed uses non-indexed parameters, so react() must handle both formats
2. **RVM ID Injection:** Reactive Network automatically replaces address(0) in callback payload
3. **VM Detection:** ReactiveMirror uses `msg.sender == address(0)` to detect ReactVM environment
4. **Funding Mechanism:** Both contracts need separate funding (different networks, different proxies)
5. **Subscription Timing:** Happens in constructor, so subscription is immediate on deployment
6. **Callback Proxy:** Hardcoded address on Sepolia, not deployable
7. **System Contract:** Fixed address on Reactive Network, not deployable

### Optimization Opportunities (Future)

1. Batch multiple price updates in single callback
2. Support multiple feeds in one FeedProxy (mapping)
3. Store historical round data (not just latest)
4. Implement getRoundData for past rounds
5. Add gas optimization (assembly for storage writes)
6. Extend to more chains beyond Amoy/Sepolia
7. Add automated funding when reserves low
8. Implement event-based frontend updates (instead of polling)

---

## REFERENCE LINKS

- **Reactive Network Docs:** https://dev.reactive.network
- **Reactive Scan:** https://lasna.reactscan.net
- **Chainlink AggregatorV3Interface:** https://docs.chain.link/data-feeds/api-reference
- **Polygon Amoy Faucet:** https://faucet.polygon.technology
- **Sepolia Faucet:** https://sepoliafaucet.com
- **Hardhat Ignition:** https://hardhat.org/ignition/docs/getting-started

---

**Implementation Status:** NOT STARTED  
**Current Codebase:** Starter template only (Counter.sol + Next.js boilerplate)  
**Next Steps:** Begin with IReactive.sol and MockFeed.sol implementation

---

*This reference document is for AI implementation guidance. Contains complete specifications extracted from project analysis.*


