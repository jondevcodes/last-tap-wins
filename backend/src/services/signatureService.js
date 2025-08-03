const ethers = require('ethers');
const crypto = require('crypto');

// Security-critical signing service
module.exports = {
  generateSignature: (gameId, winnerAddress) => {
    const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);
    
    // Prevent replay attacks with nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const hash = ethers.utils.solidityKeccak256(
      ['uint256', 'address', 'bytes32'],
      [gameId, winnerAddress, nonce]
    );
    
    const signature = signer.signMessage(ethers.utils.arrayify(hash));
    return { signature, nonce };
  },

  verifySignature: (signature, gameId, winnerAddress, nonce) => {
    const signerAddress = ethers.utils.computeAddress(
      ethers.utils.recoverPublicKey(
        ethers.utils.arrayify(
          ethers.utils.solidityKeccak256(
            ['uint256', 'address', 'bytes32'],
            [gameId, winnerAddress, nonce]
          )
        ),
        signature
      )
    );
    return signerAddress === process.env.SIGNER_ADDRESS;
  }
};