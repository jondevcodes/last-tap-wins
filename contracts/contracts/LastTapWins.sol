// contracts/contracts/LastTapWins.sol
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract LastTapWins is VRFConsumerBase, ReentrancyGuard {
    using ECDSA for bytes32;
    
    // Core game state
    struct Game {
        uint256 gameId;
        uint256 entryFee;
        uint256 startTime;
        uint256 endTime;
        address[] players;
        address lastTapper;
        bool ended;
        bytes32 vrfRequestId; // Track VRF requests
    }
    
    // Chainlink VRF parameters
    bytes32 internal keyHash;
    uint256 internal fee;
    
    // Game parameters
    uint256 public constant GAME_DURATION = 60 seconds;
    uint256 public constant MAX_PLAYERS = 10;
    uint256 public constant MIN_PLAYERS = 2;
    
    // State variables
    mapping(uint256 => Game) public games;
    mapping(bytes32 => uint256) public vrfRequestToGameId;
    uint256 public gameCounter;
    address public immutable signerAddress; // Backend signer
    
    // Events
    event GameCreated(uint256 gameId, uint256 entryFee);
    event PlayerJoined(uint256 gameId, address player);
    event GameStarting(uint256 gameId, bytes32 vrfRequestId);
    event GameStarted(uint256 gameId, uint256 startTime, uint256 endTime);
    event TapRecorded(uint256 gameId, address player, uint256 timestamp);
    event GameEnded(uint256 gameId, address winner, uint256 amount);

    constructor(
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _keyHash,
        uint256 _vrfFee,
        address _signerAddress
    ) VRFConsumerBase(_vrfCoordinator, _linkToken) {
        keyHash = _keyHash;
        fee = _vrfFee;
        signerAddress = _signerAddress;
    }
    
    function createGame(uint256 _entryFee) external {
        uint256 gameId = gameCounter++;
        games[gameId] = Game({
            gameId: gameId,
            entryFee: _entryFee,
            startTime: 0, // Set by VRF callback
            endTime: 0,
            players: new address[](0),
            lastTapper: address(0),
            ended: false,
            vrfRequestId: bytes32(0)
        });
        emit GameCreated(gameId, _entryFee);
    }
    
    function joinGame(uint256 gameId) external payable nonReentrant {
        Game storage game = games[gameId];
        require(!game.ended, "Game ended");
        require(game.startTime == 0, "Game already started");
        require(msg.value == game.entryFee, "Incorrect ETH amount");
        require(game.players.length < MAX_PLAYERS, "Game full");
        
        game.players.push(msg.sender);
        emit PlayerJoined(gameId, msg.sender);
        
        // Start game when minimum players reached
        if (game.players.length >= MIN_PLAYERS) {
            _startGame(gameId);
        }
    }
    
    function _startGame(uint256 gameId) internal {
        Game storage game = games[gameId];
        require(game.vrfRequestId == bytes32(0), "VRF already requested");
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        
        bytes32 requestId = requestRandomness(keyHash, fee);
        game.vrfRequestId = requestId;
        vrfRequestToGameId[requestId] = gameId;
        emit GameStarting(gameId, requestId);
    }
    
    // Chainlink VRF callback
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        uint256 gameId = vrfRequestToGameId[requestId];
        Game storage game = games[gameId];
        
        // Calculate random start delay (5-30 seconds)
        uint256 startDelay = (randomness % 25) + 5;
        game.startTime = block.timestamp + startDelay;
        game.endTime = game.startTime + GAME_DURATION;
        
        emit GameStarted(gameId, game.startTime, game.endTime);
    }
    
    function recordTap(uint256 gameId) external {
        Game storage game = games[gameId];
        require(!game.ended, "Game ended");
        require(block.timestamp >= game.startTime, "Game not started");
        require(block.timestamp <= game.endTime, "Game ended");
        
        game.lastTapper = msg.sender;
        emit TapRecorded(gameId, msg.sender, block.timestamp);
    }
    
    function endGame(uint256 gameId, bytes memory signature) external nonReentrant {
        Game storage game = games[gameId];
        require(block.timestamp > game.endTime, "Game not ended");
        require(!game.ended, "Game already ended");
        require(game.lastTapper != address(0), "No taps recorded");
        
        // Verify backend signature
        bytes32 messageHash = keccak256(abi.encodePacked(gameId, game.lastTapper));
        address recoveredSigner = messageHash.toEthSignedMessageHash().recover(signature);
        require(recoveredSigner == signerAddress, "Invalid signature");

        game.ended = true;
        uint256 pot = game.entryFee * game.players.length;
        uint256 feeAmount = pot / 20; // 5% platform fee
        uint256 winnerAmount = pot - feeAmount;
        
        // Distribute funds
        payable(game.lastTapper).transfer(winnerAmount);
        payable(owner()).transfer(feeAmount); // Owner set in deployment
        
        emit GameEnded(gameId, game.lastTapper, winnerAmount);
    }

    // Emergency cancel for stuck games
    function emergencyCancel(uint256 gameId) external onlyOwner {
        Game storage game = games[gameId];
        require(!game.ended, "Game ended");
        require(block.timestamp > game.endTime + 1 hours, "Too early");
        
        game.ended = true;
        for (uint i = 0; i < game.players.length; i++) {
            payable(game.players[i]).transfer(game.entryFee);
        }
    }
    
    // Owner functions for contract maintenance
    address private _owner;
    
    constructor() {
        _owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == _owner, "Not owner");
        _;
    }
    
    function withdrawLink() external onlyOwner {
        require(LINK.transfer(msg.sender, LINK.balanceOf(address(this))), "Link transfer failed");
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        _owner = newOwner;
    }
}