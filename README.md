# Blocklock Frontend Kit

A Next.js application showcasing time-locked encryption using the Blocklock protocol. Users can encrypt plaintext to be decrypted after a target block height, and browse previously submitted requests in an explorer.

## ✨ Features

- **Time-locked encryption UI**: Enter plaintext, set blocks ahead, and submit an on-chain timelock request
- **Decryption time estimate**: Live estimate based on chain seconds-per-block
- **Message explorer**: Fetches recent requests and shows decrypted messages when available
- **Wallet connectivity**: RainbowKit + Wagmi for multi-wallet support
- **Multi-network**: Works across multiple EVM networks defined in `useNetworkConfig`
- **Responsive UI**: Tailwind CSS styling

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- A browser wallet (e.g., MetaMask, Coinbase Wallet)

### Setup

1. Clone and install:
```bash
git clone https://github.com/randa-mu/blocklock-frontend-kit
cd blocklock-frontend-kit
npm install
```

2. Configure environment:
Create a `.env.local` in the project root:
```bash
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
```

3. Start the app:
```bash
npm run dev
```

Open http://localhost:3000

## ⚙️ Configuration

- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`: Required by RainbowKit for WalletConnect. Obtain from WalletConnect Cloud.
- Network settings (RPCs, contract addresses, gas config, seconds-per-block) are provided via `hooks/useNetworkConfig.ts` and `lib/contract.ts`.

## 🧭 Usage

1. Connect your wallet
2. In the Encrypt tab:
   - Enter plaintext
   - Set "Blocks Ahead" (positive integer)
   - Review the estimated decryption time
   - Click Encrypt to send the request on-chain
3. Switch to Explorer to refresh and view recent requests and any available decrypted messages

Notes:
- The default tab is `Encrypt`. Explorer is entered explicitly via its button.
- The refresh icon spins while a fetch is in-flight.
- The decryption time estimate is displayed without causing layout shift.

## 🛠 Tech Stack

- Next.js 15 + React 18
- TypeScript
- Tailwind CSS
- Wagmi + RainbowKit
- Ethers.js
- React Query (@tanstack/react-query)

## 📂 Project Structure

```
app/
  blocklock/
    header.tsx      # Header for Blocklock page
    page.tsx        # Main UI (Encrypt/Explorer)
  layout.tsx
  page.tsx
components/
  Footer.tsx
  header.tsx
  walletConnect.tsx
hooks/
  useEncrypt.ts       # Encryption flow, state, estimates
  useExplorer.ts      # Explorer data fetching
  useEthers.ts        # Provider/signer helpers
  useNetworkConfig.ts # Networks + gas config
lib/
  contract.ts         # ABIs + addresses
public/
  assets/...          # Images and logos
```

## 🔐 How It Works (High Level)

- `useEncrypt` computes a target block from the current block + blocksAhead, encrypts the message via Blocklock.js, estimates fees, and submits a timelock request to the configured contract. After success, it clears inputs and switches to the Explorer tab.
- `useExplorer` queries recent requests from the contract and displays them, including decrypted messages when available.

## 🧪 Scripts

- `npm run dev` – start development server
- `npm run build` – production build
- `npm run start` – start production server
- `npm run lint` – run ESLint

## ❗ Troubleshooting

- Console shows "Analytics SDK: TypeError: Failed to fetch": This often originates from injected browser extensions (e.g., Coinbase Wallet) and is harmless. Test in an incognito window with extensions disabled to confirm.
- Ensure you are on a supported network with funded account to send transactions.
- If fee data is missing from your RPC, try switching RPC endpoints.

## 📜 License

Built with ❤️ by FIL-B

## 🔗 Links

- Documentation: https://docs.randa.mu/
- GitHub: https://github.com/randa-mu
- X (Twitter): https://x.com/RandamuInc/
