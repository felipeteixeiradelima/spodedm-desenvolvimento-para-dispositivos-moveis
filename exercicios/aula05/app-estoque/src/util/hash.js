import * as Crypto from "expo-crypto";

export async function hashText(input) {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}
