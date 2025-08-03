pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LastTapWins is VRFConsumerBase, ReentrancyGuard {
    // Core game state
    struct Game {
        uint256 gameId;
        uint256 entryFee;
        uint256 startTime;
        uint256 endTime;
        address[] players;
        address lastTapper;
        bool ended;
    }
    
    mapping(uint256 => Game) public games;
    uint256 public gameCounter;
    
    // Events
    event GameCreated(uint256 gameId, uint256 entryFee);
    event PlayerJoined(uint256 gameId, address player);
    event TapRecorded(uint256 gameId, address player, uint256 timestamp);
    event GameEnded(uint256 gameId, address winner, uint256 amount);

    constructor(address _vrfCoordinator, address _linkToken)
        VRFConsumerBase(_vrfCoordinator, _linkToken) {
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
            ended: false
        });
        emit GameCreated(gameId, _entryFee);
    }
    
    function joinGame(uint256 gameId) external payable nonReentrant {
        Game storage game = games[gameId];
        require(msg.value == game.entryFee, "Incorrect ETH amount");
        game.players.push(msg.sender);
        emit PlayerJoined(gameId, msg.sender);
    }
    
    function recordTap(uint256 gameId) external {
        Game storage game = games[gameId];
        require(block.timestamp >= game.startTime, "Game not started");
        require(block.timestamp <= game.endTime, "Game ended");
        
        game.lastTapper = msg.sender;
        emit TapRecorded(gameId, msg.sender, block.timestamp);
    }
    
    function endGame(uint256 gameId, address winner, bytes memory signature) external nonReentrant {
        // Signature verification logic here
        // Payout logic here
    }
}