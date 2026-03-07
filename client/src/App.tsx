import { ConnectWallet } from './components/ConnectWallet'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold">Blokaz</h1>
      <p className="text-gray-400">Onchain Block Puzzle</p>
      <ConnectWallet />
    </div>
  )
}

export default App
