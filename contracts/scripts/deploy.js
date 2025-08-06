async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Mumbai Testnet Parameters
  const VRF_COORDINATOR = '0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed';
  const LINK_TOKEN = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB';
  const KEY_HASH = '0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f';
  const VRF_FEE = ethers.utils.parseEther('0.0001');
  const SIGNER_ADDRESS = '0xYourBackendSignerAddress'; // From .env

  const Contract = await ethers.getContractFactory("LastTapWins");
  const contract = await Contract.deploy(
    VRF_COORDINATOR,
    LINK_TOKEN,
    KEY_HASH,
    VRF_FEE,
    SIGNER_ADDRESS
  );

  console.log("Contract deployed to:", contract.address);
}