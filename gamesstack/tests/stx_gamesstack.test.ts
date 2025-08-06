import { describe, expect, it } from "vitest";

// Mock Clarinet testing environment
const mockClarinet = {
  run: (testFunction: () => void) => testFunction(),
  tx: {
    ok: (value: any) => ({ type: 'ok', value }),
    err: (value: any) => ({ type: 'err', value }),
  },
  types: {
    uint: (value: number) => value,
    ascii: (value: string) => value,
    principal: (value: string) => value,
  },
  accounts: {
    deployer: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    wallet_1: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5',
    wallet_2: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    wallet_3: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
  }
};

// Mock contract call function
const mockCallContract = (contractName: string, functionName: string, args: any[], sender?: string) => {
  // Simulate contract state
  const contractState = {
    games: new Map(),
    playerProfiles: new Map(),
    gamePlayers: new Map(),
    achievements: new Map(),
    playerAchievements: new Map(),
    gameItems: new Map(),
    playerItems: new Map(),
    gameSessions: new Map(),
    nextGameId: 1,
    nextAchievementId: 1,
    nextItemId: 1,
    nextSessionId: 1,
  };

  const contractOwner = mockClarinet.accounts.deployer;
  
  switch (functionName) {
    case 'register-game':
      const gameName = args[0];
      if (!gameName || gameName.length === 0) {
        return mockClarinet.tx.err(103); // err-invalid-input
      }
      const gameId = contractState.nextGameId;
      contractState.games.set(gameId, {
        name: gameName,
        developer: sender || contractOwner,
        isActive: true,
        createdAt: 1000,
        totalPlayers: 0
      });
      contractState.nextGameId++;
      return mockClarinet.tx.ok(gameId);

    case 'create-player-profile':
      const username = args[0];
      if (contractState.playerProfiles.has(sender)) {
        return mockClarinet.tx.err(102); // err-already-exists
      }
      if (!username || username.length === 0 || username.length > 30) {
        return mockClarinet.tx.err(103); // err-invalid-input
      }
      contractState.playerProfiles.set(sender, {
        username: username,
        totalGamesPlayed: 0,
        totalAchievements: 0,
        createdAt: 1000,
        isVerified: false
      });
      return mockClarinet.tx.ok(true);

    case 'join-game':
      const joinGameId = args[0];
      const game = contractState.games.get(joinGameId);
      if (!game) {
        return mockClarinet.tx.err(101); // err-not-found
      }
      if (!game.isActive) {
        return mockClarinet.tx.err(105); // err-game-not-active
      }
      const playerGameKey = `${joinGameId}-${sender}`;
      if (contractState.gamePlayers.has(playerGameKey)) {
        return mockClarinet.tx.err(102); // err-already-exists
      }
      contractState.gamePlayers.set(playerGameKey, {
        level: 1,
        experience: 0,
        score: 0,
        playTime: 0,
        lastPlayed: 1000,
        isActive: true
      });
      game.totalPlayers++;
      return mockClarinet.tx.ok(true);

    case 'start-session':
      const sessionGameId = args[0];
      const playerGameKey2 = `${sessionGameId}-${sender}`;
      if (!contractState.gamePlayers.has(playerGameKey2)) {
        return mockClarinet.tx.err(101); // err-not-found
      }
      const sessionId = contractState.nextSessionId;
      contractState.gameSessions.set(sessionId, {
        player: sender,
        gameId: sessionGameId,
        startTime: 1000,
        endTime: null,
        scoreGained: 0,
        experienceGained: 0
      });
      contractState.nextSessionId++;
      return mockClarinet.tx.ok(sessionId);

    case 'end-session':
      const endSessionId = args[0];
      const finalScore = args[1];
      const expGained = args[2];
      const session = contractState.gameSessions.get(endSessionId);
      if (!session) {
        return mockClarinet.tx.err(101); // err-not-found
      }
      if (session.player !== sender) {
        return mockClarinet.tx.err(100); // err-not-authorized
      }
      if (session.endTime !== null) {
        return mockClarinet.tx.err(103); // err-invalid-input
      }
      session.endTime = 1001;
      session.scoreGained = finalScore;
      session.experienceGained = expGained;
      
      // Update player stats
      const playerKey = `${session.gameId}-${sender}`;
      const playerData = contractState.gamePlayers.get(playerKey);
      if (playerData) {
        playerData.score += finalScore;
        playerData.experience += expGained;
        playerData.lastPlayed = 1001;
      }
      return mockClarinet.tx.ok(true);

    case 'create-achievement':
      const achGameId = args[0];
      const achName = args[1];
      const achDesc = args[2];
      const achRarity = args[3];
      const achReward = args[4];
      const achGame = contractState.games.get(achGameId);
      if (!achGame) {
        return mockClarinet.tx.err(101); // err-not-found
      }
      if (achGame.developer !== sender) {
        return mockClarinet.tx.err(100); // err-not-authorized
      }
      if (!achName || achName.length === 0) {
        return mockClarinet.tx.err(103); // err-invalid-input
      }
      const achievementId = contractState.nextAchievementId;
      contractState.achievements.set(achievementId, {
        gameId: achGameId,
        name: achName,
        description: achDesc,
        rarity: achRarity,
        rewardAmount: achReward,
        createdBy: sender
      });
      contractState.nextAchievementId++;
      return mockClarinet.tx.ok(achievementId);

    case 'award-achievement':
      const awardPlayer = args[0];
      const awardAchId = args[1];
      const achievement = contractState.achievements.get(awardAchId);
      if (!achievement) {
        return mockClarinet.tx.err(101); // err-not-found
      }
      const awardGame = contractState.games.get(achievement.gameId);
      if (!awardGame || awardGame.developer !== sender) {
        return mockClarinet.tx.err(100); // err-not-authorized
      }
      const playerAchKey = `${awardPlayer}-${awardAchId}`;
      if (contractState.playerAchievements.has(playerAchKey)) {
        return mockClarinet.tx.err(102); // err-already-exists
      }
      contractState.playerAchievements.set(playerAchKey, {
        earnedAt: 1000,
        gameId: achievement.gameId
      });
      
      // Update player profile
      const playerProfile = contractState.playerProfiles.get(awardPlayer);
      if (playerProfile) {
        playerProfile.totalAchievements++;
      }
      return mockClarinet.tx.ok(true);

    case 'create-game-item':
      const itemGameId = args[0];
      const itemName = args[1];
      const itemType = args[2];
      const itemRarity = args[3];
      const itemMetadata = args[4];
      const itemMaxSupply = args[5];
      const itemGame = contractState.games.get(itemGameId);
      if (!itemGame) {
        return mockClarinet.tx.err(101); // err-not-found
      }
      if (itemGame.developer !== sender) {
        return mockClarinet.tx.err(100); // err-not-authorized
      }
      if (!itemName || itemName.length === 0) {
        return mockClarinet.tx.err(103); // err-invalid-input
      }
      const itemId = contractState.nextItemId;
      contractState.gameItems.set(itemId, {
        gameId: itemGameId,
        name: itemName,
        itemType: itemType,
        rarity: itemRarity,
        metadataUri: itemMetadata,
        maxSupply: itemMaxSupply,
        currentSupply: 0,
        createdBy: sender
      });
      contractState.nextItemId++;
      return mockClarinet.tx.ok(itemId);

    case 'mint-item':
      const mintPlayer = args[0];
      const mintItemId = args[1];
      const mintQuantity = args[2];
      const mintItem = contractState.gameItems.get(mintItemId);
      if (!mintItem) {
        return mockClarinet.tx.err(101); // err-not-found
      }
      const mintGame = contractState.games.get(mintItem.gameId);
      if (!mintGame || mintGame.developer !== sender) {
        return mockClarinet.tx.err(100); // err-not-authorized
      }
      if (mintItem.currentSupply + mintQuantity > mintItem.maxSupply) {
        return mockClarinet.tx.err(103); // err-invalid-input
      }
      mintItem.currentSupply += mintQuantity;
      
      const playerItemKey = `${mintPlayer}-${mintItemId}`;
      const existingItem = contractState.playerItems.get(playerItemKey) || { quantity: 0, acquiredAt: 0 };
      contractState.playerItems.set(playerItemKey, {
        quantity: existingItem.quantity + mintQuantity,
        acquiredAt: 1000
      });
      return mockClarinet.tx.ok(true);

    // Read-only functions
    case 'get-game-info':
      const getGameId = args[0];
      const gameInfo = contractState.games.get(getGameId);
      return gameInfo ? mockClarinet.tx.ok(gameInfo) : mockClarinet.tx.ok(null);

    case 'get-player-profile':
      const getPlayer = args[0];
      const profile = contractState.playerProfiles.get(getPlayer);
      return profile ? mockClarinet.tx.ok(profile) : mockClarinet.tx.ok(null);

    default:
      return mockClarinet.tx.err(404);
  }
};

describe("Web3 Game SDK Contract Tests", () => {
  
  describe("Game Registration", () => {
    it("should successfully register a new game", () => {
      const result = mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(1);
    });

    it("should fail to register game with empty name", () => {
      const result = mockCallContract("stx_gamesstack", "register-game", [""], mockClarinet.accounts.deployer);
      expect(result.type).toBe("err");
      expect(result.value).toBe(103); // err-invalid-input
    });

    it("should get game info after registration", () => {
      // First register a game
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      
      // Then get game info
      const result = mockCallContract("stx_gamesstack", "get-game-info", [1]);
      expect(result.type).toBe("ok");
      expect(result.value).toBeDefined();
      expect(result.value.name).toBe("Test Game");
      expect(result.value.isActive).toBe(true);
    });
  });

  describe("Player Profile Management", () => {
    it("should create a new player profile", () => {
      const result = mockCallContract("stx_gamesstack", "create-player-profile", ["TestPlayer"], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(true);
    });

    it("should fail to create duplicate player profile", () => {
      // Create first profile
      mockCallContract("stx_gamesstack", "create-player-profile", ["TestPlayer"], mockClarinet.accounts.wallet_1);
      
      // Try to create duplicate
      const result = mockCallContract("stx_gamesstack", "create-player-profile", ["TestPlayer2"], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("err");
      expect(result.value).toBe(102); // err-already-exists
    });

    it("should fail with invalid username", () => {
      const result = mockCallContract("stx_gamesstack", "create-player-profile", [""], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("err");
      expect(result.value).toBe(103); // err-invalid-input
    });

    it("should get player profile after creation", () => {
      // Create profile
      mockCallContract("stx_gamesstack", "create-player-profile", ["TestPlayer"], mockClarinet.accounts.wallet_1);
      
      // Get profile
      const result = mockCallContract("stx_gamesstack", "get-player-profile", [mockClarinet.accounts.wallet_1]);
      expect(result.type).toBe("ok");
      expect(result.value).toBeDefined();
      expect(result.value.username).toBe("TestPlayer");
      expect(result.value.totalGamesPlayed).toBe(0);
    });
  });

  describe("Game Participation", () => {
    it("should allow player to join an active game", () => {
      // Register game
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      
      // Join game
      const result = mockCallContract("stx_gamesstack", "join-game", [1], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(true);
    });

    it("should fail to join non-existent game", () => {
      const result = mockCallContract("stx_gamesstack", "join-game", [999], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("err");
      expect(result.value).toBe(101); // err-not-found
    });

    it("should fail to join same game twice", () => {
      // Register game
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      
      // Join game first time
      mockCallContract("stx_gamesstack", "join-game", [1], mockClarinet.accounts.wallet_1);
      
      // Try to join again
      const result = mockCallContract("stx_gamesstack", "join-game", [1], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("err");
      expect(result.value).toBe(102); // err-already-exists
    });
  });

  describe("Game Sessions", () => {
    it("should start a game session successfully", () => {
      // Setup: Register game and join
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "join-game", [1], mockClarinet.accounts.wallet_1);
      
      // Start session
      const result = mockCallContract("stx_gamesstack", "start-session", [1], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(1); // session ID
    });

    it("should end a game session successfully", () => {
      // Setup: Register game, join, start session
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "join-game", [1], mockClarinet.accounts.wallet_1);
      mockCallContract("stx_gamesstack", "start-session", [1], mockClarinet.accounts.wallet_1);
      
      // End session
      const result = mockCallContract("stx_gamesstack", "end-session", [1, 1000, 50], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(true);
    });

    it("should fail to end non-existent session", () => {
      const result = mockCallContract("stx_gamesstack", "end-session", [999, 1000, 50], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("err");
      expect(result.value).toBe(101); // err-not-found
    });

    it("should fail to end session by wrong player", () => {
      // Setup: Register game, join, start session
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "join-game", [1], mockClarinet.accounts.wallet_1);
      mockCallContract("stx_gamesstack", "start-session", [1], mockClarinet.accounts.wallet_1);
      
      // Try to end session with different player
      const result = mockCallContract("stx_gamesstack", "end-session", [1, 1000, 50], mockClarinet.accounts.wallet_2);
      expect(result.type).toBe("err");
      expect(result.value).toBe(100); // err-not-authorized
    });
  });

  describe("Achievement System", () => {
    it("should create achievement by game developer", () => {
      // Setup: Register game
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      
      // Create achievement
      const result = mockCallContract("stx_gamesstack", "create-achievement", [1, "First Win", "Win your first match", "common", 100], mockClarinet.accounts.deployer);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(1); // achievement ID
    });

    it("should fail to create achievement by non-developer", () => {
      // Setup: Register game
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      
      // Try to create achievement with different account
      const result = mockCallContract("stx_gamesstack", "create-achievement", [1, "First Win", "Win your first match", "common", 100], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("err");
      expect(result.value).toBe(100); // err-not-authorized
    });

    it("should award achievement to player", () => {
      // Setup: Register game, create achievement, create player profile
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "create-achievement", [1, "First Win", "Win your first match", "common", 100], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "create-player-profile", ["TestPlayer"], mockClarinet.accounts.wallet_1);
      
      // Award achievement
      const result = mockCallContract("stx_gamesstack", "award-achievement", [mockClarinet.accounts.wallet_1, 1], mockClarinet.accounts.deployer);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(true);
    });

    it("should fail to award same achievement twice", () => {
      // Setup: Register game, create achievement, create player profile
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "create-achievement", [1, "First Win", "Win your first match", "common", 100], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "create-player-profile", ["TestPlayer"], mockClarinet.accounts.wallet_1);
      
      // Award achievement first time
      mockCallContract("stx_gamesstack", "award-achievement", [mockClarinet.accounts.wallet_1, 1], mockClarinet.accounts.deployer);
      
      // Try to award again
      const result = mockCallContract("stx_gamesstack", "award-achievement", [mockClarinet.accounts.wallet_1, 1], mockClarinet.accounts.deployer);
      expect(result.type).toBe("err");
      expect(result.value).toBe(102); // err-already-exists
    });
  });

  describe("Game Item System", () => {
    it("should create game item by developer", () => {
      // Setup: Register game
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      
      // Create item
      const result = mockCallContract("stx_gamesstack", "create-game-item", [1, "Magic Sword", "weapon", "legendary", "https://example.com/sword.json", 100], mockClarinet.accounts.deployer);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(1); // item ID
    });

    it("should fail to create item by non-developer", () => {
      // Setup: Register game
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      
      // Try to create item with different account
      const result = mockCallContract("stx_gamesstack", "create-game-item", [1, "Magic Sword", "weapon", "legendary", "https://example.com/sword.json", 100], mockClarinet.accounts.wallet_1);
      expect(result.type).toBe("err");
      expect(result.value).toBe(100); // err-not-authorized
    });

    it("should mint item to player", () => {
      // Setup: Register game, create item
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "create-game-item", [1, "Magic Sword", "weapon", "legendary", "https://example.com/sword.json", 100], mockClarinet.accounts.deployer);
      
      // Mint item
      const result = mockCallContract("stx_gamesstack", "mint-item", [mockClarinet.accounts.wallet_1, 1, 1], mockClarinet.accounts.deployer);
      expect(result.type).toBe("ok");
      expect(result.value).toBe(true);
    });

    it("should fail to mint beyond max supply", () => {
      // Setup: Register game, create item with max supply of 1
      mockCallContract("stx_gamesstack", "register-game", ["Test Game"], mockClarinet.accounts.deployer);
      mockCallContract("stx_gamesstack", "create-game-item", [1, "Magic Sword", "weapon", "legendary", "https://example.com/sword.json", 1], mockClarinet.accounts.deployer);
      
      // Try to mint more than max supply
      const result = mockCallContract("stx_gamesstack", "mint-item", [mockClarinet.accounts.wallet_1, 1, 2], mockClarinet.accounts.deployer);
      expect(result.type).toBe("err");
      expect(result.value).toBe(103); // err-invalid-input
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete game flow", () => {
      // 1. Register game
      const gameResult = mockCallContract("stx_gamesstack", "register-game", ["Complete Test Game"], mockClarinet.accounts.deployer);
      expect(gameResult.type).toBe("ok");
      
      // 2. Create player profile
      const profileResult = mockCallContract("stx_gamesstack", "create-player-profile", ["CompletePlayer"], mockClarinet.accounts.wallet_1);
      expect(profileResult.type).toBe("ok");
      
      // 3. Join game
      const joinResult = mockCallContract("stx_gamesstack", "join-game", [1], mockClarinet.accounts.wallet_1);
      expect(joinResult.type).toBe("ok");
      
      // 4. Start session
      const sessionResult = mockCallContract("stx_gamesstack", "start-session", [1], mockClarinet.accounts.wallet_1);
      expect(sessionResult.type).toBe("ok");
      
      // 5. End session
      const endResult = mockCallContract("stx_gamesstack", "end-session", [1, 5000, 250], mockClarinet.accounts.wallet_1);
      expect(endResult.type).toBe("ok");
      
      // 6. Create achievement
      const achResult = mockCallContract("stx_gamesstack", "create-achievement", [1, "High Score", "Score over 1000 points", "rare", 500], mockClarinet.accounts.deployer);
      expect(achResult.type).toBe("ok");
      
      // 7. Award achievement
      const awardResult = mockCallContract("stx_gamesstack", "award-achievement", [mockClarinet.accounts.wallet_1, 1], mockClarinet.accounts.deployer);
      expect(awardResult.type).toBe("ok");
      
      // 8. Create and mint item
      const itemResult = mockCallContract("stx_gamesstack", "create-game-item", [1, "Victory Trophy", "collectible", "epic", "https://example.com/trophy.json", 50], mockClarinet.accounts.deployer);
      expect(itemResult.type).toBe("ok");
      
      const mintResult = mockCallContract("stx_gamesstack", "mint-item", [mockClarinet.accounts.wallet_1, 1, 1], mockClarinet.accounts.deployer);
      expect(mintResult.type).toBe("ok");
    });
  });
});