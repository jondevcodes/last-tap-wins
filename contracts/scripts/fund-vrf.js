const LINK_TOKEN_ABI = ['function transfer(address to, uint256 value) returns (bool)'];

async function main() {
  const contractAddress = "YOUR_DEPLOYED_ADDRESS";
  const amount = ethers.utils.parseEther("0.5"); // 0.5 LINK
  
  const [signer] = await ethers.getSigners();
  const linkToken = new ethers.Contract(
    "0x326C977E6efc84E512bB9C30f76E30c160eD06FB", 
    LINK_TOKEN_ABI,
    signer
  );
  
  const tx = await linkToken.transfer(contractAddress, amount);
  await tx.wait();
  console.log(`Funded ${contractAddress} with ${amount} LINK`);
}