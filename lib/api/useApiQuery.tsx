import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

import type { Block } from 'types/api/block';

import dayjs from 'lib/date/dayjs';
import { publicClient } from 'lib/web3/client';
import { unknownAddress } from 'ui/shared/address/utils';

import type { ResourceError, ResourceName, ResourcePayload } from './resources';
import type { Params as ApiFetchParams } from './useApiFetch';
import useApiFetch from './useApiFetch';

export interface Params<R extends ResourceName, E = unknown> extends ApiFetchParams<R> {
  queryOptions?: Omit<UseQueryOptions<ResourcePayload<R>, ResourceError<E>, ResourcePayload<R>>, 'queryKey' | 'queryFn'>;
}

export function getResourceKey<R extends ResourceName>(resource: R, { pathParams, queryParams }: Params<R> = {}) {
  if (pathParams || queryParams) {
    return [ resource, { ...pathParams, ...queryParams } ];
  }

  return [ resource ];
}

export default function useApiQuery<R extends ResourceName, E = unknown>(
  resource: R,
  { queryOptions, pathParams, queryParams, fetchParams }: Params<R, E> = {},
) {
  const apiFetch = useApiFetch();

  return useQuery<ResourcePayload<R>, ResourceError<E>, ResourcePayload<R>>({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: getResourceKey(resource, { pathParams, queryParams }),
    queryFn: async() => {
      // all errors and error typing is handgitled by react-query
      // so error response will never go to the data
      // that's why we are safe here to do type conversion "as Promise<ResourcePayload<R>>"
      if (resource === 'blocks') {
        let curBlockNumber = 0;
        let itemsCount = 50;
        if (queryParams && Boolean(queryParams.block_number)) {
          curBlockNumber = queryParams.block_number as number;
          itemsCount = queryParams.items_count as number;
        } else {
          const block = await publicClient.getBlock();
          curBlockNumber = Number(block.number);
        }

        const data = {
          items: [] as Array<Block>,
          next_page_params: {
            block_number: curBlockNumber - itemsCount > 0 ? curBlockNumber - itemsCount : 0,
            items_count: itemsCount,
          },
        };

        const promises = [];
        while (curBlockNumber >= 1 && itemsCount > 0) {
          itemsCount -= 1;
          curBlockNumber -= 1;
          const blockParams = { blockNumber: BigInt(curBlockNumber) };
          const promise = publicClient.getBlock(blockParams).then((block) => {
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
              base_fee_per_gas: block.baseFeePerGas?.toString() || '0',
              burnt_fees: null,
              priority_fee: null,
              extra_data: block.extraData,
              state_root: block.stateRoot,
              gas_target_percentage: null,
              gas_used_percentage: null,
              burnt_fees_percentage: null,
              type: 'block',
              tx_fees: null,
              uncles_hashes: block.uncles,
              withdrawals_count: block.withdrawals?.length,
            };
          });
          promises.push(promise);
        }

        const items = await Promise.all(promises);
        data.items = items as Array<Block>;

        return Promise.resolve(data as ResourcePayload<R>);
      }

      const data = apiFetch(resource, { pathParams, queryParams, fetchParams }) as Promise<ResourcePayload<R>>;
      return data;
    },
    ...queryOptions,
  });
}
