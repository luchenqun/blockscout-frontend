import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { Chain, GetBlockReturnType } from 'viem';

import type { Block } from 'types/api/block';

import type { ResourceError } from 'lib/api/resources';
import dayjs from 'lib/date/dayjs';
import { publicClient } from 'lib/web3/client';
import { GET_BLOCK } from 'stubs/RPC';
import { unknownAddress } from 'ui/shared/address/utils';

type RpcResponseType = GetBlockReturnType<Chain, false, 'latest'> | null;

export type BlockQuery = UseQueryResult<Block, ResourceError<{ status: number }>> & {
  isDegradedData: boolean;
};

interface Params {
  heightOrHash: string;
}

export default function useBlockQuery({ heightOrHash }: Params): BlockQuery {
  const rpcQuery = useQuery<RpcResponseType, unknown, Block | null>({
    queryKey: [ 'RPC', 'block', { heightOrHash } ],
    queryFn: async() => {
      const blockParams = heightOrHash.startsWith('0x') ? { blockHash: heightOrHash as `0x${ string }` } : { blockNumber: BigInt(heightOrHash) };
      return publicClient.getBlock(blockParams).catch(() => null);
    },
    select: (block) => {
      if (!block) {
        return null;
      }

      return {
        height: Number(block.number),
        timestamp: dayjs.unix(Number(block.timestamp)).format(),
        tx_count: block.transactions.length,
        miner: { ...unknownAddress, hash: block.miner },
        size: Number(block.size),
        hash: block.hash,
        parent_hash: block.parentHash,
        difficulty: block.difficulty.toString(),
        total_difficulty: block.totalDifficulty?.toString() ?? null,
        gas_used: block.gasUsed.toString(),
        gas_limit: block.gasLimit.toString(),
        nonce: block.nonce,
        base_fee_per_gas: block.baseFeePerGas?.toString() ?? null,
        burnt_fees: null,
        priority_fee: null,
        extra_data: block.extraData,
        state_root: block.stateRoot,
        gas_target_percentage: null,
        gas_used_percentage: null,
        burnt_fees_percentage: null,
        type: 'block', // we can't get this type from RPC, so it will always be a regular block
        tx_fees: null,
        uncles_hashes: block.uncles,
        withdrawals_count: block.withdrawals?.length,
      };
    },
    placeholderData: GET_BLOCK,
    enabled: true,
    retry: false,
    refetchOnMount: false,
  });

  const query = rpcQuery as UseQueryResult<Block, ResourceError<{ status: number }>>;

  return {
    ...query,
    isDegradedData: true,
  };
}
