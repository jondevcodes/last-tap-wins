describe("Game Lifecycle", () => {
  it("Should complete full game flow", async () => {
    // Create game
    await contract.createGame(ethers.utils.parseEther("0.01"));
    
    // Players join
    await contract.connect(player1).joinGame(0, {value: ethers.utils.parseEther("0.01")});
    await contract.connect(player2).joinGame(0, {value: ethers.utils.parseEther("0.01")});
    
    // Simulate VRF callback
    const requestId = await contract.vrfRequestToGameId(0);
    await vrfCoordinator.callBackWithRandomness(
      requestId,
      123456, // Random number
      contract.address
    );
    
    // Record taps
    await contract.connect(player1).recordTap(0);
    await contract.connect(player2).recordTap(0);
    
    // Generate signature (simulate backend)
    const messageHash = ethers.utils.solidityKeccak256(
      ['uint256', 'address'],
      [0, player2.address]
    );
    const signature = await owner.signMessage(ethers.utils.arrayify(messageHash));
    
    // End game
    await contract.connect(anyone).endGame(0, signature);
    
    // Verify winner got funds
    const balance = await ethers.provider.getBalance(player2.address);
    expect(balance).to.equal(initialBalance - 0.01 + 0.019); // 0.019 = (0.02 * 0.95)
  });
});