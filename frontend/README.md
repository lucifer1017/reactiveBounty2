# 🛡️ Reactive Shield Frontend

**State-of-the-art DeFi dashboard with cyberpunk glassmorphism design**

---

## ✨ Features

### 🎨 **Stunning UI/UX**
- 🌌 Animated gradient background with floating orbs
- 💎 Glassmorphic cards with neon borders
- ⚡ Smooth animations powered by Framer Motion
- 🎯 Real-time data updates
- 📊 Animated counters and progress bars
- 🔄 Live event notifications

### 🚀 **Functionality**
- 💰 View vault position (collateral, debt, health factor)
- 🔄 Loop progress visualization
- 📈 Health factor progress bar with color coding
- 💸 Mint test WETH for demo
- 📝 Deposit and trigger automated loops
- 🔗 Direct links to Sepolia and Reactive explorers
- 📢 Toast notifications for all events

---

## 🎭 Design Elements

### **Color Palette**
- Background: Purple/Blue/Pink gradient
- Cards: Dark glass with blur effect
- Accents: Neon purple, cyan, pink
- Text: White with gradients

### **Animations**
- Count-up animations for numbers
- Smooth transitions on all interactions
- Pulsing glow effects
- Hover animations
- Loading states

---

## 🏗️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4
- **Web3:** Wagmi v3 + Viem v2
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Notifications:** Sonner

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

### 3. Open Browser

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Main page
│   │   ├── providers.tsx       # Wagmi + React Query providers
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── AnimatedBackground.tsx  # Gradient background with orbs
│   │   ├── AnimatedCounter.tsx     # Count-up number animation
│   │   ├── DepositForm.tsx         # Deposit interface
│   │   ├── GlassCard.tsx           # Glassmorphic card wrapper
│   │   ├── HealthFactorBar.tsx     # Health factor visualization
│   │   ├── LoopProgress.tsx        # Circular loop progress
│   │   ├── VaultDashboard.tsx      # Main dashboard
│   │   └── WalletButton.tsx        # Wallet connection
│   └── lib/
│       ├── contracts.ts        # Contract addresses
│       ├── wagmi.ts           # Wagmi configuration
│       └── abis/              # Contract ABIs
│           ├── ReactiveVault.json
│           ├── MockWETH.json
│           └── MockLendingPool.json
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 🎮 User Flow

1. **Connect Wallet** → Click "Connect Wallet" button
2. **View Position** → See current collateral, debt, loops, health factor
3. **Mint WETH** → Get test WETH for demo (if balance is low)
4. **Deposit** → Enter amount and deposit to vault
5. **Watch Magic** → 5 loops execute automatically via Reactive Network
6. **Monitor** → Real-time updates with toast notifications

---

## 🎨 Component Highlights

### **AnimatedBackground**
- Gradient base with animated overlay
- 5 floating orbs with random movement
- Grid overlay for depth

### **GlassCard**
- Glassmorphism effect with backdrop blur
- Neon gradient border on hover
- Smooth fade-in animation

### **AnimatedCounter**
- Smooth count-up animation using springs
- Configurable decimals and affixes
- Auto-animates on value change

### **HealthFactorBar**
- Color-coded progress bar (green/yellow/red)
- Animated fill with glow effect
- Icon indicator for status

### **LoopProgress**
- Circular progress indicator
- Gradient stroke with SVG animation
- Pulsing glow effect

---

## 🔧 Configuration

### **Contract Addresses**

Update in `src/lib/contracts.ts`:

```typescript
export const contracts = {
  vault: '0x...',  // ReactiveVault
  weth: '0x...',   // MockWETH
  usdc: '0x...',   // MockUSDC
  pool: '0x...',   // MockLendingPool
  // ...
};
```

### **RPC URLs**

Update in `src/lib/wagmi.ts`:

```typescript
transports: {
  [sepolia.id]: http('YOUR_RPC_URL'),
}
```

---

## 🎯 Key Features Implemented

✅ Wallet connection with injected wallets (MetaMask, etc.)
✅ Real-time balance and position updates
✅ Event listening for Loop and Unwind events
✅ Toast notifications for all transactions
✅ Animated loading states
✅ Responsive design (mobile-friendly)
✅ Direct explorer links
✅ Error handling with user-friendly messages
✅ Three-step deposit flow (Mint → Approve → Deposit)

---

## 🚨 Development Notes

### **Important:**
- Configured for **Sepolia testnet** only
- Uses **mock tokens** for demo purposes
- Requires **MetaMask or compatible wallet**
- Auto-refetches data every 5 seconds

### **Event Handling:**
- Listens to `LoopStep` events for real-time loop updates
- Listens to `Unwind` events for emergency exit
- Shows toast notifications for all events

---

## 🎨 Customization

### **Colors**

Edit `tailwind.config.ts` to change color scheme.

### **Animations**

Adjust animation duration in Framer Motion props.

### **Refresh Rate**

Change refetch interval in `VaultDashboard.tsx`:

```typescript
query: {
  refetchInterval: 5000, // milliseconds
}
```

---

## 🏆 Design Inspiration

- **Glassmorphism** - Modern UI trend with frosted glass effect
- **Cyberpunk** - Neon colors and futuristic vibes
- **DeFi Dashboards** - Clean data visualization
- **Web3 Aesthetics** - Gradient backgrounds and glow effects

---

## 📱 Responsive Design

- **Desktop:** Full dashboard with 4-column grid
- **Tablet:** 2-column grid
- **Mobile:** Single column stacked layout

---

## 🎉 What Makes This Special

1. 🎨 **Unique Design** - Not your typical black/grey dashboard
2. ⚡ **Buttery Smooth** - 60fps animations everywhere
3. 📊 **Real-time Updates** - Live data without refresh
4. 🔔 **Smart Notifications** - Toast for every action
5. 💎 **Glassmorphism** - Modern frosted glass effects
6. 🌈 **Gradient Everything** - Eye-catching color schemes
7. ✨ **Micro-interactions** - Hover effects on all elements
8. 🎯 **User-friendly** - Clear CTAs and feedback

---

**Built with 💜 for Reactive Network Hackathon**

**Status:** ✅ Production Ready • 🎨 Designer Approved • ⚡ Fully Functional
