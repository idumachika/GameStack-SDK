;; Web3 Game SDK Contract for Stacks Blockchain
;; A comprehensive contract for game developers to integrate Web3 functionality
;; Includes player profiles, achievements, leaderboards, and in-game assets

;; Contract owner and admin functions
(define-constant contract-owner tx-sender)
(define-constant err-not-authorized (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-exists (err u102))
(define-constant err-invalid-input (err u103))
(define-constant err-insufficient-funds (err u104))
(define-constant err-game-not-active (err u105))

;; Game registration and management
(define-map games
  { game-id: uint }
  {
    name: (string-ascii 50),
    developer: principal,
    is-active: bool,
    created-at: uint,
    total-players: uint
  }
)

;; Player profiles across all games
(define-map player-profiles
  { player: principal }
  {
    username: (string-ascii 30),
    total-games-played: uint,
    total-achievements: uint,
    created-at: uint,
    is-verified: bool
  }
)

;; Game-specific player data
(define-map game-players
  { game-id: uint, player: principal }
  {
    level: uint,
    experience: uint,
    score: uint,
    play-time: uint,
    last-played: uint,
    is-active: bool
  }
)

;; Achievement system
(define-map achievements
  { achievement-id: uint }
  {
    game-id: uint,
    name: (string-ascii 50),
    description: (string-ascii 200),
    rarity: (string-ascii 10), ;; common, rare, epic, legendary
    reward-amount: uint,
    created-by: principal
  }
)

;; Player achievements tracking
(define-map player-achievements
  { player: principal, achievement-id: uint }
  {
    earned-at: uint,
    game-id: uint
  }
)

;; Leaderboards for games
(define-map leaderboards
  { game-id: uint, season: uint }
  {
    name: (string-ascii 50),
    start-time: uint,
    end-time: uint,
    is-active: bool,
    prize-pool: uint
  }
)

;; In-game items/assets (NFT-like)
(define-map game-items
  { item-id: uint }
  {
    game-id: uint,
    name: (string-ascii 50),
    item-type: (string-ascii 20),
    rarity: (string-ascii 10),
    metadata-uri: (string-ascii 200),
    max-supply: uint,
    current-supply: uint,
    created-by: principal
  }
)

;; Player item ownership
(define-map player-items
  { player: principal, item-id: uint }
  {
    quantity: uint,
    acquired-at: uint
  }
)

;; Game economy - virtual currencies
(define-map game-currencies
  { game-id: uint, currency-name: (string-ascii 20) }
  {
    total-supply: uint,
    exchange-rate: uint, ;; exchange rate to STX
    is-tradeable: bool
  }
)

;; Player currency balances
(define-map player-balances
  { player: principal, game-id: uint, currency-name: (string-ascii 20) }
  { balance: uint }
)

;; Game session tracking
(define-map game-sessions
  { session-id: uint }
  {
    player: principal,
    game-id: uint,
    start-time: uint,
    end-time: (optional uint),
    score-gained: uint,
    experience-gained: uint
  }
)

;; Counter variables
(define-data-var next-game-id uint u1)
(define-data-var next-achievement-id uint u1)
(define-data-var next-item-id uint u1)
(define-data-var next-session-id uint u1)

;; Game registration function
(define-public (register-game (name (string-ascii 50)))
  (let ((game-id (var-get next-game-id)))
    (asserts! (> (len name) u0) err-invalid-input)
    (map-set games
      { game-id: game-id }
      {
        name: name,
        developer: tx-sender,
        is-active: true,
        created-at: stacks-block-height,
        total-players: u0
      }
    )
    (var-set next-game-id (+ game-id u1))
    (ok game-id)
  )
)

;; Player registration
(define-public (create-player-profile (username (string-ascii 30)))
  (let ((existing-profile (map-get? player-profiles { player: tx-sender })))
    (asserts! (is-none existing-profile) err-already-exists)
    (asserts! (and (> (len username) u0) (<= (len username) u30)) err-invalid-input)
    (map-set player-profiles
      { player: tx-sender }
      {
        username: username,
        total-games-played: u0,
        total-achievements: u0,
        created-at: stacks-block-height,
        is-verified: false
      }
    )
    (ok true)
  )
)

;; Join a game
(define-public (join-game (game-id uint))
  (let ((game (unwrap! (map-get? games { game-id: game-id }) err-not-found))
        (player-game-data (map-get? game-players { game-id: game-id, player: tx-sender })))
    (asserts! (get is-active game) err-game-not-active)
    (asserts! (is-none player-game-data) err-already-exists)
    
    ;; Add player to game
    (map-set game-players
      { game-id: game-id, player: tx-sender }
      {
        level: u1,
        experience: u0,
        score: u0,
        play-time: u0,
        last-played: stacks-block-height,
        is-active: true
      }
    )
    
    ;; Update game player count
    (map-set games
      { game-id: game-id }
      (merge game { total-players: (+ (get total-players game) u1) })
    )
    
    (ok true)
  )
)

;; Start a game session
(define-public (start-session (game-id uint))
  (let ((session-id (var-get next-session-id))
        (player-data (unwrap! (map-get? game-players { game-id: game-id, player: tx-sender }) err-not-found)))
    (map-set game-sessions
      { session-id: session-id }
      {
        player: tx-sender,
        game-id: game-id,
        start-time: stacks-block-height,
        end-time: none,
        score-gained: u0,
        experience-gained: u0
      }
    )
    (var-set next-session-id (+ session-id u1))
    (ok session-id)
  )
)

;; End a game session
(define-public (end-session (session-id uint) (final-score uint) (experience-gained uint))
  (let ((session (unwrap! (map-get? game-sessions { session-id: session-id }) err-not-found)))
    (asserts! (is-eq (get player session) tx-sender) err-not-authorized)
    (asserts! (is-none (get end-time session)) err-invalid-input)
    
    ;; Update session
    (map-set game-sessions
      { session-id: session-id }
      (merge session {
        end-time: (some stacks-block-height),
        score-gained: final-score,
        experience-gained: experience-gained
      })
    )
    
    ;; Update player stats
    (let ((player-data (unwrap! (map-get? game-players { game-id: (get game-id session), player: tx-sender }) err-not-found)))
      (map-set game-players
        { game-id: (get game-id session), player: tx-sender }
        (merge player-data {
          score: (+ (get score player-data) final-score),
          experience: (+ (get experience player-data) experience-gained),
          last-played: stacks-block-height
        })
      )
    )
    
    (ok true)
  )
)

;; Create achievement (game developers only)
(define-public (create-achievement (game-id uint) (name (string-ascii 50)) (description (string-ascii 200)) 
                                  (rarity (string-ascii 10)) (reward-amount uint))
  (let ((achievement-id (var-get next-achievement-id))
        (game (unwrap! (map-get? games { game-id: game-id }) err-not-found)))
    (asserts! (is-eq (get developer game) tx-sender) err-not-authorized)
    (asserts! (> (len name) u0) err-invalid-input)
    
    (map-set achievements
      { achievement-id: achievement-id }
      {
        game-id: game-id,
        name: name,
        description: description,
        rarity: rarity,
        reward-amount: reward-amount,
        created-by: tx-sender
      }
    )
    (var-set next-achievement-id (+ achievement-id u1))
    (ok achievement-id)
  )
)

;; Award achievement to player
(define-public (award-achievement (player principal) (achievement-id uint))
  (let ((achievement (unwrap! (map-get? achievements { achievement-id: achievement-id }) err-not-found))
        (game (unwrap! (map-get? games { game-id: (get game-id achievement) }) err-not-found))
        (existing-award (map-get? player-achievements { player: player, achievement-id: achievement-id })))
    (asserts! (is-eq (get developer game) tx-sender) err-not-authorized)
    (asserts! (is-none existing-award) err-already-exists)
    
    ;; Record achievement
    (map-set player-achievements
      { player: player, achievement-id: achievement-id }
      {
        earned-at: stacks-block-height,
        game-id: (get game-id achievement)
      }
    )
    
    ;; Update player profile
    (let ((profile (unwrap! (map-get? player-profiles { player: player }) err-not-found)))
      (map-set player-profiles
        { player: player }
        (merge profile { total-achievements: (+ (get total-achievements profile) u1) })
      )
    )
    
    (ok true)
  )
)

;; Create in-game item
(define-public (create-game-item (game-id uint) (name (string-ascii 50)) (item-type (string-ascii 20))
                                (rarity (string-ascii 10)) (metadata-uri (string-ascii 200)) (max-supply uint))
  (let ((item-id (var-get next-item-id))
        (game (unwrap! (map-get? games { game-id: game-id }) err-not-found)))
    (asserts! (is-eq (get developer game) tx-sender) err-not-authorized)
    (asserts! (> (len name) u0) err-invalid-input)
    
    (map-set game-items
      { item-id: item-id }
      {
        game-id: game-id,
        name: name,
        item-type: item-type,
        rarity: rarity,
        metadata-uri: metadata-uri,
        max-supply: max-supply,
        current-supply: u0,
        created-by: tx-sender
      }
    )
    (var-set next-item-id (+ item-id u1))
    (ok item-id)
  )
)

;; Mint item to player
(define-public (mint-item (player principal) (item-id uint) (quantity uint))
  (let ((item (unwrap! (map-get? game-items { item-id: item-id }) err-not-found))
        (game (unwrap! (map-get? games { game-id: (get game-id item) }) err-not-found))
        (current-ownership (default-to { quantity: u0, acquired-at: u0 } 
                           (map-get? player-items { player: player, item-id: item-id }))))
    (asserts! (is-eq (get developer game) tx-sender) err-not-authorized)
    (asserts! (<= (+ (get current-supply item) quantity) (get max-supply item)) err-invalid-input)
    
    ;; Update item supply
    (map-set game-items
      { item-id: item-id }
      (merge item { current-supply: (+ (get current-supply item) quantity) })
    )
    
    ;; Update player ownership
    (map-set player-items
      { player: player, item-id: item-id }
      {
        quantity: (+ (get quantity current-ownership) quantity),
        acquired-at: stacks-block-height
      }
    )
    
    (ok true)
  )
)

;; Read-only functions for querying data

;; Get game information
(define-read-only (get-game-info (game-id uint))
  (map-get? games { game-id: game-id })
)

;; Get player profile
(define-read-only (get-player-profile (player principal))
  (map-get? player-profiles { player: player })
)

;; Get player game data
(define-read-only (get-player-game-data (game-id uint) (player principal))
  (map-get? game-players { game-id: game-id, player: player })
)

;; Get achievement info
(define-read-only (get-achievement-info (achievement-id uint))
  (map-get? achievements { achievement-id: achievement-id })
)

;; Check if player has achievement
(define-read-only (has-achievement (player principal) (achievement-id uint))
  (is-some (map-get? player-achievements { player: player, achievement-id: achievement-id }))
)

;; Get item info
(define-read-only (get-item-info (item-id uint))
  (map-get? game-items { item-id: item-id })
)

;; Get player item quantity
(define-read-only (get-player-item-quantity (player principal) (item-id uint))
  (match (map-get? player-items { player: player, item-id: item-id })
    item-data (get quantity item-data)
    u0
  )
)

;; Get session info
(define-read-only (get-session-info (session-id uint))
  (map-get? game-sessions { session-id: session-id })
)

;; Admin functions

;; Deactivate a game (contract owner only)
(define-public (deactivate-game (game-id uint))
  (let ((game (unwrap! (map-get? games { game-id: game-id }) err-not-found)))
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (map-set games
      { game-id: game-id }
      (merge game { is-active: false })
    )
    (ok true)
  )
)

;; Verify player (contract owner only)
(define-public (verify-player (player principal))
  (let ((profile (unwrap! (map-get? player-profiles { player: player }) err-not-found)))
    (asserts! (is-eq tx-sender contract-owner) err-not-authorized)
    (map-set player-profiles
      { player: player }
      (merge profile { is-verified: true })
    )
    (ok true)
  )
)