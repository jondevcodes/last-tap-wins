// backend/src/services/signatureService.js
const ethers = require('ethers');
const crypto = require('crypto');
const { parseEther } = ethers.utils;

// Security-hardened signature service with:
// 1. Timestamp expiration
// 2. Cryptographic nonce
// 3. Type-safe hashing
// 4. Error handling
module.exports = {
  /**
   * Generates a signed winner attestation
   * @param {number} gameId - The game ID
   * @param {string} winnerAddress - Ethereum address of winner
   * @param {number} [expirySeconds=60] - Signature validity window
   * @returns {Promise<{signature: string, timestamp: number, nonce: string}>}
   */
  generateSignature: async (gameId, winnerAddress, expirySeconds = 60) => {
    try {
      if (!process.env.SIGNER_PRIVATE_KEY) {
        throw new Error('SIGNER_PRIVATE_KEY not configured');
      }

      const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);
      const timestamp = Math.floor(Date.now() / 1000);
      const nonce = crypto.randomBytes(16).toString('hex'); // 128-bit nonce

      // Type-safe hashing with packed parameters
      const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'address', 'uint256', 'bytes32'],
        [gameId, winnerAddress, timestamp, nonce]
      );

      // Sign the hash with EIP-191 personal message prefix
      const signature = await signer.signMessage(ethers.utils.arrayify(hash));

      return {
        signature,
        timestamp,
        nonce,
        expiry: timestamp + expirySeconds
      };

    } catch (error) {
      console.error('[SignatureService] Generation failed:', error);
      throw new Error('Failed to generate signature');
    }
  },

  /**
   * Verifies a signed winner attestation
   * @param {string} signature - Hex signature from generateSignature()
   * @param {number} gameId - The game ID
   * @param {string} winnerAddress - Ethereum address of winner
   * @param {number} timestamp - Seconds since epoch
   * @param {string} nonce - Cryptographic nonce
   * @returns {Promise<boolean>}
   */
  verifySignature: async (signature, gameId, winnerAddress, timestamp, nonce) => {
    try {
      // 1. Validate signature age (60s default)
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > timestamp + 60) {
        console.warn(`[SignatureService] Expired signature: ${currentTime - timestamp}s old`);
        return false;
      }

      // 2. Reconstruct message hash
      const messageHash = ethers.utils.solidityKeccak256(
        ['uint256', 'address', 'uint256', 'bytes32'],
        [gameId, winnerAddress, timestamp, nonce]
      );

      // 3. EIP-191 compliant hash recovery
      const ethSignedHash = ethers.utils.hashMessage(ethers.utils.arrayify(messageHash));
      const recoveredAddress = ethers.utils.recoverAddress(
        ethSignedHash,
        signature
      );

      // 4. Compare with configured signer
      const isValid = recoveredAddress.toLowerCase() === 
                     process.env.SIGNER_ADDRESS?.toLowerCase();

      if (!isValid) {
        console.warn('[SignatureService] Invalid signature', {
          expected: process.env.SIGNER_ADDRESS,
          recovered: recoveredAddress
        });
      }

      return isValid;

    } catch (error) {
      console.error('[SignatureService] Verification failed:', error);
      return false;
    }
  },

  // Utility function for contract verification
  getSignerAddress: () => {
    if (!process.env.SIGNER_PRIVATE_KEY) {
      throw new Error('SIGNER_PRIVATE_KEY not configured');
    }
    return new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY).address;
  }
};