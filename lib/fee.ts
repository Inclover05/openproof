import { abi, createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { encodeFunctionData, formatEther, type Address, type Abi } from "viem";
import { contractFor, payload } from "./network";
import type { CaseRecord } from "./domain";
export async function quote(record: CaseRecord, account: Address) {
  const client = createClient({ chain: testnetBradbury, account });
  const data = abi.transactions.serialize([
    abi.calldata.encode(
      abi.calldata.makeCalldataObject("evaluate", [payload(record)], undefined),
    ),
    false,
  ]);
  const consensus = testnetBradbury.consensusMainContract;
  if (!consensus) throw new Error("Network fee configuration unavailable");
  const entry = consensus.abi.find((v) => {
    const item = v as { type?: string; name?: string };
    return item.type === "function" && item.name === "addTransaction";
  }) as { inputs: unknown[] };
  const baseArgs = [
    account,
    contractFor(record),
    testnetBradbury.defaultNumberOfInitialValidators,
    testnetBradbury.defaultConsensusMaxRotations,
    data,
  ];
  const args =
    entry.inputs.length === 6
      ? [...baseArgs, BigInt(Math.floor(Date.now() / 1000) + 3600)]
      : baseArgs;
  const encoded = encodeFunctionData({
    abi: consensus.abi as Abi,
    functionName: "addTransaction",
    args,
  });
  const [gas, price] = await Promise.all([
    client.estimateTransactionGas({
      from: account,
      to: consensus.address,
      data: encoded,
      value: BigInt(0),
    }),
    client.getGasPrice(),
  ]);
  return {
    gas: gas.toString(),
    gasPrice: price.toString(),
    estimatedGen: formatEther(gas * price),
    quotedAt: new Date().toISOString(),
    network: "Bradbury",
    chainId: 4221,
  };
}
