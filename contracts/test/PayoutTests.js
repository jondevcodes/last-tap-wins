const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Payout Security", () => {
  let contract;
  let owner, player1, player2;

  beforeEach(async () => {
    [owner, player1, player2] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("LastTapWins");
    contract = await Contract.deploy(VRF_ADDR, LINK_ADDR);
  });

  it("Should prevent reentrancy attacks", async () => {
    // Implement reentrancy attack simulation
  });

  it("Should verify server signatures", async () => {
    // Test signature verification logic
  });

  it("Should correctly distribute winnings", async () => {
    await contract.connect(player1).joinGame(0, {value: ENTRY_FEE});
    await contract.connect(player2).joinGame(0, {value: ENTRY_FEE});
    
    // Simulate taps
    await contract.recordTap(0);
    await contract.recordTap(0);
    
    // End game and verify payouts
    const winner = player2.address;
    const signature = await generateBackendSignature(winner, 0);
    await contract.endGame(0, winner, signature);
    
    expect(await ethers.provider.getBalance(player2.address)).to.equal(
      INITIAL_BALANCE - ENTRY_FEE + (ENTRY_FEE * 2)
    );
  });
});