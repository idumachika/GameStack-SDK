# Web3 Game SDK for Stacks Blockchain

A comprehensive smart contract that provides Web3 functionality for game developers on the Stacks blockchain. This SDK enables games to integrate blockchain features including player profiles, achievements, leaderboards, in-game assets, and virtual economies.

## Features

### 🎮 Core Gaming Features
- **Game Registration**: Developers can register their games on-chain
- **Player Profiles**: Cross-game player identity and statistics
- **Session Tracking**: Monitor gameplay sessions and statistics
- **Multi-game Support**: Single contract supports multiple games

### 🏆 Achievement System
- **Custom Achievements**: Game developers can create unique achievements
- **Rarity Levels**: Support for common, rare, epic, and legendary achievements
- **Reward System**: Configurable rewards for achievement completion
- **Cross-game Tracking**: Players maintain achievement history across all games

### 📊 Leaderboards & Competition
- **Season-based Leaderboards**: Time-limited competitive periods
- **Prize Pools**: Configurable rewards for top performers
- **Multi-game Rankings**: Support for game-specific leaderboards

### 🎁 In-Game Assets (NFT-like)
- **Item Creation**: Developers can create unique in-game items
- **Supply Management**: Configurable maximum supply limits
- **Metadata Support**: URI-based metadata for rich item descriptions
- **Ownership Tracking**: Secure player ownership records

### 💰 Virtual Economy
- **Multi-currency Support**: Games can create custom virtual currencies
- **Exchange Rates**: Configurable exchange rates to STX
- **Trading Controls**: Enable/disable currency trading
- **Balance Management**: Secure player balance tracking

## Contract Structure

### Data Maps
- `games`: Game registration and metadata
- `player-profiles`: Cross-game player information
- `game-players`: Game-specific player data
- `achievements`: Achievement definitions
- `player-achievements`: Player achievement records
- `leaderboards`: Competitive season management
- `game-items`: In-game asset definitions
- `player-items`: Player asset ownership
- `game-currencies`: Virtual currency definitions
- `player-balances`: Player currency balances
- `game-sessions`: Gameplay session tracking

## Getting Started

### For Game Developers

#### 1. Register Your Game
```clarity
(contract-call? .web3-game-sdk register-game "My Awesome Game")
```

#### 2. Create Achievements
```clarity
(contract-call? .web3-game-sdk create-achievement 
  u1                           ;; game-id
  "First Victory"              ;; name
  "Win your first match"       ;; description
  "common"                     ;; rarity
  u100)                        ;; reward-amount
```

#### 3. Create In-Game Items
```clarity
(contract-call? .web3-game-sdk create-game-item
  u1                           ;; game-id
  "Magic Sword"                ;; name
  "weapon"                     ;; item-type
  "legendary"                  ;; rarity
  "https://example.com/sword"  ;; metadata-uri
  u1000)                       ;; max-supply
```

#### 4. Award Players
```clarity
;; Award achievement
(contract-call? .web3-game-sdk award-achievement 'ST1PLAYER123 u1)

;; Mint item to player
(contract-call? .web3-game-sdk mint-item 'ST1PLAYER123 u1 u1)
```

### For Players

#### 1. Create Profile
```clarity
(contract-call? .web3-game-sdk create-player-profile "PlayerName")
```

#### 2. Join a Game
```clarity
(contract-call? .web3-game-sdk join-game u1)
```

#### 3. Start Gaming Session
```clarity
(contract-call? .web3-game-sdk start-session u1)
```

#### 4. End Gaming Session
```clarity
(contract-call? .web3-game-sdk end-session u1 u1500 u250)  ;; session-id, score, experience
```

## Read-Only Functions

Query contract data without making transactions:

```clarity
;; Get game information
(contract-call? .web3-game-sdk get-game-info u1)

;; Get player profile
(contract-call? .web3-game-sdk get-player-profile 'ST1PLAYER123)

;; Check if player has achievement
(contract-call? .web3-game-sdk has-achievement 'ST1PLAYER123 u1)

;; Get player's item quantity
(contract-call? .web3-game-sdk get-player-item-quantity 'ST1PLAYER123 u1)
```

## Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| u100 | `err-not-authorized` | Caller lacks required permissions |
| u101 | `err-not-found` | Requested resource doesn't exist |
| u102 | `err-already-exists` | Resource already exists |
| u103 | `err-invalid-input` | Invalid input parameters |
| u104 | `err-insufficient-funds` | Insufficient balance for operation |
| u105 | `err-game-not-active` | Game is not currently active |

## Security Features

### Authorization Controls
- **Game Developer Permissions**: Only game developers can create achievements and items for their games
- **Contract Owner Functions**: Admin functions restricted to contract deployer
- **Player Ownership**: Players control their own profiles and sessions

### Data Integrity
- **Unique Constraints**: Prevents duplicate registrations and achievements
- **Supply Limits**: Enforces maximum supply constraints for items
- **Session Validation**: Ensures only session owners can end their sessions

## Admin Functions

Contract owner can perform administrative tasks:

```clarity
;; Deactivate a game
(contract-call? .web3-game-sdk deactivate-game u1)

;; Verify a player
(contract-call? .web3-game-sdk verify-player 'ST1PLAYER123)
```

## Integration Examples

### Unity Integration Pseudocode
```csharp
public class Web3GameManager {
    public async void StartGameSession() {
        var sessionId = await StacksContract.Call("start-session", gameId);
        currentSessionId = sessionId;
    }
    
    public async void EndGameSession(int score, int experience) {
        await StacksContract.Call("end-session", currentSessionId, score, experience);
    }
    
    public async void AwardAchievement(string player, int achievementId) {
        await StacksContract.Call("award-achievement", player, achievementId);
    }
}
```

### Web Game Integration
```javascript
import { StacksMainnet } from '@stacks/network';
import { callReadOnlyFunction, makeContractCall } from '@stacks/transactions';

class Web3GameSDK {
  async getPlayerProfile(playerAddress) {
    return await callReadOnlyFunction({
      contractAddress: 'SP1234567890',
      contractName: 'web3-game-sdk',
      functionName: 'get-player-profile',
      functionArgs: [standardPrincipalCV(playerAddress)],
      network: new StacksMainnet()
    });
  }
  
  async joinGame(gameId) {
    return await makeContractCall({
      contractAddress: 'SP1234567890',
      contractName: 'web3-game-sdk',
      functionName: 'join-game',
      functionArgs: [uintCV(gameId)],
      network: new StacksMainnet()
    });
  }
}
```

## Deployment

1. Deploy the contract to Stacks blockchain
2. Note the contract address for integration
3. Register your game using `register-game`
4. Begin integrating Web3 features into your game

## Contributing

This contract is designed to be extensible. Consider these enhancement areas:

- **Trading System**: Player-to-player asset trading
- **Tournament System**: Automated tournament management
- **Governance**: Community voting on game features
- **Cross-chain Assets**: Multi-blockchain asset support
- **Reputation System**: Advanced player reputation mechanics

## License

This smart contract is provided as-is for educational and development purposes. Review and test thoroughly before production use.

## Support

For integration support and questions:
- Review the contract functions and error codes
- Test on Stacks testnet before mainnet deployment
- Consider gas costs for frequent operations
- Implement proper error handling in your game client

---

**Note**: Always test smart contracts thoroughly on testnet before mainnet deployment. Consider the gas costs of operations and implement appropriate caching strategies for read operations in your game clients.